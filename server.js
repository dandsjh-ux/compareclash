'use strict';
/* Compare Clash — multiplayer server. Zero dependencies: Node's http module + a tiny WebSocket layer. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./public/cards.js');

/* ---------------- static files ---------------- */
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

/* ---------------- minimal WebSocket (RFC 6455) ---------------- */
const conns = new Map(); // id -> Conn
let connSeq = 0;
class Conn {
  constructor(socket) {
    this.id = 'w' + ++connSeq; this.socket = socket; this.buf = Buffer.alloc(0); this.handlers = {}; this.alive = true; this.closed = false; this.frag = null;
    socket.setNoDelay(true);
    socket.on('data', (d) => this.onData(d));
    socket.on('close', () => this.close());
    socket.on('error', () => this.close());
    socket.on('end', () => this.close());
  }
  on(e, fn) { (this.handlers[e] = this.handlers[e] || []).push(fn); }
  fire(e, d) { for (const fn of this.handlers[e] || []) { try { fn(d); } catch (err) { console.error('handler error', e, err); } } }
  emit(e, d) { this.sendFrame(0x1, Buffer.from(JSON.stringify({ e, d }))); }
  sendFrame(op, payload) {
    if (this.closed) return;
    const len = payload.length;
    let head;
    if (len < 126) head = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    try { this.socket.write(Buffer.concat([head, payload])); } catch (e) { this.close(); }
  }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) return this.close();
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = this.buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = this.buf.subarray(off, off + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
      this.buf = this.buf.subarray(need);
      this.alive = true;
      if (op === 0x8) return this.close();
      if (op === 0x9) { this.sendFrame(0xA, payload); continue; }
      if (op === 0xA) continue;
      if (op === 0x0 && this.frag) { this.frag.push(payload); if (!fin) continue; payload = Buffer.concat(this.frag); this.frag = null; }
      else if (op === 0x1 && !fin) { this.frag = [payload]; continue; }
      else if (op !== 0x1) continue;
      let msg;
      try { msg = JSON.parse(payload.toString('utf8')); } catch (e) { continue; }
      if (msg && typeof msg.e === 'string') this.fire(msg.e, msg.d);
    }
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    conns.delete(this.id);
    try { this.socket.end(Buffer.from([0x88, 0])); } catch (e) { /* ignore */ }
    this.socket.destroy();
    this.fire('disconnect');
  }
}
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!(req.url || '').startsWith('/ws') || !key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const conn = new Conn(socket);
  conns.set(conn.id, conn);
  onConnection(conn);
});
setInterval(() => {
  for (const c of conns.values()) { if (!c.alive) { c.close(); continue; } c.alive = false; c.sendFrame(0x9, Buffer.alloc(0)); }
}, 25000);
const sendTo = (id, e, d) => { const c = conns.get(id); if (c) c.emit(e, d); };

const HAND = 6, START_VP = 20, WIN_VP = 5, FREE_DISCARDS = 3, DISCARD_COST = 3, MAX_PLAYERS = 4, BET_TIME = 20;
const COLORS = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419'];
const BOT_NAMES = ['Robo Rita', 'Bot Bob', 'Cyber Sam', 'Pixel Pat', 'Chip', 'Sparky'];
const rooms = new Map();
const sockets = new Map(); // socket.id -> { code, pid }

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function makeCode() { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let c; do { c = ''; for (let i = 0; i < 4; i++) c += L[Math.floor(Math.random() * L.length)]; } while (rooms.has(c)); return c; }
const cleanName = (n) => String(n || '').replace(/[<>&"]/g, '').trim().slice(0, 14) || 'Player';
const byId = (room, id) => room.players.find((p) => p.id === id);
const N = (id) => C.NOUN_BY_ID[id];

/* ---------------- rooms & players ---------------- */
function newRoom() {
  const room = {
    code: makeCode(), hostId: null, players: [], phase: 'lobby', round: 0,
    settings: { rounds: 10, timer: 45, gambit: true }, // rounds: 0 = Free Play (host finishes the game)
    deck: [], discard: [], challenge: null, lastTitle: '', timer: null, timerEnd: 0, phaseId: 0,
    reveal: null, peeks: {}, history: [], final: null, nextUid: 1, playOrder: 0, deleteTimer: null,
  };
  rooms.set(room.code, room);
  return room;
}
function addPlayer(room, { id, name, isBot }) {
  const used = new Set(room.players.map((p) => p.color));
  const color = COLORS.find((c) => !used.has(c)) || pick(COLORS);
  const p = { id, name, isBot: !!isBot, connected: !isBot, socketId: null, vp: START_VP, hand: [], discardsUsed: 0, play: null, bet: null, color };
  room.players.push(p);
  if (!room.hostId && !isBot) room.hostId = id;
  return p;
}
function pickNewHost(room) {
  const h = room.players.find((p) => !p.isBot && p.connected) || room.players.find((p) => !p.isBot);
  room.hostId = h ? h.id : null;
}
function removePlayer(room, p) {
  room.players = room.players.filter((q) => q !== p);
  if (room.hostId === p.id) pickNewHost(room);
  if (!room.players.some((q) => !q.isBot)) { destroyRoom(room); return; }
  if (room.phase !== 'lobby' && room.phase !== 'over' && room.players.length < 2) { finishGame(room); return; }
  broadcast(room);
}
function destroyRoom(room) { clearTimer(room); rooms.delete(room.code); }
function afterDisconnect(room) {
  if (!rooms.has(room.code)) return;
  if (!room.players.some((p) => !p.isBot && p.connected)) {
    if (!room.deleteTimer) room.deleteTimer = setTimeout(() => destroyRoom(room), 10 * 60 * 1000);
    return;
  }
  const host = byId(room, room.hostId);
  if (!host) pickNewHost(room);
  else if (!host.connected) {
    // give the host a moment to come back (e.g. a page reload) before handing over control
    setTimeout(() => { const h = byId(room, room.hostId); if (rooms.get(room.code) === room && (!h || !h.connected)) { pickNewHost(room); broadcast(room); } }, 15000);
  }
  broadcast(room);
}

/* ---------------- views ---------------- */
function view(room, me) {
  const top = room.discard[room.discard.length - 1];
  return {
    code: room.code, phase: room.phase, round: room.round, settings: room.settings, hostId: room.hostId, you: me.id,
    timerLeft: room.timerEnd ? Math.max(0, room.timerEnd - Date.now()) : 0,
    deckCount: room.deck.length, discardCount: room.discard.length, discardTop: top ? { type: top.type, id: top.id } : null,
    challenge: room.challenge ? { ...room.challenge, info: C.challengeInfo(room.challenge) } : null,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, color: p.color, vp: p.vp, isBot: p.isBot, connected: p.connected, handCount: p.hand.length,
      locked: !!p.play, betLocked: !!p.bet, hasAction: !!(p.play && p.play.action),
      discardsLeft: Math.max(0, FREE_DISCARDS - p.discardsUsed),
    })),
    hand: me.hand,
    myPlay: me.play ? { noun: me.play.noun, action: me.play.action, target: me.play.target } : null,
    myBet: me.bet, maxBet: Math.floor(me.vp / 3), discardCost: DISCARD_COST,
    peek: room.peeks[me.id] || null,
    reveal: room.reveal,
    history: room.phase === 'over' ? room.history : null,
    final: room.final,
  };
}
function broadcast(room) {
  for (const p of room.players) if (p.socketId && p.connected) sendTo(p.socketId, 'state', view(room, p));
}

/* ---------------- timers ---------------- */
function clearTimer(room) { if (room.timer) clearTimeout(room.timer); room.timer = null; room.timerEnd = 0; }
function setTimer(room, ms, fn) {
  clearTimer(room);
  room.timerEnd = Date.now() + ms;
  const id = room.phaseId;
  room.timer = setTimeout(() => { if (room.phaseId === id) fn(); }, ms);
}
function later(room, ms, fn) {
  const id = room.phaseId;
  setTimeout(() => { if (rooms.get(room.code) === room && room.phaseId === id) fn(); }, ms);
}

/* ---------------- deck ---------------- */
function buildDeck(room) {
  room.nextUid = 1;
  const d = [];
  for (const n of C.NOUNS) d.push({ uid: 'c' + room.nextUid++, type: 'noun', id: n.id });
  for (const [id, a] of Object.entries(C.ACTIONS)) for (let i = 0; i < (id === 'peek' && !room.settings.gambit ? 0 : a.count); i++) d.push({ uid: 'c' + room.nextUid++, type: 'action', id });
  room.deck = shuffle(d);
  room.discard = [];
}
function draw(room) {
  if (!room.deck.length) { room.deck = shuffle(room.discard); room.discard = []; }
  return room.deck.pop() || null;
}
function ensureNoun(room, p) {
  if (p.hand.some((c) => c.type === 'noun')) return;
  let src = room.deck, i = src.findIndex((c) => c.type === 'noun');
  if (i < 0) { src = room.discard; i = src.findIndex((c) => c.type === 'noun'); }
  if (i < 0) return;
  const noun = src.splice(i, 1)[0];
  if (p.hand.length >= HAND) {
    const a = p.hand.splice(Math.floor(Math.random() * p.hand.length), 1)[0];
    room.deck.splice(Math.floor(Math.random() * (room.deck.length + 1)), 0, a);
  }
  p.hand.push(noun);
}
function refill(room, p) {
  while (p.hand.length < HAND) { const c = draw(room); if (!c) break; p.hand.push(c); }
  ensureNoun(room, p);
}

/* ---------------- challenges ---------------- */
const STAT_W = [['size', 3], ['weight', 3], ['speed', 2], ['price', 2], ['loud', 2], ['temp', 1.5]];
const COMBOS = [['size', 'weight'], ['size', 'speed'], ['speed', 'loud'], ['weight', 'price'], ['size', 'loud'], ['speed', 'price']];
function wpick(list) { const t = list.reduce((s, x) => s + x[1], 0); let r = Math.random() * t; for (const [v, w] of list) if ((r -= w) <= 0) return v; return list[0][0]; }
function genChallenge(room) {
  let ch;
  for (let tries = 0; tries < 25; tries++) {
    const r = Math.random(), high = Math.random() < 0.5;
    if (r < 0.42) ch = { kind: 'simple', stat: wpick(STAT_W), high };
    else if (r < 0.57) ch = { kind: 'theme', stat: wpick(STAT_W), high, cat: pick(Object.keys(C.CATS)) };
    else if (r < 0.72) {
      const stat = pick(['size', 'weight', 'speed', 'price']);
      ch = { kind: 'target', stat, high: true, ref: pick(C.NOUNS.filter((n) => n.sc[stat] != null && n.sc[stat] >= 3 && n.sc[stat] <= 8)).id };
    } else if (r < 0.88) {
      const stat = wpick(STAT_W.filter((s) => s[0] !== 'temp'));
      const refs = C.NOUNS.filter((n) => n.sc[stat] != null && (high ? n.sc[stat] >= 5.5 && n.sc[stat] <= 8.5 : n.sc[stat] >= 2.5 && n.sc[stat] <= 5.5));
      ch = { kind: 'limit', stat, high, ref: pick(refs).id };
    } else ch = { kind: 'combo', stats: pick(COMBOS), high };
    const sig = C.challengeInfo(ch).title + (ch.ref || '') + (ch.cat || '');
    if (sig !== room.lastTitle) { room.lastTitle = sig; break; }
  }
  return ch;
}

/* ---------------- game flow ---------------- */
function startGame(room) {
  for (const p of room.players) { p.vp = START_VP; p.hand = []; p.discardsUsed = 0; p.play = null; p.bet = null; }
  room.history = []; room.final = null; room.reveal = null; room.lastTitle = ''; room.pendingDiscard = null;
  buildDeck(room);
  for (let i = 0; i < HAND; i++) for (const p of room.players) p.hand.push(draw(room));
  room.players.forEach((p) => ensureNoun(room, p));
  room.round = 0;
  startRound(room);
}
function startRound(room) {
  room.round++; room.phaseId++; room.phase = 'play';
  room.reveal = null; room.peeks = {}; room.playOrder = 0;
  for (const p of room.players) { p.play = null; p.bet = null; }
  room.challenge = genChallenge(room);
  if (room.settings.timer > 0) setTimer(room, room.settings.timer * 1000, () => autoAll(room)); else clearTimer(room);
  scheduleAuto(room);
  broadcast(room);
}
const needsAuto = (p) => p.isBot || !p.connected;
function scheduleAuto(room) {
  for (const p of room.players) {
    if (!needsAuto(p)) continue;
    later(room, p.isBot ? rand(1200, 3400) : 2500, () => {
      if (!needsAuto(p)) return;
      if (room.phase === 'play' && !p.play) botPlay(room, p);
      else if (room.phase === 'bet' && !p.bet) botBet(room, p);
    });
  }
}
function autoAll(room) {
  if (room.phase === 'play') { for (const p of room.players) if (!p.play) botPlay(room, p, !needsAuto(p)); }
  else if (room.phase === 'bet') { for (const p of room.players) if (!p.bet) doBet(room, p, 'none', 0); }
}

function doPlay(room, p, nounUid, actionUid, targetId) {
  if (room.phase !== 'play' || p.play) return;
  const n = p.hand.find((c) => c.uid === nounUid && c.type === 'noun');
  if (!n) return;
  let a = null, target = null;
  if (actionUid) { a = p.hand.find((c) => c.uid === actionUid && c.type === 'action'); if (!a) return; }
  if (a && C.ACTIONS[a.id].target) {
    const others = room.players.filter((o) => o.id !== p.id);
    target = (others.find((o) => o.id === targetId) || others[0]).id;
  }
  p.hand = p.hand.filter((c) => c !== n && c !== a);
  p.play = { noun: n, action: a, target, order: room.playOrder++ };
  if (room.players.every((q) => q.play)) startBet(room); else broadcast(room);
}

function doDiscard(room, p, uids) {
  if (room.phase !== 'play' || p.play || !Array.isArray(uids)) return false;
  uids = [...new Set(uids)].slice(0, 2);
  const cards = uids.map((u) => p.hand.find((c) => c.uid === u));
  if (!cards.length || cards.some((c) => !c)) return false;
  if (p.discardsUsed >= FREE_DISCARDS) { if (p.vp < DISCARD_COST) return false; p.vp -= DISCARD_COST; }
  p.discardsUsed++;
  p.hand = p.hand.filter((c) => !cards.includes(c));
  room.discard.push(...cards);
  for (let i = 0; i < cards.length; i++) { const c = draw(room); if (c) p.hand.push(c); }
  ensureNoun(room, p);
  broadcast(room);
  return true;
}

/* Shield blocks targeted actions; Mirror bounces them back at the sender. */
function resolveTarget(src, tgt) {
  if (!tgt || tgt === src) return { none: true };
  const ta = tgt.play && tgt.play.action && tgt.play.action.id;
  if (ta === 'shield') return { blocked: true, src, tgt };
  if (ta === 'mirror') return { reflected: true, src: tgt, tgt: src };
  return { src, tgt };
}

function startBet(room) {
  if (!room.settings.gambit) { // betting switched off: skip straight to the reveal
    for (const p of room.players) p.bet = { side: 'none', amount: 0 };
    return resolveRound(room);
  }
  room.phaseId++; room.phase = 'bet'; room.peeks = {};
  for (const p of room.players) {
    const a = p.play.action;
    if (!a || a.id !== 'peek') continue;
    const t = byId(room, p.play.target);
    const r = resolveTarget(p, t);
    if (r.none) continue;
    if (r.blocked) room.peeks[p.id] = { blocked: true, name: t.name };
    else if (r.reflected) {
      room.peeks[t.id] = { name: p.name, card: p.play.noun.id, reflected: true };
      room.peeks[p.id] = { mirrored: true, name: t.name };
    } else room.peeks[p.id] = { name: t.name, card: t.play.noun.id };
  }
  if (room.settings.timer > 0) setTimer(room, BET_TIME * 1000, () => autoAll(room)); else clearTimer(room);
  scheduleAuto(room);
  broadcast(room);
}

function doBet(room, p, side, amount) {
  if (room.phase !== 'bet' || p.bet) return;
  const max = Math.floor(p.vp / 3);
  amount = Math.max(0, Math.min(max, Math.floor(Number(amount) || 0)));
  if (!['win', 'lose'].includes(side) || amount <= 0) { side = 'none'; amount = 0; }
  p.bet = { side, amount };
  if (room.players.every((q) => q.bet)) resolveRound(room); else broadcast(room);
}

/* ---------------- sentences ---------------- */
const A = (d) => C.cap(d.phrase);
const a = (d) => d.phrase;
const The = (d) => C.cap(C.thePhrase(d));
const joinList = (xs) => (xs.length <= 1 ? xs[0] || '' : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);

function buildLines(ch, plays, winners) {
  const D = (x) => N(x.noun.id);
  const lines = [];
  const di = ch.high ? 0 : 1;
  const busts = plays.filter((x) => x.bust);
  const losers = plays.filter((x) => !x.bust && !winners.includes(x));
  if (!winners.length) lines.push('Nobody wins — every card is out!');
  else if (winners.length > 1) {
    const Wd = winners.map(D);
    if (ch.stat && ch.kind !== 'target' && Wd.every((d) => d[ch.stat] === Wd[0][ch.stat]))
      lines.push(`${A(Wd[0])} is as ${C.STATS[ch.stat].base[di]} as ${joinList(Wd.slice(1).map(a))}!`);
    else lines.push(`It's a tie between ${joinList(Wd.map(a))}!`);
  } else {
    const wx = winners[0], w = D(wx);
    if (!losers.length) lines.push(busts.length ? `${A(w)} wins — every other card is out!` : `${A(w)} wins!`);
    else if (ch.kind === 'combo') {
      const lx = [...losers].sort((x, y) => y.power - x.power)[0], l = D(lx);
      const cmp = (st) => {
        const S = C.STATS[st], wv = w[st], lv = l[st];
        if (wv === lv) return { w: false, text: `${A(w)} is as ${S.base[di]} as ${a(l)}.` };
        const better = ch.high ? wv > lv : wv < lv;
        return better ? { w: true, text: `${A(w)} is ${S.comp[di]} than ${a(l)}.` } : { w: false, text: `${A(l)} is ${S.comp[di]} than ${a(w)}.` };
      };
      const [s1, s2] = ch.stats, c1 = cmp(s1), c2 = cmp(s2);
      if (c1.w && c2.w) lines.push(`${A(w)} is ${C.STATS[s1].comp[di]} and ${C.STATS[s2].comp[di]} than ${a(l)}.`);
      else { lines.push(`${A(w)} wins on points!`); lines.push(c1.text); lines.push(c2.text); }
    } else if (ch.kind === 'target') {
      const ref = N(ch.ref), S = C.STATS[ch.stat];
      lines.push(ch.high ? `${A(w)} is the closest in ${S.noun} to ${a(ref)}.` : `${A(w)} is the furthest in ${S.noun} from ${a(ref)}.`);
    } else {
      const st = ch.stat, S = C.STATS[st];
      const beats = (x) => (ch.high ? w[st] > D(x)[st] : w[st] < D(x)[st]);
      const truly = losers.filter(beats), notTruly = losers.filter((x) => !beats(x));
      if (!notTruly.length) {
        lines.push(`${A(w)} is ${S.comp[di]} than ${joinList(truly.map((x) => a(D(x))))}.`);
        if (losers.length >= 2) lines.push(`${The(w)} is the ${S.sup[di]}!`);
      } else {
        let why = 'a power-up';
        if (wx.mod > 0) why = 'BOOST power';
        else if (ch.kind === 'theme' && w.cat === ch.cat) why = `the ${C.CATS[ch.cat].label} bonus`;
        else if (notTruly.some((x) => x.mod < 0)) why = 'a sneaky SHRINK';
        lines.push(`${A(w)} wins with ${why}!`);
        for (const x of notTruly) {
          const ld = D(x);
          lines.push(ld[st] === w[st] ? `(Really, ${a(ld)} is as ${S.base[di]} as ${a(w)}.)` : `(Really, ${a(ld)} is ${S.comp[di]} than ${a(w)}.)`);
        }
      }
    }
  }
  for (const x of busts) lines.push(`${A(D(x))} ${x.reason}, so it's out!`);
  return lines;
}

function valueText(ch, d) {
  const stats = ch.kind === 'combo' ? ch.stats : [ch.stat];
  return stats.map((st) => C.fmtValue(st, d[st])).join(' · ');
}

/* ---------------- reveal & scoring ---------------- */
function resolveRound(room) {
  clearTimer(room); room.phaseId++; room.phase = 'reveal';
  const ch = { ...room.challenge };
  if (ch.stats) ch.stats = [...ch.stats];
  const startInfo = C.challengeInfo(ch);
  const plays = room.players.map((p) => ({ p, noun: p.play.noun, action: p.play.action, target: p.play.target, order: p.play.order, mod: 0 }));
  const P = (id) => plays.find((x) => x.p.id === id);
  const initial = {};
  plays.forEach((x) => (initial[x.p.id] = { noun: x.noun, action: x.action }));
  const steps = [];
  const ordered = [...plays].sort((x, y) => x.order - y.order);
  const withA = (id) => ordered.filter((x) => x.action && x.action.id === id);
  const targeted = (x, verb, fn) => {
    const t = byId(room, x.target);
    const r = resolveTarget(x.p, t);
    if (r.none) return;
    if (r.blocked) { steps.push({ t: 'blocked', by: x.p.id, on: t.id, text: `${t.name}'s SHIELD blocks ${x.p.name}'s ${verb}!` }); return; }
    fn(r, t);
  };

  for (const x of withA('reverse')) {
    ch.high = !ch.high;
    steps.push({ t: 'reverse', by: x.p.id, text: `${x.p.name} played REVERSE!`, challenge: C.challengeInfo(ch) });
  }
  for (const x of withA('swap')) targeted(x, 'SWAP', (r, t) => {
    const X = P(x.p.id), Y = P(t.id);
    [X.noun, Y.noun] = [Y.noun, X.noun];
    steps.push({ t: 'swap', by: x.p.id, a: x.p.id, b: t.id, text: r.reflected ? `${t.name}'s MIRROR can't stop a SWAP — cards swapped!` : `${x.p.name} SWAPS cards with ${t.name}!` });
  });
  for (const x of withA('boost')) { x.mod += 2; steps.push({ t: 'boost', on: x.p.id, text: `${x.p.name} BOOSTS their card: +2 power!` }); }
  for (const x of withA('shrink')) targeted(x, 'SHRINK', (r) => {
    P(r.tgt.id).mod -= 2;
    steps.push({ t: 'shrink', by: r.src.id, on: r.tgt.id, text: r.reflected ? `${r.src.name}'s MIRROR bounces the SHRINK back at ${r.tgt.name}!` : `${x.p.name} SHRINKS ${r.tgt.name}'s card: −2 power!` });
  });
  let mult = 1;
  for (const x of withA('double')) { mult *= 2; steps.push({ t: 'double', by: x.p.id, text: `${x.p.name} played DOUBLE — ${room.settings.gambit ? 'prize and bets' : 'prize'} ×2!` }); }
  for (const x of withA('peek')) targeted(x, 'PEEK', (r, t) => {
    steps.push({ t: 'peek', by: x.p.id, on: t.id, text: r.reflected ? `${t.name}'s MIRROR let them peek back at ${x.p.name}!` : `${x.p.name} peeked at ${t.name}'s card.` });
  });

  for (const x of plays) {
    const ev = C.evaluate(ch, N(x.noun.id));
    x.bust = !!ev.bust; x.reason = ev.reason || null; x.key = ev.key;
    x.power = ev.bust ? null : Math.round((ev.strength + x.mod) * 10) / 10;
  }
  const cont = plays.filter((x) => !x.bust);
  let winners = [];
  if (cont.length) {
    const max = Math.max(...cont.map((x) => x.power));
    let top = cont.filter((x) => Math.abs(x.power - max) < 1e-6);
    if (top.length > 1 && top.every((x) => x.key != null)) { const mk = Math.max(...top.map((x) => x.key)); top = top.filter((x) => x.key === mk); }
    winners = top;
  }

  const pot = WIN_VP * mult;
  const deltas = {};
  for (const x of plays) {
    const p = x.p, isWin = winners.includes(x);
    let d = isWin ? Math.ceil(pot / winners.length) : 0;
    if (p.bet && p.bet.side !== 'none') {
      const amt = p.bet.amount * mult;
      if (p.bet.side === 'win') d += isWin ? amt : -amt;
      else d += isWin ? -amt : 2 * amt;
    }
    const nv = Math.max(0, p.vp + d);
    deltas[p.id] = nv - p.vp;
    p.vp = nv;
  }

  for (const x of withA('steal')) targeted(x, 'STEAL', (r) => {
    const thief = r.src, victim = r.tgt;
    if (!victim.hand.length) { steps.push({ t: 'steal', by: thief.id, on: victim.id, text: `${thief.name} tried to STEAL, but ${victim.name}'s hand is empty!` }); return; }
    const card = victim.hand.splice(Math.floor(Math.random() * victim.hand.length), 1)[0];
    thief.hand.push(card);
    steps.push({ t: 'steal', by: thief.id, on: victim.id, text: r.reflected ? `${victim.name}'s steal bounced off a MIRROR — ${thief.name} takes a card instead!` : `${thief.name} STEALS a card from ${victim.name}!` });
  });

  const lines = buildLines(ch, plays, winners);
  const finalInfo = C.challengeInfo(ch);
  room.history.push({ round: room.round, title: finalInfo.title, sub: finalInfo.sub, line: lines[0], words: plays.map((x) => x.noun.id) });
  room.pendingDiscard = plays.flatMap((x) => (x.action ? [x.noun, x.action] : [x.noun]));

  room.reveal = {
    id: room.code + '-' + room.round, round: room.round, startChallenge: startInfo, finalChallenge: finalInfo, initial, steps, mult, pot,
    winners: winners.map((x) => x.p.id), lines,
    results: plays.map((x) => ({
      id: x.p.id, noun: x.noun, action: x.action, power: x.power, bust: x.bust, reason: x.reason, mod: x.mod,
      value: valueText(ch, N(x.noun.id)), delta: deltas[x.p.id], bet: x.p.bet, win: winners.includes(x),
    })),
  };
  broadcast(room);
  later(room, 1800 + steps.length * 1600 + 9500, () => endRound(room));
}

function endRound(room) {
  if (room.phase !== 'reveal') return;
  if (room.pendingDiscard) { room.discard.push(...room.pendingDiscard); room.pendingDiscard = null; }
  const done = room.settings.rounds > 0 && room.round >= room.settings.rounds;
  if (done) return finishGame(room);
  for (const p of room.players) refill(room, p);
  startRound(room);
}
function finishGame(room) {
  clearTimer(room); room.phaseId++; room.phase = 'over';
  room.final = { ranking: [...room.players].sort((x, y) => y.vp - x.vp).map((p) => ({ id: p.id, name: p.name, vp: p.vp, color: p.color, isBot: p.isBot })) };
  broadcast(room);
}

/* ---------------- bots (also auto-play for timed-out / offline players) ---------------- */
function scoreFor(ch, id) { const ev = C.evaluate(ch, N(id)); return ev.bust ? -5 : ev.strength; }
function botPlay(room, p, randomPick) {
  if (room.phase !== 'play' || p.play) return;
  let nouns = p.hand.filter((c) => c.type === 'noun');
  if (!nouns.length) { ensureNoun(room, p); nouns = p.hand.filter((c) => c.type === 'noun'); if (!nouns.length) return; }
  if (randomPick) return doPlay(room, p, pick(nouns).uid, null, null);
  const ch = room.challenge;
  const rank = (chx) => p.hand.filter((c) => c.type === 'noun').map((c) => ({ c, s: scoreFor(chx, c.id) })).sort((x, y) => y.s - x.s);
  let ranked = rank(ch);
  if (ranked[0].s < 3 && p.discardsUsed < FREE_DISCARDS) { doDiscard(room, p, ranked.slice(-2).map((x) => x.c.uid)); ranked = rank(ch); }
  let choice = Math.random() < 0.75 || ranked.length < 2 ? ranked[0] : ranked[1];
  const acts = p.hand.filter((c) => c.type === 'action');
  const has = (id) => acts.find((x) => x.id === id);
  let action = null;
  const rev = has('reverse');
  if (rev) { const rr = rank({ ...ch, high: !ch.high })[0]; if (rr.s > choice.s + 2.5) { choice = rr; action = rev; } }
  if (!action) {
    const roll = Math.random();
    if (has('boost') && choice.s < 7.5 && roll < 0.8) action = has('boost');
    else if (has('double') && choice.s >= 8) action = has('double');
    else if (has('shrink') && roll < 0.5) action = has('shrink');
    else if (has('swap') && choice.s < 3) action = has('swap');
    else if (has('steal') && roll < 0.4) action = has('steal');
    else if (has('peek') && roll < 0.35) action = has('peek');
    else if (has('shield') && roll < 0.25) action = has('shield');
    else if (has('mirror') && roll < 0.25) action = has('mirror');
  }
  const target = action && C.ACTIONS[action.id].target ? pick(room.players.filter((o) => o.id !== p.id)).id : null;
  doPlay(room, p, choice.c.uid, action && action.uid, target);
}
function botBet(room, p) {
  if (room.phase !== 'bet' || p.bet) return;
  const max = Math.floor(p.vp / 3);
  if (max < 1) return doBet(room, p, 'none', 0);
  let s = scoreFor(room.challenge, p.play.noun.id);
  if (p.play.action && p.play.action.id === 'boost') s += 2;
  if (s >= 8.2) return doBet(room, p, 'win', Math.ceil(max * rand(0.3, 0.7)));
  if (s <= 3.5) return doBet(room, p, 'lose', Math.ceil(max * rand(0.3, 0.6)));
  if (room.players.length === 2 && s >= 6.5 && Math.random() < 0.4) return doBet(room, p, 'win', Math.ceil(max * 0.3));
  doBet(room, p, 'none', 0);
}

/* ---------------- sockets ---------------- */
function leaveRoom(socket) {
  const s = sockets.get(socket.id);
  if (!s) return;
  sockets.delete(socket.id);
  const room = rooms.get(s.code);
  const p = room && byId(room, s.pid);
  if (!p) return;
  p.socketId = null; p.connected = false;
  if (room.phase === 'lobby' || room.phase === 'over') removePlayer(room, p);
  else { p.isBot = true; p.name = p.name + ' (bot)'; if (room.hostId === p.id) pickNewHost(room); scheduleAuto(room); afterDisconnect(room); }
}

function onConnection(socket) {
  const ctx = () => {
    const s = sockets.get(socket.id);
    if (!s) return {};
    const room = rooms.get(s.code);
    return { room, p: room && byId(room, s.pid) };
  };
  const isHost = (room, p) => room && p && room.hostId === p.id;
  function bind(room, p) {
    p.socketId = socket.id; p.connected = true;
    sockets.set(socket.id, { code: room.code, pid: p.id });
    if (room.deleteTimer) { clearTimeout(room.deleteTimer); room.deleteTimer = null; }
    if (!byId(room, room.hostId)?.connected && !p.isBot) room.hostId = p.id;
    socket.emit('joined', { code: room.code });
    broadcast(room);
  }

  socket.on('create', ({ name, pid } = {}) => {
    if (!pid) return;
    leaveRoom(socket);
    const room = newRoom();
    bind(room, addPlayer(room, { id: String(pid), name: cleanName(name) }));
  });
  socket.on('join', ({ code, name, pid } = {}) => {
    if (!pid) return;
    const room = rooms.get(String(code || '').toUpperCase().trim());
    if (!room) return socket.emit('err', 'Room not found — check the code!');
    let p = byId(room, String(pid));
    if (!p) {
      if (room.phase !== 'lobby') return socket.emit('err', 'That game has already started.');
      if (room.players.length >= MAX_PLAYERS) return socket.emit('err', 'That room is full (4 players max).');
      leaveRoom(socket);
      p = addPlayer(room, { id: String(pid), name: cleanName(name) });
    } else if (name && !p.isBot) p.name = cleanName(name);
    bind(room, p);
  });
  socket.on('rejoin', ({ code, pid } = {}) => {
    const room = rooms.get(String(code || ''));
    const p = room && byId(room, String(pid));
    if (!p || (p.isBot && p.id.startsWith('bot-'))) return socket.emit('session-lost');
    bind(room, p);
  });
  socket.on('addBot', () => {
    const { room, p } = ctx();
    if (!isHost(room, p) || room.phase !== 'lobby' || room.players.length >= MAX_PLAYERS) return;
    const used = new Set(room.players.map((q) => q.name));
    addPlayer(room, { id: 'bot-' + Math.random().toString(36).slice(2, 8), name: BOT_NAMES.find((n) => !used.has(n)) || 'Bot', isBot: true });
    broadcast(room);
  });
  socket.on('kick', (id) => {
    const { room, p } = ctx();
    if (!isHost(room, p) || room.phase !== 'lobby' || id === p.id) return;
    const q = byId(room, id);
    if (!q) return;
    if (q.socketId) { sendTo(q.socketId, 'kicked'); sockets.delete(q.socketId); }
    removePlayer(room, q);
  });
  socket.on('settings', (s = {}) => {
    const { room, p } = ctx();
    if (!isHost(room, p) || room.phase !== 'lobby') return;
    if ([5, 10, 15, 0].includes(s.rounds)) room.settings.rounds = s.rounds;
    if ([0, 30, 45, 60, 90].includes(s.timer)) room.settings.timer = s.timer;
    if (s.gambit !== undefined) room.settings.gambit = !!s.gambit;
    broadcast(room);
  });
  socket.on('start', () => {
    const { room, p } = ctx();
    if (!isHost(room, p) || room.phase !== 'lobby' || room.players.length < 2) return;
    startGame(room);
  });
  socket.on('play', ({ noun, action, target } = {}) => { const { room, p } = ctx(); if (room && p) doPlay(room, p, noun, action, target); });
  socket.on('discard', (uids) => {
    const { room, p } = ctx();
    if (room && p && !doDiscard(room, p, uids)) socket.emit('err', "You can't discard right now.");
  });
  socket.on('bet', ({ side, amount } = {}) => { const { room, p } = ctx(); if (room && p) doBet(room, p, side, amount); });
  socket.on('finish', () => { const { room, p } = ctx(); if (isHost(room, p) && ['play', 'bet', 'reveal'].includes(room.phase)) finishGame(room); });
  socket.on('next', () => { const { room, p } = ctx(); if (isHost(room, p) && room.phase === 'reveal') endRound(room); });
  socket.on('again', () => {
    const { room, p } = ctx();
    if (!isHost(room, p) || room.phase !== 'over') return;
    room.players = room.players.filter((q) => (q.isBot && q.id.startsWith('bot-')) || q.connected);
    for (const q of room.players) { q.hand = []; q.play = null; q.bet = null; q.vp = START_VP; }
    room.phase = 'lobby'; room.phaseId++; room.round = 0; room.reveal = null; room.challenge = null; room.final = null; room.history = [];
    broadcast(room);
  });
  socket.on('leave', () => { leaveRoom(socket); socket.emit('left'); });
  socket.on('disconnect', () => {
    const s = sockets.get(socket.id);
    sockets.delete(socket.id);
    if (!s) return;
    const room = rooms.get(s.code);
    const p = room && byId(room, s.pid);
    if (!p || p.socketId !== socket.id) return;
    p.connected = false; p.socketId = null;
    if (room.phase === 'lobby') removePlayer(room, p);
    else { scheduleAuto(room); afterDisconnect(room); }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Compare Clash running on http://localhost:${PORT}`));
module.exports = { server, rooms };
