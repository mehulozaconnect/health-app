/* Pranayama breath pacer: inhale : hold : exhale : hold × rounds, voice + animated guide, nostril cues, log */
'use strict';
/* key: [name, plain name, inhale, hold, exhale, hold-after, rounds, nostril pattern, how, caution, fast]
   nostril: 'alt' = Anulom Vilom (in left, out right, in right, out left); 'R' = in right out left; 'L' = in left out right; '' = both */
var PRANA = {
  anulom: ['Anulom Vilom', 'Alternate nostrils', 6, 2, 6, 2, 20, 'alt', 'Sit tall. Right thumb closes the right nostril, ring finger the left. Breathe in through one side, out through the other, then switch.', ''],
  sheetali: ['Sheetali', 'Cooling', 4, 2, 6, 0, 12, '', 'Roll the tongue like a tube, breathe in through it, close the mouth and breathe out through the nose.', 'Skip in cold weather or with a cough.'],
  udgeeth: ['Udgeeth', 'Chanting breath (Om)', 4, 0, 12, 0, 7, '', 'Breathe in deep. On the out-breath chant a long Oooo-mmm, the mmm longer than the ooo.', ''],
  ujjayi: ['Ujjayi', 'Ocean breath', 5, 0, 7, 0, 15, '', 'Breathe through the nose with the throat slightly closed, making a soft ocean sound in and out.', ''],
  bahya: ['Bahya', 'External kumbhak', 4, 0, 6, 8, 5, '', 'Breathe out fully, then hold the breath out with chin lock, belly pulled in and up. Release and breathe in gently.', 'Skip with high BP, heart trouble, on a full stomach or in pregnancy.'],
  bhramari: ['Bhramari', 'Humming bee breath', 4, 0, 8, 0, 7, '', 'Thumbs close the ears, fingers over the eyes. Breathe in, and hum like a bee all the way out.', ''],
  meditative: ['Meditative breathing', '4 : 7 : 8', 4, 7, 8, 0, 8, '', 'In through the nose for 4, hold for 7, out through the mouth with a whoosh for 8. Calms the mind before sleep.', 'Feeling dizzy? Shorten the hold.'],
  surya: ['Surya Bhedana', 'Right nostril (warming)', 5, 2, 6, 0, 12, 'R', 'Breathe in only through the right nostril, out only through the left.', 'Skip with high BP or acidity.'],
  chandra: ['Chandra Bhedana', 'Left nostril (cooling)', 5, 2, 6, 0, 12, 'L', 'Breathe in only through the left nostril, out only through the right. Calming, good for BP.', ''],
  box: ['Box breathing', '4 : 4 : 4 : 4', 4, 4, 4, 4, 10, '', 'Equal counts: in, hold, out, hold. Steadies the heart and stress.', ''],
  kapal: ['Kapalbhati', 'Skull purification (fast)', 0, 0, 0, 0, 3, '', 'Short, sharp breaths out through the nose by snapping the belly in. Breathing in happens by itself.', 'Skip with high BP, heart trouble, hernia or pregnancy.', [60, 30, 30]],
  bhastrika: ['Bhastrika', 'Bellows (fast)', 0, 0, 0, 0, 3, '', 'Deep, strong breaths in and out through the nose at an even pace.', 'Skip with high BP or heart trouble.', [30, 20, 30]]
};
var PRANA_ORDER = ['anulom', 'sheetali', 'udgeeth', 'ujjayi', 'bahya', 'bhastrika', 'bhramari', 'meditative', 'kapal', 'surya', 'chandra', 'box'];
function pcfg(k) {
  var p = PRANA[k], s = (DB.breath || {})[k] || {};
  var c = { r: s.r ? s.r.slice() : [p[2], p[3], p[4], p[5]], rounds: s.rounds || p[6] };
  if (p[10]) { c.fast = s.fast ? s.fast.slice() : p[10].slice(); }
  return c;
}
function pTotal(k, c) {
  if (c.fast) return Math.round(c.rounds * (c.fast[1] * 60 / c.fast[0]) + (c.rounds - 1) * c.fast[2]);
  return (c.r[0] + c.r[1] + c.r[2] + c.r[3]) * c.rounds;
}
function mmss(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? pad(h) + ':' : '') + pad(m) + ':' + pad(s % 60); }

/* ---------- list ---------- */
ROUTES.breaths = function () {
  var h = head('Pranayama', 'Set your own counts and rounds');
  h += PRANA_ORDER.map(function (k) { var p = PRANA[k], c = pcfg(k); return '<button class="res" data-act="go" data-to="breath/' + k + '"><span>' + p[0] + ' <span class="l">(' + p[1] + ')</span><small>' + (c.fast ? c.rounds + ' rounds × ' + c.fast[1] + ' breaths' : c.r.join(' : ') + ' × ' + c.rounds) + ' · ' + mmss(pTotal(k, c)) + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  h += '<button class="btn sec" data-act="go" data-to="breathlog">Pranayama report</button>';
  return h;
};

/* ---------- pacer ---------- */
var BP = null;
function phases(k, c) {
  var p = PRANA[k], out = [];
  if (c.fast) {
    for (var r = 0; r < c.rounds; r++) {
      out.push({ ph: 'fast', sec: c.fast[1] * 60 / c.fast[0], round: r + 1, n: c.fast[1], bpm: c.fast[0] });
      if (r < c.rounds - 1) out.push({ ph: 'rest', sec: c.fast[2], round: r + 1 });
    }
    return out;
  }
  for (var i = 0; i < c.rounds; i++) {
    var inN = '', outN = '';
    if (p[7] === 'alt') { inN = i % 2 ? 'right' : 'left'; outN = i % 2 ? 'left' : 'right'; }
    if (p[7] === 'R') { inN = 'right'; outN = 'left'; }
    if (p[7] === 'L') { inN = 'left'; outN = 'right'; }
    if (c.r[0]) out.push({ ph: 'in', sec: c.r[0], round: i + 1, nos: inN });
    if (c.r[1]) out.push({ ph: 'hold', sec: c.r[1], round: i + 1 });
    if (c.r[2]) out.push({ ph: 'out', sec: c.r[2], round: i + 1, nos: outN });
    if (c.r[3]) out.push({ ph: 'hold2', sec: c.r[3], round: i + 1 });
  }
  return out;
}
var PHL = { in: 'Inhale', hold: 'Hold', out: 'Exhale', hold2: 'Hold out', fast: 'Go', rest: 'Rest' };
ROUTES.breath = function (k) {
  var p = PRANA[k]; if (!p) return head('Pranayama') + '<div class="empty-s">Not found.</div>';
  if (!BP || BP.k !== k) { BP && clearInterval(BP.t); BP = { k: k, run: false, el: 0, t: 0, i: 0, done: 0, last: 0 }; }
  var c = pcfg(k), tot = pTotal(k, c);
  var h = head(p[0], p[1]);
  if (c.fast) {
    h += '<section class="c"><div class="ratio r4"><span class="l">BREATHS / MIN</span><span class="l">PER ROUND</span><span class="l">REST (s)</span><span class="l">ROUNDS</span>' +
      ['f0', 'f1', 'f2', 'rounds'].map(function (key, j) { var v = key === 'rounds' ? c.rounds : c.fast[j]; return '<div class="rc"><button class="rb" data-act="bAdj" data-f="' + key + '" data-d="1" aria-label="More">+</button><b>' + v + '</b><button class="rb" data-act="bAdj" data-f="' + key + '" data-d="-1" aria-label="Less">−</button></div>'; }).join('') + '</div></section>';
  } else {
    h += '<section class="c"><div class="ratio r5"><span class="l">INHALE</span><span class="l">HOLD</span><span class="l">EXHALE</span><span class="l">HOLD</span><span class="l">ROUNDS</span>' +
      ['r0', 'r1', 'r2', 'r3', 'rounds'].map(function (key, j) { var v = key === 'rounds' ? c.rounds : c.r[j]; return '<div class="rc"><button class="rb" data-act="bAdj" data-f="' + key + '" data-d="1" aria-label="More">+</button><b>' + v + '</b><button class="rb" data-act="bAdj" data-f="' + key + '" data-d="-1" aria-label="Less">−</button></div>'; }).join('') + '</div>' +
      '<div class="chips nm mt">' + [[4, 0, 4, 0], [4, 2, 6, 0], [6, 2, 6, 2], [4, 7, 8, 0], [4, 4, 4, 4], [4, 16, 8, 0]].map(function (r) { var on = r.join() === c.r.join(); return '<button class="chip' + (on ? ' dk' : '') + '" data-act="bRatio" data-r="' + r.join(',') + '">' + r.filter(function (x, i) { return x || i % 2 === 0; }).join(':') + '</button>'; }).join('') + '</div></section>';
  }
  h += '<section class="c ctrtxt"><div class="orbwrap"><div id="orb" class="orb"></div><div class="orbtxt"><b id="bph">' + (BP.run ? '' : 'Ready') + '</b><span id="bsec"></span><span id="bnos" class="l"></span></div></div>' +
    '<div id="bround" class="l mt">' + (c.fast ? c.rounds + ' rounds' : c.rounds + ' rounds') + '</div>' +
    '<div class="clock"><span><b id="bel">' + mmss(BP.el) + '</b><small>done</small></span><span><b id="blf">' + mmss(tot - BP.el) + '</b><small>left</small></span><span><b>' + mmss(tot) + '</b><small>total</small></span></div></section>';
  h += '<div class="g3"><button class="btn sec" data-act="bReset">Reset</button><button class="btn" data-act="bToggle" id="bgo">' + icon(BP.run ? 'pause' : 'play', 18) + (BP.run ? 'Pause' : 'Start') + '</button><button class="btn sec" data-act="bStop">Finish</button></div>';
  h += '<details class="c"><summary class="lnk">How to do it</summary><p class="p">' + esc(p[8]) + '</p>' + (p[9] ? '<div class="note warn mt">' + esc(p[9]) + '</div>' : '') + '</details>';
  var hist = breathHist(k).slice(0, 5);
  if (hist.length) h += '<section class="c"><h2>Your last sessions</h2>' + hist.map(function (x) { return '<div class="rd"><span>' + niceDate(x.k) + ', ' + hm(x.s.t) + (x.s.ratio ? ' · ' + x.s.ratio : '') + '</span><b>' + mmss(x.s.sec) + '</b></div>'; }).join('') + '</section>';
  return h;
};
ROUTES.breath.after = function () { if (BP && BP.run) bPaint(); };
function bSave(c) { DB.breath = DB.breath || {}; DB.breath[BP.k] = { r: c.r, rounds: c.rounds, fast: c.fast }; save(); }
ACT.bAdj = function (el) {
  if (BP.run) return toast('Pause first to change counts');
  var c = pcfg(BP.k), f = el.getAttribute('data-f'), d = +el.getAttribute('data-d');
  if (f === 'rounds') c.rounds = clamp(c.rounds + d, 1, 200);
  else if (f[0] === 'r') { var j = +f[1]; c.r[j] = clamp(c.r[j] + d, j === 0 || j === 2 ? 1 : 0, 60); }
  else { j = +f[1]; c.fast[j] = clamp(c.fast[j] + d * (j === 0 ? 5 : j === 1 ? 5 : 5), j === 2 ? 0 : 5, j === 0 ? 120 : 200); }
  bSave(c); BP.el = 0; BP.i = 0; rerender();
};
ACT.bRatio = function (el) { if (BP.run) return; var c = pcfg(BP.k); c.r = el.getAttribute('data-r').split(',').map(Number); bSave(c); rerender(); };
ACT.bReset = function () { clearInterval(BP.t); BP.run = false; BP.el = 0; BP.i = 0; BP.last = 0; native('keepAwake', false); native('stopSpeak'); rerender(); };
ACT.bToggle = function () {
  BP.run = !BP.run;
  if (BP.run) { BP.last = Date.now(); BP.spoke = -1; clearInterval(BP.t); BP.t = setInterval(bTick, 100); native('keepAwake', true); bPaint(); }
  else { clearInterval(BP.t); native('keepAwake', false); native('stopSpeak'); }
  var b = document.getElementById('bgo'); if (b) b.innerHTML = icon(BP.run ? 'pause' : 'play', 18) + (BP.run ? 'Pause' : 'Start');
};
ACT.bStop = function () { clearInterval(BP.t); BP.run = false; native('keepAwake', false); if (BP.el >= 20) bLog(); else { toast('Too short to save'); BP.el = 0; rerender(); } };
function bTick() {
  if (!BP || !BP.run) return;
  var now = Date.now(); BP.el += (now - BP.last) / 1000; BP.last = now;
  var c = pcfg(BP.k), tot = pTotal(BP.k, c);
  if (BP.el >= tot) { BP.el = tot; clearInterval(BP.t); BP.run = false; native('keepAwake', false); plSay('Well done'); bLog(); return; }
  if (cur.name === 'breath') bPaint();
}
function bPaint() {
  var c = pcfg(BP.k), ph = phases(BP.k, c), t = BP.el, i = 0, acc = 0;
  while (i < ph.length && acc + ph[i].sec <= t) { acc += ph[i].sec; i++; }
  var g = ph[Math.min(i, ph.length - 1)], into = t - acc, left = Math.ceil(g.sec - into);
  var orb = document.getElementById('orb'); if (!orb) return;
  var scale = g.ph === 'in' ? 0.45 + 0.55 * (into / g.sec) : g.ph === 'out' ? 1 - 0.55 * (into / g.sec) : g.ph === 'hold' ? 1 : g.ph === 'hold2' ? 0.45 : g.ph === 'fast' ? (Math.floor(into * g.bpm / 60 * 2) % 2 ? 0.7 : 0.85) : 0.6;
  orb.style.transform = 'scale(' + scale.toFixed(3) + ')';
  orb.className = 'orb ' + g.ph;
  document.getElementById('bph').textContent = PHL[g.ph] + (g.ph === 'fast' ? ' · ' + Math.min(g.n, Math.floor(into * g.bpm / 60) + 1) + '/' + g.n : '');
  document.getElementById('bsec').textContent = g.ph === 'fast' ? '' : left;
  document.getElementById('bnos').textContent = g.nos ? g.nos + ' nostril' : '';
  document.getElementById('bround').textContent = 'Round ' + g.round + ' of ' + c.rounds;
  document.getElementById('bel').textContent = mmss(t); document.getElementById('blf').textContent = mmss(pTotal(BP.k, c) - t);
  if (BP.spoke !== i) { BP.spoke = i; plSay(g.ph === 'fast' ? 'Round ' + g.round + '. Go' : g.ph === 'rest' ? 'Rest. Breathe normally' : PHL[g.ph] + (g.nos ? ' ' + g.nos : '')); }
}
function bLog() {
  var c = pcfg(BP.k), p = PRANA[BP.k], sec = Math.round(BP.el);
  day(today()).yoga.push({ t: Date.now(), min: Math.round(sec / 6) / 10, sec: sec, kind: 'yoga', prana: BP.k, name: p[0], ratio: c.fast ? c.rounds + '×' + c.fast[1] : c.r.filter(function (x, i) { return x || i % 2 === 0; }).join(':') + ' ×' + Math.round(sec / Math.max(1, pTotal(BP.k, c)) * c.rounds) });
  save(); toast('Saved ' + p[0] + ' · ' + mmss(sec) + ' · ' + sessionKcal(day(today()).yoga[day(today()).yoga.length - 1]) + ' kcal'); BP.el = 0; BP.i = 0; rerender();
}
function breathHist(k) {
  var out = []; Object.keys(DB.days).sort().reverse().forEach(function (dk) { (DB.days[dk].yoga || []).slice().reverse().forEach(function (s) { if (s.prana && (!k || s.prana === k)) out.push({ k: dk, s: s }); }); });
  return out;
}
ROUTES.breathlog = function () {
  var all = breathHist(), h = head('Pranayama report', all.length + ' sessions');
  if (!all.length) return h + '<div class="empty-s">No pranayama yet. Start one from the Pranayama list.</div>';
  var tot = {}; all.forEach(function (x) { tot[x.s.prana] = (tot[x.s.prana] || 0) + x.s.sec; });
  var wk = all.filter(function (x) { return x.k >= addDays(today(), -6); }).reduce(function (a, x) { return a + x.s.sec; }, 0);
  h += '<section class="c"><div class="row sb"><div><div class="l">Last 7 days</div><b class="m22">' + mmss(wk) + '</b></div><div class="r"><div class="l">All time</div><b class="m22">' + mmss(all.reduce(function (a, x) { return a + x.s.sec; }, 0)) + '</b></div></div>' +
    Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; }).map(function (k) { return '<div class="rd"><span>' + PRANA[k][0] + '</span><b>' + mmss(tot[k]) + '</b></div>'; }).join('') + '</section>';
  h += '<section class="c"><div class="tbl"><span class="l">DATE</span><span class="l r">DURATION</span><span class="l r">TYPE</span>' + all.slice(0, 60).map(function (x) { return '<span>' + x.k.slice(8) + ' ' + MON[+x.k.slice(5, 7) - 1] + '</span><span class="r">' + mmss(x.s.sec) + '</span><span class="r">' + PRANA[x.s.prana][0] + '</span>'; }).join('') + '</div></section>';
  return h;
};
