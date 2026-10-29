/* Demo figures: a simple body drawn from joint angles, animated from a start position into the pose.
   Angles in degrees: 0 = pointing down, 90 = to the right, 180 = up, -90 = to the left.
   t torso (hip → neck), a / b near / far arm [upper, fore], l / m near / far leg [thigh, shin], h head tilt, v 'f' = front view */
'use strict';
var FIG = {
  stand: { t: 180, a: [0, 0], b: [0, 0], l: [0, 0], m: [0, 0] },
  standF: { v: 'f', t: 180, a: [-8, -5], b: [8, 5], l: [-4, -4], m: [4, 4] },
  sitF: { v: 'f', t: 180, a: [-28, -40], b: [28, 40], l: [-75, 100], m: [75, -100] },
  sit: { t: 180, a: [10, 60], b: [10, 60], l: [90, 90], m: [90, 90] },
  kneel: { t: 180, a: [15, 70], b: [15, 70], l: [90, -90], m: [90, -90] },
  kneelUp: { t: 180, a: [0, 0], b: [0, 0], l: [0, -90], m: [0, -90] },
  table: { t: 90, a: [0, 0], b: [0, 0], l: [0, -90], m: [0, -90], h: 0 },
  prone: { t: 90, a: [60, 170], b: [60, 170], l: [-90, -90], m: [-90, -90] },
  supine: { t: -90, a: [-80, -80], b: [-80, -80], l: [90, 90], m: [90, 90], h: 0 },
  chair: { t: 180, a: [15, 70], b: [15, 70], l: [90, 0], m: [90, 0] }
};
/* key: [start, pose] or [start, frame, frame, ...] for flows */
var POSEFIG = {
  neck: ['standF', { v: 'f', t: 180, h: 30, a: [-8, -5], b: [8, 5], l: [-4, -4], m: [4, 4] }, { v: 'f', t: 180, h: -30, a: [-8, -5], b: [8, 5], l: [-4, -4], m: [4, 4] }],
  shoulder: ['standF', { v: 'f', t: 180, a: [-100, 160], b: [100, -160], l: [-4, -4], m: [4, 4] }, { v: 'f', t: 180, a: [-160, 100], b: [160, -100], l: [-4, -4], m: [4, 4] }],
  wrist: ['standF', { v: 'f', t: 180, a: [-60, -90], b: [60, 90], l: [-4, -4], m: [4, 4] }],
  tadasana: ['standF', { v: 'f', t: 180, a: [-4, -2], b: [4, 2], l: [-2, -2], m: [2, 2] }],
  desk_stretch: ['standF', { v: 'f', t: 180, a: [178, 182], b: [182, 178], l: [-2, -2], m: [2, 2] }],
  tiryaka: ['standF', { v: 'f', t: 162, h: -10, a: [160, 160], b: [150, 150], l: [-5, -5], m: [5, 5] }, { v: 'f', t: 198, h: 10, a: [210, 210], b: [200, 200], l: [-5, -5], m: [5, 5] }],
  katichakra: ['standF', { v: 'f', t: 180, a: [90, 90], b: [60, 140], l: [-14, -14], m: [14, 14] }, { v: 'f', t: 180, a: [-60, -140], b: [-90, -90], l: [-14, -14], m: [14, 14] }],
  trikona: ['standF', { v: 'f', t: 120, h: 30, a: [20, 20], b: [200, 200], l: [-32, -32], m: [32, 32] }],
  virabhadra: ['standF', { v: 'f', t: 180, h: 60, a: [90, 90], b: [-90, -90], l: [-45, -45], m: [75, 0] }],
  utkata: ['stand', { t: 150, a: [150, 150], b: [150, 150], l: [55, -15], m: [55, -15] }],
  padahasta: ['stand', { t: 25, h: 10, a: [15, 5], b: [15, 5], l: [-5, -5], m: [-5, -5] }],
  ardhachakra: ['stand', { t: 208, h: 25, a: [-40, 35], b: [-40, 35], l: [8, 8], m: [8, 8] }],
  vriksha: ['standF', { v: 'f', t: 180, a: [178, 178], b: [182, 182], l: [-2, -2], m: [55, -55] }],
  garuda: ['standF', { v: 'f', t: 178, a: [150, 200], b: [210, 165], l: [10, -10], m: [-5, 15] }],
  vajra: ['stand', FIG.kneel],
  sukhasana: ['standF', FIG.sitF],
  dhyana: ['sitF', { v: 'f', t: 180, a: [-25, 40], b: [25, -40], l: [-80, 95], m: [80, -95] }],
  palming: ['sitF', { v: 'f', t: 180, a: [-25, 150], b: [25, -150], l: [-80, 95], m: [80, -95] }],
  baddha: ['sit', { v: 'f', t: 180, a: [-10, 0], b: [10, 0], l: [-70, 120], m: [70, -120] }],
  paschim: ['sit', { t: 105, h: -10, a: [95, 92], b: [95, 92], l: [90, 90], m: [90, 90] }],
  janu: ['sit', { t: 108, h: -10, a: [95, 92], b: [95, 92], l: [90, 90], m: [40, -100] }],
  matsyendra: ['sit', { t: 180, h: 50, a: [70, 0], b: [-20, -10], l: [140, 0], m: [90, -90] }],
  ustra: ['kneelUp', { t: 215, h: 40, a: [-30, -15], b: [-30, -15], l: [10, -90], m: [10, -90] }],
  manduka: ['kneel', { t: 105, h: -10, a: [70, 160], b: [70, 160], l: [90, -90], m: [90, -90] }],
  gomukha: ['sitF', { v: 'f', t: 180, a: [-190, 10], b: [10, -190], l: [-75, 100], m: [75, -100] }],
  marjari: ['table', { t: 80, h: 30, a: [0, 0], b: [0, 0], l: [0, -90], m: [0, -90] }, { t: 100, h: -30, a: [0, 0], b: [0, 0], l: [0, -90], m: [0, -90] }],
  balasana: ['kneel', { t: 98, h: 0, a: [95, 92], b: [95, 92], l: [80, -90], m: [80, -90] }],
  adho: ['table', { t: 38, h: 0, a: [40, 40], b: [40, 40], l: [-30, -30], m: [-30, -30] }],
  plank: ['table', { t: 96, a: [0, 0], b: [0, 0], l: [-84, -84], m: [-84, -84] }],
  bhujanga: ['prone', { t: 135, h: 20, a: [-5, 15], b: [-5, 15], l: [-90, -90], m: [-90, -90] }],
  shalabha: ['prone', { t: 84, a: [-80, -90], b: [-80, -90], l: [-108, -108], m: [-108, -108] }],
  dhanura: ['prone', { t: 118, h: 20, a: [-110, -130], b: [-110, -130], l: [-105, -170], m: [-105, -170] }],
  makara: ['prone', { t: 90, a: [60, 170], b: [60, 170], l: [-95, -95], m: [-85, -85] }],
  setu: ['supine', { t: -62, h: 0, a: [92, 92], b: [92, 92], l: [125, 5], m: [125, 5] }],
  pawan: ['supine', { t: -90, a: [150, 110], b: [150, 110], l: [-155, 120], m: [-155, 120] }],
  uttanapada: ['supine', { t: -90, a: [-80, -80], b: [-80, -80], l: [140, 140], m: [140, 140] }],
  supta: ['supine', { t: -90, a: [-170, -170], b: [-10, -10], l: [120, 20], m: [130, 30] }],
  supta_baddha: ['supine', { t: -90, a: [-80, -80], b: [-80, -80], l: [140, 30], m: [150, 40] }],
  viparita: ['supine', { t: -90, a: [-80, -80], b: [-80, -80], l: [180, 180], m: [180, 180] }],
  sarvanga: ['supine', { t: 2, h: 0, a: [-90, 170], b: [-90, 170], l: [180, 180], m: [180, 180] }],
  shava: ['stand', FIG.supine],
  yoganidra: ['stand', FIG.supine],
  chair_twist: ['chair', { t: 180, h: 60, a: [60, 120], b: [-60, -120], l: [90, 0], m: [90, 0] }],
  surya: ['stand', { t: 180, a: [20, 150], b: [20, 150], l: [0, 0], m: [0, 0] }, { t: 200, h: 20, a: [205, 205], b: [205, 205], l: [5, 5], m: [5, 5] }, { t: 15, a: [5, 0], b: [5, 0], l: [0, 0], m: [0, 0] },
    { t: 140, h: 10, a: [15, 10], b: [15, 10], l: [55, -10], m: [-70, -80] }, { t: 96, a: [0, 0], b: [0, 0], l: [-84, -84], m: [-84, -84] }, { t: 92, a: [-20, 60], b: [-20, 60], l: [-95, -95], m: [-95, -95] },
    { t: 135, h: 20, a: [-5, 15], b: [-5, 15], l: [-90, -90], m: [-90, -90] }, { t: 38, a: [40, 40], b: [40, 40], l: [-30, -30], m: [-30, -30] }, { t: 140, h: 10, a: [15, 10], b: [15, 10], l: [55, -10], m: [-70, -80] },
    { t: 15, a: [5, 0], b: [5, 0], l: [0, 0], m: [0, 0] }, { t: 200, h: 20, a: [205, 205], b: [205, 205], l: [5, 5], m: [5, 5] }, { t: 180, a: [20, 150], b: [20, 150], l: [0, 0], m: [0, 0] }],
  chandra: ['stand', { t: 180, a: [20, 150], b: [20, 150], l: [0, 0], m: [0, 0] }, { t: 200, h: 20, a: [205, 205], b: [205, 205], l: [5, 5], m: [5, 5] }, { t: 15, a: [5, 0], b: [5, 0], l: [0, 0], m: [0, 0] },
    { t: 150, h: 10, a: [15, 10], b: [15, 10], l: [55, -10], m: [0, -90] }, { t: 195, h: 20, a: [200, 200], b: [200, 200], l: [55, -10], m: [0, -90] }, { t: 15, a: [5, 0], b: [5, 0], l: [0, 0], m: [0, 0] }, { t: 180, a: [20, 150], b: [20, 150], l: [0, 0], m: [0, 0] }]
};
/* pranayama: seated, front view; hands as the practice needs */
var PRANAFIG = {
  nose: { v: 'f', t: 180, a: [-35, 160], b: [35, 25], l: [-75, 100], m: [75, -100] },
  ears: { v: 'f', t: 180, a: [-95, 165], b: [95, -165], l: [-75, 100], m: [75, -100] },
  knees: { v: 'f', t: 180, a: [-30, -40], b: [30, 40], l: [-75, 100], m: [75, -100] },
  gyan: { v: 'f', t: 180, a: [-28, -40], b: [28, 40], l: [-75, 100], m: [75, -100] }
};
var PRANA_HANDS = { anulom: 'nose', surya: 'nose', chandra: 'nose', surya_bh: 'nose', chandra_bh: 'nose', bhramari: 'ears' };
POSEFIG.anulom = ['sitF', PRANAFIG.nose]; POSEFIG.surya_bh = ['sitF', PRANAFIG.nose]; POSEFIG.chandra_bh = ['sitF', PRANAFIG.nose]; POSEFIG.bhramari = ['sitF', PRANAFIG.ears];
['kapal', 'bhastrika', 'ujjayi', 'sheetali', 'udgeeth', 'bahya'].forEach(function (k) { POSEFIG[k] = ['sitF', PRANAFIG.gyan]; });

function fd(a) { a = a * Math.PI / 180; return [Math.sin(a), Math.cos(a)]; }
function fadd(p, a, len) { var d = fd(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; }
function frame(f) { return typeof f === 'string' ? FIG[f] : f; }
/* joint positions for one frame */
function figPts(f) {
  var H = [0, 0], N = fadd(H, f.t, 52), S = fadd(H, f.t, 46), hd = fadd(N, f.t + (f.h || 0), 12);
  var front = f.v === 'f', sx = front ? 15 : 0, hx = front ? 8 : 0, side = fd(f.t + 90);
  var S1 = [S[0] + side[0] * sx, S[1] + side[1] * sx], S2 = [S[0] - side[0] * sx, S[1] - side[1] * sx];
  var H1 = [H[0] + side[0] * hx, H[1] + side[1] * hx], H2 = [H[0] - side[0] * hx, H[1] - side[1] * hx];
  var arm = function (s, a) { var e = fadd(s, a[0], 27), w = fadd(e, a[1], 25); return [s, e, w]; };
  var leg = function (h, l) { var k = fadd(h, l[0], 36), an = fadd(k, l[1], 35), toe = front ? fadd(an, l[1], 7) : fadd(an, l[1] + 90, 11); return [h, k, an, toe]; };
  return { H: H, N: N, hd: hd, a: arm(S1, f.a), b: arm(S2, f.b), l: leg(H1, f.l), m: leg(H2, f.m), front: front };
}
function figSvg(f, W, Hh, breath) {
  W = W || 220; Hh = Hh || 170;
  var P = figPts(f), all = [P.H, P.N, [P.hd[0], P.hd[1] - 11], [P.hd[0], P.hd[1] + 11], [P.hd[0] - 11, P.hd[1]], [P.hd[0] + 11, P.hd[1]]].concat(P.a, P.b, P.l, P.m);
  var x0 = Math.min.apply(null, all.map(function (p) { return p[0]; })), x1 = Math.max.apply(null, all.map(function (p) { return p[0]; }));
  var y0 = Math.min.apply(null, all.map(function (p) { return p[1]; })), y1 = Math.max.apply(null, all.map(function (p) { return p[1]; }));
  var sc = Math.min(1.25, (W - 30) / Math.max(1, x1 - x0), (Hh - 26) / Math.max(1, y1 - y0)), gy = Hh - 12;
  var X = function (p) { return ((p[0] - (x0 + x1) / 2) * sc + W / 2).toFixed(1); }, Y = function (p) { return ((p[1] - y1) * sc + gy).toFixed(1); };
  var line = function (pts, w, op) { return '<polyline points="' + pts.map(function (p) { return X(p) + ',' + Y(p); }).join(' ') + '" fill="none" stroke="url(#fgr)" stroke-width="' + (w * sc).toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + op + '"/>'; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" height="' + Hh + '" aria-hidden="true"><defs><linearGradient id="fgr" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + W + '" y2="' + Hh + '"><stop offset="0" style="stop-color:var(--g)"/><stop offset="1" style="stop-color:var(--g3)"/></linearGradient><radialGradient id="fgl"><stop offset="0" style="stop-color:var(--g);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--g);stop-opacity:0"/></radialGradient></defs>';
  s += '<rect x="14" y="' + (gy + 2) + '" width="' + (W - 28) + '" height="5" rx="2.5" fill="var(--track)"/>';
  var far = P.front ? 1 : 0.42;
  s += line(P.m, 10, far) + line(P.b, 8, far);
  s += line([P.H, P.N], P.front ? 22 : 17, 1) + line(P.l, 11, 1) + line(P.a, 8.5, 1);
  if (breath != null) { var mid = [(P.H[0] + P.N[0]) / 2, (P.H[1] + P.N[1]) / 2]; s += '<circle id="fbreath" data-r="' + (30 * sc).toFixed(1) + '" cx="' + X(mid) + '" cy="' + Y(mid) + '" r="' + (30 * sc * breath).toFixed(1) + '" fill="url(#fgl)"/>'; }
  s += '<circle cx="' + X(P.hd) + '" cy="' + Y(P.hd) + '" r="' + (11 * sc).toFixed(1) + '" fill="url(#fgr)"/>';
  return s + '</svg>';
}
/* shortest-way blend between two frames */
function lerpA(a, b, k) { var d = ((b - a + 540) % 360) - 180; return a + d * k; }
function figMix(f1, f2, k) {
  var o = { v: k < 0.5 ? f1.v : f2.v, t: lerpA(f1.t, f2.t, k), h: lerpA(f1.h || 0, f2.h || 0, k) };
  ['a', 'b', 'l', 'm'].forEach(function (j) { o[j] = [lerpA(f1[j][0], f2[j][0], k), lerpA(f1[j][1], f2[j][1], k)]; });
  return o;
}
/* animate a demo into an element: start → pose → hold → back (or through every frame of a flow) */
var DEMO = { id: 0 };
function demoFrames(key) { var d = POSEFIG[key]; if (!d) return null; return d.map(frame); }
function demoHtml(key, H) { return POSEFIG[key] ? '<div class="demo" id="demo" data-k="' + key + '">' + figSvg(demoFrames(key)[demoFrames(key).length > 2 ? 1 : 1], 240, H || 180) + '</div>' : ''; }
function demoStart(key, H) {
  var el = document.getElementById('demo'); if (!el) return; var fr = demoFrames(key); if (!fr) return;
  if (DEMO.key === key && DEMO.alive) return; DEMO.key = key; DEMO.alive = true;
  var id = ++DEMO.id, seq = fr.length > 2 ? fr : [fr[0], fr[1], fr[0]], move = fr.length > 6 ? 900 : 1500, hold = fr.length > 6 ? 500 : 1400, t0 = performance.now();
  if (fr.length === 2) seq = [fr[0], fr[1], fr[1], fr[0]];
  var step = function (now) {
    if (DEMO.id !== id) return;
    if (!document.getElementById('demo')) { DEMO.alive = false; DEMO.key = ''; return; }
    var per = move + hold, n = seq.length - 1, el2 = (now - t0) % (per * n + 900), i = Math.min(n - 1, Math.floor(el2 / per)), into = el2 - i * per, k = Math.min(1, into / move);
    if (el2 >= per * n) { i = n - 1; k = 1; }
    k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    document.getElementById('demo').innerHTML = figSvg(figMix(seq[i], seq[i + 1], k), 240, H || 180);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* breathing figure for the pacer: torso glow grows with the breath */
function breathFig(k, scale) { var f = PRANAFIG[PRANA_HANDS[k] || 'gyan']; return figSvg(f, 200, 150, scale == null ? 0.6 : scale); }
