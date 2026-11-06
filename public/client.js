/* Compare Clash — browser client */
(() => {
  'use strict';
  const C = window.CC;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  /* ---------------- connection (WebSocket with auto-reconnect) ---------------- */
  function createSocket() {
    const handlers = {};
    let ws, open = false, backoff = 500;
    const queue = [];
    const fire = (e, d) => (handlers[e] || []).forEach((fn) => fn(d));
    function connect() {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onopen = () => { open = true; backoff = 500; fire('connect'); queue.splice(0).forEach((m) => ws.send(m)); };
      ws.onmessage = (ev) => { try { const { e, d } = JSON.parse(ev.data); fire(e, d); } catch (err) { console.error(err); } };
      ws.onclose = () => { const was = open; open = false; if (was) fire('disconnect'); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 5000); };
      ws.onerror = () => {};
    }
    connect();
    return {
      on(e, fn) { (handlers[e] = handlers[e] || []).push(fn); },
      emit(e, d) { const m = JSON.stringify({ e, d }); if (open) ws.send(m); else queue.push(m); },
    };
  }
  const socket = createSocket();

  let pid = localStorage.getItem('cc_pid');
  if (!pid) { pid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('cc_pid', pid); }

  /* ---------------- state ---------------- */
  let S = null;
  let timerEnd = 0;
  const ui = {
    sel: { noun: null, action: null, target: null }, discardMode: false, discardSel: [],
    betSide: 'win', betAmt: 1, muted: localStorage.getItem('cc_mute') === '1', voice: localStorage.getItem('cc_voice') !== '0',
  };
  let RV = null;           // reveal display state
  let rvTimers = [];
  const els = new Map();   // key -> card element on the table
  const table = $('#table');
  const htmlCache = new Map();
  const setHTML = (el, html) => { if (htmlCache.get(el) !== html) { htmlCache.set(el, html); el.innerHTML = html; return true; } return false; };

  /* ---------------- sound & voice ---------------- */
  let AC = null;
  function sfx(kind) {
    if (ui.muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = AC.currentTime;
      const tone = (f, d, type = 'sine', v = 0.08, delay = 0, f2) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t0 + delay);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + delay + d);
        g.gain.setValueAtTime(v, t0 + delay); g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + d);
        o.connect(g).connect(AC.destination); o.start(t0 + delay); o.stop(t0 + delay + d + 0.03);
      };
      switch (kind) {
        case 'deal': tone(520, 0.05, 'triangle', 0.04); break;
        case 'flip': tone(300, 0.14, 'triangle', 0.08, 0, 760); break;
        case 'coin': tone(988, 0.08, 'square', 0.035); tone(1319, 0.22, 'square', 0.035, 0.07); break;
        case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.07, i * 0.11)); break;
        case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.13)); break;
        case 'up': tone(380, 0.32, 'sawtooth', 0.035, 0, 1200); break;
        case 'down': tone(900, 0.32, 'sawtooth', 0.035, 0, 180); break;
        case 'whoosh': tone(220, 0.25, 'triangle', 0.05, 0, 900); break;
        case 'block': tone(160, 0.2, 'square', 0.05); break;
        case 'tick': tone(1200, 0.035, 'square', 0.025); break;
        case 'click': tone(820, 0.03, 'triangle', 0.04); break;
      }
    } catch (e) { /* audio not available */ }
  }
  function speak(lines) {
    if (!ui.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const text = lines.join(' ').replace(/[()]/g, '').replace(/—/g, ',');
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9; u.lang = 'en-GB';
      const v = speechSynthesis.getVoices().find((x) => /en-GB/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- screens ---------------- */
  function showScreen(id) {
    for (const s of ['home', 'lobby', 'game']) $('#' + s).classList.toggle('hidden', s !== id);
  }
  function toast(msg) {
    const t = $('#toastMsg');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------------- home ---------------- */
  $('#nameIn').value = localStorage.getItem('cc_name') || '';
  const getName = () => {
    const n = $('#nameIn').value.trim();
    if (!n) { toast('Type your name first!'); $('#nameIn').focus(); return null; }
    localStorage.setItem('cc_name', n);
    return n;
  };
  $('#createBtn').onclick = () => { const name = getName(); if (name) { sfx('click'); socket.emit('create', { name, pid }); } };
  $('#joinBtn').onclick = () => {
    const name = getName(); if (!name) return;
    const code = $('#codeIn').value.trim().toUpperCase();
    if (code.length !== 4) return toast('Room codes have 4 letters.');
    sfx('click'); socket.emit('join', { code, name, pid });
  };
  $('#codeIn').addEventListener('input', (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '')));
  $('#codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#joinBtn').click(); });
  const urlCode = new URLSearchParams(location.search).get('room');
  if (urlCode) $('#codeIn').value = urlCode.toUpperCase().slice(0, 4);

  (function floaters() {
    const ids = ['elephant', 'mouse', 'rocket', 'snail', 'castle', 'icecream', 'sun', 'bus', 'giraffe', 'apple'];
    $('#floaters').innerHTML = ids.map((id, i) => {
      const d = C.NOUN_BY_ID[id];
      return `<div class="floater" style="left:${(i * 9.7 + 3) % 92}%;top:${(i * 37) % 80 + 5}%;animation-delay:${-i * 1.7}s;--r:${(i % 2 ? 1 : -1) * (6 + i)}deg">${nounFront(d)}</div>`;
    }).join('');
    $('#ruleActions').innerHTML = Object.entries(C.ACTIONS).map(([id, a]) =>
      `<div class="ruleact"><div class="mini a-${id}">${C.ACTION_ART[id]}</div><div><b>${a.name}</b> ×${a.count}<br><span>${a.desc}</span></div></div>`).join('');
  })();

  /* ---------------- socket events ---------------- */
  socket.on('connect', () => {
    const code = localStorage.getItem('cc_room');
    if (code) socket.emit('rejoin', { code, pid });
  });
  socket.on('disconnect', () => toast('Connection lost — reconnecting…'));
  socket.on('joined', ({ code }) => { localStorage.setItem('cc_room', code); history.replaceState(null, '', '?room=' + code); });
  const goHome = () => { localStorage.removeItem('cc_room'); S = null; RV = null; clearRv(); clearTable(); hideOver(); history.replaceState(null, '', location.pathname); showScreen('home'); };
  socket.on('session-lost', goHome);
  socket.on('left', goHome);
  socket.on('kicked', () => { goHome(); toast('You were removed from the room.'); });
  socket.on('err', (m) => toast(m));
  socket.on('state', onState);

  function onState(st) {
    const prev = S;
    S = st;
    timerEnd = st.timerLeft ? Date.now() + st.timerLeft : 0;
    if (st.phase === 'lobby') { RV = null; clearRv(); clearTable(); hideOver(); showScreen('lobby'); renderLobby(); return; }
    showScreen('game');
    if (st.phase === 'play' && (!prev || prev.round !== st.round || prev.phase !== 'play')) {
      ui.sel = { noun: null, action: null, target: null }; ui.discardMode = false; ui.discardSel = [];
    }
    if (st.phase === 'bet' && (!prev || prev.phase !== 'bet')) {
      ui.betSide = 'win'; ui.betAmt = Math.max(1, Math.ceil(st.maxBet / 2)); sfx('tick');
    }
    if (st.reveal && (!RV || RV.id !== st.reveal.id)) startReveal(st.reveal, prev);
    if (!st.reveal && RV) { RV = null; clearRv(); }
    const uids = new Set(st.hand.map((c) => c.uid));
    if (ui.sel.noun && !uids.has(ui.sel.noun)) ui.sel.noun = null;
    if (ui.sel.action && !uids.has(ui.sel.action)) { ui.sel.action = null; ui.sel.target = null; }
    ui.discardSel = ui.discardSel.filter((u) => uids.has(u));
    render();
    if (st.phase === 'over') renderOver(); else hideOver();
  }

  /* ---------------- lobby ---------------- */
  function renderLobby() {
    const host = S.hostId === S.you;
    const link = `${location.origin}${location.pathname}?room=${S.code}`;
    const opt = (key, vals, cur, fmt) => vals.map((v) => `<button class="chip ${v === cur ? 'on' : ''}" ${host ? `data-set="${key}:${v}"` : 'disabled'}>${fmt(v)}</button>`).join('');
    const html = `
      <div class="logo-big small"><span class="l1">Compare</span><span class="l2">Clash</span></div>
      <div class="codebox"><div class="lbl">Room code</div><div class="code">${S.code}</div>
        <button class="link" data-act="copy" data-link="${esc(link)}">Copy invite link</button></div>
      <h3>Players (${S.players.length}/4)</h3>
      <div class="plist">${S.players.map((p) => `
        <div class="prow"><span class="av" style="background:${p.color}">${esc(p.name[0] || '?')}</span>
          <span class="pn">${esc(p.name)}${p.id === S.you ? ' <small>(you)</small>' : ''}</span>
          ${p.id === S.hostId ? '<span class="tagc">host</span>' : ''}${p.isBot ? '<span class="tagc bot">bot</span>' : ''}
          ${host && p.id !== S.you ? `<button class="x" data-kick="${p.id}" title="Remove">✕</button>` : ''}</div>`).join('')}
        ${host && S.players.length < 4 ? '<button class="btn ghost addbot" data-act="addBot">+ Add a computer player</button>' : ''}
      </div>
      <h3>Settings</h3>
      <div class="setrow"><span>Rounds</span>${opt('rounds', [5, 10, 15, 0], S.settings.rounds, (v) => (v ? v : 'Free Play'))}</div>
      <p class="small">${S.settings.rounds ? `The highest earner after ${S.settings.rounds} rounds wins.` : 'Play as many rounds as you like. The host presses Finish game, and the highest earner wins.'}</p>
      <div class="setrow"><span>Gambit</span>${opt('gambit', [1, 0], S.settings.gambit ? 1 : 0, (v) => (v ? 'On' : 'Off'))}</div>
      <p class="small">${S.settings.gambit ? '<b>On:</b> before the cards are revealed, players can bet Vocab Points that their card will WIN or LOSE.' : '<b>Off:</b> no betting at all. Players simply pick their best card, and Vocab Points only come from winning rounds. Peek cards are taken out of the deck, because they are only for betting. Best for younger children.'}</p>
      <div class="setrow"><span>Turn timer</span>${opt('timer', [30, 45, 60, 90, 0], S.settings.timer, (v) => (v ? v + 's' : 'Off'))}</div>
      <div class="lobbybtns">
        ${host ? `<button class="btn big" data-act="start" ${S.players.length < 2 ? 'disabled' : ''}>${S.players.length < 2 ? 'Need 2+ players' : 'Start game ▶'}</button>` : '<p class="wait">Waiting for the host to start…</p>'}
        <button class="link" data-act="rules">How to play</button>
        <button class="link" data-act="leave">Leave room</button>
      </div>`;
    setHTML($('#lobbyBox'), html);
  }

  /* ---------------- card faces ---------------- */
  function nounFront(d) {
    return `<div class="fr noun c-${d.cat}"><div class="cat">${C.CATS[d.cat].label}</div><div class="art">${C.ART[d.id]}</div><div class="word${d.name.length > 9 ? ' long' : ''}">${esc(d.name)}</div></div>`;
  }
  function actionFront(id) {
    const a = C.ACTIONS[id];
    return `<div class="fr act a-${id}"><div class="cat">Action</div><div class="art">${C.ACTION_ART[id]}</div><div class="word">${a.name}</div><div class="desc">${a.desc}</div></div>`;
  }
  function chalFront(info) {
    return `<div class="fr chal ${info.high ? 'hi' : 'lo'} k-${info.kind}"><div class="cat">Challenge</div>
      <div class="icons">${info.icons.map((s) => `<span>${C.STAT_ICON[s]}</span>`).join('')}</div>
      <div class="ctitle">${esc(info.title)}</div><div class="csub">${esc(info.sub)}</div>
      ${info.ref ? `<div class="ref">${C.ART[info.ref]}</div>` : ''}${info.cat ? `<div class="cbadge c-${info.cat}">${C.CATS[info.cat].label} +2</div>` : ''}</div>`;
  }
  const BACK = '<div class="back-in"><div class="bl1">Compare</div><div class="bl2">Clash</div></div>';
  function makeCard(key) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.key = key;
    el.innerHTML = `<div class="lift"><div class="flip"><div class="face back">${BACK}</div><div class="face front"></div></div></div>`;
    table.appendChild(el);
    return el;
  }
  function fillCard(el, t, fresh) {
    let sig = '', html = '';
    if (t.kind === 'chal') { sig = 'ch:' + t.info.title + t.info.sub; html = chalFront(t.info); }
    else if (t.card) { sig = t.card.type + ':' + t.card.id; html = t.card.type === 'noun' ? nounFront(C.NOUN_BY_ID[t.card.id]) : actionFront(t.card.id); }
    if (sig && el._sig !== sig) {
      const had = el._sig;
      el._sig = sig;
      el.querySelector('.front').innerHTML = html;
      if (had && !fresh && t.kind === 'chal') { el.classList.remove('spin'); void el.offsetWidth; el.classList.add('spin'); }
    }
    if (t.kind === 'chal') el.classList.add('chalcard');
    if (t.kind === 'pile') {
      let b = el.querySelector('.count');
      if (!b) { b = document.createElement('div'); b.className = 'count'; el.querySelector('.lift').appendChild(b); }
      b.textContent = t.count;
      el.classList.add('pile');
    }
  }
  function clearTable() { for (const el of els.values()) el.remove(); els.clear(); }

  /* ---------------- geometry ---------------- */
  function orderOpps() {
    const ps = S.players, i = ps.findIndex((p) => p.id === S.you);
    return [...ps.slice(i + 1), ...ps.slice(0, i)];
  }
  function geo() {
    const W = table.clientWidth, H = table.clientHeight;
    const ch = Math.max(84, Math.min(H / 5, (W / 10) * 1.4));
    const cw = ch / 1.4;
    const G = { W, H, cw, ch };
    G.chalS = 1.32; // the challenge card is drawn larger than the other cards so it is easy to read
    G.chal = { x: W / 2, y: H * 0.405 };
    G.deck = { x: W / 2 - cw * 2.0, y: H * 0.405 };
    G.disc = { x: W / 2 + cw * 2.0, y: H * 0.405 };
    G.mySlot = { x: W / 2, y: H * 0.615 };
    G.handY = H - ch * 0.5;
    const top = (x) => ({ type: 'top', panel: { x, y: ch * 0.47 }, backs: { x, y: ch * 0.04 }, slot: { x, y: H * 0.19 } });
    const sx = Math.max(W * 0.19, cw * 1.5);
    const left = { type: 'left', panel: { x: 96, y: H * 0.2 }, backs: { x: cw * 0.08, y: H * 0.42 }, slot: { x: sx, y: H * 0.42 } };
    const right = { type: 'right', panel: { x: W - 96, y: H * 0.2 }, backs: { x: W - cw * 0.08, y: H * 0.42 }, slot: { x: W - sx, y: H * 0.42 } };
    const opps = orderOpps();
    const lay = opps.length === 1 ? [top(W / 2)] : opps.length === 2 ? [top(W * 0.28), top(W * 0.72)] : [left, top(W / 2), right];
    G.seats = {};
    opps.forEach((p, i) => (G.seats[p.id] = lay[i]));
    G.seats[S.you] = { type: 'me', slot: G.mySlot };
    return G;
  }

  /* ---------------- render ---------------- */
  function render() {
    if (!S || S.phase === 'lobby') return;
    const G = geo();
    table.style.setProperty('--cw', G.cw + 'px');
    table.style.setProperty('--ch', G.ch + 'px');
    $('#hud').style.setProperty('--cw', G.cw + 'px');
    $('#hud').style.setProperty('--ch', G.ch + 'px');
    const T = new Map();
    const me = S.players.find((p) => p.id === S.you);
    const opps = orderOpps();

    T.set('deck', { ...G.deck, s: 0.8, z: 5, up: false, kind: 'pile', count: S.deckCount });
    if (S.discardTop && S.discardCount) T.set('discardpile', { ...G.disc, s: 0.8, z: 5, up: true, kind: 'pile', card: S.discardTop, count: S.discardCount, spawn: { ...G.disc, s: 0.8 }, spawnUp: true });

    if (S.challenge) {
      const info = RV ? RV.challenge : S.challenge.info;
      T.set('ch-' + S.round, { ...G.chal, s: G.chalS, z: 30, up: true, kind: 'chal', info, spawn: { x: G.W / 2, y: -G.ch, rot: -20, s: 1 } });
    }

    // my hand
    const hand = [...S.hand].sort((a, b) => (a.type === b.type ? 0 : a.type === 'noun' ? -1 : 1));
    const n = hand.length;
    const maxW = Math.min(G.W * 0.6, n * G.cw * 0.95);
    const step = n > 1 ? Math.min(G.cw * 0.95, (maxW - G.cw) / (n - 1)) : 0;
    const canAct = S.phase === 'play' && !S.myPlay;
    hand.forEach((c, i) => {
      const o = i - (n - 1) / 2;
      const sel = ui.sel.noun === c.uid || ui.sel.action === c.uid;
      const dsel = ui.discardMode && ui.discardSel.includes(c.uid);
      let y = G.handY + Math.abs(o) * Math.abs(o) * 2.2;
      if (sel) y -= G.ch * (c.type === 'noun' ? 0.3 : 0.22);
      if (dsel) y -= G.ch * 0.16;
      T.set(c.uid, { x: G.W / 2 + o * step, y, rot: o * 3, s: 1, z: 100 + i, up: true, card: c, mine: canAct, sel, dsel, dim: !canAct && S.phase !== 'over' });
    });

    // played cards
    const slotT = (pidX, mod = 0) => { const s = G.seats[pidX].slot; return { x: s.x, y: s.y, rot: 0, s: 0.75 * (1 + mod * 0.06) }; };
    const actT = (pidX) => { const s = G.seats[pidX].slot; return { x: s.x + G.cw * 0.44, y: s.y + G.ch * 0.08, rot: 14, s: 0.52 }; };
    if (RV) {
      const res = {};
      RV.rv.results.forEach((r) => (res[r.id] = r));
      for (const pidX of Object.keys(RV.display)) {
        if (!G.seats[pidX]) continue;
        const d = RV.display[pidX], mine = pidX === S.you, up = RV.flipped || mine;
        const r = res[pidX];
        T.set(d.noun.uid, { ...slotT(pidX, RV.mods[pidX] || 0), z: 60, up, card: d.noun, win: RV.results && r && r.win, bust: RV.results && r && r.bust, spawn: backsPos(G, pidX) });
        if (d.action) T.set(d.action.uid, { ...actT(pidX), z: 55, up, card: d.action, spawn: backsPos(G, pidX) });
      }
    } else if (S.phase === 'play' || S.phase === 'bet') {
      if (S.myPlay) {
        T.set(S.myPlay.noun.uid, { ...slotT(S.you), z: 60, up: true, card: S.myPlay.noun });
        if (S.myPlay.action) T.set(S.myPlay.action.uid, { ...actT(S.you), z: 55, up: true, card: S.myPlay.action });
      }
      for (const p of opps) {
        if (!p.locked) continue;
        T.set(`pn-${S.round}-${p.id}`, { ...slotT(p.id), z: 60, up: false, kind: 'hidden', spawn: backsPos(G, p.id) });
        if (p.hasAction) T.set(`pa-${S.round}-${p.id}`, { ...actT(p.id), z: 55, up: false, kind: 'hidden', spawn: backsPos(G, p.id) });
      }
    }

    // opponents' hands (card backs)
    for (const p of opps) {
      const seat = G.seats[p.id], k = p.handCount;
      for (let i = 0; i < k; i++) {
        const o = i - (k - 1) / 2;
        let t;
        if (seat.type === 'top') t = { x: seat.backs.x + o * G.cw * 0.2, y: seat.backs.y + Math.abs(o) * 2, rot: 180 - o * 5 };
        else if (seat.type === 'left') t = { x: seat.backs.x + Math.abs(o) * 2, y: seat.backs.y + o * G.cw * 0.2, rot: 90 + o * 5 };
        else t = { x: seat.backs.x - Math.abs(o) * 2, y: seat.backs.y + o * G.cw * 0.2, rot: -90 - o * 5 };
        T.set(`bk-${p.id}-${i}`, { ...t, s: 0.42, z: 10 + i, up: false, kind: 'back' });
      }
    }

    sync(T, G);
    renderHud(G, me, opps);
  }
  function backsPos(G, pidX) { const s = G.seats[pidX]; return s && s.backs ? { x: s.backs.x, y: s.backs.y, rot: s.type === 'top' ? 180 : 90, s: 0.42 } : null; }

  function place(el, t, G) {
    el.style.transform = `translate(${t.x - G.cw / 2}px, ${t.y - G.ch / 2}px) rotate(${t.rot || 0}deg) scale(${t.s || 1})`;
  }
  function sync(T, G) {
    let dealt = 0;
    for (const [k, t] of T) {
      let el = els.get(k), fresh = false;
      if (!el) {
        el = makeCard(k); els.set(k, el); fresh = true;
        const sp = t.spawn || { x: G.deck.x, y: G.deck.y, rot: 0, s: 0.8 };
        el.style.transition = 'none';
        place(el, sp, G);
        el.classList.toggle('up', !!t.spawnUp);
        el.style.zIndex = t.z;
        void el.offsetWidth;
        el.style.transition = '';
        if (t.mine || (t.card && !t.spawn && k !== 'deck')) { el.style.transitionDelay = dealt * 90 + 'ms'; dealt++; setTimeout(() => (el.style.transitionDelay = ''), 1400); }
      }
      fillCard(el, t, fresh);
      place(el, t, G);
      el.style.zIndex = t.z;
      el.classList.toggle('up', !!t.up);
      el.classList.toggle('mine', !!t.mine);
      el.classList.toggle('sel', !!t.sel);
      el.classList.toggle('dsel', !!t.dsel);
      el.classList.toggle('dim', !!t.dim);
      el.classList.toggle('win', !!t.win);
      el.classList.toggle('bust', !!t.bust);
    }
    if (dealt) for (let i = 0; i < Math.min(dealt, 6); i++) setTimeout(() => sfx('deal'), i * 90);
    for (const [k, el] of [...els]) {
      if (T.has(k)) continue;
      els.delete(k);
      el.classList.remove('sel', 'dsel', 'mine', 'win', 'bust');
      if (k.startsWith('bk-') || k === 'deck' || k === 'discardpile' || k.startsWith('ch-')) {
        if (k.startsWith('ch-')) place(el, { x: G.W / 2, y: -G.ch * 1.2, rot: 25, s: 1 }, G);
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 650);
        continue;
      }
      place(el, { x: G.disc.x + (Math.random() * 12 - 6), y: G.disc.y + (Math.random() * 12 - 6), rot: Math.random() * 40 - 20, s: 0.8 }, G);
      el.style.zIndex = 6;
      setTimeout(() => (el.style.opacity = '0'), 520);
      setTimeout(() => el.remove(), 1000);
    }
  }

  /* ---------------- reveal sequence ---------------- */
  function clearRv() { rvTimers.forEach(clearTimeout); rvTimers = []; }
  const rvAt = (ms, fn) => rvTimers.push(setTimeout(fn, ms));
  function rekey(from, to) {
    const el = els.get(from);
    if (el && !els.has(to)) { els.delete(from); els.set(to, el); el.dataset.key = to; }
  }
  function startReveal(rv) {
    clearRv();
    for (const id of Object.keys(rv.initial)) {
      const ini = rv.initial[id];
      rekey(`pn-${rv.round}-${id}`, ini.noun.uid);
      if (ini.action) rekey(`pa-${rv.round}-${id}`, ini.action.uid);
    }
    RV = { id: rv.id, rv, display: JSON.parse(JSON.stringify(rv.initial)), mods: {}, flipped: false, results: false, challenge: rv.startChallenge, toast: null };
    const late = S && S.phase === 'over';
    if (late) { RV.flipped = true; RV.results = true; RV.challenge = rv.finalChallenge; for (const s of rv.steps) applyStep(s, true); RV.toast = null; return; }
    let t = 450;
    rvAt(t, () => { RV.flipped = true; sfx('flip'); render(); });
    t += 1300;
    for (const s of rv.steps) { rvAt(t, () => applyStep(s)); t += 1600; }
    rvAt(t, () => { RV.toast = null; RV.challenge = rv.finalChallenge; RV.results = true; render(); celebrate(rv); });
  }
  function applyStep(s, silent) {
    RV.toast = { text: s.text, t: s.t, key: Math.random() };
    if (s.t === 'reverse') RV.challenge = s.challenge;
    if (s.t === 'swap') { const A = RV.display[s.a].noun; RV.display[s.a].noun = RV.display[s.b].noun; RV.display[s.b].noun = A; }
    if (s.t === 'boost') RV.mods[s.on] = (RV.mods[s.on] || 0) + 2;
    if (s.t === 'shrink') RV.mods[s.on] = (RV.mods[s.on] || 0) - 2;
    if (silent) return;
    sfx({ shrink: 'down', boost: 'up', blocked: 'block', double: 'coin' }[s.t] || 'whoosh');
    render();
  }
  function celebrate(rv) {
    const meWon = rv.winners.includes(S.you);
    sfx(meWon ? 'win' : rv.winners.length ? 'tick' : 'lose');
    speak(rv.lines.filter((l) => !/so it's out/.test(l) || rv.lines.length < 4));
    setTimeout(() => {
      rv.results.forEach((r, i) => { if (r.delta) setTimeout(() => flyCoins(r.id, r.delta), i * 250); });
    }, 600);
  }
  function seatCenter(id) {
    const el = document.querySelector(`[data-seat="${CSS.escape(id)}"]`);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }
  function flyCoins(id, delta) {
    const to = seatCenter(id);
    if (!to) return;
    const fx = $('#fx');
    const from = { x: table.clientWidth / 2, y: table.clientHeight * 0.405 };
    const [a, b] = delta > 0 ? [from, to] : [to, from];
    const n = Math.min(8, Math.abs(delta));
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.style.transform = `translate(${a.x}px, ${a.y}px)`;
      fx.appendChild(c);
      setTimeout(() => {
        c.style.transform = `translate(${b.x + (Math.random() * 20 - 10)}px, ${b.y + (Math.random() * 14 - 7)}px)`;
        c.style.opacity = '1';
      }, 30 + i * 70);
      setTimeout(() => { if (delta > 0) sfx('coin'); c.style.opacity = '0'; }, 750 + i * 70);
      setTimeout(() => c.remove(), 1300 + i * 70);
    }
    const f = document.createElement('div');
    f.className = 'floatnum ' + (delta > 0 ? 'pos' : 'neg');
    f.textContent = (delta > 0 ? '+' : '') + delta + ' VP';
    f.style.left = to.x + 'px'; f.style.top = to.y - 20 + 'px';
    fx.appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }

  /* ---------------- HUD ---------------- */
  function statusOf(p) {
    if (!p.connected && !p.isBot) return '<span class="st off">offline</span>';
    if (S.phase === 'play') return p.locked ? '<span class="st ok">✔ ready</span>' : '<span class="st think">thinking…</span>';
    if (S.phase === 'bet') return p.betLocked ? '<span class="st ok">✔ bet</span>' : '<span class="st think">betting…</span>';
    return '';
  }
  function renderHud(G, me, opps) {
    const host = S.hostId === S.you;
    const tl = timerEnd ? Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)) : null;
    setHTML($('#hudTop'), `<div class="roominfo"><b>Room ${S.code}</b><span>${S.settings.rounds ? `Round ${Math.min(S.round, S.settings.rounds)} of ${S.settings.rounds}` : `Round ${S.round} · Free Play`}</span>${S.settings.gambit ? '' : '<span>No betting</span>'}</div>
      <div id="timer" class="${tl == null ? 'hidden' : ''}"></div>`);
    updateTimer();
    $('[data-act="sound"]').textContent = ui.muted ? '🔇' : '🔊';
    $('[data-act="voice"]').textContent = ui.voice ? '🗣' : '🤐';
    $('[data-act="voice"]').classList.toggle('off', !ui.voice);

    // seats
    const needTarget = false; // targets are chosen automatically (strongest rival card / VP leader)
    const winners = RV && RV.results ? RV.rv.winners : [];
    let seats = '';
    for (const p of opps) {
      const s = G.seats[p.id];
      seats += `<div class="seat s-${s.type} ${needTarget ? 'targetable' : ''} ${needTarget && ui.sel.target === p.id ? 'targeted' : ''} ${winners.includes(p.id) ? 'won' : ''}" data-seat="${p.id}" style="left:${s.panel.x}px;top:${s.panel.y}px">
        <span class="av" style="background:${p.color}">${esc(p.name[0])}</span><div class="si"><div class="nm">${esc(p.name)}${p.isBot ? ' 🤖' : ''}</div>
        <div class="vp"><i class="vpc"></i>${p.vp} VP ${statusOf(p)}</div></div>${needTarget && ui.sel.target === p.id ? '<span class="tgt">🎯</span>' : ''}</div>`;
    }
    const betChip = S.myBet && S.myBet.side !== 'none' ? `<span class="betchip ${S.myBet.side}">Bet: ${S.myBet.side.toUpperCase()} ${S.myBet.amount}</span>` : '';
    seats += `<div class="seat s-me ${winners.includes(S.you) ? 'won' : ''}" data-seat="${S.you}"><span class="av" style="background:${me.color}">${esc(me.name[0])}</span>
      <div class="si"><div class="nm">${esc(me.name)} <small>(you)</small></div><div class="vp big"><i class="vpc"></i>${me.vp} VP ${betChip}</div>
      <div class="disc">♻ ${me.discardsLeft} free discard${me.discardsLeft === 1 ? '' : 's'}</div></div></div>`;
    setHTML($('#seats'), seats);

    // hint + controls
    let hint = '', controls = '';
    if (S.phase === 'play') {
      if (S.myPlay) hint = 'Card played! Waiting for the other players…';
      else if (ui.discardMode) {
        hint = `Tap up to 2 cards to throw away.${me.discardsLeft ? '' : ` This costs ${S.discardCost} VP.`}`;
        controls = `<button class="btn red" data-act="doDiscard" ${ui.discardSel.length ? '' : 'disabled'}>Discard ${ui.discardSel.length || ''} & draw</button><button class="btn ghost" data-act="cancelDiscard">Cancel</button>`;
      } else {
        const a = ui.sel.action && S.hand.find((c) => c.uid === ui.sel.action);
        if (!ui.sel.noun) hint = 'Pick the <b>word card</b> that best fits the challenge.';
        else if (!a) hint = 'Nice! Add an <b>action card</b> if you want, then press <b>Play</b>.';
        if (a) {
          const auto = C.ACTIONS[a.id].target ? ' <i>It picks its target automatically.</i>' : '';
          hint = `<b>${C.ACTIONS[a.id].name}:</b> ${C.ACTIONS[a.id].desc}${auto}` + (ui.sel.noun ? '' : ' Now pick a word card.');
        }
        const canDisc = me.discardsLeft > 0 || me.vp >= S.discardCost;
        controls = `<button class="btn big" data-act="play" ${ui.sel.noun ? '' : 'disabled'}>Play card ▶</button>
          <button class="btn ghost" data-act="discard" ${canDisc ? '' : 'disabled'}>♻ Discard ${me.discardsLeft ? `(${me.discardsLeft} free)` : `(${S.discardCost} VP)`}</button>`;
      }
    } else if (S.phase === 'bet') {
      hint = S.myBet ? 'Bet placed! Waiting for everyone…' : '';
    } else if (S.phase === 'reveal' && RV && !RV.results) hint = 'Revealing the cards…';
    setHTML($('#hint'), hint);
    $('#hint').classList.toggle('hidden', !hint);
    setHTML($('#controls'), controls);

    renderBet(me);
    renderToast();
    renderBadges(G);
    renderResults(host);
  }

  function renderBet(me) {
    const panel = $('#betPanel');
    if (S.phase !== 'bet' || S.myBet) { setHTML(panel, ''); panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    const max = S.maxBet;
    let peek = '';
    if (S.peek) {
      if (S.peek.blocked) peek = `<div class="peek">🛡 ${esc(S.peek.name)}'s Shield blocked your Peek!</div>`;
      else if (S.peek.mirrored) peek = `<div class="peek">🪞 ${esc(S.peek.name)}'s Mirror — they peeked at YOUR card!</div>`;
      else peek = `<div class="peek"><div class="mini">${C.ART[S.peek.card]}</div><div>${S.peek.reflected ? 'Mirror magic! ' : ''}${esc(S.peek.name)} played <b>${esc(C.NOUN_BY_ID[S.peek.card].phrase)}</b></div></div>`;
    }
    const mine = S.myPlay && C.NOUN_BY_ID[S.myPlay.noun.id];
    const html = `<h3>🎲 Gambit</h3><p>You played <b>${esc(mine ? mine.phrase : '?')}</b>. Will it win?</p>${peek}
      ${max < 1 ? '<p class="small">You need at least 3 VP to make a bet.</p><div class="row"><button class="btn" data-act="nobet">OK, no bet</button></div>' : `
      <div class="seg"><button class="opt win ${ui.betSide === 'win' ? 'on' : ''}" data-side="win">I'll WIN<small>pays 1 : 1</small></button>
      <button class="opt lose ${ui.betSide === 'lose' ? 'on' : ''}" data-side="lose">I'll LOSE<small>pays 2 : 1</small></button></div>
      <div class="amt"><input type="range" id="betRange" min="1" max="${max}" step="1" /><b id="betLbl"></b></div>
      <div class="row"><button class="btn" data-act="bet">Place bet</button><button class="btn ghost" data-act="nobet">No bet</button></div>`}`;
    if (setHTML(panel, html)) {
      const r = $('#betRange');
      if (r) { ui.betAmt = Math.min(Math.max(1, ui.betAmt), max); r.value = ui.betAmt; r.oninput = () => { ui.betAmt = +r.value; updBetLbl(); }; updBetLbl(); }
    }
  }
  function updBetLbl() {
    const l = $('#betLbl'); if (!l) return;
    const win = ui.betSide === 'win' ? ui.betAmt : ui.betAmt * 2;
    l.innerHTML = `${ui.betAmt} VP <small>→ win ${win}, lose ${ui.betAmt}</small>`;
  }

  function renderToast() {
    const t = $('#actToast');
    if (!RV || !RV.toast) { setHTML(t, ''); return; }
    if (setHTML(t, `<div class="atoast t-${RV.toast.t}" data-k="${RV.toast.key}">${esc(RV.toast.text)}</div>`)) { /* animation restarts with new node */ }
  }

  function renderBadges(G) {
    const b = $('#badges');
    if (!RV || !RV.results) { setHTML(b, ''); return; }
    let html = '';
    for (const r of RV.rv.results) {
      const s = G.seats[r.id]; if (!s) continue;
      const side = s.type === 'top' || s.type === 'me';
      const x = side ? s.slot.x - G.cw * 0.42 : s.slot.x;
      const y = side ? s.slot.y + G.ch * 0.12 : s.slot.y + G.ch * 0.375 * (1 + (r.mod || 0) * 0.06);
      html += `<div class="badge ${side ? 'side' : ''} ${r.win ? 'win' : ''} ${r.bust ? 'bust' : ''}" style="left:${x}px;top:${y}px">
        ${r.win ? '<span class="crown">👑</span>' : ''}<span class="pw">${r.bust ? 'OUT' : '⚡ ' + r.power}</span><span class="val">${esc(r.value)}</span>${r.mod ? `<span class="mod ${r.mod > 0 ? 'p' : 'm'}">${r.mod > 0 ? '+' : ''}${r.mod}</span>` : ''}</div>`;
    }
    setHTML(b, html);
  }

  function renderResults(host) {
    const box = $('#results');
    if (!RV || !RV.results || S.phase === 'over') { setHTML(box, ''); box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const rv = RV.rv;
    const name = (id) => (S.players.find((p) => p.id === id) || {}).name || '?';
    const chips = rv.results.map((r) => {
      const b = r.bet && r.bet.side !== 'none' ? ` <small>(bet ${r.bet.side} ${r.bet.amount})</small>` : '';
      return `<span class="dchip ${r.delta > 0 ? 'pos' : r.delta < 0 ? 'neg' : ''}">${esc(name(r.id))}: ${r.delta > 0 ? '+' : ''}${r.delta} VP${b}</span>`;
    }).join('');
    const html = `<div class="rhead">Round ${rv.round} · ${esc(rv.finalChallenge.title)}${rv.mult > 1 ? ' <span class="x2">×' + rv.mult + '</span>' : ''}</div>
      <div class="lines">${rv.lines.map((l, i) => `<p class="${i ? 'sub' : 'main'}">${esc(l)}</p>`).join('')}</div>
      <div class="row"><div class="dchips">${chips}</div><button class="btn ghost small" data-act="say">🔊 Hear it</button>${host ? `${!S.settings.rounds || rv.round < S.settings.rounds ? '<button class="btn" data-act="next">Next round ▶</button>' : '<button class="btn" data-act="next">See results ▶</button>'}${!S.settings.rounds ? '<button class="btn red small" data-act="finish">Finish game</button>' : ''}` : '<span class="small">Next round starting soon…</span>'}</div>`;
    setHTML(box, html);
  }

  function updateTimer() {
    const el = $('#timer');
    if (!el || !S) return;
    if (!timerEnd || (S.phase !== 'play' && S.phase !== 'bet')) { el.classList.add('hidden'); return; }
    const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    el.classList.remove('hidden');
    el.classList.toggle('urgent', left <= 5);
    el.textContent = '⏱ ' + left + 's';
  }
  setInterval(() => {
    updateTimer();
    if (S && timerEnd && (S.phase === 'play' || S.phase === 'bet')) {
      const left = Math.ceil((timerEnd - Date.now()) / 1000);
      const waiting = (S.phase === 'play' && !S.myPlay) || (S.phase === 'bet' && !S.myBet);
      if (waiting && left <= 5 && left > 0 && left !== updateTimer.last) { updateTimer.last = left; sfx('tick'); }
    }
  }, 250);

  /* ---------------- game over ---------------- */
  function renderOver() {
    const o = $('#over');
    o.classList.remove('hidden');
    const rk = S.final ? S.final.ranking : [];
    const medal = ['🥇', '🥈', '🥉', '4th'];
    const words = [...new Set((S.history || []).flatMap((h) => h.words))];
    const html = `<div class="panel overbox"><div class="logo-big small"><span class="l1">Game</span><span class="l2">Over!</span></div>
      <div class="podium">${rk.map((p, i) => `<div class="pod p${i}"><div class="md">${medal[i]}</div><span class="av" style="background:${p.color}">${esc(p.name[0])}</span><div class="nm">${esc(p.name)}</div><div class="vp"><i class="vpc"></i>${p.vp} VP</div></div>`).join('')}</div>
      <h3>Sentences from this game</h3>
      <ol class="hist">${(S.history || []).map((h) => `<li><b>${esc(h.title)}</b> ${esc(h.line)}</li>`).join('')}</ol>
      <h3>Words you met (${words.length})</h3>
      <div class="words">${words.map((id) => `<span class="wchip c-${C.NOUN_BY_ID[id].cat}">${esc(C.NOUN_BY_ID[id].name)}</span>`).join('')}</div>
      <div class="row">${S.hostId === S.you ? '<button class="btn big" data-act="again">Play again ▶</button>' : '<span class="small">Waiting for the host…</span>'}<button class="btn ghost" data-act="leave">Leave</button></div></div>`;
    if (setHTML(o, html) && S.final && S.final.ranking[0] && S.final.ranking[0].id === S.you) sfx('win');
  }
  function hideOver() { $('#over').classList.add('hidden'); setHTML($('#over'), ''); }

  /* ---------------- input ---------------- */
  table.addEventListener('click', (e) => {
    const el = e.target.closest('.card');
    if (!el || !S || S.phase !== 'play' || S.myPlay) return;
    const key = el.dataset.key;
    const c = S.hand.find((h) => h.uid === key);
    if (!c) return;
    sfx('click');
    if (ui.discardMode) {
      const i = ui.discardSel.indexOf(key);
      if (i >= 0) ui.discardSel.splice(i, 1); else if (ui.discardSel.length < 2) ui.discardSel.push(key); else toast('You can discard 2 cards at a time.');
      return render();
    }
    if (c.type === 'noun') ui.sel.noun = ui.sel.noun === key ? null : key;
    else {
      ui.sel.action = ui.sel.action === key ? null : key;
      ui.sel.target = null;
    }
    render();
  });
  table.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.card');
    if (!el || !S || S.phase !== 'play' || S.myPlay || ui.discardMode) return;
    const c = S.hand.find((h) => h.uid === el.dataset.key);
    if (c && c.type === 'noun') { ui.sel.noun = c.uid; doPlay(); }
  });
  function doPlay() {
    if (!ui.sel.noun) return;
    sfx('whoosh');
    socket.emit('play', { noun: ui.sel.noun, action: ui.sel.action, target: ui.sel.target });
  }

  document.addEventListener('click', (e) => {
    const seat = e.target.closest('.seat.targetable');
    if (seat && seat.dataset.seat !== (S && S.you)) { ui.sel.target = seat.dataset.seat; sfx('click'); render(); return; }
    const side = e.target.closest('[data-side]');
    if (side) { ui.betSide = side.dataset.side; document.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('on', b === side)); updBetLbl(); sfx('click'); return; }
    const set = e.target.closest('[data-set]');
    if (set) { const [k, v] = set.dataset.set.split(':'); socket.emit('settings', { ...(S ? S.settings : {}), [k]: +v }); return; }
    const kick = e.target.closest('[data-kick]');
    if (kick) { socket.emit('kick', kick.dataset.kick); return; }
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    switch (act) {
      case 'rules': $('#rules').classList.remove('hidden'); break;
      case 'closeRules': $('#rules').classList.add('hidden'); break;
      case 'copy': navigator.clipboard?.writeText(btn.dataset.link).then(() => toast('Invite link copied!'), () => toast(btn.dataset.link)); break;
      case 'addBot': socket.emit('addBot'); break;
      case 'start': sfx('click'); socket.emit('start'); break;
      case 'leave': if (confirmLeave()) socket.emit('leave'); break;
      case 'play': doPlay(); break;
      case 'discard': ui.discardMode = true; ui.discardSel = []; ui.sel = { noun: null, action: null, target: null }; render(); break;
      case 'cancelDiscard': ui.discardMode = false; ui.discardSel = []; render(); break;
      case 'doDiscard': socket.emit('discard', ui.discardSel); ui.discardMode = false; ui.discardSel = []; sfx('whoosh'); break;
      case 'bet': socket.emit('bet', { side: ui.betSide, amount: ui.betAmt }); sfx('coin'); break;
      case 'nobet': socket.emit('bet', { side: 'none', amount: 0 }); sfx('click'); break;
      case 'next': socket.emit('next'); break;
      case 'finish': if (window.confirm('Finish the game now? The highest earner wins.')) socket.emit('finish'); break;
      case 'again': socket.emit('again'); break;
      case 'say': if (RV) { const v = ui.voice; ui.voice = true; speak(RV.rv.lines); ui.voice = v; } break;
      case 'sound': ui.muted = !ui.muted; localStorage.setItem('cc_mute', ui.muted ? '1' : '0'); render(); break;
      case 'voice': ui.voice = !ui.voice; localStorage.setItem('cc_voice', ui.voice ? '1' : '0'); if (!ui.voice) try { speechSynthesis.cancel(); } catch (err) { /* */ } render(); break;
    }
  });
  function confirmLeave() { return !S || S.phase === 'lobby' || S.phase === 'over' || window.confirm('Leave this game? A computer player will take your seat.'); }
  $('#rules').addEventListener('click', (e) => { if (e.target.id === 'rules') $('#rules').classList.add('hidden'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#rules').classList.add('hidden');
    if (e.key === 'Enter' && document.activeElement === $('#nameIn')) $('#createBtn').click();
  });
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S && S.phase !== 'lobby') { for (const el of els.values()) el.style.transition = 'none'; render(); requestAnimationFrame(() => { for (const el of els.values()) el.style.transition = ''; }); } }, 80); });
})();
