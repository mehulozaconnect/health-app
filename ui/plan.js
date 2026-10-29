/* Your yoga & pranayama plan: reads BP, sugar, weight, sleep, heart rate, food timing, medicines and lab reports,
   picks what helps, says why, how much, when in your day, what to expect, what to avoid, and whether it is working. */
'use strict';
function avgN(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
function lastDays(n) { var out = []; for (var i = 0; i < n; i++) out.push(addDays(today(), -i)); return out; }
function minOfDay(t) { var d = new Date(t); return d.getHours() * 60 + d.getMinutes(); }
function hmMin(m) { m = Math.round((m + 1440) % 1440); var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + ':' + pad(mm) + (h < 12 ? ' am' : ' pm'); }

/* ---------- what the data says ---------- */
function planContext() {
  var C = {}, ev = {}, add = function (id, sev, label, line) { if (!C[id] || C[id].sev < sev) C[id] = { id: id, sev: sev, label: label, ev: (C[id] || {}).ev || [] }; if (line) C[id].ev.push(line); };
  var now = Date.now(), cls = {}; (typeof meds === 'function' ? meds() : []).forEach(function (m) { cls[m.cls] = (cls[m.cls] || []).concat([m.name]); });
  /* blood pressure */
  var bp = merged('bp').filter(function (x) { return x.t > now - 30 * 86400000; });
  if (bp.length) {
    var s = Math.round(avgN(bp.map(function (x) { return x.sys; }))), d = Math.round(avgN(bp.map(function (x) { return x.dia; })));
    var line = 'BP averages ' + s + '/' + d + ' over ' + bp.length + ' reading' + (bp.length > 1 ? 's' : '') + ' in the last 30 days';
    if (s >= 140 || d >= 90) add('bp', 3, 'High blood pressure', line); else if (s >= 130 || d >= 85) add('bp', 2, 'BP on the higher side', line); else if (s >= 120 || d >= 80) add('bp', 1, 'BP upper normal', line);
    ev.bpAvg = [s, d];
    if (bp.length < 3 && C.bp) C.bp.ev[0] += ' — only ' + bp.length + ', so log BP a few times this week to confirm';
  } else { var lb = merged('bp')[0]; if (lb && (lb.sys >= 130 || lb.dia >= 85)) add('bp', 2, 'BP on the higher side', 'Last BP ' + lb.sys + '/' + lb.dia + ' (' + ago(lb.t) + ')'); }
  if (cls.bp || cls.diuretic) add('bp', Math.max(2, (C.bp || {}).sev || 0), (C.bp || {}).label || 'BP under treatment', 'On ' + (cls.bp || cls.diuretic).join(', ') + ' for BP');
  /* sugar */
  var su = merged('sugar').filter(function (x) { return x.type === 'fasting' && x.t > now - 60 * 86400000; });
  if (su.length) { var fs = Math.round(avgN(su.map(function (x) { return x.val; }))); if (fs >= 126) add('sugar', 3, 'High fasting sugar', 'Fasting sugar averages ' + fs + ' mg/dL'); else if (fs >= 100) add('sugar', 2, 'Fasting sugar above 100', 'Fasting sugar averages ' + fs + ' mg/dL'); }
  if (cls.sugar) add('sugar', 2, (C.sugar || {}).label || 'Sugar under treatment', 'On ' + cls.sugar.join(', '));
  var fl = reportFlags();
  fl.forEach(function (v) {
    var n = String(v.name).toLowerCase(), t = v.name + ' ' + v.value + ' ' + (v.unit || '') + ' (' + v.status + ') in your report';
    if (/hba1c|glucose|sugar/.test(n) && v.status !== 'low') add('sugar', v.status === 'high' ? 3 : 2, 'Sugar on the higher side', t);
    if (/ldl|cholesterol|triglycer/.test(n) && v.status !== 'low') add('chol', 2, 'Cholesterol', t);
    if (/tsh|t3|t4/.test(n)) add('thyroid', 2, 'Thyroid', t);
    if (/vitamin d/.test(n) && v.status === 'low') add('vitd', 1, 'Low vitamin D', t);
    if (/haemoglobin|hemoglobin|ferritin/.test(n) && v.status === 'low') add('energy', 1, 'Low energy', t);
  });
  if (cls.chol) add('chol', 2, 'Cholesterol', 'On ' + cls.chol.join(', '));
  if (cls.thyroid) add('thyroid', 1, 'Thyroid', 'On ' + cls.thyroid.join(', '));
  /* weight */
  var w = lastWeight() || DB.profile.weight, bmi = w / Math.pow(DB.profile.height / 100, 2);
  if (bmi >= 25) add('weight', 2, 'Weight above healthy range', 'BMI ' + n1(bmi) + ' (healthy for Indians: under 23) · goal ' + DB.profile.goal + ' kg');
  else if (bmi >= 23 || w > DB.profile.goal + 1) add('weight', 1, 'A few kg above goal', n1(w) + ' kg now, goal ' + DB.profile.goal + ' kg');
  /* sleep, heart, energy, oxygen, activity */
  var days = lastDays(7), sl = days.map(sleepFor).filter(Boolean);
  if (sl.length >= 2) {
    var as = avgN(sl.map(function (x) { return x.asleep; })), dp = avgN(sl.filter(function (x) { return !x.manual; }).map(function (x) { return x.m.deep / x.staged; })) || 0.15;
    if (as < 360) add('sleep', 3, 'Short sleep', 'Sleeping ' + dur(as) + ' a night on average'); else if (as < 420) add('sleep', 2, 'Sleep a bit short', 'Sleeping ' + dur(as) + ' a night on average');
    if (dp > 0 && dp < 0.13) add('sleep', Math.max(1, (C.sleep || {}).sev || 0), (C.sleep || {}).label || 'Light sleep', 'Deep sleep only ' + Math.round(dp * 100) + '% (usual 13–23%)');
    ev.bed = avgN(sl.map(function (x) { var m = minOfDay(x.start); return m < 720 ? m + 1440 : m; }));
  }
  var rh = days.map(function (k) { return DB.health && DB.health.restingHr ? DB.health.restingHr[k] : null; }).filter(function (x) { return x; });
  if (rh.length >= 3) { var r = Math.round(avgN(rh)); ev.rhr = r; if (r > 78) add('stress', 2, 'Stress / high resting heart rate', 'Resting heart rate around ' + r + ' bpm'); else if (r > 72) add('stress', 1, 'Stress', 'Resting heart rate around ' + r + ' bpm'); }
  var en = days.map(energyFor).filter(function (x) { return x != null; });
  if (en.length >= 2 && avgN(en) < 65) add('energy', 2, 'Low energy', 'Energy score averaging ' + Math.round(avgN(en)));
  var sp = days.map(spo2Night).filter(Boolean); if (sp.some(function (x) { return x.lowCount > 2; })) add('oxygen', 2, 'Oxygen dips at night', 'SpO₂ dipped under 90% on some nights');
  var st = days.map(stepsFor).filter(function (x) { return x != null && x > 0; }); if (st.length >= 3 && avgN(st) < 6000) add('energy', Math.max(1, (C.energy || {}).sev || 0), (C.energy || {}).label || 'Low activity', 'About ' + n0(avgN(st)) + ' steps a day');
  /* food habits */
  var late = 0, fried = 0, salty = 0, bf = [], dn = [];
  days.forEach(function (k) {
    var dd = dayIf(k); if (!dd) return;
    var din = dd.meals.dinner || []; if (din.length) { var lt = Math.max.apply(null, din.map(function (x) { return x.t; })); dn.push(minOfDay(lt)); if (new Date(lt).getHours() >= 21) late++; }
    var b = dd.meals.breakfast || []; if (b.length) bf.push(minOfDay(Math.min.apply(null, b.map(function (x) { return x.t; }))));
    dayItems(k).forEach(function (it) { if (/fried|pakora|bhaji|bhajiya|samosa|vada|kachori|puri|bhatura|chips|namkeen|farsan|fafda/i.test(it.n)) fried++; });
    if (dayTotals(k).na > 2300) salty++;
  });
  ev.breakfast = bf.length ? avgN(bf) : null; ev.dinner = dn.length ? avgN(dn) : null;
  if (late >= 3) add('digest', 1, 'Late dinners', 'Dinner after 9 pm on ' + late + ' of the last 7 days');
  if (fried >= 4) add('digest', 1, (C.digest || {}).label || 'Heavy, fried food', fried + ' fried items in the last 7 days');
  if (salty >= 3 && C.bp) C.bp.ev.push('Salt above 2,300 mg on ' + salty + ' of 7 days');
  if (cls.acid) add('digest', 2, 'Acidity', 'On ' + cls.acid.join(', ') + ' for acidity');
  /* medicines that change timing */
  ev.emptyMed = (typeof meds === 'function' ? meds() : []).filter(function (m) { return m.food === 'empty' || m.cls === 'thyroid'; }).map(function (m) { return { name: m.name, tm: (m.times || [])[0] }; })[0] || null;
  ev.cls = cls;
  var list = Object.keys(C).map(function (k) { return C[k]; }).sort(function (a, b) { return b.sev - a.sev; });
  return { C: C, list: list, ev: ev };
}

/* ---------- practices ---------- */
/* t: 'p' pranayama (pacer key) or 'y' pose; f: what it helps (weight per concern); no: reasons to avoid; slot: morning / meal / evening / night */
var PRACTICE = [
  { k: 'anulom', t: 'p', f: { bp: 3, stress: 3, sleep: 2, oxygen: 2, sugar: 1, thyroid: 1, energy: 1 }, slot: 'morning', min: 10,
    dose: function (X) { return X.C.bp && X.C.bp.sev >= 2 ? { r: [5, 0, 5, 0], rounds: 30, txt: '5 : 5 with no holding, 30 rounds (5 min). Build up to 10 min over 2 weeks.' } : { r: [6, 2, 6, 2], rounds: 20, txt: '6 : 2 : 6 : 2, 20 rounds (about 5 min). Build up to 10 min.' }; },
    why: 'Slow, even breathing through alternate nostrils settles the nervous system: heart rate and BP come down while you do it, and with daily practice it carries into the day.',
    expect: 'Calmer within a few days. In studies of daily slow breathing, systolic BP falls about 5–10 mmHg after 4–8 weeks.' },
  { k: 'bhramari', t: 'p', f: { sleep: 3, stress: 3, bp: 2 }, slot: 'night', min: 4,
    dose: function () { return { r: [4, 0, 8, 0], rounds: 9, txt: '9 rounds: breathe in 4, hum out 8 (about 2 min). Up to 11 rounds.' }; },
    why: 'The long humming out-breath slows breathing to about 5 a minute, which switches the body into rest mode.',
    expect: 'Most people fall asleep faster within 1–2 weeks of doing it every night.' },
  { k: 'chandra', t: 'p', f: { bp: 2, sleep: 2, digest: 2, stress: 1 }, slot: 'night', min: 4,
    dose: function (X) { return { r: X.C.bp && X.C.bp.sev >= 2 ? [5, 0, 6, 0] : [5, 2, 6, 0], rounds: 12, txt: '12 rounds, in through the left nostril, out through the right (about 2–3 min).' }; },
    why: 'Left-nostril breathing is the calming, cooling side in yoga practice; it is used for heat, acidity and racing thoughts.',
    expect: 'Feels calming straight away; best as part of your bedtime routine.' },
  { k: 'ujjayi', t: 'p', f: { stress: 2, thyroid: 2, bp: 1, sleep: 1 }, slot: 'evening', min: 3,
    dose: function () { return { r: [5, 0, 7, 0], rounds: 15, txt: '15 slow breaths, 5 in and 7 out, with a soft ocean sound (3 min).' }; },
    why: 'The slightly closed throat lengthens each breath; it is traditionally used for the throat and thyroid area.',
    expect: 'Helps you stay calm through the day; any thyroid effect is traditional rather than proven, so keep your tablets as prescribed.' },
  { k: 'udgeeth', t: 'p', f: { stress: 2, sleep: 1, bp: 1 }, slot: 'night', min: 2,
    dose: function () { return { r: [4, 0, 12, 0], rounds: 7, txt: '7 long Om chants (about 2 min).' }; },
    why: 'A long chanted out-breath is one of the simplest ways to slow the breath and the mind.', expect: 'Calm within minutes; steadier mood with daily practice.' },
  { k: 'meditative', t: 'p', f: { sleep: 3, stress: 2 }, slot: 'night', min: 2,
    dose: function () { return { r: [4, 7, 8, 0], rounds: 6, txt: '4 : 7 : 8, 6 rounds in bed (2 min). Shorten the hold if dizzy.' }; },
    why: 'The long out-breath and hold quieten a busy mind before sleep.', expect: 'Often helps on the first night; more over 2 weeks.' },
  { k: 'sheetali', t: 'p', f: { digest: 2, bp: 1 }, slot: 'evening', min: 2, no: function () { return null; },
    dose: function () { return { r: [4, 2, 6, 0], rounds: 12, txt: '12 rounds (about 2 min). Skip when you have a cough or cold.' }; },
    why: 'Breathing in through the rolled tongue cools the body; used for acidity and heat.', expect: 'Cooling within minutes.' },
  { k: 'kapal', t: 'p', f: { sugar: 3, weight: 3, chol: 2, digest: 1, energy: 1 }, slot: 'morning', min: 5,
    no: function (X) { return X.C.bp && X.C.bp.sev >= 2 ? (X.C.bp.ev[0] || 'BP is high') + '. Fast belly breathing pushes BP up; do slow breathing until BP stays under 130/85.' : null; },
    dose: function () { return { fast: [60, 30, 30], rounds: 3, txt: '3 rounds of 30 strokes, rest 30 s between (about 3 min). Build to 60 strokes.' }; },
    why: 'Sharp belly pumping works the abdominal muscles and digestion; it is the pranayama most used for sugar and weight.',
    expect: 'Alongside diet and walking, fasting sugar and waist usually improve over 8–12 weeks.', caution: 'Only on an empty stomach, at least 3 hours after food.' },
  { k: 'bhastrika', t: 'p', f: { energy: 2, weight: 1 }, slot: 'morning', min: 3,
    no: function (X) { return X.C.bp && X.C.bp.sev >= 2 ? (X.C.bp.ev[0] || 'BP is high') + '. Forceful breathing raises BP.' : null; },
    dose: function () { return { fast: [30, 20, 30], rounds: 3, txt: '3 rounds of 20 breaths (2 min).' }; },
    why: 'Deep, strong breaths wake the body up.', expect: 'More energy the same morning.' },
  { k: 'bahya', t: 'p', f: { digest: 2, sugar: 1 }, slot: 'morning', min: 3,
    no: function (X) { if (X.C.bp && X.C.bp.sev >= 2) return (X.C.bp.ev[0] || 'BP is high') + '. Holding the breath out with locks raises BP.'; if (X.ev.cls.acid) return 'You take ' + X.ev.cls.acid.join(', ') + ' for acidity; the strong belly lock can make it worse.'; return null; },
    dose: function () { return { r: [9, 0, 9, 6], rounds: 5, txt: 'Your 9 : 9 : 6, 5 rounds, empty stomach.' }; },
    why: 'Pulling the belly in and up while the breath is out massages the digestive organs.', expect: 'Better digestion over a few weeks.' },
  { k: 'surya', t: 'p', f: { energy: 2, thyroid: 1 }, slot: 'morning', min: 3,
    no: function (X) { if (X.C.bp && X.C.bp.sev >= 2) return 'Right-nostril breathing is warming and stimulating; not with raised BP.'; if (X.ev.cls.acid) return 'Warming breath; not with acidity.'; return null; },
    dose: function () { return { r: [5, 2, 6, 0], rounds: 12, txt: '12 rounds, in right, out left (3 min).' }; },
    why: 'Right-nostril breathing is the warming, energising side.', expect: 'Feels energising the same morning.' },
  { k: 'vajra', t: 'y', f: { digest: 3, sugar: 2 }, slot: 'meal', min: 7, dose: function () { return { txt: '5–10 minutes sitting on your heels right after lunch and dinner.' }; },
    why: 'The only pose meant for straight after a meal: it helps digestion and the after-meal sugar rise.', expect: 'Less heaviness and gas within a week.' },
  { k: 'manduka', t: 'y', f: { sugar: 2, digest: 1 }, slot: 'morning', min: 2, dose: function () { return { txt: '3 rounds of 20–30 seconds, empty stomach.' }; },
    why: 'Fists pressing the belly while folding forward works the pancreas area; widely used for sugar in Indian yoga practice.', expect: 'Part of a sugar routine; changes show over 6–12 weeks with diet.' },
  { k: 'viparita', t: 'y', f: { bp: 2, sleep: 2, stress: 2 }, slot: 'night', min: 5, dose: function () { return { txt: '3–5 minutes with legs up the wall before bed.' }; },
    why: 'A gentle inversion that relaxes the body without effort.', expect: 'Deeper relaxation the same night.' },
  { k: 'shava', t: 'y', f: { bp: 2, stress: 2, sleep: 1 }, slot: 'evening', min: 5, dose: function () { return { txt: '5 minutes, lying still, slow breathing.' }; },
    why: 'Deliberate deep relaxation; studies show it lowers BP and heart rate.', expect: 'Lower BP within the session; regular practice keeps it lower.' },
  { k: 'surya', t: 'y', yk: 'surya', f: { weight: 3, energy: 2, sugar: 2, vitd: 1, chol: 1 }, slot: 'morning', min: 10,
    no: function (X) { return X.C.bp && X.C.bp.sev >= 3 ? 'BP is high; do slow stretching first and add Surya Namaskar once BP is under control.' : null; },
    dose: function (X) { return { txt: (X.C.bp && X.C.bp.sev >= 2 ? 'Start with 4 slow rounds' : 'Start with 6 rounds') + ', add 2 rounds each week up to 12. ' + (X.C.vitd ? 'Do it in the morning sun for vitamin D.' : '') }; },
    why: 'A full-body flow that burns calories and builds strength and flexibility together.', expect: '12 rounds burn about 100–130 kcal; with your calorie budget it supports steady weight loss.' },
  { k: 'paschim', t: 'y', f: { digest: 1, sugar: 1, stress: 1 }, slot: 'morning', min: 1, dose: function () { return { txt: '45 seconds, 2 times.' }; },
    why: 'A calming forward bend that compresses the belly.', expect: 'Better flexibility in 2–3 weeks.' },
  { k: 'pawan', t: 'y', f: { digest: 2 }, slot: 'morning', min: 1, dose: function () { return { txt: '1 minute, morning.' }; }, why: 'Hugging the knees releases gas and eases the lower back.', expect: 'Relief from gas the same day.' },
  { k: 'sarvanga', t: 'y', f: { thyroid: 2 }, slot: 'morning', min: 1,
    no: function (X) { return X.C.bp && X.C.bp.sev >= 2 ? 'Inversions raise pressure in the head; not with raised BP. Bridge pose is a gentle alternative.' : null; },
    dose: function () { return { txt: '30 seconds, building to 1 minute.' }; }, why: 'Traditionally used for the thyroid; it presses the chin to the throat.', expect: 'Traditional benefit; keep your thyroid tablets as prescribed.' },
  { k: 'setu', t: 'y', f: { thyroid: 1, bp: 1 }, slot: 'morning', min: 2, dose: function () { return { txt: '3 rounds of 30 seconds.' }; }, why: 'A gentle chest opener and the safe alternative to shoulder stand.', expect: 'Stronger back and hips in 3–4 weeks.' }
];
var SLOTS = { morning: 'Morning, empty stomach', meal: 'After lunch and dinner', evening: 'Evening', night: 'Bedtime' };
function practName(p) { return p.t === 'p' ? PRANA[p.k][0] : pose(p.yk || p.k).name; }
function practKey(p) { return p.t + ':' + (p.yk || p.k); }

function makePlan() {
  var X = planContext(), rec = [], avoid = [];
  PRACTICE.forEach(function (p) {
    var sc = 0, hits = [];
    Object.keys(p.f).forEach(function (c) { if (X.C[c]) { sc += p.f[c] * X.C[c].sev; hits.push(X.C[c]); } });
    var no = p.no ? p.no(X) : null;
    if (no) { if (sc > 0 || practDone(p)) avoid.push({ p: p, why: no }); return; }
    if (!X.list.length) sc = (p.f.stress || 0) + (p.f.sleep || 0) * 0.5;
    if (sc > 0) rec.push({ p: p, sc: sc, hits: hits.sort(function (a, b) { return b.sev - a.sev; }), dose: p.dose(X) });
  });
  rec.sort(function (a, b) { return b.sc - a.sc; });
  /* keep a doable plan: up to 3 pranayama and 3 poses, about 25 minutes */
  var pr = rec.filter(function (r) { return r.p.t === 'p'; }).slice(0, 3), ys = rec.filter(function (r) { return r.p.t === 'y'; }).slice(0, 3);
  return { X: X, rec: pr.concat(ys), more: rec.filter(function (r) { return pr.indexOf(r) < 0 && ys.indexOf(r) < 0; }), avoid: avoid };
}
function practDone(p) { return p.t === 'p' ? breathHist(p.k).length > 0 : false; }
/* when in your day */
function slotTime(slot, X) {
  var ev = X.ev;
  if (slot === 'morning') {
    var bf = ev.breakfast, em = ev.emptyMed;
    if (em && bf) return 'Between ' + em.name + ' at ' + t12(em.tm) + ' and breakfast (usually ' + hmMin(bf) + ')';
    return bf ? 'Before breakfast, around ' + hmMin(bf - 45) + ' (you usually eat at ' + hmMin(bf) + ')' : 'Before breakfast';
  }
  if (slot === 'meal') return 'Straight after lunch and after dinner' + (ev.dinner ? ' (dinner usually ' + hmMin(ev.dinner) + ')' : '');
  if (slot === 'night') return ev.bed ? 'About ' + hmMin(ev.bed - 30) + ', 30 min before you usually sleep (' + hmMin(ev.bed) + ')' : '30 minutes before bed';
  return 'Evening, at least 2 hours after a meal';
}

/* is it working: numbers since you started pranayama */
function planProgress() {
  var hist = breathHist(); if (hist.length < 3) return null;
  var first = hist[hist.length - 1].k, d0 = fromKey(first).getTime(), daysOn = Math.round((Date.now() - d0) / 86400000);
  var before = function (arr, f) { return avgN(arr.filter(function (x) { return x.t < d0 && x.t > d0 - 30 * 86400000; }).map(f)); }, since = function (arr, f) { return avgN(arr.filter(function (x) { return x.t >= d0; }).map(f)); };
  var rows = [], bp = merged('bp');
  var b1 = before(bp, function (x) { return x.sys; }), b2 = since(bp, function (x) { return x.sys; });
  if (b1 && b2) rows.push(['BP (top number)', Math.round(b1), Math.round(b2), 'mmHg', true]);
  var su = merged('sugar').filter(function (x) { return x.type === 'fasting'; }), s1 = before(su, function (x) { return x.val; }), s2 = since(su, function (x) { return x.val; });
  if (s1 && s2) rows.push(['Fasting sugar', Math.round(s1), Math.round(s2), 'mg/dL', true]);
  var rh = DB.health && DB.health.restingHr ? Object.keys(DB.health.restingHr).map(function (k) { return { t: fromKey(k).getTime(), v: DB.health.restingHr[k] }; }) : [];
  var r1 = before(rh, function (x) { return x.v; }), r2 = since(rh, function (x) { return x.v; });
  if (r1 && r2) rows.push(['Resting heart rate', Math.round(r1), Math.round(r2), 'bpm', true]);
  var sl = []; for (var i = 0; i < 60; i++) { var k = addDays(today(), -i), s = sleepFor(k); if (s) sl.push({ t: fromKey(k).getTime(), v: s.score }); }
  var q1 = before(sl, function (x) { return x.v; }), q2 = since(sl, function (x) { return x.v; });
  if (q1 && q2) rows.push(['Sleep score', Math.round(q1), Math.round(q2), '', false]);
  var mins = Math.round(hist.reduce(function (a, x) { return a + x.s.sec; }, 0) / 60);
  return { first: first, days: daysOn, sessions: hist.length, mins: mins, rows: rows };
}

/* ---------- screens ---------- */
ROUTES.yplan = function () {
  var P = makePlan(), X = P.X, h = head('Your plan', 'Chosen from your health data');
  h += '<section class="c"><div class="l">PICKED FOR</div><p class="p15">' + (X.list.length ? X.list.map(function (c) { return esc(c.label); }).join(' · ') : 'Low stress and good sleep') + '</p>' +
    (X.list.length ? '<details><summary class="lnk">What I looked at</summary>' + X.list.map(function (c) { return '<div class="l mt6">• ' + esc(c.ev.join('; ')) + '</div>'; }).join('') + '</details>' : '') + '</section>';
  /* the day, in order */
  var bySlot = {}; P.rec.forEach(function (r) { (bySlot[r.p.slot] = bySlot[r.p.slot] || []).push(r); });
  var tot = P.rec.reduce(function (a, r) { return a + r.p.min; }, 0);
  h += '<h3 class="sech">Your day · about ' + tot + ' min</h3>';
  ['morning', 'meal', 'evening', 'night'].forEach(function (s) {
    if (!bySlot[s]) return;
    h += '<section class="c"><div class="kick2">' + icon(s === 'night' ? 'moon' : s === 'meal' ? 'food' : 'bolt', 16) + SLOTS[s].toUpperCase() + '</div><div class="l">' + esc(slotTime(s, X)) + '</div>' + bySlot[s].map(function (r) { return practCard(r, X); }).join('') + '</section>';
  });
  if (P.avoid.length) h += '<details class="c"><summary class="lnk">Avoid for now: ' + esc(P.avoid.map(function (a) { return practName(a.p); }).join(', ')) + '</summary>' + P.avoid.map(function (a) { return '<p class="p"><b>' + esc(practName(a.p)) + ':</b> ' + esc(a.why) + '</p>'; }).join('') + '</details>';
  var pg = planProgress();
  if (pg) h += '<section class="c"><h2>Is it working?</h2><div class="l">Since your first pranayama on ' + niceDate(pg.first) + ' · ' + pg.sessions + ' sessions, ' + pg.mins + ' min</div>' +
    (pg.rows.length ? pg.rows.map(function (r) { var dlt = r[2] - r[1], good = r[4] ? dlt < 0 : dlt > 0; return '<div class="rd"><span>' + r[0] + '</span><b>' + r[1] + ' → ' + r[2] + ' ' + r[3] + ' <small class="' + (dlt === 0 ? 'l' : good ? 'gtxt' : 'warnt') + '">' + (dlt > 0 ? '+' : '') + dlt + '</small></b></div>'; }).join('') + (pg.days < 28 ? '<div class="l mt6">Early days: real changes usually show after 4–8 weeks of daily practice.</div>' : '')
      : '<div class="l mt6">Log BP or sugar a few times a week so I can show you the change.</div>') + '</section>';
  if (P.more.length) h += '<details class="c"><summary class="lnk">More that could help (' + P.more.length + ')</summary>' + P.more.map(function (r) { return practCard(r, X); }).join('') + '</details>';
  h += '<div class="l ctrtxt">Pranayama and yoga support your treatment; they don\'t replace medicines or cure a condition on their own. Keep medicines as prescribed and review your numbers with your doctor.</div>';
  setTimeout(planDemos, 0);
  return h;
};
function practCard(r, X) {
  var p = r.p, key = p.yk || p.k, nm = practName(p);
  var NICE = { bp: 'BP', sugar: 'sugar', weight: 'weight', sleep: 'sleep', stress: 'stress', digest: 'digestion', chol: 'cholesterol', thyroid: 'thyroid', energy: 'energy', oxygen: 'night-time oxygen', vitd: 'vitamin D' };
  var why = r.hits.slice(0, 3).map(function (c) { return NICE[c.id] || c.label.toLowerCase(); });
  if (why.length > 1) why = [why.slice(0, -1).join(', '), why[why.length - 1]];
  return '<div class="pcard"><div class="pfig" data-fig="' + (p.t === 'p' ? 'p:' : 'y:') + key + '"></div><div class="f1"><b class="m16">' + esc(nm) + '</b>' +
    (why.length ? '<div class="sm gtxt">For your ' + esc(why.join(' and ')) + '</div>' : '') +
    '<div class="sm mt6">' + esc(r.dose.txt) + '</div>' + (p.caution ? '<div class="l warnt">' + esc(p.caution) + '</div>' : '') +
    '<details><summary class="lnk">Why it helps</summary><p class="p">' + esc(p.why) + '</p><p class="p"><b>What to expect:</b> ' + esc(p.expect) + '</p></details>' +
    (p.t === 'p' ? '<button class="btn sm mt6" data-act="planStart" data-k="' + p.k + '">' + icon('play', 16) + 'Start with these counts</button>' : '<button class="btn sm mt6" data-act="poseInfo" data-k="' + key + '">' + icon('play', 16) + 'See how</button>') + '</div></div>';
}
function planDemos() { document.querySelectorAll('.pfig').forEach(function (el) { var f = el.getAttribute('data-fig').split(':'); var fr = f[0] === 'p' ? PRANAFIG[PRANA_HANDS[f[1]] || 'gyan'] : (demoFrames(f[1]) || [])[1]; if (fr) el.innerHTML = figSvg(fr, 90, 80); }); }
ACT.planStart = function (el) {
  var k = el.getAttribute('data-k'), P = makePlan(), r = P.rec.concat(P.more).filter(function (x) { return x.p.k === k && x.p.t === 'p'; })[0];
  if (r) { var d = r.dose, c = pcfg(k); if (d.r) c.r = d.r.slice(); if (d.fast) c.fast = d.fast.slice(); if (d.rounds) c.rounds = d.rounds; DB.breath = DB.breath || {}; DB.breath[k] = { r: c.r, rounds: c.rounds, fast: c.fast }; save(); }
  go('breath/' + k);
};
/* short "for you" note on any pranayama screen */
function planNote(k) {
  var P = makePlan(), a = P.avoid.filter(function (x) { return x.p.t === 'p' && x.p.k === k; })[0];
  if (a) return '<div class="tip warn">' + icon('warn', 16) + '<span><b>Avoid for now:</b> ' + esc(a.why.split('. ').slice(-1)[0].replace(/\.$/, '')) + '. <button class="lnk" data-act="go" data-to="yplan">Why?</button></span></div>';
  var r = P.rec.concat(P.more).filter(function (x) { return x.p.t === 'p' && x.p.k === k; })[0];
  if (r && r.hits.length) return '<div class="tip">' + icon('check', 16) + '<span><b>Good for your ' + esc(r.hits.slice(0, 2).map(function (c) { return { bp: 'BP', sugar: 'sugar', sleep: 'sleep', stress: 'stress', digest: 'digestion', weight: 'weight' }[c.id] || c.label.toLowerCase(); }).join(' and ')) + '.</b> <button class="lnk" data-act="planStart" data-k="' + k + '">Use suggested counts</button></span></div>';
  return '';
}
function planTeaser() {
  var P = makePlan(), top = P.rec.slice(0, 3);
  return '<section class="c dark" data-act="go" data-to="yplan"><div class="kick">' + icon('spark', 16) + 'YOUR PLAN · FROM YOUR DATA</div><p class="p15">' + esc(top.map(function (r) { return practName(r.p); }).join(', ')) + '</p><div class="l">' +
    esc(P.X.list.length ? 'For ' + P.X.list.slice(0, 3).map(function (c) { return c.label.toLowerCase(); }).join(', ') : 'To keep stress low and sleep deep') + (P.avoid.length ? ' · ' + P.avoid.length + ' to avoid for now' : '') + '</div><span class="lnk mint">See why, how much and when →</span></section>';
}
TABOF.yplan = 'more';
