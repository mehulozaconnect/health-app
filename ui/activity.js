/* Activity: you log what you did and for how long. It feeds calories burned, rewards (move and yoga goals),
   the BP plan's walk and breathing ticks, the health plan and the coach. No suggested routines. */
'use strict';
/* key, label, log kind, effort (MET at moderate) */
var ACTS = [
  ['yoga', 'Yoga', 'yoga', 2.8], ['prana', 'Pranayama', 'yoga', 1.5], ['walk', 'Walk', 'walk', 3.5], ['brisk', 'Brisk walk', 'walk', 4.3],
  ['run', 'Running', 'other', 8.5], ['gym', 'Gym / strength', 'gym', 5], ['cycle', 'Cycling', 'cycle', 6], ['swim', 'Swimming', 'swim', 7],
  ['sport', 'Sports', 'sport', 6], ['dance', 'Dance', 'other', 5], ['stairs', 'Stairs', 'other', 6], ['other', 'Other', 'other', 4]
];
var AINT = { easy: [0.8, 'Easy'], mod: [1, 'Moderate'], hard: [1.3, 'Hard'] };
function actOf(k) { return ACTS.filter(function (a) { return a[0] === k; })[0] || ACTS[ACTS.length - 1]; }
/* calories: logged effort and intensity, else the old estimate */
var _sessionKcal = sessionKcal;
sessionKcal = function (s) {
  if (!s.act) return _sessionKcal(s);
  var kg = lastWeight() || DB.profile.weight || 70, met = actOf(s.act)[3] * (AINT[s.int || 'mod'] || AINT.mod)[0];
  return Math.max(0, Math.round((met - 1) * kg * (s.min || 0) / 60));
};

/* ---------- log sheet ---------- */
var LA = null;
ACT.logAct = function (el) {
  var pre = el && el.getAttribute ? el.getAttribute('data-a') : null;
  LA = { act: pre || (DB.lastAct || 'yoga'), min: pre === 'prana' ? 10 : pre === 'brisk' ? 30 : (DB.lastActMin || 30), int: 'mod', when: 'now', at: '', note: '', name: '', ek: null, ei: null };
  actSheet();
};
function actSheet() {
  var A = actOf(LA.act), rec = LA.ek ? '' : '';
  var h = '<h2>' + (LA.ek ? 'Edit activity' : 'What did you do?') + '</h2><div class="chips">' + ACTS.map(function (a) { return '<button class="chip' + (LA.act === a[0] ? ' dk' : '') + '" data-act="laPick" data-a="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>';
  if (LA.act === 'other' || LA.act === 'sport' || LA.act === 'gym') h += '<label class="fld">Name (optional)<input id="la_n" value="' + esc(LA.name) + '" placeholder="' + (LA.act === 'sport' ? 'Badminton, cricket…' : LA.act === 'gym' ? 'Weights, legs day…' : 'What was it?') + '"></label>';
  h += '<div class="l mt">How long?</div><div class="chips">' + [10, 15, 20, 30, 45, 60].map(function (m) { return '<button class="chip' + (LA.min === m ? ' dk' : '') + '" data-act="laMin" data-m="' + m + '">' + m + ' min</button>'; }).join('') + '</div>' +
    '<label class="fld">Or type minutes<input id="la_m" type="number" inputmode="numeric" value="' + LA.min + '"></label>';
  h += '<div class="l mt">How hard?</div><div class="chips">' + Object.keys(AINT).map(function (k) { return '<button class="chip' + (LA.int === k ? ' dk' : '') + '" data-act="laInt" data-i="' + k + '">' + AINT[k][1] + '</button>'; }).join('') + '</div>';
  if (!LA.ek) h += '<div class="l mt">When?</div><div class="chips">' + [['now', 'Just now'], ['earlier', 'Earlier today'], ['yday', 'Yesterday']].map(function (w) { return '<button class="chip' + (LA.when === w[0] ? ' dk' : '') + '" data-act="laWhen" data-w="' + w[0] + '">' + w[1] + '</button>'; }).join('') + '</div>' +
    (LA.when !== 'now' ? '<label class="fld">Finished at<input id="la_at" type="time" value="' + (LA.at || '07:00') + '"></label>' : '');
  h += '<label class="fld">Note (optional)<input id="la_note" value="' + esc(LA.note) + '"></label>';
  var est = sessionKcal({ act: LA.act, min: LA.min, int: LA.int });
  h += '<div class="l mt6">About ' + est + ' kcal burned' + (LA.act === 'brisk' || LA.act === 'walk' ? ' · counts toward your BP plan walk' : LA.act === 'prana' ? ' · counts toward your BP plan breathing' : '') + '</div>';
  h += '<button class="btn mt" data-act="laSave">' + (LA.ek ? 'Save changes' : 'Save') + '</button>' + (LA.ek ? '<button class="btn sec mt" data-act="laDel">' + icon('trash', 18) + 'Delete</button>' : '');
  sheet(h);
}
function laRead() {
  var g = function (id) { return document.getElementById(id); };
  if (g('la_m') && +g('la_m').value > 0) LA.min = Math.min(600, Math.round(+g('la_m').value));
  if (g('la_n')) LA.name = g('la_n').value.trim(); if (g('la_note')) LA.note = g('la_note').value.trim(); if (g('la_at')) LA.at = g('la_at').value;
}
ACT.laPick = function (el) { laRead(); LA.act = el.getAttribute('data-a'); actSheet(); };
ACT.laMin = function (el) { laRead(); LA.min = +el.getAttribute('data-m'); actSheet(); };
ACT.laInt = function (el) { laRead(); LA.int = el.getAttribute('data-i'); actSheet(); };
ACT.laWhen = function (el) { laRead(); LA.when = el.getAttribute('data-w'); actSheet(); };
ACT.laSave = function () {
  laRead(); if (!(LA.min > 0)) return toast('Enter minutes');
  var A = actOf(LA.act), rec = { min: LA.min, kind: A[2], act: LA.act, int: LA.int, name: LA.name || A[1], note: LA.note, src: 'log' };
  if (LA.act === 'prana') rec.prana = 'any';
  if (LA.ek) { var d = day(LA.ek), old = d.yoga[LA.ei]; rec.t = old.t; d.yoga[LA.ei] = rec; }
  else {
    var k = LA.when === 'yday' ? addDays(today(), -1) : today(), t = Date.now();
    if (LA.when !== 'now' && LA.at) { var dt = fromKey(k); dt.setHours(+LA.at.slice(0, 2), +LA.at.slice(3), 0, 0); t = dt.getTime(); }
    rec.t = t; day(k).yoga.push(rec); DB.lastAct = LA.act; DB.lastActMin = LA.min;
  }
  var kc = sessionKcal(rec); LA = null; save(); sheet(null); feel('done'); rerender();
  toast(rec.name + ' · ' + rec.min + ' min · ' + kc + ' kcal burned');
};
ACT.laDel = function () { day(LA.ek).yoga.splice(LA.ei, 1); LA = null; save(); sheet(null); rerender(); toast('Deleted'); };
ACT.actEdit = function (el) {
  var k = el.getAttribute('data-k'), i = +el.getAttribute('data-i'), s = day(k).yoga[i]; if (!s) return;
  var a = s.act || (s.prana ? 'prana' : s.kind === 'walk' ? 'walk' : s.kind === 'gym' ? 'gym' : s.kind === 'cycle' ? 'cycle' : s.kind === 'swim' ? 'swim' : s.kind === 'sport' ? 'sport' : s.kind === 'yoga' || !s.kind ? 'yoga' : 'other');
  LA = { act: a, min: Math.round(s.min || 0), int: s.int || 'mod', when: 'now', at: '', note: s.note || '', name: s.act ? (s.name === actOf(a)[1] ? '' : s.name) : '', ek: k, ei: i };
  actSheet();
};

/* ---------- the screen (replaces the old yoga and exercise screens) ---------- */
function actName(s) { return s.name || (s.prana ? 'Pranayama' : s.kind === 'walk' ? 'Walk' : 'Yoga'); }
function actRow(s, k, i) { return '<button class="res" data-act="actEdit" data-k="' + k + '" data-i="' + i + '"><span class="actic">' + icon(s.kind === 'walk' ? 'steps' : s.kind === 'yoga' || !s.kind ? 'yoga' : 'bolt', 18) + '</span><span class="f1">' + esc(actName(s)) + '<small>' + hm(s.t) + ' · ' + Math.round(s.min) + ' min' + (s.int && s.int !== 'mod' ? ' · ' + AINT[s.int][1].toLowerCase() : '') + ' · ' + sessionKcal(s) + ' kcal' + (s.note ? ' · ' + esc(s.note) : '') + '</small></span>' + icon('chev', 18) + '</button>'; }
ROUTES.yoga = function () {
  var k = today(), d = dayIf(k), ys = d ? d.yoga : [], tot = moveMin(k), kc = loggedKcal(k);
  var h = head('Activity', 'Log what you did; Arogya does the rest');
  h += '<button class="btn" data-act="logAct" style="margin-bottom:14px">' + icon('plus', 18) + 'Log activity</button>';
  h += '<div class="chips" style="margin:-4px 0 14px">' + ['yoga', 'prana', 'brisk', 'gym'].map(function (a) { return '<button class="chip" data-act="logAct" data-a="' + a + '">+ ' + actOf(a)[1] + '</button>'; }).join('') + '</div>';
  h += '<section class="c"><div class="row sb"><h2>Today</h2><b>' + tot + ' min · ' + kc + ' kcal</b></div>' +
    (ys.length ? ys.map(function (s, i) { return { s: s, i: i }; }).sort(function (a, b) { return b.s.t - a.s.t; }).map(function (x) { return actRow(x.s, k, x.i); }).join('') : '<p class="l">Nothing logged yet today.</p>') + '</section>';
  /* week */
  var days = [], mx = 30; for (var i = 6; i >= 0; i--) { var dk = addDays(k, -i), m = moveMin(dk); days.push([dk, m]); mx = Math.max(mx, m); }
  var wt = days.reduce(function (a, x) { return a + x[1]; }, 0), act = days.filter(function (x) { return x[1] >= 30; }).length;
  h += '<section class="c"><div class="row sb"><h2>This week</h2><b>' + wt + ' min</b></div><div class="dwbars">' + days.map(function (x) { return '<div><i class="' + (x[1] >= 30 ? '' : 'lo') + '" style="height:' + Math.max(3, x[1] / mx * 100) + '%;background:' + (x[1] >= 30 ? '#16C79A' : '#BFE9DC') + '"></i><span>' + DOW[fromKey(x[0]).getDay()].slice(0, 2) + '</span></div>'; }).join('') + '</div>' +
    '<div class="l mt6">' + act + ' of 7 days with 30+ minutes. For BP, aim for 150 minutes a week.</div></section>';
  /* earlier days */
  var past = []; for (var j = 1; j <= 6; j++) { var pk = addDays(k, -j), pd = dayIf(pk); if (pd && pd.yoga.length) past.push([pk, pd]); }
  if (past.length) h += '<section class="c"><h2>Earlier</h2>' + past.map(function (p) { return '<div class="l mt6">' + niceDate(p[0]) + '</div>' + p[1].yoga.map(function (s, i) { return actRow(s, p[0], i); }).join(''); }).join('') + '</section>';
  h += '<p class="l">What you log adds to calories burned, your rewards, the BP plan walk and breathing ticks, and what the coach knows.' + (DB.health && DB.health.exercise && DB.health.exercise.length ? ' Sessions your watch already recorded are not counted twice.' : '') + '</p>';
  return h;
};
TABOF.yoga = 'home'; HERO['Activity'] = ['steps', '#16C79A'];

/* ---------- take out the suggested exercise elsewhere ---------- */
/* BP plan: no wall-sit timer; walk and breathing tick from what you log */
(function () { for (var i = BPH.length - 1; i >= 0; i--) if (BPH[i][0] === 'wall') BPH.splice(i, 1); })();
BPH.forEach(function (x) { if (x[0] === 'walk') x[3] = 'Log it under Activity; 30 minutes ticks this'; if (x[0] === 'breath') x[3] = 'Log pranayama under Activity; 10 minutes ticks this'; });
/* rewards: the health-plan exercise goal and its badges go */
(function () {
  for (var i = GOALS.length - 1; i >= 0; i--) if (GOALS[i][0] === 'plan') GOALS.splice(i, 1);
  for (var j = BADGES.length - 1; j >= 0; j--) if (BADGES[j][0] === 'plan7' || BADGES[j][0] === 'plan30') BADGES.splice(j, 1);
})();
/* health plan: no daily exercise list */
hpExToday = function () { return []; };
