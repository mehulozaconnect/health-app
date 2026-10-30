/* Pranayama breath pacer: inhale : hold : exhale : hold × rounds, voice + animated guide, nostril cues, log */
'use strict';
/* key: [name, plain name, inhale, hold, exhale, hold-after, rounds, nostril pattern, how, caution, fast]
   nostril: 'alt' = Anulom Vilom (in left, out right, in right, out left); 'R' = in right out left; 'L' = in left out right; '' = both */
var PRANA = {
  anulom: ['Anulom Vilom', 'Alternate nostrils', 6, 2, 6, 2, 20, 'alt', 'Sit tall. Right thumb closes the right nostril, ring finger the left. Breathe in through one side, out through the other, then switch.', ''],
  sheetali: ['Sheetali', 'Cooling', 4, 2, 6, 0, 12, '', 'Roll the tongue like a tube, breathe in through it, close the mouth and breathe out through the nose.', 'Skip in cold weather or with a cough.'],
  udgeeth: ['Udgeeth', 'Chanting breath (Om)', 4, 0, 12, 0, 7, '', 'Breathe in deep. On the out-breath chant a long Oooo-mmm, the mmm longer than the ooo.', ''],
  ujjayi: ['Ujjayi', 'Ocean breath', 5, 0, 7, 0, 15, '', 'Breathe through the nose with the throat slightly closed, making a soft ocean sound in and out.', ''],
  bahya: ['Bahya', 'External kumbhak', 9, 0, 9, 6, 5, '', 'Breathe out fully, then hold the breath out with chin lock, belly pulled in and up. Release and breathe in gently.', 'Skip with high BP, heart trouble, on a full stomach or in pregnancy.'],
  bhramari: ['Bhramari', 'Humming bee breath', 4, 0, 8, 0, 7, '', 'Thumbs close the ears, fingers over the eyes. Breathe in, and hum like a bee all the way out.', ''],
  meditative: ['Meditative breathing', '4 : 7 : 8', 4, 7, 8, 0, 8, '', 'In through the nose for 4, hold for 7, out through the mouth with a whoosh for 8. Calms the mind before sleep.', 'Feeling dizzy? Shorten the hold.'],
  surya: ['Surya Bhedana', 'Right nostril (warming)', 5, 2, 6, 0, 12, 'R', 'Breathe in only through the right nostril, out only through the left.', 'Skip with high BP or acidity.'],
  chandra: ['Chandra Bhedana', 'Left nostril (cooling)', 5, 2, 6, 0, 12, 'L', 'Breathe in only through the left nostril, out only through the right. Calming, good for BP.', ''],
  box: ['Box breathing', '4 : 4 : 4 : 4', 4, 4, 4, 4, 10, '', 'Equal counts: in, hold, out, hold. Steadies the heart and stress.', ''],
  kapal: ['Kapalbhati', 'Skull purification (fast)', 0, 0, 0, 0, 3, '', 'Short, sharp breaths out through the nose by snapping the belly in. Breathing in happens by itself.', 'Skip with high BP, heart trouble, hernia or pregnancy.', [60, 30, 30]],
  bhastrika: ['Bhastrika', 'Bellows (fast)', 0, 0, 0, 0, 3, '', 'Deep, strong breaths in and out through the nose at an even pace.', 'Skip with high BP or heart trouble.', [30, 20, 30]]
};
/* which counts each pranayama uses, in the order you set them: r0 inhale, r1 hold (breath in), r2 exhale, r3 hold (breath out) */
var PSHOW = { anulom: ['r0', 'r1', 'r2', 'r3'], box: ['r0', 'r1', 'r2', 'r3'], bahya: ['r0', 'r2', 'r3'], meditative: ['r0', 'r1', 'r2'], surya: ['r0', 'r1', 'r2'], chandra: ['r0', 'r1', 'r2'] };
var PLAB = { r0: 'INHALE', r1: 'HOLD', r2: 'EXHALE', r3: 'HOLD' };
function pshow(k) { return PSHOW[k] || ['r0', 'r1', 'r2']; }
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
  var h = head('Pranayama', 'Pick one, press Start') + pschedCards() + '<h3 class="sech">All pranayama</h3>', P = makePlan(), rec = {}, av = {};
  P.rec.forEach(function (r) { if (r.p.t === 'p') rec[r.p.k] = r; }); P.avoid.forEach(function (a) { if (a.p.t === 'p') av[a.p.k] = a; });
  var order = PRANA_ORDER.slice().sort(function (a, b) { return (av[a] ? 2 : rec[a] ? 0 : 1) - (av[b] ? 2 : rec[b] ? 0 : 1) || ((rec[b] || {}).sc || 0) - ((rec[a] || {}).sc || 0); });
  h += order.map(function (k) { var p = PRANA[k], c = pcfg(k); return '<button class="res' + (av[k] ? ' dim2' : '') + '" data-act="go" data-to="breath/' + k + '"><span>' + p[0] + (rec[k] && !av[k] ? ' <em class="badge">For you</em>' : '') + (av[k] ? ' <em class="badge off">Avoid for now</em>' : '') + '<small>' + esc(p[1]) + ' · ' + mmss(pTotal(k, c)) + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  h += '<button class="lnk" data-act="go" data-to="breathlog">See my pranayama history →</button>';
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
    h += '<section class="c strip"><div class="sgrid s4">' + ['BREATHS/MIN', 'PER ROUND', 'REST (S)', 'ROUNDS'].map(function (l) { return '<span class="l">' + l + '</span>'; }).join('') +
      ['f0', 'f1', 'f2', 'rounds'].map(function (key, j) { var v = key === 'rounds' ? c.rounds : c.fast[j]; return cell(key, v); }).join('') + '</div></section>';
  } else {
    var sh = pshow(k), labs = sh.map(function (f) { return f === 'r3' && sh.indexOf('r1') >= 0 ? 'HOLD OUT' : PLAB[f]; });
    h += '<section class="c strip"><div class="sgrid" style="grid-template-columns:28px repeat(' + sh.length + ',minmax(0,1fr)) 28px 64px"><span></span>' + labs.map(function (l) { return '<span class="l">' + l + '</span>'; }).join('') + '<span></span><span class="l">ROUNDS</span>' +
      '<button class="sarr" data-act="bLevel" data-d="-1" aria-label="Shorter">‹</button>' + sh.map(function (f, i) { return cell(f, c.r[+f[1]], i < sh.length - 1); }).join('') + '<button class="sarr" data-act="bLevel" data-d="1" aria-label="Longer">›</button>' + cell('rounds', c.rounds) + '</div>' +
      '</section>';
  }
  h += psBanner(k) || planNote(k);
  h += '<section class="c ctrtxt bcard"><div class="bfig' + (BP.run ? '' : ' idle') + '" id="bfig">' + breathFig(k, 0.6) + '</div>' +
    '<div class="bph"><b id="bph">' + (BP.run ? '' : 'Ready') + '</b> <span id="bsec"></span></div><div id="bnos" class="l"></div>' +
    '<div class="l mt6"><span id="bround">' + c.rounds + ' rounds</span> · <span id="blf">' + mmss(tot - BP.el) + '</span> left<span id="bel" hidden></span></div>' +
    '<button class="btn big mt" data-act="bToggle" id="bgo">' + icon(BP.run ? 'pause' : 'play', 20) + (BP.run ? 'Pause' : 'Start') + '</button>' +
    '<div class="row sb mt6"><button class="lnk" data-act="bReset">Start over</button><button class="lnk" data-act="bStop">Finish and save</button></div></section>';
  h += '<details class="c"><summary class="lnk">How to do it</summary><p class="p">' + esc(p[8]) + '</p>' + (p[9] ? '<div class="note warn mt">' + esc(p[9]) + '</div>' : '') + '</details>';
  return h;
};
ROUTES.breath.after = function () { if (BP && BP.run) bPaint(); };
function cell(f, v, colon) { return '<div class="scell' + (colon ? ' colon' : '') + '"><button class="sup" data-act="bAdj" data-f="' + f + '" data-d="1" aria-label="More">▲</button><b>' + v + '</b><button class="sup" data-act="bAdj" data-f="' + f + '" data-d="-1" aria-label="Less">▼</button></div>'; }
/* ‹ › : the whole ratio gets one step shorter or longer, keeping its shape (9:9:6 → 10:10:7) */
ACT.bLevel = function (el) {
  if (BP.run) return toast('Pause first to change counts');
  var c = pcfg(BP.k), d = +el.getAttribute('data-d'), base = c.r[0] || 1, f = (base + d) / base;
  if (base + d < 1) return;
  c.r = c.r.map(function (x, i) { return x ? Math.max(1, Math.round(x * f)) : 0; }); c.r[0] = base + d;
  bSave(c); BP.el = 0; BP.i = 0; rerender();
};
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
  if (BP.el >= tot) { BP.el = tot; clearInterval(BP.t); BP.run = false; native('keepAwake', false); plSay('Well done'); feel('done'); bLog(); return; }
  if (cur.name === 'breath') bPaint();
}
function bPaint() {
  var c = pcfg(BP.k), ph = phases(BP.k, c), t = BP.el, i = 0, acc = 0;
  while (i < ph.length && acc + ph[i].sec <= t) { acc += ph[i].sec; i++; }
  var g = ph[Math.min(i, ph.length - 1)], into = t - acc, left = Math.ceil(g.sec - into);
  if (!document.getElementById('bph')) return; var orb = document.getElementById('orb') || { style: {} };
  var scale = g.ph === 'in' ? 0.45 + 0.55 * (into / g.sec) : g.ph === 'out' ? 1 - 0.55 * (into / g.sec) : g.ph === 'hold' ? 1 : g.ph === 'hold2' ? 0.45 : g.ph === 'fast' ? (Math.floor(into * g.bpm / 60 * 2) % 2 ? 0.7 : 0.85) : 0.6;
  orb.style.transform = 'scale(' + scale.toFixed(3) + ')';
  var fb = document.getElementById('fbreath'); if (fb) { fb.setAttribute('r', (+fb.getAttribute('data-r') * (0.35 + scale)).toFixed(1)); document.getElementById('bfig').className = 'bfig'; }
  orb.className = 'orb ' + g.ph;
  document.getElementById('bph').textContent = PHL[g.ph] + (g.ph === 'fast' ? ' · ' + Math.min(g.n, Math.floor(into * g.bpm / 60) + 1) + '/' + g.n : '');
  document.getElementById('bsec').textContent = g.ph === 'fast' ? '' : left;
  document.getElementById('bnos').textContent = g.nos ? g.nos + ' nostril' : '';
  document.getElementById('bround').textContent = 'Round ' + g.round + ' of ' + c.rounds;
  document.getElementById('bel').textContent = mmss(t); document.getElementById('blf').textContent = mmss(pTotal(BP.k, c) - t);
  if (BP.spoke !== i) { if (BP.spoke != null) feel(g.ph === 'in' ? 'tick' : g.ph === 'rest' ? 'bell' : 'tickl'); BP.spoke = i; plSay(g.ph === 'fast' ? 'Round ' + g.round + '. Go' : g.ph === 'rest' ? 'Rest. Breathe normally' : PHL[g.ph] + (g.nos ? ' ' + g.nos : '')); }
}
function bLog() {
  var doneK = BP.k;
  var c = pcfg(BP.k), p = PRANA[BP.k], sec = Math.round(BP.el);
  day(today()).yoga.push({ t: Date.now(), min: Math.round(sec / 6) / 10, sec: sec, kind: 'yoga', prana: BP.k, name: p[0], ratio: c.fast ? c.rounds + '×' + c.fast[1] : c.r.filter(function (x, i) { return x || i % 2 === 0; }).join(':') + ' ×' + Math.round(sec / Math.max(1, pTotal(BP.k, c)) * c.rounds) });
  save(); toast('Saved ' + p[0] + ' · ' + mmss(sec) + ' · ' + sessionKcal(day(today()).yoga[day(today()).yoga.length - 1]) + ' kcal'); BP.el = 0; BP.i = 0; rerender();
  psNext(doneK);
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
