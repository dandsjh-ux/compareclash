/* Compare Clash — shared card data (used by server and browser) */
(function () {
  'use strict';

  /* ---------- SVG drawing helpers (viewBox 0 0 100 100) ---------- */
  const K = '#2d2a3e';
  const NS = ' stroke="none"';
  const c = (x, y, r, f = '#fff', n) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${n ? NS : ''}/>`;
  const e = (x, y, rx, ry, f = '#fff', rot) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${rot != null ? ` transform="rotate(${rot} ${x} ${y})"` : ''}/>`;
  const r = (x, y, w, h, f = '#fff', rr = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rr}" fill="${f}"/>`;
  const p = (d, f = 'none') => `<path d="${d}" fill="${f}"/>`;
  const pn = (d, f) => `<path d="${d}" fill="${f}" stroke="none"/>`;
  const l = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none"/>`;
  const tube = (d, f, w = 6) =>
    `<path d="${d}" fill="none" stroke-width="${w + 5}"/><path d="${d}" fill="none" stroke="${f}" stroke-width="${w}"/>`;
  const eye = (x, y, s = 1) =>
    `<circle cx="${x}" cy="${y}" r="${3.4 * s}" fill="#fff" stroke-width="${1.8 * s}"/><circle cx="${x + 0.7 * s}" cy="${y + 0.4 * s}" r="${1.9 * s}" fill="${K}" stroke="none"/>`;
  const dot = (x, y, rr = 1.8, f = K) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}" stroke="none"/>`;
  const sh = (w = 30, y = 92) => `<ellipse cx="50" cy="${y}" rx="${w}" ry="3.5" fill="#000" opacity=".13" stroke="none"/>`;
  const smile = (x, y, w = 4) => `<path d="M${x - w} ${y}Q${x} ${y + w} ${x + w} ${y}" fill="none"/>`;
  const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.8" fill="#ff8fa3" opacity=".75" stroke="none"/>`;
  const shine = (x, y, rx, ry, rot = -30) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" stroke="none" transform="rotate(${rot} ${x} ${y})"/>`;
  const g = (t, inner) => `<g transform="${t}">${inner}</g>`;
  const svg = (inner) =>
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="${K}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
  const loop = (n, fn) => { let s = ''; for (let i = 0; i < n; i++) s += fn(i); return s; };

  const GREY = '#b8bfcc', BROWN = '#c98b55', DBROWN = '#8a5a35', WOOD = '#a0673f', GLASS = '#bfe3ff', TYRE = '#3a3a4a', HUB = '#d5dae3';

  /* ---------- 84 noun illustrations ---------- */
  const ART = {
    /* animals */
    ant: svg(sh(36) + l(44, 62, 36, 82) + l(52, 63, 52, 84) + l(58, 62, 68, 82) + p('M76 45Q80 30 88 27') + p('M70 44Q69 30 75 22') +
      e(28, 60, 16, 12, '#8a5233') + e(52, 58, 9, 7, '#8a5233') + c(73, 52, 10, '#8a5233') + eye(76, 49) + smile(75, 57, 3)),
    bee: svg(sh(24) + e(40, 30, 11, 15, '#e6f6ff', -20) + e(58, 28, 10, 14, '#e6f6ff', 20) + p('M74 56L86 56L74 62Z', K) +
      e(50, 56, 26, 19, '#ffd23f') + '<path d="M44 39Q39 56 44 73" fill="none" stroke-width="6"/><path d="M58 39Q53 56 58 73" fill="none" stroke-width="6"/>' +
      c(24, 52, 11, '#ffd23f') + eye(21, 49) + smile(22, 56, 3) + p('M19 42Q15 32 11 30') + p('M26 41Q28 31 32 28') + dot(11, 30, 2.4) + dot(32, 28, 2.4)),
    snail: svg(sh(38, 86) + p('M8 82Q6 66 18 64Q26 63 28 70L82 76Q90 78 88 84L12 84Q8 84 8 82Z', '#b8e07a') + l(16, 65, 12, 48) + l(22, 64, 25, 47) +
      c(12, 46, 3.5, '#b8e07a') + dot(12, 46, 1.6) + c(25, 45, 3.5, '#b8e07a') + dot(25, 45, 1.6) + smile(17, 73, 3) +
      c(56, 56, 22, '#ff9f43') + p('M56 56m-4 0a4 4 0 1 1 8 0a9 9 0 1 1 -18 0a14 14 0 1 1 28 0')),
    mouse: svg(sh(32) + p('M80 68Q98 62 92 44') + e(58, 66, 26, 17, GREY) + c(40, 38, 10, GREY) + c(40, 38, 5, '#f7a1b5', 1) +
      e(32, 58, 17, 14, GREY) + c(24, 40, 9, GREY) + c(24, 40, 4.5, '#f7a1b5', 1) + eye(28, 54) + c(16, 61, 3, '#f7a1b5') +
      l(16, 63, 5, 61) + l(17, 65, 7, 69) + e(46, 83, 6, 3, '#f7a1b5') + e(70, 83, 6, 3, '#f7a1b5')),
    frog: svg(sh(32) + e(26, 84, 10, 4, '#6cc551') + e(74, 84, 10, 4, '#6cc551') + e(50, 64, 30, 22, '#6cc551') + c(34, 42, 10, '#6cc551') +
      c(66, 42, 10, '#6cc551') + eye(34, 41, 1.6) + eye(66, 41, 1.6) + e(50, 73, 16, 9, '#c4ec8f') + p('M32 60Q50 72 68 60') + blush(28, 58) + blush(72, 58)),
    goldfish: svg(c(16, 28, 3, '#dff3ff') + c(22, 18, 2, '#dff3ff') + p('M68 52L90 34L87 52L90 70Z', '#ff9f43') + p('M38 36Q48 20 60 37', '#ffb86b') +
      e(46, 53, 26, 18, '#ff9f43') + p('M50 62Q56 70 62 62', '#ffb86b') + eye(32, 49, 1.2) + smile(25, 57, 3) + p('M54 42Q58 53 54 64')),
    rabbit: svg(sh(26) + e(40, 26, 6, 18, '#fff', -8) + e(40, 26, 2.8, 12, '#f7a1b5', -8) + e(58, 26, 6, 18, '#fff', 8) + e(58, 26, 2.8, 12, '#f7a1b5', 8) +
      c(74, 74, 6, '#fff') + e(52, 72, 22, 17, '#fff') + c(49, 49, 16, '#fff') + eye(43, 47) + eye(56, 47) + c(49.5, 53, 2.2, '#f7a1b5') +
      smile(49.5, 56, 3) + blush(39, 54) + blush(60, 54) + e(42, 88, 7, 3.5, '#fff') + e(62, 88, 7, 3.5, '#fff')),
    cat: svg(sh(30) + tube('M76 72Q96 66 86 44', '#ffb05c', 5) + e(55, 70, 24, 17, '#ffb05c') + p('M50 57Q54 63 50 69') + p('M61 57Q65 63 61 69') +
      p('M25 42L27 21L41 33Z', '#ffb05c') + p('M55 42L53 21L39 33Z', '#ffb05c') + c(40, 48, 17, '#ffb05c') + eye(34, 46) + eye(47, 46) +
      p('M38 52L42 52L40 54.5Z', '#f7a1b5') + p('M36 57Q38 59.5 40 56.5Q42 59.5 44 57') + l(30, 54, 19, 52) + l(50, 54, 61, 52) + blush(31, 53) + blush(49, 53)),
    penguin: svg(sh(22) + e(42, 89, 7, 3, '#ffb020') + e(58, 89, 7, 3, '#ffb020') + e(27, 58, 6, 15, '#2d3a4f', 15) + e(73, 58, 6, 15, '#2d3a4f', -15) +
      e(50, 56, 22, 32, '#2d3a4f') + e(50, 64, 15, 23, '#fff') + e(50, 40, 14, 10, '#fff') + eye(44, 38) + eye(56, 38) + p('M45 44L55 44L50 51Z', '#ffb020') + blush(41, 46) + blush(59, 46)),
    dog: svg(sh(32) + tube('M78 62Q92 52 86 40', BROWN, 5) + r(40, 74, 8, 14, BROWN, 3) + r(64, 74, 8, 14, BROWN, 3) + e(57, 66, 24, 16, BROWN) +
      e(65, 61, 7, 5, DBROWN) + e(23, 48, 6, 13, DBROWN, 15) + e(53, 48, 6, 13, DBROWN, -15) + c(38, 46, 16, BROWN) + e(38, 56, 9, 7, '#f0d2b0') +
      e(38, 52, 4, 3, K) + eye(32, 42) + eye(45, 42) + p('M36 60Q38 68 41 60', '#ff6b8a')),
    owl: svg(sh(26) + p('M28 34L30 17L43 30Z', WOOD) + p('M72 34L70 17L57 30Z', WOOD) + e(25, 60, 7, 16, '#8a5230', 10) + e(75, 60, 7, 16, '#8a5230', -10) +
      e(50, 58, 26, 30, WOOD) + e(50, 67, 16, 19, '#e8c9a0') + c(39, 44, 10, '#fff') + c(61, 44, 10, '#fff') + dot(40, 45, 4.5) + dot(62, 45, 4.5) +
      dot(41.5, 43.5, 1.4, '#fff') + dot(63.5, 43.5, 1.4, '#fff') + p('M46 52L54 52L50 60Z', '#ffb020') + p('M44 66l6 4l6-4') + p('M44 75l6 4l6-4') +
      e(42, 89, 6, 3, '#ffb020') + e(58, 89, 6, 3, '#ffb020')),
    pig: svg(sh(32) + r(36, 76, 9, 12, '#ffb3c6', 3) + r(66, 76, 9, 12, '#ffb3c6', 3) + p('M83 58q7-4 3-9q-4-3-6 2') + e(56, 62, 30, 21, '#ffb3c6') +
      p('M27 40L30 25L42 36Z', '#ff9fb6') + p('M53 40L50 25L39 36Z', '#ff9fb6') + c(40, 52, 18, '#ffb3c6') + e(36, 59, 8, 6, '#ff8fab') +
      dot(33.5, 59, 1.6) + dot(38.5, 59, 1.6) + eye(34, 47) + eye(47, 47) + blush(29, 53) + blush(51, 53)),
    lion: svg(sh(32) + tube('M84 68Q96 62 92 48', '#ffc163', 4) + c(92, 46, 5, '#c96f22') + r(56, 76, 8, 12, '#ffc163', 3) + r(76, 74, 8, 14, '#ffc163', 3) +
      e(68, 68, 22, 14, '#ffc163') + loop(12, (i) => { const a = (i / 12) * Math.PI * 2; return c((40 + Math.cos(a) * 19).toFixed(1), (48 + Math.sin(a) * 19).toFixed(1), 9, '#d9822b'); }) +
      loop(12, (i) => { const a = (i / 12) * Math.PI * 2; return c((40 + Math.cos(a) * 19).toFixed(1), (48 + Math.sin(a) * 19).toFixed(1), 7.8, '#d9822b', 1); }) +
      c(40, 48, 18, '#d9822b', 1) + c(40, 48, 16, '#ffc163') + c(28, 36, 4.5, '#ffc163') + c(52, 36, 4.5, '#ffc163') + eye(34, 45) + eye(46, 45) +
      p('M37 52L43 52L40 55Z', '#8a5230') + p('M35 58Q37.5 61 40 57.5Q42.5 61 45 58')),
    cheetah: svg(sh(34) + l(92, 46, 99, 46) + l(93, 52, 100, 52) + tube('M84 60Q97 66 92 79', '#ffcf5c', 4) + tube('M38 66L32 86', '#ffcf5c', 5) +
      tube('M48 68L52 88', '#ffcf5c', 5) + tube('M70 68L64 88', '#ffcf5c', 5) + tube('M78 66L84 86', '#ffcf5c', 5) + e(58, 60, 28, 12, '#ffcf5c') +
      dot(46, 56, 2) + dot(54, 62, 2) + dot(62, 55, 2) + dot(70, 62, 2) + dot(76, 55, 2) + dot(50, 52, 1.5) + dot(66, 66, 1.5) +
      c(21, 39, 4, '#ffcf5c') + c(33, 39, 4, '#ffcf5c') + c(27, 50, 12, '#ffcf5c') + eye(23, 48, .8) + eye(31, 48, .8) + p('M21 51Q19 56 22 60') + p('M33 51Q35 56 32 60') + dot(27, 55, 1.6)),
    cow: svg(sh(34) + l(80, 50, 88, 68) + r(30, 68, 9, 18, '#fff', 3) + r(68, 68, 9, 18, '#fff', 3) + r(26, 44, 56, 28, '#fff', 12) + e(44, 54, 8, 6, K) +
      e(68, 62, 7, 5, K) + p('M14 34Q8 26 14 22') + p('M30 34Q36 26 30 22') + e(22, 46, 12, 14, '#fff') + e(22, 57, 11, 7, '#ffb3c6') + eye(17, 44) + eye(27, 44) +
      dot(18, 57, 1.4) + dot(26, 57, 1.4)),
    horse: svg(sh(32) + tube('M80 52Q94 60 86 78', '#5a3520', 5) + r(32, 60, 7, 26, WOOD, 3) + r(42, 62, 7, 24, WOOD, 3) + r(64, 62, 7, 24, WOOD, 3) +
      r(73, 60, 7, 26, WOOD, 3) + e(56, 56, 27, 14, WOOD) + p('M32 54L24 28L38 22L44 46Z', WOOD) + e(22, 30, 13, 8, WOOD, -30) + p('M26 22L28 14L32 22Z', WOOD) +
      tube('M36 22Q46 32 42 48', '#5a3520', 5) + eye(24, 26, .8) + dot(12, 36, 1.3)),
    crocodile: svg(sh(42, 80) + e(40, 74, 7, 4, '#57a85a') + e(72, 74, 7, 4, '#57a85a') + p('M48 52l4-7l4 7l4-7l4 7l4-7l4 7', '#3f8a45') +
      p('M6 62Q8 50 30 50L78 54Q94 56 97 66Q80 72 30 72Q8 72 6 62Z', '#57a85a') + p('M10 64l3 3l3-3l3 3l3-3l3 3l3-3', '#fff') + l(8, 63, 32, 63) +
      c(24, 48, 5, '#57a85a') + c(35, 48, 5, '#57a85a') + dot(24, 47, 2) + dot(35, 47, 2)),
    giraffe: svg(sh(26) + r(42, 72, 5, 20, '#ffcf5c', 2) + r(50, 74, 5, 18, '#ffcf5c', 2) + r(60, 74, 5, 18, '#ffcf5c', 2) + r(68, 72, 5, 20, '#ffcf5c', 2) +
      p('M38 66Q36 74 42 70') + e(56, 66, 20, 11, '#ffcf5c') + p('M58 60L64 20L74 20L70 62Z', '#ffcf5c') + e(52, 64, 4, 3, '#c27a3a') + e(64, 69, 4, 3, '#c27a3a') +
      e(68, 40, 2.5, 3.5, '#c27a3a') + e(66, 52, 2.5, 3.5, '#c27a3a') + e(69, 29, 2, 3, '#c27a3a') + l(70, 12, 69, 5) + l(78, 12, 79, 5) + c(69, 4, 2.4, WOOD) +
      c(79, 4, 2.4, WOOD) + e(76, 16, 12, 7, '#ffcf5c') + eye(76, 14, .8) + dot(85, 17, 1.2)),
    elephant: svg(sh(36) + p('M84 56Q92 62 88 70') + r(34, 70, 11, 18, '#9aa7bb', 3) + r(68, 70, 11, 18, '#9aa7bb', 3) + e(57, 58, 30, 22, '#9aa7bb') +
      tube('M18 54Q8 72 18 82', '#9aa7bb', 8) + c(30, 46, 18, '#9aa7bb') + p('M22 60Q24 68 31 66', '#fff') + e(46, 47, 12, 16, '#b8c3d4') + eye(27, 42) + blush(32, 52)),
    whale: svg(c(30, 14, 2.5, '#9fd3ff') + c(50, 12, 2.5, '#9fd3ff') + c(40, 8, 2, '#9fd3ff') + p('M40 32Q36 22 30 18M40 32Q42 20 48 16') +
      p('M8 60Q12 34 48 34Q80 34 84 52L96 40L94 62L86 60Q76 78 46 78Q10 78 8 60Z', '#4a8fe0') + p('M12 64Q30 76 60 74Q74 72 80 64Q50 70 12 64Z', '#cfe6ff') +
      eye(26, 54) + p('M12 62Q20 66 28 64') + blush(32, 60)),

    /* food */
    grape: svg(sh(22) + p('M50 30Q52 20 58 16') + e(62, 20, 8, 4, '#6cc551', -25) + c(50, 56, 26, '#9b6bff') + shine(40, 46, 6, 4) + eye(42, 56) + eye(58, 56) + smile(50, 63, 4) + blush(36, 63) + blush(64, 63)),
    strawberry: svg(sh(20) + p('M50 88Q20 70 22 44Q30 32 50 36Q70 32 78 44Q80 70 50 88Z', '#ef4b4b') + p('M32 38L40 24L50 32L60 24L68 38Q50 44 32 38Z', '#6cc551') +
      loop(9, (i) => dot(32 + (i % 3) * 16 + (i > 5 ? 0 : (i % 2) * 2), 50 + Math.floor(i / 3) * 10, 1.6, '#ffe08a')) + p('M50 32L50 20')),
    egg: svg(sh(22) + e(50, 56, 24, 31, '#fff6e0') + shine(41, 42, 5, 8, 15)),
    banana: svg(sh(30, 88) + p('M18 28Q20 76 70 80Q86 80 84 72Q46 68 32 28Z', '#ffd23f') + p('M18 28L20 20L28 24Z', '#6b4226') + p('M28 40Q36 64 66 74') + dot(84, 74, 2)),
    apple: svg(sh(28, 90) + p('M50 34Q30 22 22 42Q16 66 34 82Q42 88 50 82Q58 88 66 82Q84 66 78 42Q70 22 50 34Z', '#ef4b4b') + p('M50 34Q50 24 54 16') +
      e(62, 22, 9, 4.5, '#6cc551', -25) + shine(34, 46, 5, 9, 20)),
    carrot: svg(p('M42 30Q34 14 42 8Q48 18 50 30Q52 16 60 8Q68 16 58 30Z', '#6cc551') + p('M30 30L70 30Q66 52 50 92Q34 52 30 30Z', '#ff9f43') +
      l(38, 42, 46, 42) + l(54, 52, 61, 52) + l(42, 64, 49, 64) + l(52, 76, 56, 76)),
    icecream: svg(p('M33 50L67 50L50 92Z', '#e8b06a') + l(40, 58, 58, 76) + l(44, 52, 62, 66) + l(60, 58, 42, 76) + l(56, 52, 38, 66) +
      c(50, 44, 17, '#ffb3c6') + p('M34 50Q38 58 42 52Q46 60 50 52Q54 58 58 52Q62 58 66 50', '#ffb3c6') + c(50, 27, 13, '#9be3c5') + c(50, 12, 4.5, '#ef4b4b') + p('M50 8Q52 3 56 2')),
    cupcake: svg(sh(24) + p('M28 54L72 54L66 88L34 88Z', '#4aa3ff') + l(40, 56, 42, 88) + l(50, 56, 50, 88) + l(60, 56, 58, 88) +
      p('M24 56Q18 44 32 42Q32 28 50 28Q68 28 68 42Q82 44 76 56Z', '#ffb3c6') + c(50, 22, 5, '#ef4b4b') +
      `<g stroke-width="3">${['#ffd23f', '#4aa3ff', '#6cc551', '#9b6bff', '#fff'].map((col, i) => `<path d="M${32 + i * 9} ${44 + (i % 2) * 4}l3 -2" stroke="${col}" fill="none"/>`).join('')}</g>`),
    pizza: svg(sh(26) + '<path d="M38 12q-4-5 0-10M50 12q-4-5 0-10M62 12q-4-5 0-10" fill="none" stroke="#9aa3b5"/>' + p('M20 24L80 24L50 90Z', '#ffd27a') +
      p('M17 22Q50 10 83 22L80 30Q50 20 20 30Z', '#d9963f') + c(40, 38, 6, '#e05252') + c(60, 40, 6, '#e05252') + c(50, 60, 5, '#e05252') + dot(48, 46, 1.5, '#3f9b45') + dot(56, 54, 1.5, '#3f9b45')),
    watermelon: svg(sh(34) + e(50, 58, 38, 27, '#3f9b45') + '<g stroke="#2c7a33" stroke-width="4">' + p('M28 35Q20 58 28 82') + p('M44 32Q38 58 44 84') + p('M60 32Q66 58 60 84') + p('M76 37Q84 58 76 80') + '</g>' +
      e(50, 58, 38, 27, 'none') + shine(30, 44, 6, 3, -20)),
    cheese: svg(sh(36, 88) + p('M14 62L86 52L86 80L14 86Z', '#ffc61a') + p('M14 62L58 32L86 52Z', '#ffe066') + e(36, 72, 5, 4, '#e6a800') + e(64, 68, 4, 3, '#e6a800') +
      e(54, 46, 4, 2.5, '#e6a800') + e(76, 75, 3, 2.5, '#e6a800')),
    soup: svg(sh(32) + '<path d="M38 38q-4-6 0-12q4-6 0-12M50 36q-4-6 0-12q4-6 0-12M62 38q-4-6 0-12q4-6 0-12" fill="none" stroke="#9aa3b5"/>' +
      p('M14 50L86 50Q84 86 50 88Q16 86 14 50Z', '#4aa3ff') + e(50, 50, 36, 8, '#ff9f43') + c(38, 50, 3, '#6cc551') + c(58, 49, 3, '#ffd23f') + c(66, 52, 2.5, '#6cc551') + p('M30 66Q50 74 70 66', 'none')),

    /* transport */
    skateboard: svg(sh(40, 78) + r(22, 58, 10, 5, '#9aa3b5', 2) + r(68, 58, 10, 5, '#9aa3b5', 2) + p('M6 48Q8 56 16 56L84 56Q92 56 94 48L88 50L12 50Z', '#9b6bff') +
      p('M30 52L44 52M56 52L70 52', 'none') + c(27, 68, 7, '#ffd23f') + c(73, 68, 7, '#ffd23f') + dot(27, 68, 2) + dot(73, 68, 2)),
    bicycle: svg(sh(42, 84) + c(26, 64, 16, '#fff') + c(74, 64, 16, '#fff') + dot(26, 64, 2.5) + dot(74, 64, 2.5) +
      '<path d="M26 64L42 40L66 40L74 64M42 40L50 64L26 64M50 64L66 40" fill="none" stroke="#ef4b4b" stroke-width="4.5"/>' + p('M36 33L48 33', 'none') +
      '<path d="M36 33L48 33" stroke-width="5"/>' + p('M64 40L62 30L70 28')),
    motorbike: svg(sh(40, 86) + r(14, 58, 18, 5, '#9aa3b5', 2) + c(24, 70, 14, TYRE) + c(24, 70, 6, HUB) + c(78, 70, 14, TYRE) + c(78, 70, 6, HUB) +
      p('M28 50L52 44L70 48L80 62L30 62Z', '#ef4b4b') + r(32, 40, 22, 7, K, 3) + p('M70 48L64 32L74 30') + c(80, 48, 4.5, '#ffd23f') + p('M40 52L60 52', 'none')),
    car: svg(sh(42, 80) + p('M6 66Q6 54 16 52L28 52L40 38L66 38L78 52L88 54Q95 56 95 66Z', '#ef4b4b') + p('M33 52L43 42L52 42L52 52Z', GLASS) +
      p('M56 42L65 42L73 52L56 52Z', GLASS) + c(28, 68, 9, TYRE) + c(28, 68, 3.5, HUB) + c(74, 68, 9, TYRE) + c(74, 68, 3.5, HUB) + c(90, 59, 2.5, '#ffd23f') + l(46, 58, 52, 58)),
    bus: svg(sh(42, 86) + r(8, 28, 84, 48, '#ffd23f', 8) + r(14, 36, 14, 14, GLASS, 2) + r(32, 36, 14, 14, GLASS, 2) + r(50, 36, 14, 14, GLASS, 2) +
      r(70, 36, 16, 30, GLASS, 2) + r(8, 56, 62, 4, K) + c(26, 78, 8, TYRE) + c(26, 78, 3, HUB) + c(74, 78, 8, TYRE) + c(74, 78, 3, HUB) + c(14, 66, 2.5, '#fff')),
    tractor: svg(sh(42, 88) + r(74, 26, 4, 18, '#9aa3b5', 1) + r(58, 46, 30, 20, '#6cc551', 3) + r(30, 40, 34, 26, '#6cc551', 3) + r(36, 20, 22, 22, GLASS, 2) +
      r(33, 16, 28, 6, '#3f9b45', 2) + c(38, 68, 19, TYRE) + c(38, 68, 8, '#ffd23f') + c(80, 75, 11, TYRE) + c(80, 75, 4.5, '#ffd23f')),
    train: svg(l(2, 80, 98, 80) + p('M4 72L4 44Q4 34 14 34L76 34Q96 38 96 72Z', '#fff') + r(4, 56, 92, 6, '#ef4b4b') + r(12, 40, 12, 10, GLASS, 2) +
      r(30, 40, 12, 10, GLASS, 2) + r(48, 40, 12, 10, GLASS, 2) + p('M74 38Q90 42 93 54L74 54Z', GLASS) + c(18, 74, 5, TYRE) + c(36, 74, 5, TYRE) + c(64, 74, 5, TYRE) + c(82, 74, 5, TYRE)),
    sailboat: svg('<path d="M4 86q8-6 16 0t16 0t16 0t16 0t16 0t16 0" fill="none" stroke="#4aa3ff" stroke-width="3"/>' + l(50, 12, 50, 66) +
      p('M53 15L53 60L84 60Z', '#fff') + p('M47 22L47 60L22 60Z', '#ffd23f') + p('M50 12L59 15L50 18Z', '#ef4b4b') + p('M12 66L88 66L76 82L24 82Z', WOOD) + l(26, 72, 74, 72)),
    plane: svg(p('M48 46L58 46L50 26L43 26Z', '#2f7fd6') + p('M8 54Q8 46 18 46L80 46Q95 48 95 54Q95 61 80 62L18 62Q8 62 8 54Z', '#fff') +
      p('M14 46L8 26L22 26L30 46Z', '#4aa3ff') + p('M42 55L64 55L50 82L36 82Z', '#4aa3ff') + loop(6, (i) => c(34 + i * 8, 51, 2.2, GLASS)) + p('M84 48Q92 50 93 54L84 54Z', '#2f5aa8')),
    helicopter: svg(sh(26, 86) + tube('M28 80L70 80', '#9aa3b5', 2) + l(34, 70, 34, 80) + l(58, 70, 58, 80) + r(62, 50, 28, 7, '#ff9f43', 3) +
      c(91, 48, 7, 'none') + l(91, 41, 91, 55) + e(44, 56, 24, 17, '#ff9f43') + p('M22 52Q24 42 36 42L42 42L42 58L22 58Z', GLASS) + l(46, 28, 46, 39) +
      '<path d="M10 28L84 28" stroke-width="5"/>' + dot(46, 28, 3)),
    rocket: svg(p('M38 66Q50 102 62 66Z', '#ffb020') + p('M43 66Q50 90 57 66Z', '#ff5c3c') + p('M34 50L20 72L35 66Z', '#ef4b4b') + p('M66 50L80 72L65 66Z', '#ef4b4b') +
      p('M50 6Q70 24 66 66L34 66Q30 24 50 6Z', '#fff') + p('M50 6Q62 15 64 28L36 28Q38 15 50 6Z', '#ef4b4b') + c(50, 42, 8, '#4aa3ff') + shine(47, 39, 2.5, 1.5) + l(50, 56, 50, 66)),

    /* buildings & places */
    igloo: svg(e(50, 80, 46, 6, '#fff') + p('M12 78A38 38 0 0 1 88 78Z', '#eaf6ff') + p('M16 64L84 64M24 50L76 50M36 38L64 38M40 64L36 78M60 64L64 78M34 50L32 64M66 50L68 64M50 38L50 50') +
      p('M40 78L40 66A10 10 0 0 1 60 66L60 78Z', '#5a6b85')),
    tent: svg(l(4, 82, 96, 82) + l(50, 20, 50, 8) + p('M50 8L60 11L50 14Z', '#ef4b4b') + p('M8 82L50 20L92 82Z', '#ff9f43') + p('M50 20L38 82L62 82Z', '#c96f22') + l(50, 40, 50, 82)),
    house: svg(sh(38, 88) + r(62, 20, 9, 18, WOOD) + r(22, 46, 56, 40, '#fff4dc') + p('M14 48L50 18L86 48Z', '#ef4b4b') + r(44, 62, 12, 24, WOOD, 2) + dot(53, 75, 1.4) +
      r(28, 54, 11, 10, GLASS, 1) + r(61, 54, 11, 10, GLASS, 1) + c(50, 36, 4, GLASS)),
    barn: svg(sh(40, 88) + r(18, 42, 64, 46, '#d94a3a') + p('M12 44L30 18L70 18L88 44Z', '#8a2e24') + r(36, 58, 28, 30, '#fff') + p('M36 58L64 88M64 58L36 88') +
      r(42, 28, 16, 11, '#fff') + l(50, 28, 50, 39)),
    lighthouse: svg(pn('M58 22L96 10L96 34Z', '#fff3a0') + e(50, 88, 26, 6, '#9aa3b5') + p('M37 88L44 30L56 30L63 88Z', '#fff') + p('M39 72L61 72L62 80L38 80Z', '#ef4b4b') +
      p('M41 48L59 48L60 58L40 58Z', '#ef4b4b') + r(41, 18, 18, 12, '#ffd23f') + p('M39 18L50 7L61 18Z', '#ef4b4b') + r(46, 78, 8, 10, WOOD)),
    castle: svg(sh(42, 90) + r(20, 44, 60, 44, '#c7cedb') + r(20, 38, 8, 7, '#c7cedb') + r(36, 38, 8, 7, '#c7cedb') + r(56, 38, 8, 7, '#c7cedb') + r(72, 38, 8, 7, '#c7cedb') +
      r(8, 30, 20, 58, '#b0b9c9') + r(72, 30, 20, 58, '#b0b9c9') + p('M6 30L18 10L30 30Z', '#9b6bff') + p('M70 30L82 10L94 30Z', '#9b6bff') +
      p('M41 88L41 68A9 9 0 0 1 59 68L59 88Z', '#6b4226') + r(14, 44, 7, 10, '#5a6b85', 3) + r(79, 44, 7, 10, '#5a6b85', 3) + l(18, 10, 18, 3) + p('M18 3L26 5L18 8Z', '#ef4b4b')),
    bridge: svg(pn('M0 70L100 70L100 92L0 92Z', '#9fd3ff') + '<path d="M2 66q8-4 16 0t16 0t16 0t16 0t16 0t16 0" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<g stroke="#ef4b4b" stroke-width="3">' + p('M2 50Q16 26 29 20Q50 50 71 20Q84 26 98 50') + '</g>' + loop(9, (i) => l(10 + i * 10, 52, 10 + i * 10, 52 - [6, 14, 24, 28, 22, 28, 24, 14, 6][i] * 0.9)) +
      r(25, 16, 8, 62, '#ef4b4b', 1) + r(67, 16, 8, 62, '#ef4b4b', 1) + r(0, 50, 100, 7, '#ef4b4b')),
    pyramid: svg(l(2, 86, 98, 86) + c(82, 18, 8, '#ffd23f') + p('M6 86L50 20L94 86Z', '#ffcf5c') + p('M50 20L94 86L64 86Z', '#e6ad3a') + l(20, 65, 76, 65) + l(33, 46, 63, 46) + l(32, 65, 36, 86) + l(54, 46, 56, 65)),
    skyscraper: svg(l(50, 9, 50, 1) + r(12, 42, 22, 48, '#a9c4e0') + r(66, 30, 22, 60, '#9bb5d4') + r(34, 9, 32, 81, '#7fb2e6') +
      loop(24, (i) => r(38 + (i % 3) * 9, 14 + Math.floor(i / 3) * 9, 6, 5, '#e8f4ff', 1)) + loop(8, (i) => r(16 + (i % 2) * 8, 48 + Math.floor(i / 2) * 10, 5, 5, '#e8f4ff', 1)) +
      loop(10, (i) => r(70 + (i % 2) * 8, 36 + Math.floor(i / 2) * 10, 5, 5, '#e8f4ff', 1))),
    windmill: svg(sh(26, 90) + p('M34 88L41 42L59 42L66 88Z', '#fff4dc') + r(45, 72, 10, 16, WOOD, 4) + c(50, 56, 4, GLASS) +
      loop(4, (i) => g(`rotate(${20 + i * 90} 50 40)`, r(46, 4, 8, 34, '#fff') + l(46, 14, 54, 14) + l(46, 24, 54, 24))) + p('M38 44L50 30L62 44Z', WOOD) + c(50, 40, 4.5, '#6b4226')),

    /* home */
    key: svg(r(68, 52, 7, 13, '#ffd23f', 1) + r(80, 52, 7, 10, '#ffd23f', 1) + r(40, 45, 50, 9, '#ffd23f', 3) + c(28, 50, 16, '#ffd23f') + c(28, 50, 6, '#fff')),
    pencil: svg(g('rotate(-30 50 50)', r(20, 42, 56, 16, '#ffd23f') + l(20, 50, 76, 50) + p('M76 42L93 50L76 58Z', '#f5d3a6') + p('M87 47L93 50L87 53Z', K) + r(6, 42, 13, 16, '#ff8fab', 3) + r(16, 42, 6, 16, '#9aa3b5'))),
    spoon: svg(g('rotate(-35 50 50)', r(42, 46.5, 50, 7, '#d5dae3', 3.5) + e(28, 50, 16, 11, '#d5dae3') + shine(24, 47, 6, 3, 0))),
    candle: svg(pn('M50 28m-16 0a16 16 0 1 0 32 0a16 16 0 1 0 -32 0', '#fff3a0') + e(50, 86, 26, 6, '#ffd23f') + r(36, 44, 28, 42, '#fff4dc', 3) +
      p('M40 44Q40 52 44 52Q46 46 50 46', '#fff4dc') + l(50, 44, 50, 36) + p('M50 13Q61 27 50 38Q39 27 50 13Z', '#ffb020') + p('M50 23Q55 31 50 36Q45 31 50 23Z', '#fff3a0')),
    book: svg(sh(42, 90) + p('M5 32L5 82Q28 76 50 84Q72 76 95 82L95 32Z', '#4aa3ff') + p('M50 30Q30 22 10 28L10 76Q30 70 50 78Z', '#fff') + p('M50 30Q70 22 90 28L90 76Q70 70 50 78Z', '#fff') +
      l(50, 30, 50, 78) + p('M18 40Q30 37 42 41M18 50Q30 47 42 51M18 60Q30 57 42 61M58 41Q70 37 82 40M58 51Q70 47 82 50M58 61Q70 57 82 60')),
    phone: svg('<path d="M74 28q6 6 0 12M80 22q10 12 0 24M26 28q-6 6 0 12M20 22q-10 12 0 24" fill="none" stroke="#ef4b4b"/>' + r(32, 10, 36, 80, K, 7) + r(36, 18, 28, 62, '#7fd1ff', 2) +
      c(50, 85, 2.5, '#666') + r(40, 24, 8, 8, '#ffd23f', 2) + r(52, 24, 8, 8, '#ff6b8a', 2) + r(40, 36, 8, 8, '#6cc551', 2) + r(52, 36, 8, 8, '#9b6bff', 2)),
    clock: svg(sh(26) + l(32, 78, 24, 90) + l(68, 78, 76, 90) + c(28, 24, 10, '#ef4b4b') + c(72, 24, 10, '#ef4b4b') + l(50, 18, 50, 24) + c(50, 54, 30, '#ef4b4b') + c(50, 54, 23, '#fff') +
      l(50, 54, 50, 38) + l(50, 54, 62, 59) + dot(50, 54, 2.5) + dot(50, 34, 1.4) + dot(70, 54, 1.4) + dot(50, 74, 1.4) + dot(30, 54, 1.4)),
    lightbulb: svg(pn('M50 36m-30 0a30 30 0 1 0 60 0a30 30 0 1 0 -60 0', '#fff7c2') + l(12, 34, 6, 32) + l(88, 34, 94, 32) + l(22, 12, 17, 7) + l(78, 12, 83, 7) + l(50, 4, 50, 0) +
      p('M50 10A24 24 0 0 1 66 52Q60 60 60 68L40 68Q40 60 34 52A24 24 0 0 1 50 10Z', '#fff3a0') + p('M44 56L46 40L50 46L54 40L56 56') +
      r(40, 68, 20, 16, '#9aa3b5', 2) + l(40, 73, 60, 73) + l(40, 78, 60, 78) + p('M45 84L55 84L52 90L48 90Z', K)),
    umbrella: svg(p('M10 52Q12 16 50 14Q88 16 90 52Q80 44 70 52Q60 44 50 52Q40 44 30 52Q20 44 10 52Z', '#9b6bff') + p('M50 14Q40 30 30 52M50 14Q60 30 70 52') +
      l(50, 14, 50, 8) + '<path d="M50 52L50 84Q50 92 42 89" fill="none" stroke-width="4"/>'),
    kettle: svg('<path d="M10 30q-4-6 0-12q4-6 0-12" fill="none" stroke="#9aa3b5"/>' + tube('M70 44Q92 44 84 72', '#2f7fd6', 4) + p('M27 58L9 38L14 33L30 48Z', '#4aa3ff') +
      p('M22 84L27 44Q30 34 50 34Q70 34 73 44L78 84Z', '#4aa3ff') + e(50, 34, 16, 4, '#2f7fd6') + c(50, 28, 4.5, K) + r(20, 82, 60, 6, K, 2) + shine(36, 52, 4, 9, 10)),
    chair: svg(sh(32, 92) + r(19, 60, 6, 30, WOOD, 2) + r(75, 60, 6, 30, WOOD, 2) + r(30, 60, 5, 24, DBROWN, 2) + r(65, 60, 5, 24, DBROWN, 2) + r(27, 12, 46, 38, BROWN, 5) +
      l(38, 18, 38, 46) + l(50, 18, 50, 46) + l(62, 18, 62, 46) + p('M20 50L80 50L86 62L14 62Z', WOOD) + e(50, 52, 26, 3, '#ef4b4b')),
    tv: svg(sh(26, 90) + p('M40 74L60 74L67 88L33 88Z', '#9aa3b5') + r(10, 20, 80, 56, K, 7) + r(16, 26, 68, 44, '#7fd1ff', 3) + c(70, 38, 6, '#ffd23f') +
      p('M17 62Q36 44 56 56T83 50L83 69L17 69Z', '#6cc551') + l(36, 20, 28, 8) + l(64, 20, 72, 8)),
    bed: svg(sh(44, 88) + r(8, 28, 12, 56, WOOD, 3) + r(18, 50, 76, 18, '#fff', 4) + p('M42 46Q66 42 92 48L92 68L42 68Z', '#4aa3ff') + e(31, 46, 12, 7, '#fff') +
      r(88, 42, 8, 42, WOOD, 3) + r(18, 68, 6, 14, WOOD) + r(82, 68, 6, 14, WOOD) + p('M50 56L86 56', 'none')),
    fridge: svg(sh(26, 94) + r(28, 6, 44, 86, '#e9eef5', 6) + l(28, 36, 72, 36) + r(33, 15, 4, 14, '#9aa3b5', 2) + r(33, 44, 4, 22, '#9aa3b5', 2) +
      c(60, 22, 3.5, '#ef4b4b') + r(54, 50, 10, 8, '#ffd23f', 1) + c(62, 70, 3, '#6cc551') + '<path d="M78 18l6 0M81 15l0 6M86 30l4 0M88 28l0 4" stroke="#7fd1ff" fill="none"/>'),

    /* nature */
    leaf: svg(p('M14 84Q12 26 82 16Q88 78 14 84Z', '#6cc551') + p('M14 84Q46 56 80 18') + p('M34 64L30 44M46 52L44 32M58 42L58 26M38 62L56 64M50 50L68 52M62 38L76 40')),
    flower: svg(tube('M50 50L50 92', '#3f9b45', 4) + e(39, 76, 11, 5, '#6cc551', -30) + e(61, 70, 11, 5, '#6cc551', 30) +
      loop(6, (i) => { const a = (i / 6) * Math.PI * 2; return c((50 + Math.cos(a) * 14).toFixed(1), (36 + Math.sin(a) * 14).toFixed(1), 10, '#ff8fb6'); }) +
      c(50, 36, 9, '#ffd23f') + dot(47, 34, 1.4) + dot(53, 34, 1.4) + smile(50, 38, 2.5)),
    rock: svg(sh(38, 88) + p('M12 80Q8 60 24 48Q34 30 56 34Q80 36 86 58Q92 80 76 85L22 87Q12 87 12 80Z', '#9aa3b5') + p('M60 44Q70 50 72 62') + p('M30 70L38 64L44 70') +
      e(36, 52, 5, 3, '#c7cedb')),
    cactus: svg(r(30, 80, 40, 14, '#d9822b', 3) + r(16, 34, 11, 30, '#57a85a', 5.5) + r(16, 54, 26, 10, '#57a85a', 5) + r(73, 26, 11, 28, '#57a85a', 5.5) +
      r(58, 44, 26, 10, '#57a85a', 5) + r(39, 14, 22, 68, '#57a85a', 11) + l(45, 28, 45, 70) + l(55, 28, 55, 70) + c(50, 14, 5, '#ff8fab') + eye(45, 40, .8) + eye(55, 40, .8) + smile(50, 46, 3)),
    tree: svg(sh(26, 92) + r(42, 54, 16, 36, WOOD, 3) + c(30, 46, 16, '#5bbf55') + c(70, 46, 16, '#5bbf55') + c(50, 30, 22, '#5bbf55') +
      c(30, 46, 14.8, '#5bbf55', 1) + c(70, 46, 14.8, '#5bbf55', 1) + c(50, 30, 20.8, '#5bbf55', 1) + pn('M30 50L70 50L70 60L30 60Z', '#5bbf55') +
      c(36, 36, 3, '#ef4b4b') + c(62, 28, 3, '#ef4b4b') + c(58, 50, 3, '#ef4b4b') + p('M50 72L60 64')),
    cloud: svg(p('M22 70Q8 70 10 56Q12 44 26 46Q28 28 46 30Q56 18 70 28Q86 28 86 46Q96 50 92 62Q90 72 78 70Z', '#fff') + eye(40, 52) + eye(60, 52) + smile(50, 58, 4) + blush(33, 58) + blush(67, 58)),
    snowman: svg(sh(26, 93) + c(50, 72, 21, '#fff') + l(32, 62, 14, 50) + l(68, 62, 86, 50) + c(50, 37, 15, '#fff') + r(36, 26, 28, 5, K, 2) + r(40, 10, 20, 18, K, 2) +
      r(40, 20, 20, 4, '#ef4b4b') + dot(45, 35, 1.8) + dot(55, 35, 1.8) + p('M50 39L64 42L50 44Z', '#ff9f43') + r(36, 49, 28, 6, '#ef4b4b', 3) + r(56, 52, 6, 12, '#ef4b4b', 2) +
      dot(50, 64, 2) + dot(50, 74, 2) + dot(50, 84, 2)),
    mountain: svg(p('M2 88L40 22L60 54L70 38L98 88Z', '#7d8ca8') + p('M40 22L49.3 36L45 33L41 38L36 33L32.1 36Z', '#fff') + p('M70 38L74.3 46L71 44L67 47L64.3 46Z', '#fff') +
      p('M40 22L52 88', 'none') + pn('M41 25L60 54L58 88L52 88Z', '#000" opacity=".08')),
    volcano: svg(c(30, 14, 6, '#c7cedb') + c(40, 8, 7, '#c7cedb') + c(56, 10, 6, '#c7cedb') + p('M42 32Q34 14 44 8Q50 18 52 8Q62 14 58 32Z', '#ffb020') +
      p('M8 88L36 34L64 34L92 88Z', '#8a5a3a') + e(50, 34, 14, 4, '#ff5c3c') + p('M38 35Q42 48 37 58Q45 56 46 40L54 40Q55 60 62 54Q58 44 62 35Z', '#ff5c3c')),
    moon: svg(dot(12, 18, 1.5, '#ffd23f') + dot(88, 14, 2, '#ffd23f') + dot(90, 84, 1.5, '#ffd23f') + c(50, 50, 36, '#ece6cf') + c(36, 38, 7, '#d6cfb2') +
      c(64, 62, 9, '#d6cfb2') + c(60, 30, 4, '#d6cfb2') + c(32, 66, 4.5, '#d6cfb2') + p('M42 52Q46 55 50 52') + p('M54 46Q57 48 60 46') + p('M36 46Q39 48 42 46')),
    sun: svg(loop(12, (i) => { const a = (i / 12) * Math.PI * 2; const x1 = 50 + Math.cos(a) * 30, y1 = 50 + Math.sin(a) * 30, x2 = 50 + Math.cos(a) * 44, y2 = 50 + Math.sin(a) * 44;
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#ff9f43" stroke-width="5" fill="none"/>`; }) +
      c(50, 50, 26, '#ffd23f') + eye(41, 46) + eye(59, 46) + smile(50, 56, 6) + blush(35, 56) + blush(65, 56)),

    /* toys */
    balloon: svg(p('M50 72Q42 80 52 86Q60 92 50 99') + p('M46 70L54 70L50 74Z', '#ef4b4b') + e(50, 40, 25, 30, '#ef4b4b') + shine(40, 28, 5, 9, 20)),
    football: svg(sh(28, 90) + c(50, 52, 30, '#fff') + p('M50 40L61 48L57 61L43 61L39 48Z', K) + l(50, 40, 50, 23) + l(61, 48, 77, 43) + l(57, 61, 66, 76) + l(43, 61, 34, 76) + l(39, 48, 23, 43) +
      pn('M44 23L56 23L50 26Z', K) + pn('M78 50L74 38L80 42Z', K) + pn('M22 50L26 38L20 42Z', K)),
    teddy: svg(sh(28, 94) + c(32, 24, 9, BROWN) + c(68, 24, 9, BROWN) + c(32, 24, 4.5, '#f0d2b0', 1) + c(68, 24, 4.5, '#f0d2b0', 1) + e(28, 64, 6, 11, BROWN, 25) + e(72, 64, 6, 11, BROWN, -25) +
      c(38, 86, 7, BROWN) + c(62, 86, 7, BROWN) + e(50, 70, 18, 18, BROWN) + e(50, 72, 10, 10, '#f0d2b0') + c(50, 38, 18, BROWN) + e(50, 45, 8, 6, '#f0d2b0') +
      e(50, 42, 3, 2, K) + dot(43, 35, 2) + dot(57, 35, 2) + smile(50, 47, 2.5) + p('M42 55L50 59L42 63Z', '#ef4b4b') + p('M58 55L50 59L58 63Z', '#ef4b4b')),
    kite: svg(p('M50 78Q40 86 50 92Q60 98 54 100') + p('M45 85L50 88L45 91Z', '#4aa3ff') + p('M55 92L52 96L57 97Z', '#ffd23f') + p('M50 6L77 40L50 78L23 40Z', '#ff5c8a') +
      p('M50 6L77 40L50 40Z', '#ffd23f') + p('M50 40L50 78L23 40Z', '#ffd23f') + l(50, 6, 50, 78) + l(23, 40, 77, 40)),
    drum: svg(sh(32, 90) + l(40, 30, 14, 8) + l(60, 30, 86, 8) + c(14, 8, 3.5, '#fff4dc') + c(86, 8, 3.5, '#fff4dc') + p('M20 40L20 76Q50 88 80 76L80 40Z', '#ef4b4b') +
      '<path d="M20 46L30 72L40 48L50 74L60 48L70 72L80 46" fill="none" stroke="#ffd23f" stroke-width="3"/>' + e(50, 40, 30, 8, '#fff4dc')),
    guitar: svg(g('rotate(-35 50 50)', r(46, 0, 8, 44, WOOD, 2) + r(43, -6, 14, 9, '#6b4226', 2) + c(50, 72, 21, '#ff9f43') + c(50, 48, 15, '#ff9f43') +
      c(50, 72, 19.8, '#ff9f43', 1) + c(50, 48, 13.8, '#ff9f43', 1) + c(50, 62, 6, '#6b4226') + r(41, 76, 18, 4, '#6b4226', 1) + l(48, 4, 48, 78) + l(52, 4, 52, 78))),
  };

  /* ---------- action card icons ---------- */
  const W = '#fff';
  const ACTION_ART = {
    reverse: svg(`<g stroke="${W}" stroke-width="7" fill="none">` + p('M24 46A26 26 0 0 1 72 34') + p('M62 22L74 36L58 42') + p('M76 54A26 26 0 0 1 28 66') + p('M38 78L26 64L42 58') + '</g>'),
    swap: svg(`<g stroke="${W}" stroke-width="7" fill="none">` + p('M18 36L78 36') + p('M66 24L80 36L66 48') + p('M82 64L22 64') + p('M34 52L20 64L34 76') + '</g>'),
    shrink: svg(`<g stroke="${W}" stroke-width="6" fill="none">` + r(40, 40, 20, 20, 'none', 3) + p('M12 12L32 32M32 18L32 32L18 32') + p('M88 12L68 32M68 18L68 32L82 32') +
      p('M12 88L32 68M32 82L32 68L18 68') + p('M88 88L68 68M68 82L68 68L82 68') + '</g>'),
    boost: svg(pn('M58 6L22 56L46 56L38 94L80 38L56 38Z', '#fff') + `<g stroke="${W}" stroke-width="4">` + l(14, 22, 20, 28) + l(86, 70, 80, 64) + l(84, 16, 78, 22) + '</g>'),
    shield: svg(`<path d="M50 8L84 20Q84 66 50 92Q16 66 16 20Z" fill="#fff" stroke="none"/><path d="M34 50L46 62L68 38" fill="none" stroke="#2f6fd6" stroke-width="8"/>`),
    mirror: svg(`<g stroke="${W}" stroke-width="5">` + e(50, 42, 26, 34, 'rgba(255,255,255,.25)') + l(50, 76, 50, 94) + l(40, 94, 60, 94) + '</g>' +
      `<path d="M36 30L48 18M36 46L60 22" stroke="#fff" stroke-width="4" fill="none"/>`),
    peek: svg(`<path d="M6 50Q50 10 94 50Q50 90 6 50Z" fill="#fff" stroke="none"/><circle cx="50" cy="50" r="16" fill="#4b3bb8" stroke="none"/><circle cx="50" cy="50" r="7" fill="#1b1440" stroke="none"/><circle cx="55" cy="45" r="3.5" fill="#fff" stroke="none"/>`),
    double: svg(`<text x="50" y="68" font-size="52" font-weight="900" text-anchor="middle" fill="#fff" stroke="none" font-family="Fredoka, Arial Rounded MT Bold, sans-serif">×2</text>`),
    steal: svg(`<path d="M26 14L26 54A24 24 0 0 0 74 54L74 14L60 14L60 54A10 10 0 0 1 40 54L40 14Z" fill="#fff" stroke="none"/><rect x="26" y="10" width="14" height="12" fill="#ffd23f" stroke="none"/><rect x="60" y="10" width="14" height="12" fill="#ffd23f" stroke="none"/>` +
      `<g stroke="#fff" stroke-width="4" fill="none"><path d="M14 80l8-6M86 80l-8-6M50 92l0-8"/></g>`),
  };

  /* ---------- stat icons (challenge card) ---------- */
  const STAT_ICON = {
    size: svg('<g stroke-width="7" fill="none">' + p('M22 78L78 22') + p('M56 22L78 22L78 44') + p('M22 56L22 78L44 78') + '</g>'),
    weight: svg('<path d="M36 40A14 14 0 1 1 64 40" fill="none" stroke-width="7"/>' + p('M22 46L78 46L86 88L14 88Z', '#5a6b85') +
      '<text x="50" y="78" font-size="22" font-weight="900" text-anchor="middle" fill="#fff" stroke="none" font-family="sans-serif">kg</text>'),
    speed: svg(p('M58 6L22 56L46 56L38 94L80 38L56 38Z', '#ffd23f')),
    price: svg(c(50, 50, 38, '#ffd23f') + c(50, 50, 29, 'none') + '<text x="50" y="66" font-size="44" font-weight="900" text-anchor="middle" fill="#2d2a3e" stroke="none" font-family="sans-serif">$</text>'),
    loud: svg(p('M14 38L32 38L54 18L54 82L32 62L14 62Z', '#9b6bff') + '<g stroke-width="6" fill="none">' + p('M66 34Q76 50 66 66') + p('M76 22Q94 50 76 78') + '</g>'),
    temp: svg(r(41, 8, 18, 62, '#fff', 9) + c(50, 74, 16, '#ef4b4b') + r(46, 34, 8, 40, '#ef4b4b', 2) + l(60, 20, 66, 20) + l(60, 32, 66, 32) + l(60, 44, 66, 44)),
  };

  /* ---------- categories & stats ---------- */
  const CATS = {
    animal: { label: 'Animal' }, food: { label: 'Food' }, transport: { label: 'Transport' }, place: { label: 'Building' },
    home: { label: 'Home' }, nature: { label: 'Nature' }, toy: { label: 'Toy' },
  };

  const STATS = {
    size:   { label: 'Size', noun: 'size', base: ['big', 'small'], comp: ['bigger', 'smaller'], sup: ['biggest', 'smallest'], none: null },
    weight: { label: 'Weight', noun: 'weight', base: ['heavy', 'light'], comp: ['heavier', 'lighter'], sup: ['heaviest', 'lightest'], none: null },
    speed:  { label: 'Speed', noun: 'speed', base: ['fast', 'slow'], comp: ['faster', 'slower'], sup: ['fastest', 'slowest'], none: "can't move" },
    price:  { label: 'Price', noun: 'price', base: ['expensive', 'cheap'], comp: ['more expensive', 'cheaper'], sup: ['most expensive', 'cheapest'], none: "can't be bought" },
    loud:   { label: 'Loudness', noun: 'loudness', base: ['loud', 'quiet'], comp: ['louder', 'quieter'], sup: ['loudest', 'quietest'], none: null },
    temp:   { label: 'Temperature', noun: 'temperature', base: ['hot', 'cold'], comp: ['hotter', 'colder'], sup: ['hottest', 'coldest'], none: null },
  };
  const STAT_KEYS = Object.keys(STATS);

  /* id, card word, category, size (m), weight (kg), speed (km/h), price (US$), loudness (dB), temperature (°C), [phrase] */
  const ROWS = [
    ['ant', 'ant', 'animal', 0.005, 0.000003, 0.3, null, 5, 25],
    ['bee', 'bee', 'animal', 0.015, 0.0001, 25, null, 40, 30],
    ['snail', 'snail', 'animal', 0.03, 0.005, 0.05, null, 0, 20],
    ['mouse', 'mouse', 'animal', 0.08, 0.02, 13, 10, 20, 37],
    ['frog', 'frog', 'animal', 0.1, 0.05, 8, null, 60, 20],
    ['goldfish', 'goldfish', 'animal', 0.07, 0.03, 5, 5, 0, 20],
    ['rabbit', 'rabbit', 'animal', 0.4, 2, 56, 50, 20, 39],
    ['cat', 'cat', 'animal', 0.5, 4.5, 48, 100, 45, 38.5],
    ['penguin', 'penguin', 'animal', 1.1, 30, 8, null, 70, 38],
    ['dog', 'dog', 'animal', 0.8, 25, 45, 500, 90, 38.6],
    ['owl', 'owl', 'animal', 0.45, 1.5, 65, null, 50, 40],
    ['pig', 'pig', 'animal', 1.5, 150, 17, 300, 100, 39],
    ['lion', 'lion', 'animal', 2.3, 190, 80, null, 114, 38.1],
    ['cheetah', 'cheetah', 'animal', 1.3, 50, 110, null, 60, 38.3],
    ['cow', 'cow', 'animal', 2.5, 700, 40, 1500, 92, 38.5],
    ['horse', 'horse', 'animal', 2.4, 500, 70, 3000, 90, 37.8],
    ['crocodile', 'crocodile', 'animal', 4, 450, 30, null, 80, 25],
    ['giraffe', 'giraffe', 'animal', 5.5, 1200, 60, null, 30, 38.4],
    ['elephant', 'elephant', 'animal', 6, 6000, 40, null, 117, 36],
    ['whale', 'whale', 'animal', 30, 150000, 30, null, 188, 37],

    ['grape', 'grape', 'food', 0.02, 0.005, null, 0.05, 0, 20],
    ['strawberry', 'strawberry', 'food', 0.03, 0.012, null, 0.25, 0, 20],
    ['egg', 'egg', 'food', 0.06, 0.06, null, 0.35, 0, 20],
    ['banana', 'banana', 'food', 0.2, 0.12, null, 0.3, 0, 20],
    ['apple', 'apple', 'food', 0.08, 0.2, null, 0.5, 0, 20],
    ['carrot', 'carrot', 'food', 0.18, 0.07, null, 0.2, 0, 20],
    ['icecream', 'ice cream', 'food', 0.15, 0.1, null, 3, 0, -10],
    ['cupcake', 'cupcake', 'food', 0.08, 0.07, null, 2.5, 0, 20],
    ['pizza', 'pizza', 'food', 0.35, 0.8, null, 12, 0, 70],
    ['watermelon', 'watermelon', 'food', 0.4, 8, null, 6, 0, 20],
    ['cheese', 'cheese', 'food', 0.15, 0.5, null, 5, 0, 12, 'a block of cheese'],
    ['soup', 'soup', 'food', 0.18, 0.5, null, 4, 0, 80, 'a bowl of soup'],

    ['skateboard', 'skateboard', 'transport', 0.8, 3.5, 15, 80, 70, 20],
    ['bicycle', 'bicycle', 'transport', 1.8, 12, 25, 300, 40, 20],
    ['motorbike', 'motorbike', 'transport', 2.1, 200, 180, 8000, 100, 20],
    ['car', 'car', 'transport', 4.5, 1500, 160, 25000, 70, 20],
    ['bus', 'bus', 'transport', 12, 12000, 100, 300000, 85, 20],
    ['tractor', 'tractor', 'transport', 4, 4000, 40, 80000, 95, 20],
    ['train', 'train', 'transport', 200, 400000, 300, 20000000, 102, 20],
    ['sailboat', 'sailboat', 'transport', 9, 3500, 15, 60000, 20, 20],
    ['plane', 'plane', 'transport', 70, 300000, 900, 300000000, 140, 20],
    ['helicopter', 'helicopter', 'transport', 15, 3000, 250, 3000000, 110, 20],
    ['rocket', 'rocket', 'transport', 110, 2800000, 28000, 1000000000, 180, 3000],

    ['igloo', 'igloo', 'place', 3, 3000, null, null, 0, -5],
    ['tent', 'tent', 'place', 2.5, 5, null, 100, 0, 20],
    ['house', 'house', 'place', 10, 100000, null, 300000, 0, 21],
    ['barn', 'barn', 'place', 20, 200000, null, 200000, 0, 20],
    ['lighthouse', 'lighthouse', 'place', 30, 1000000, null, 2000000, 120, 20],
    ['castle', 'castle', 'place', 50, 50000000, null, 50000000, 0, 15],
    ['bridge', 'bridge', 'place', 1500, 400000000, null, 1000000000, 60, 20],
    ['pyramid', 'pyramid', 'place', 230, 6000000000, null, null, 0, 30],
    ['skyscraper', 'skyscraper', 'place', 450, 450000000, null, 1500000000, 0, 20],
    ['windmill', 'windmill', 'place', 18, 80000, null, 500000, 40, 15],

    ['key', 'key', 'home', 0.065, 0.01, null, 5, 0, 20],
    ['pencil', 'pencil', 'home', 0.18, 0.006, null, 0.5, 0, 20],
    ['spoon', 'spoon', 'home', 0.15, 0.03, null, 1, 0, 20],
    ['candle', 'candle', 'home', 0.2, 0.25, null, 3, 0, 1000],
    ['book', 'book', 'home', 0.25, 0.5, null, 15, 0, 20],
    ['phone', 'phone', 'home', 0.15, 0.2, null, 800, 75, 30],
    ['clock', 'clock', 'home', 0.2, 0.5, null, 25, 80, 20],
    ['lightbulb', 'light bulb', 'home', 0.12, 0.05, null, 2, 0, 150],
    ['umbrella', 'umbrella', 'home', 1, 0.5, null, 15, 0, 20],
    ['kettle', 'kettle', 'home', 0.25, 1.2, null, 30, 85, 100],
    ['chair', 'chair', 'home', 1, 7, null, 50, 0, 20],
    ['tv', 'television', 'home', 1.2, 15, null, 500, 70, 35],
    ['bed', 'bed', 'home', 2, 60, null, 400, 0, 25],
    ['fridge', 'fridge', 'home', 1.8, 80, null, 800, 40, 4],

    ['leaf', 'leaf', 'nature', 0.1, 0.002, null, null, 0, 20],
    ['flower', 'flower', 'nature', 0.3, 0.01, null, 3, 0, 20],
    ['rock', 'rock', 'nature', 0.3, 10, null, null, 0, 20],
    ['cactus', 'cactus', 'nature', 2, 200, null, 50, 0, 40],
    ['tree', 'tree', 'nature', 15, 5000, null, 500, 30, 20],
    ['cloud', 'cloud', 'nature', 1000, 500000, 50, null, 0, 0],
    ['snowman', 'snowman', 'nature', 1.7, 100, null, null, 0, -2],
    ['mountain', 'mountain', 'nature', 8800, 1e14, null, null, 0, -20],
    ['volcano', 'volcano', 'nature', 3000, 1e13, null, null, 120, 1200],
    ['moon', 'moon', 'nature', 3474000, 7.3e22, 3700, null, 0, -20, 'the moon'],
    ['sun', 'sun', 'nature', 1.39e9, 2e30, 828000, null, 0, 5500, 'the sun'],

    ['balloon', 'balloon', 'toy', 0.3, 0.005, null, 1, 0, 20],
    ['football', 'football', 'toy', 0.22, 0.43, 100, 25, 0, 20],
    ['teddy', 'teddy bear', 'toy', 0.4, 0.5, null, 20, 0, 20],
    ['kite', 'kite', 'toy', 1, 0.3, 30, 20, 0, 20],
    ['drum', 'drum', 'toy', 0.5, 5, null, 150, 110, 20],
    ['guitar', 'guitar', 'toy', 1, 3, null, 200, 90, 20],
  ];

  const article = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const NOUNS = ROWS.map(([id, name, cat, size, weight, speed, price, loud, temp, phrase]) => ({
    id, name, cat, size, weight, speed, price, loud, temp, phrase: phrase || article(name), sc: {},
  }));
  const NOUN_BY_ID = {};
  NOUNS.forEach((n) => (NOUN_BY_ID[n.id] = n));

  /* Power score 1–10 for each stat, by rank across the whole deck (ties share a score). */
  for (const st of STAT_KEYS) {
    const vals = NOUNS.map((n) => n[st]).filter((v) => v != null).sort((a, b) => a - b);
    const last = vals.length - 1;
    for (const n of NOUNS) {
      const v = n[st];
      if (v == null) { n.sc[st] = null; continue; }
      const lo = vals.indexOf(v), hi = vals.lastIndexOf(v);
      n.sc[st] = Math.round((1 + (9 * ((lo + hi) / 2)) / last) * 10) / 10;
    }
  }

  /* ---------- action cards (16) ---------- */
  const ACTIONS = {
    reverse: { name: 'Reverse', count: 2, target: false, desc: 'Flip the challenge! Bigger becomes smaller.' },
    swap:    { name: 'Swap', count: 2, target: true, desc: "Swap your word card with a player's card." },
    shrink:  { name: 'Shrink', count: 2, target: true, desc: "A player's card loses 2 power." },
    boost:   { name: 'Boost', count: 3, target: false, desc: 'Your card gains 2 power.' },
    shield:  { name: 'Shield', count: 2, target: false, desc: 'Blocks Swap, Shrink, Steal and Peek.' },
    mirror:  { name: 'Mirror', count: 1, target: false, desc: 'Bounces an action back at the sender.' },
    peek:    { name: 'Peek', count: 2, target: true, desc: "See a player's card before you bet." },
    double:  { name: 'Double', count: 1, target: false, desc: 'Doubles the prize and all bets.' },
    steal:   { name: 'Steal', count: 1, target: true, desc: "Take a random card from a player's hand." },
  };

  /* ---------- text helpers ---------- */
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const thePhrase = (d) => d.phrase.replace(/^(a|an|the) /, 'the ');

  function niceNum(x) {
    const v = x >= 100 ? Math.round(x) : Number(x.toPrecision(3));
    return v.toLocaleString('en-US', { maximumFractionDigits: 3 });
  }
  function bigWords(n) {
    const units = [[1e27, 'octillion'], [1e24, 'septillion'], [1e21, 'sextillion'], [1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    for (const [u, w] of units) if (n >= u) return niceNum(n / u) + ' ' + w;
    return niceNum(n);
  }
  function fmtValue(stat, v) {
    if (v == null) return STATS[stat].none || '—';
    switch (stat) {
      case 'size': return v < 0.01 ? niceNum(v * 1000) + ' mm' : v < 1 ? niceNum(v * 100) + ' cm' : v < 1000 ? niceNum(v) + ' m' : bigWords(v / 1000) + ' km';
      case 'weight': return v < 1 ? niceNum(v * 1000) + ' g' : v < 1000 ? niceNum(v) + ' kg' : bigWords(v / 1000) + ' tonnes';
      case 'speed': return bigWords(v) + ' km/h';
      case 'price': return '$' + (v < 1 ? v.toFixed(2) : bigWords(v));
      case 'loud': return v + ' dB';
      case 'temp': return v + '°C';
    }
    return String(v);
  }

  /* ---------- challenges ---------- */
  function challengeInfo(ch) {
    const di = ch.high ? 0 : 1;
    if (ch.kind === 'combo') {
      const [a, b] = ch.stats;
      return { kind: ch.kind, high: ch.high, icons: [a, b], title: `${STATS[a].comp[di]} & ${STATS[b].comp[di]}?`.toUpperCase(), sub: 'Both powers are added together!' };
    }
    const S = STATS[ch.stat];
    const info = { kind: ch.kind, high: ch.high, icons: [ch.stat], stat: ch.stat };
    if (ch.kind === 'simple' || ch.kind === 'theme') {
      info.title = (S.comp[di] + '?').toUpperCase();
      info.sub = ch.kind === 'theme' ? `${CATS[ch.cat].label} cards get +2 power!` : `Play the ${S.sup[di]} card!`;
      if (ch.kind === 'theme') info.cat = ch.cat;
    } else if (ch.kind === 'target') {
      const ref = NOUN_BY_ID[ch.ref];
      info.title = (ch.high ? 'CLOSEST IN ' : 'FURTHEST IN ') + S.noun.toUpperCase();
      info.sub = (ch.high ? 'to ' : 'from ') + ref.phrase;
      info.ref = ref.id;
    } else if (ch.kind === 'limit') {
      const ref = NOUN_BY_ID[ch.ref];
      info.title = (S.sup[di] + '…').toUpperCase();
      info.sub = `…but it must be ${S.comp[1 - di]} than ${ref.phrase}!`;
      info.ref = ref.id;
    }
    return info;
  }

  /* How strong is noun d for challenge ch?  → {bust, reason} or {strength, key} */
  function evaluate(ch, d) {
    if (ch.kind === 'combo') {
      let t = 0;
      for (const st of ch.stats) {
        if (d[st] == null) return { bust: true, reason: STATS[st].none };
        t += ch.high ? d.sc[st] : 11 - d.sc[st];
      }
      return { strength: t / 2, key: null };
    }
    const st = ch.stat, v = d[st];
    if (v == null) return { bust: true, reason: STATS[st].none };
    const sc = d.sc[st];
    if (ch.kind === 'target') {
      const ref = NOUN_BY_ID[ch.ref];
      const diff = Math.abs(sc - ref.sc[st]);
      return { strength: ch.high ? 10 - diff : 1 + diff, key: null };
    }
    if (ch.kind === 'limit') {
      const ref = NOUN_BY_ID[ch.ref];
      const ok = ch.high ? v < ref[st] : v > ref[st];
      if (!ok) return { bust: true, reason: `isn't ${STATS[st].comp[ch.high ? 1 : 0]} than ${ref.phrase}` };
    }
    let s = ch.high ? sc : 11 - sc;
    if (ch.kind === 'theme' && d.cat === ch.cat) s += 2;
    return { strength: s, key: ch.high ? v : -v };
  }

  const api = { NOUNS, NOUN_BY_ID, ACTIONS, STATS, STAT_KEYS, CATS, ART, ACTION_ART, STAT_ICON, challengeInfo, evaluate, fmtValue, cap, thePhrase };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.CC = api;
})();
