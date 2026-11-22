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
  var k = today(), tot = moveMin(k), kc = loggedKcal(k) + watchSessions(k).reduce(function (a, s) { return a + (s.kcal || 0); }, 0), rows = dayRows(k);
  var h = head('Activity', 'Log what you did; Arogya does the rest');
  h += '<button class="btn" data-act="logAct" style="margin-bottom:14px">' + icon('plus', 18) + 'Log activity</button>';
  h += '<div class="chips" style="margin:-4px 0 14px">' + ['yoga', 'prana', 'brisk', 'gym'].map(function (a) { return '<button class="chip" data-act="logAct" data-a="' + a + '">+ ' + actOf(a)[1] + '</button>'; }).join('') + '</div>';
  h += '<section class="c"><div class="row sb"><h2>Today</h2><b>' + tot + ' min · ' + kc + ' kcal</b></div>' +
    (rows || '<p class="l">Nothing yet today. Workouts from your watch show up here by themselves.</p>') + '</section>';
  /* week */
  var days = [], mx = 30; for (var i = 6; i >= 0; i--) { var dk = addDays(k, -i), m = moveMin(dk); days.push([dk, m]); mx = Math.max(mx, m); }
  var wt = days.reduce(function (a, x) { return a + x[1]; }, 0), act = days.filter(function (x) { return x[1] >= 30; }).length;
  h += '<section class="c"><div class="row sb"><h2>This week</h2><b>' + wt + ' min</b></div><div class="dwbars">' + days.map(function (x) { return '<div><i class="' + (x[1] >= 30 ? '' : 'lo') + '" style="height:' + Math.max(3, x[1] / mx * 100) + '%;background:' + (x[1] >= 30 ? '#16C79A' : '#BFE9DC') + '"></i><span>' + DOW[fromKey(x[0]).getDay()].slice(0, 2) + '</span></div>'; }).join('') + '</div>' +
    '<div class="l mt6">' + act + ' of 7 days with 30+ minutes. For BP, aim for 150 minutes a week.</div></section>';
  /* earlier days */
  var past = []; for (var j = 1; j <= 6; j++) { var pk = addDays(k, -j), pr = dayRows(pk); if (pr) past.push([pk, pr]); }
  if (past.length) h += '<section class="c"><h2>Earlier</h2>' + past.map(function (p) { return '<div class="l mt6">' + niceDate(p[0]) + '</div>' + p[1]; }).join('') + '</section>';
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

/* ---------- workouts from Samsung Health (watch) ---------- */
function watchAct(e) {
  var t = String((e.type || '') + ' ' + (e.title || '')).toUpperCase();
  return /YOGA|PILATES|STRETCH/.test(t) ? 'yoga' : /BREATH|MEDITAT/.test(t) ? 'prana' : /RUN/.test(t) ? 'run' : /WALK|HIK/.test(t) ? 'walk' : /CYCL|BIK|SPIN/.test(t) ? 'cycle' : /SWIM/.test(t) ? 'swim' : /WEIGHT|STRENGTH|CIRCUIT|CROSS|DUMB|BARBELL|PUSH|SQUAT|PLANK|GYM/.test(t) ? 'gym' : /DANC|ZUMBA|AEROBIC/.test(t) ? 'dance' : /STAIR|STEP/.test(t) ? 'stairs' : /BADMINTON|TENNIS|CRICKET|FOOTBALL|BASKET|VOLLEY|TABLE|SQUASH|GOLF/.test(t) ? 'sport' : 'other';
}
function watchSessions(k) {
  var ex = (DB.health && DB.health.exercise) || [];
  return ex.filter(function (e) { return dkey(new Date(e.start)) === k && !((DB.hideW || {})[e.start]); }).map(function (e) {
    var a = watchAct(e), A = actOf(a), min = e.sec ? e.sec / 60 : (e.end - e.start) / 60000;
    var nm = e.title && !/^Workout$/i.test(e.title) ? e.title.replace(/^Custom /i, '') : A[1];
    return { t: e.end, start: e.start, min: Math.round(min), kind: A[2], act: a, name: nm, prana: a === 'prana' ? 'watch' : undefined, kcal: e.kcal, hr: e.hr, hrMax: e.hrMax, dist: e.dist, auto: e.auto, src: 'watch' };
  }).filter(function (s) { return s.min >= 1; });
}
/* everything you did that day: watch workouts plus what you logged (a log the watch also recorded counts once) */
function dayActs(k) { var d = dayIf(k), mine = d ? d.yoga.filter(function (s) { return !watchCovers(s); }) : []; return watchSessions(k).concat(mine); }
moveMin = function (k) { return Math.round(dayActs(k).reduce(function (a, y) { return a + (y.min || 0); }, 0)); };
yogaMin = function (k) { return Math.round(dayActs(k).filter(function (y) { return !y.kind || y.kind === 'yoga'; }).reduce(function (a, y) { return a + (y.min || 0); }, 0)); };
ACT.watchInfo = function (el) {
  var k = el.getAttribute('data-k'), st = +el.getAttribute('data-s'), s = watchSessions(k).filter(function (x) { return x.start === st; })[0]; if (!s) return;
  sheet('<h2>' + esc(s.name) + '</h2><div class="l">From your watch · ' + hm(s.start) + '–' + hm(s.t) + (s.auto ? ' · detected automatically' : '') + '</div>' +
    '<div class="g2 mt">' + [['Duration', s.min + ' min'], ['Calories', s.kcal != null ? s.kcal + ' kcal' : '—'], ['Avg heart rate', s.hr ? s.hr + ' bpm' : '—'], ['Max heart rate', s.hrMax ? s.hrMax + ' bpm' : '—']].concat(s.dist ? [['Distance', (s.dist / 1000).toFixed(2) + ' km']] : []).map(function (x) { return '<div class="dwcmp"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>' +
    '<p class="l mt">Counted in your activity minutes, rewards and BP plan. Its calories already come in with your watch\'s active calories.</p><button class="btn sec mt" data-act="watchHide" data-s="' + st + '">Don\'t count this one</button>');
};
ACT.watchHide = function (el) { DB.hideW = DB.hideW || {}; DB.hideW[el.getAttribute('data-s')] = 1; save(); sheet(null); rerender(); toast('Not counted'); };
function watchRow(s, k) { return '<button class="res" data-act="watchInfo" data-k="' + k + '" data-s="' + s.start + '"><span class="actic">' + icon(s.kind === 'walk' ? 'steps' : s.kind === 'yoga' ? 'yoga' : 'bolt', 18) + '</span><span class="f1">' + esc(s.name) + ' <span class="wtag">watch</span><small>' + hm(s.start) + ' · ' + s.min + ' min' + (s.kcal != null ? ' · ' + s.kcal + ' kcal' : '') + (s.hr ? ' · ' + s.hr + ' bpm avg' : '') + '</small></span>' + icon('chev', 18) + '</button>'; }
/* list both kinds, newest first */
function dayRows(k) {
  var d = dayIf(k), rows = watchSessions(k).map(function (s) { return { t: s.start, h: watchRow(s, k) }; });
  (d ? d.yoga : []).forEach(function (s, i) { rows.push({ t: s.t, h: actRow(s, k, i).replace('</small>', (watchCovers(s) ? ' · also on watch, counted once' : '') + '</small>') }); });
  return rows.sort(function (a, b) { return b.t - a.t; }).map(function (r) { return r.h; }).join('');
}

/* pranayama section removed: old links land on Activity */
ROUTES.breaths = function () { return ROUTES.yoga(); }; TABOF.breaths = 'home';
