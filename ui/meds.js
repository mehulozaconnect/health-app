/* Medicines: schedule, doses, reminders, stock — and what they mean next to food, BP, sugar and reports */
'use strict';

/* kind of medicine, worked out from the name. [key, label, name pattern, nutrient index in MIC (supplements), lab tests it relates to] */
var MCLS = [
  ['bp', 'Blood pressure', /amlo|amlod|stamlo|telm|telvas|losar|losacar|olmes|olmy|valsar|irbes|cilni|cilacar|ramip|cardace|enalap|lisinop|metopr|met.?xl|atenol|aten\b|nebiv|nebicard|bisopr|concor|carved|prazos|clonid|nifed|azils|azilsartan|repace|amtas|starpress/i, null, []],
  ['sugar', 'Diabetes / sugar', /metform|glycomet|gluconorm|glucophage|obimet|glimep|amaryl|glimisave|gemer|zoryl|glicla|diamicron|reclide|sitag|januv|istavel|zita|vildag|galvus|jalra|teneli|tenepla|dapag|forxiga|oxra|empag|jardian|canagl|voglib|volix|pioglit|pioz|linagl|trajenta|insulin|lantus|basalog|tresiba|ryzodeg|humalog|novorapid|novomix|mixtard|huminsulin|semaglut|rybelsus|ozempic|dulaglut|trulicity/i, null, ['hba1c', 'fasting glucose', 'fasting blood sugar', 'fasting sugar', 'post prandial glucose', 'pp glucose']],
  ['chol', 'Cholesterol', /atorv|atorva|storvas|lipitor|rosuv|rozavel|rosuvas|rozucor|simvas|pitav|statin|fenofib|ezetim|bempedo/i, null, ['ldl cholesterol', 'ldl', 'total cholesterol', 'triglycerides', 'hdl cholesterol']],
  ['thyroid', 'Thyroid', /thyrox|eltrox|levothy|thyronorm|thyroup|lethyrox|levoxin|carbimaz|neo.?mercazole|methimaz/i, null, ['tsh', 't4', 'free t4', 't3']],
  ['thin', 'Blood thinner (aspirin type)', /ecosprin|aspirin|clopid|clopilet|deplatt|prasug|ticagr|brilinta/i, null, []],
  ['anticoag', 'Blood thinner (warfarin type)', /warfarin|warf\b|acitrom|acenocou|apixab|eliquis|rivarox|xarelto|dabigat|pradaxa/i, null, ['inr', 'pt/inr']],
  ['acid', 'Acidity', /pantop|pan.?d\b|pan.?40|pantocid|omepr|omez|esomep|nexpro|rabep|razo|rablet|lansop|famot|ranit|vonopraz/i, null, []],
  ['diuretic', 'Water pill (diuretic)', /furosem|lasix|torsem|dytor|spironol|aldactone|eplere|hydrochlor|hctz|chlorthal|indapam|lasilactone/i, null, ['sodium', 'potassium', 'creatinine']],
  ['vitd', 'Vitamin D', /vitamin.?d|\bd3\b|d.?rise|cholecal|calcirol|uprise|tayo|arachitol|d3.?must|lumia/i, 16, ['vitamin d', '25-oh vitamin d', 'vitamin d3']],
  ['b12', 'Vitamin B12', /b.?12|methylcob|mecobal|nurokind|neurobion|cobadex/i, null, ['vitamin b12', 'b12']],
  ['calcium', 'Calcium', /calcium|shelcal|ccm\b|calcimax|gemcal|cipcal|ostocalcium/i, 0, ['calcium']],
  ['iron', 'Iron', /\biron\b|ferrous|ferric|orofer|livogen|autrin|dexorange|fefol|ferium|hemfer/i, 1, ['haemoglobin', 'hemoglobin', 'ferritin', 'serum iron']],
  ['magnesium', 'Magnesium', /magnes/i, 2, ['magnesium']],
  ['zinc', 'Zinc', /\bzinc\b|zincovit/i, 3, ['zinc']],
  ['omega', 'Omega-3 / fish oil', /omega|fish oil|flax|maxepa/i, null, []],
  ['multi', 'Multivitamin', /multivit|becosules|supradyn|revital|a.?to.?z|bplex|b.?complex|neurobion forte/i, null, []],
  ['homeo', 'Homeopathy', /(^|\s|[a-z])(3|6|12|30|200|1000)\s*(c|ch|x)?$|\b(1m|10m|mt|q)$|\bsbl\b|schwabe|bakson|reckeweg|bjain|bryonia|byra|arnica|nux.?vom|rhus.?tox|belladonna|pulsatilla|lycopodium|thuja|natrum|kali.?phos|kali.?mur|mag.?phos|ferrum.?phos|calc.?phos|calc.?carb|biochemic|mother tincture|silicea|sepia|ignatia|gelsemium|aconite|chamomilla|hepar/i, null, []],
  ['ayur', 'Ayurveda / herbal', /churna|vati|bhasma|asava|arishta|kwath|kadha|guggul|triphala|ashwagandha|giloy|chyawan|shilajit|brahmi|tulsi|neem|amla|divya|patanjali|himalaya|dabur|baidyanath|kapiva|isabgol/i, null, []],
  ['other', 'Other', /$^/, null, []]
];
function mcls(key) { return MCLS.filter(function (c) { return c[0] === key; })[0] || MCLS[MCLS.length - 1]; }
function guessCls(name) { var c = MCLS.filter(function (x) { return x[2].test(name || ''); })[0]; return c ? c[0] : 'other'; }
/* form: [key, label, unit, units, step, default amount, counted in stock] */
var FORMS = [['tablet', 'Tablet', 'tablet', 'tablets', 0.5, 1, 1], ['capsule', 'Capsule', 'capsule', 'capsules', 1, 1, 1], ['pills', 'Pills (globules)', 'pill', 'pills', 1, 4, 0], ['drops', 'Drops', 'drop', 'drops', 1, 5, 0],
  ['syrup', 'Syrup / liquid', 'ml', 'ml', 2.5, 5, 0], ['powder', 'Powder / churna', 'tsp', 'tsp', 0.5, 1, 0], ['sachet', 'Sachet', 'sachet', 'sachets', 1, 1, 1], ['injection', 'Injection', 'unit', 'units', 1, 10, 0],
  ['inhaler', 'Inhaler', 'puff', 'puffs', 1, 2, 0], ['cream', 'Cream / gel', 'application', 'applications', 1, 1, 0]];
function form(k) { return FORMS.filter(function (f) { return f[0] === k; })[0] || FORMS[0]; }
function unitOf(m, n) { var f = form(m.form); return (n == null ? +m.qty || 1 : n) === 1 ? f[2] : f[3]; }
var FOODW = [['after', 'After food'], ['before', 'Before food'], ['with', 'With food'], ['empty', 'Empty stomach'], ['any', 'Any time']];
var MDOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function meds(all) { return (DB.meds || []).filter(function (m) { return all || m.on !== false; }); }
function medById(id) { return (DB.meds || []).filter(function (m) { return m.id === id; })[0]; }
function medLabel(m) { return m.name + (m.dose ? ' ' + m.dose : ''); }
function medQty(m) { return frac(+m.qty || 1) + ' ' + unitOf(m) + (m.form === 'drops' && m.cls === 'homeo' ? ' in a little water' : ''); }
function t12(s) { var p = String(s).split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + (h < 12 ? ' am' : ' pm'); }
function tmin(s) { var p = String(s).split(':'); return +p[0] * 60 + +p[1]; }
/* is this medicine due on day k? */
function medDue(m, k) {
  if (m.start && k < m.start) return false; if (m.end && k > m.end) return false;
  if (m.every > 1) { var d0 = fromKey(m.start || k), n = Math.round((fromKey(k) - d0) / 86400000); return n % m.every === 0; }
  return !m.days || !m.days.length || m.days.indexOf(fromKey(k).getDay()) >= 0;
}
function medLog(k) { DB.medLog = DB.medLog || {}; return DB.medLog[k] || (DB.medLog[k] = {}); }
function dosesFor(k, all) {
  var out = [];
  meds(all).forEach(function (m) { if (!medDue(m, k)) return; (m.times || ['08:00']).forEach(function (tm) { var key = m.id + '|' + tm, l = (DB.medLog && DB.medLog[k] || {})[key]; out.push({ m: m, tm: tm, key: key, st: l ? l.s : '', at: l ? l.t : 0 }); }); });
  return out.sort(function (a, b) { return tmin(a.tm) - tmin(b.tm); });
}
/* adherence over the last n days (today counts only doses already due) */
function adherence(n, medId) {
  var tk = 0, due = 0, now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), k0 = today();
  for (var i = 0; i < n; i++) {
    var k = addDays(k0, -i);
    dosesFor(k).forEach(function (d) { if (medId && d.m.id !== medId) return; if (d.m.added && k < d.m.added) return; if (k === k0 && tmin(d.tm) > nm - 60 && d.st !== 'taken') return; due++; if (d.st === 'taken') tk++; });
  }
  return { taken: tk, due: due, pct: due ? Math.round(tk / due * 100) : null };
}
function perDay(m) { var n = (m.times || []).length * (+m.qty || 1); if (m.every > 1) return n / m.every; if (m.days && m.days.length) return n * m.days.length / 7; return n; }
function daysLeft(m) { return !form(m.form)[6] || m.stock == null || m.stock === '' ? null : Math.floor(+m.stock / Math.max(0.01, perDay(m))); }

/* supplements count towards the day's vitamins and minerals */
function suppMicros(k) {
  var add = MIC.map(function () { return 0; });
  /* a weekly 60,000 IU capsule counts as 1/7 of it each day of that week, if the dose was taken */
  meds(true).forEach(function (m) {
    var c = mcls(m.cls); if (c[3] == null || !(+m.amt > 0)) return;
    var ev = +m.every > 1 ? +m.every : 1, per = +m.amt * (+m.qty || 1) / ev; if (c[0] === 'vitd' && m.amtU === 'IU') per = per / 40;
    if (m.days && m.days.length && ev === 1) per = per * m.days.length / 7;
    for (var i = 0; i < Math.max(ev, m.days && m.days.length ? 7 : 1); i++) {
      var dk = addDays(k, -i); if (!medDue(m, dk)) continue;
      var lg = (DB.medLog || {})[dk] || {}, n = (m.times || []).filter(function (t) { return lg[m.id + '|' + t] && lg[m.id + '|' + t].s === 'taken'; }).length;
      add[c[3]] += per * n; break;
    }
  });
  return add;
}

/* ---------- doses: take / skip ---------- */
ACT.medTake = function (el) { var k = el.getAttribute('data-k') || today(), key = el.getAttribute('data-key'), l = medLog(k), m = medById(key.split('|')[0]);
  if (l[key] && l[key].s === 'taken') { delete l[key]; if (m && m.stock != null && m.stock !== '') m.stock = +m.stock + (+m.qty || 1); toast('Marked not taken'); }
  else { l[key] = { s: 'taken', t: Date.now() }; if (m && m.stock != null && m.stock !== '') m.stock = Math.max(0, +m.stock - (+m.qty || 1)); toast('Taken · ' + (m ? medLabel(m) : '')); }
  save(); rerender(); };
ACT.medSkip = function (el) { var k = el.getAttribute('data-k') || today(), key = el.getAttribute('data-key'), l = medLog(k); if (l[key] && l[key].s === 'skip') delete l[key]; else l[key] = { s: 'skip', t: Date.now() }; save(); rerender(); };
ACT.medAllNow = function () { var k = today(), nm = new Date().getHours() * 60 + new Date().getMinutes(); dosesFor(k).forEach(function (d) { if (!d.st && tmin(d.tm) <= nm + 30) ACT.medTake({ getAttribute: function (a) { return a === 'data-key' ? d.key : k; } }); }); };
function doseRow(d, k) {
  var late = !d.st && k === today() && tmin(d.tm) < new Date().getHours() * 60 + new Date().getMinutes() - 60, fw = FOODW.filter(function (f) { return f[0] === d.m.food; })[0];
  return '<div class="dose' + (d.st === 'taken' ? ' ok' : d.st === 'skip' ? ' sk' : late ? ' late' : '') + '"><div class="dt">' + t12(d.tm) + '</div><div class="f1" data-act="go" data-to="med/' + d.m.id + '"><b>' + esc(medLabel(d.m)) + '</b><small>' + medQty(d.m) + (fw && fw[0] !== 'any' ? ' · ' + fw[1].toLowerCase() : '') + (d.st === 'taken' ? ' · taken ' + hm(d.at) : d.st === 'skip' ? ' · skipped' : late ? ' · missed?' : '') + '</small></div>' +
    (d.st === 'taken' ? '<button class="dbtn on" data-act="medTake" data-k="' + k + '" data-key="' + d.key + '" aria-label="Undo">' + icon('check', 20) + '</button>' :
      '<button class="dbtn sk" data-act="medSkip" data-k="' + k + '" data-key="' + d.key + '">' + (d.st === 'skip' ? 'Undo' : 'Skip') + '</button><button class="dbtn" data-act="medTake" data-k="' + k + '" data-key="' + d.key + '" aria-label="Taken">' + icon('check', 20) + '</button>') + '</div>';
}

/* ---------- home card ---------- */
function medsCard() {
  if (!meds().length) return '';
  var k = today(), ds = dosesFor(k), done = ds.filter(function (d) { return d.st === 'taken'; }).length, nm = new Date().getHours() * 60 + new Date().getMinutes();
  var open = ds.filter(function (d) { return !d.st; }), show = open.filter(function (d) { return tmin(d.tm) <= nm + 90; }).slice(0, 3), next = open.filter(function (d) { return tmin(d.tm) > nm + 90; })[0];
  var h = '<section class="c"><div class="row sb" data-act="go" data-to="meds"><div><div class="l">Medicines today</div><b class="m22">' + done + ' / ' + ds.length + ' <small>taken</small></b></div>' + icon('chev', 18) + '</div>';
  if (show.length) h += show.map(function (d) { return doseRow(d, k); }).join('');
  else if (ds.length && done === ds.length) h += '<div class="l mt6">All done for today.</div>';
  if (next) h += '<div class="l mt6">Next: ' + esc(medLabel(next.m)) + ' at ' + t12(next.tm) + '</div>';
  var low = meds().filter(function (m) { var d = daysLeft(m); return d != null && d <= (+m.refill || 7); });
  if (low.length) h += '<div class="note warn mt">' + icon('warn', 16) + ' Refill soon: ' + low.map(function (m) { return esc(m.name) + ' (' + daysLeft(m) + ' d left)'; }).join(', ') + '</div>';
  return h + '</section>';
}

/* ---------- what Arogya notices ---------- */
function avgOf(a, f) { return a.length ? a.reduce(function (s, x) { return s + f(x); }, 0) / a.length : 0; }
function takenOn(k, cls) { var ds = dosesFor(k, true).filter(function (d) { return d.m.cls === cls; }); if (!ds.length) return null; return ds.every(function (d) { return d.st === 'taken'; }); }
function labSeries(names) {
  var out = [];
  DB.reports.forEach(function (r) { (r.values || []).forEach(function (v) { if (names.indexOf(String(v.name).toLowerCase()) >= 0) out.push({ t: r.date ? fromKey(r.date).getTime() : r.t, date: r.date || dkey(new Date(r.t)), name: v.name, value: v.value, unit: v.unit || '', status: v.status || '' }); }); });
  return out.sort(function (a, b) { return a.t - b.t; });
}
function itemsNear(k, t, before, after, re) { return dayItems(k).filter(function (it) { return it.t >= t - before * 60000 && it.t <= t + after * 60000 && (!re || re.test(it.n)); }); }
function medInsights(medOnly) {
  var out = [], k = today(), y = addDays(k, -1), list = meds(), has = function (c) { return list.some(function (m) { return m.cls === c; }); }, add = function (lvl, text, id) { if (!medOnly || medOnly === id || (id && medOnly === id)) out.push({ lvl: lvl, text: text, id: id }); };
  if (!list.length) return out;
  /* 1. doses */
  list.forEach(function (m) {
    var a = adherence(7, m.id);
    if (a.due >= 3 && a.pct < 80) add('warn', 'Missed ' + (a.due - a.taken) + ' of ' + a.due + ' doses of ' + medLabel(m) + ' in the last 7 days.', m.id);
    else if (a.due >= 5 && a.pct === 100) add('good', 'Every dose of ' + medLabel(m) + ' taken this week.', m.id);
    var dl = daysLeft(m); if (dl != null && dl <= (+m.refill || 7)) add('warn', (dl <= 0 ? 'Out of ' : 'Only ' + dl + ' days of ') + medLabel(m) + (dl <= 0 ? '' : ' left') + '. Time to refill.', m.id);
  });
  /* 2. BP medicine vs BP readings */
  list.filter(function (m) { return m.cls === 'bp' || m.cls === 'diuretic'; }).forEach(function (m) {
    var bp = merged('bp'), st = m.start ? fromKey(m.start).getTime() : 0;
    var before = bp.filter(function (x) { return st && x.t < st && x.t > st - 60 * 86400000; }), after = bp.filter(function (x) { return x.t >= st; }).slice(0, 20);
    var fs = function (a) { return Math.round(avgOf(a, function (x) { return x.sys; })) + '/' + Math.round(avgOf(a, function (x) { return x.dia; })); };
    if (before.length >= 2 && after.length >= 2) {
      var ds = avgOf(after, function (x) { return x.sys; }) - avgOf(before, function (x) { return x.sys; });
      add(ds <= -5 ? 'good' : 'info', 'Since starting ' + m.name + ' (' + niceDate(m.start) + '), BP averages ' + fs(after) + ', against ' + fs(before) + ' in the weeks before.', m.id);
    }
    var on = [], off = [];
    after.forEach(function (x) { var t = takenOn(dkey(new Date(x.t)), m.cls); if (t === true) on.push(x); else if (t === false) off.push(x); });
    if (on.length >= 2 && off.length >= 2) add('info', 'BP on days you took every dose: ' + fs(on) + '. On days a dose was missed: ' + fs(off) + '.', m.id);
    var r7 = bp.filter(function (x) { return x.t > Date.now() - 14 * 86400000; }), a14 = adherence(14, m.id);
    if (r7.length >= 3 && a14.pct >= 80 && avgOf(r7, function (x) { return x.sys; }) >= 140) add('warn', 'BP has averaged ' + fs(r7) + ' over 2 weeks even with regular doses. Worth showing these readings to your doctor.', m.id);
    var lb = bp[0]; if (lb && dkey(new Date(lb.t)) === k && takenOn(k, m.cls) === false && (lb.sys >= 140 || lb.dia >= 90)) add('warn', 'Today\'s BP ' + lb.sys + '/' + lb.dia + ' came on a day a dose of ' + m.name + ' is still pending.', m.id);
  });
  /* 3. sugar medicine vs sugar readings and meals */
  list.filter(function (m) { return m.cls === 'sugar'; }).forEach(function (m) {
    var su = merged('sugar').filter(function (x) { return x.type === 'fasting'; }), st = m.start ? fromKey(m.start).getTime() : 0;
    var before = su.filter(function (x) { return st && x.t < st && x.t > st - 60 * 86400000; }), after = su.filter(function (x) { return x.t >= st; }).slice(0, 20);
    if (before.length >= 2 && after.length >= 2) add('info', 'Fasting sugar since starting ' + m.name + ': ' + Math.round(avgOf(after, function (x) { return x.val; })) + ' mg/dL average, against ' + Math.round(avgOf(before, function (x) { return x.val; })) + ' before.', m.id);
    if (/glimep|amaryl|glimisave|gemer|zoryl|glicla|diamicron|reclide|insulin|lantus|basalog|tresiba|ryzodeg|humalog|novorapid|novomix|mixtard|huminsulin/i.test(m.name)) {
      dosesFor(k).forEach(function (d) { if (d.m.id === m.id && d.st === 'taken' && Date.now() - d.at > 45 * 60000 && Date.now() - d.at < 4 * 3600000 && !itemsNear(k, d.at, 30, 60).length) add('warn', m.name + ' was taken at ' + hm(d.at) + ' and no food is logged since. This kind of medicine can drop sugar too low without a meal — eat something soon if you haven\'t.', m.id); });
    }
    if (/metform|glycomet|gluconorm|glucophage|obimet/i.test(m.name) && reportFlags().some(function (v) { return /b12/i.test(v.name) && v.status === 'low'; })) add('info', 'Your report shows low vitamin B12. Metformin can lower B12 over time — mention it to your doctor.', m.id);
  });
  /* 4. thyroid tablet timing */
  var seen = {}; add = (function (base) { return function (lvl, text, id) { var key = text.replace(/^(Today|Yesterday),? /, '').replace(/ (today|yesterday)\./, '.'); if (seen[key]) return; seen[key] = 1; base(lvl, text, id); }; })(add);
  list.filter(function (m) { return m.cls === 'thyroid' && /thyrox|eltrox|levothy|thyronorm|thyroup|lethyrox|levoxin/i.test(m.name); }).forEach(function (m) {
    [k, y].forEach(function (dk) {
      dosesFor(dk).forEach(function (d) {
        if (d.m.id !== m.id || d.st !== 'taken') return;
        var near = itemsNear(dk, d.at, 0, 30);
        if (near.length) add('info', (dk === k ? 'Today, ' : 'Yesterday, ') + near[0].n.replace(/\s*\(.*\)$/, '').toLowerCase() + ' was logged within 30 min of ' + m.name + '. Thyroid tablets absorb best on an empty stomach, 30–60 min before tea or breakfast.', m.id);
        dosesFor(dk, true).forEach(function (o) { if (o.st === 'taken' && /calcium|iron|multi/.test(o.m.cls) && Math.abs(o.at - d.at) < 4 * 3600000) add('warn', mcls(o.m.cls)[1] + ' was taken within 4 hours of ' + m.name + ' ' + (dk === k ? 'today' : 'yesterday') + '. Calcium and iron block thyroid tablets — keep them 4 hours apart.', m.id); });
      });
    });
  });
  /* 5. iron with tea, iron with calcium */
  list.filter(function (m) { return m.cls === 'iron'; }).forEach(function (m) {
    dosesFor(k).forEach(function (d) {
      if (d.m.id !== m.id || d.st !== 'taken') return;
      var tea = itemsNear(k, d.at, 60, 60, /tea|chai|coffee/i); if (tea.length) add('info', 'Tea or coffee within an hour of your iron tablet cuts how much iron you absorb. Take it with lemon water or fruit instead.', m.id);
      dosesFor(k, true).forEach(function (o) { if (o.st === 'taken' && o.m.cls === 'calcium' && Math.abs(o.at - d.at) < 2 * 3600000) add('info', 'Iron and calcium were taken close together today. They compete — keep them at least 2 hours apart.', m.id); });
    });
  });
  /* 5b. homeopathy: strong flavours near the dose */
  list.filter(function (m) { return m.cls === 'homeo'; }).forEach(function (m) {
    dosesFor(k).forEach(function (d) { if (d.m.id !== m.id || d.st !== 'taken') return; var near = itemsNear(k, d.at, 20, 20); if (near.length) add('info', near[0].n.replace(/\s*\(.*\)$/, '') + ' was logged within 20 minutes of ' + m.name + '. Homeopathic doses are usually kept 15–30 minutes clear of food, tea, coffee and mint.', m.id); });
  });
  /* 6. food that matters with these medicines */
  var tt = dayTotals(k), items = dayItems(k);
  if (list.some(function (m) { return /telm|losar|olmes|valsar|irbes|ramip|cardace|enalap|lisinop|azils|spironol|aldactone|eplere|lasilactone/i.test(m.name); }) && tt.mi && tt.mi[4] > 4000)
    add('info', 'High-potassium day (' + n0(tt.mi[4]) + ' mg from food). With your BP medicine that is usually fine, but if your doctor asked you to limit potassium, go easy on coconut water, bananas and dals today.');
  if ((has('bp') || has('diuretic')) && tt.na > 2000) add('warn', 'Salt is high today: ' + n0(tt.na) + ' mg sodium from food (limit 2,000). Extra salt works against your BP medicine.');
  if (has('anticoag') && /warfarin|warf\b|acitrom|acenocou/i.test(list.map(function (m) { return m.name; }).join(' '))) {
    var greens = items.filter(function (it) { return /palak|spinach|methi|sarson|saag|kale|broccoli|cabbage|amaranth|chaulai|lettuce/i.test(it.n); });
    if (greens.length) add('info', 'Leafy greens today (' + greens.map(function (g) { return g.n.replace(/\s*\(.*\)$/, ''); }).join(', ') + '). With warfarin-type medicines, keep green-leaf amounts about the same each day rather than avoiding them.');
  }
  if (has('chol')) { var sat = items.filter(function (it) { return /ghee|butter|malai|cream|cheese|fried|pakora|bhajiya|samosa|vada|puri|bhatura/i.test(it.n); }); if (sat.length >= 2) add('info', sat.length + ' fried or ghee-rich items today. Your cholesterol medicine works better alongside less saturated fat.'); }
  /* 7. lab reports and medicines */
  list.forEach(function (m) {
    var c = mcls(m.cls), ls = labSeries(c[4]); if (ls.length < 2 || !m.start) return;
    var st = fromKey(m.start).getTime(), pre = ls.filter(function (x) { return x.t < st; }).pop(), post = ls.filter(function (x) { return x.t >= st; }).pop();
    if (pre && post && pre.name.toLowerCase() === post.name.toLowerCase()) add('info', post.name + ' went from ' + pre.value + ' to ' + post.value + ' ' + post.unit + ' since starting ' + m.name + '.', m.id);
  });
  var fl = reportFlags();
  [['vitd', /vitamin d/i, 'vitamin D'], ['b12', /b12/i, 'vitamin B12'], ['iron', /haemoglobin|hemoglobin|ferritin/i, 'haemoglobin/iron']].forEach(function (x) {
    if (!has(x[0]) && fl.some(function (v) { return x[1].test(v.name) && v.status === 'low'; })) add('info', 'Your report shows low ' + x[2] + ', and there is no ' + x[2].split('/')[0] + ' in your medicines. Ask your doctor whether you need one.');
  });
  return out;
}
function insightList(a) {
  return a.map(function (x) { return '<div class="ins ' + x.lvl + '">' + icon(x.lvl === 'good' ? 'check' : x.lvl === 'warn' ? 'warn' : 'spark', 16) + '<span>' + esc(x.text) + '</span></div>'; }).join('');
}

/* ---------- screens ---------- */
TABOF.meds = 'vitals'; TABOF.med = 'vitals';
ROUTES.meds = function () {
  var k = today(), h = head('Medicines', niceDate(k), '<button class="ib" data-act="go" data-to="medEdit/new" aria-label="Add medicine">' + icon('plus') + '</button>');
  if (!meds(true).length) return h + '<section class="c"><h2>Track your medicines</h2><p class="p">Add each medicine once with its times. Arogya reminds you, keeps count of tablets left, and shows how your doses line up with your BP, sugar, food and lab reports.</p><button class="btn mt" data-act="go" data-to="medEdit/new">' + icon('plus', 18) + 'Add a medicine</button></section>';
  var ds = dosesFor(k), done = ds.filter(function (d) { return d.st === 'taken'; }).length, a7 = adherence(7);
  h += '<section class="c"><div class="row sb"><div><div class="l">Today</div><b class="m22">' + done + ' / ' + ds.length + ' <small>doses taken</small></b></div><div class="r"><div class="l">Last 7 days</div><b class="m22">' + (a7.pct == null ? '—' : a7.pct + '%') + '</b></div></div>';
  h += ds.length ? ds.map(function (d) { return doseRow(d, k); }).join('') : '<div class="l mt6">Nothing due today.</div>';
  h += '</section>';
  /* week strip */
  var wk = '';
  for (var i = 6; i >= 0; i--) { var dk = addDays(k, -i), dd = dosesFor(dk).filter(function (d) { return !d.m.added || dk >= d.m.added; }), tk = dd.filter(function (d) { return d.st === 'taken'; }).length, pc = dd.length ? tk / dd.length : null; wk += '<div class="wd"><i style="background:' + (pc == null ? 'var(--track)' : pc === 1 ? 'var(--g)' : pc > 0 ? 'var(--warn)' : i === 0 ? 'var(--track)' : 'var(--bad)') + '"></i><small>' + MDOW[fromKey(dk).getDay()] + '</small></div>'; }
  h += '<section class="c"><div class="l">Doses this week</div><div class="wk mt6">' + wk + '</div></section>';
  h += popupCard() + remindCheck();
  var ins = medInsights();
  if (ins.length) h += '<section class="c"><h2>What Arogya noticed</h2>' + insightList(ins) + '<div class="l mt">Patterns from your own logs, not medical advice. Never change a dose without your doctor.</div></section>';
  h += '<h3 class="sech">My medicines</h3>' + meds().map(function (m) { var dl = daysLeft(m); return '<button class="res" data-act="go" data-to="med/' + m.id + '"><span>' + esc(medLabel(m)) + '<small>' + mcls(m.cls)[1] + ' · ' + (m.times || []).map(t12).join(', ') + (dl != null ? ' · ' + dl + ' d left' : '') + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  var old = meds(true).filter(function (m) { return m.on === false; });
  if (old.length) h += '<h3 class="sech">Stopped</h3>' + old.map(function (m) { return '<button class="res" data-act="go" data-to="med/' + m.id + '"><span>' + esc(medLabel(m)) + '<small>stopped' + (m.end ? ' ' + niceDate(m.end) : '') + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  h += '<button class="btn sec mt" data-act="go" data-to="medEdit/new">' + icon('plus', 18) + 'Add a medicine</button>';
  return h;
};

ROUTES.med = function (id) {
  var m = medById(id); if (!m) return head('Medicine') + '<div class="empty-s">Not found.</div>';
  var c = mcls(m.cls), fw = FOODW.filter(function (f) { return f[0] === m.food; })[0], a30 = adherence(30, m.id), dl = daysLeft(m);
  var h = head(medLabel(m), c[1], '<button class="ib" data-act="go" data-to="medEdit/' + m.id + '" aria-label="Edit">' + icon('edit') + '</button>');
  h += '<section class="c"><div class="rd"><span>Dose</span><b>' + medQty(m) + '</b></div><div class="rd"><span>Times</span><b>' + (m.times || []).map(t12).join(', ') + '</b></div><div class="rd"><span>Days</span><b>' + (m.every > 1 ? 'Every ' + m.every + ' days' : m.days && m.days.length && m.days.length < 7 ? m.days.map(function (d) { return DOW[d]; }).join(', ') : 'Every day') + '</b></div>' +
    (fw ? '<div class="rd"><span>Food</span><b>' + fw[1] + '</b></div>' : '') + '<div class="rd"><span>Since</span><b>' + (m.start ? niceDate(m.start) : '—') + (m.end ? ' to ' + niceDate(m.end) : '') + '</b></div>' +
    (m.amt ? '<div class="rd"><span>Per dose</span><b>' + esc(m.amt) + ' ' + esc(m.amtU || '') + '</b></div>' : '') + (m.notes ? '<p class="p mt">' + esc(m.notes) + '</p>' : '') + '</section>';
  h += '<section class="c"><div class="row sb"><div><div class="l">Taken on time · 30 days</div><b class="m22">' + (a30.pct == null ? '—' : a30.pct + '%') + '</b><div class="l">' + a30.taken + ' of ' + a30.due + ' doses</div></div>' + (a30.pct != null ? ring(a30.pct, 64, 7, a30.pct >= 90 ? 'var(--g)' : 'var(--warn)', '') : '') + '</div></section>';
  h += '<section class="c"><div class="row sb"><div><div class="l">Stock</div><b class="m22">' + (m.stock == null || m.stock === '' ? 'Not counted' : n1(m.stock) + ' <small>' + unitOf(m, m.stock) + '</small>') + '</b>' + (dl != null ? '<div class="l">about ' + dl + ' days left</div>' : '') + '</div><button class="btn sec sm0" data-act="medRefill" data-id="' + m.id + '">' + icon('plus', 16) + 'Refill</button></div></section>';
  /* linked readings */
  if (m.cls === 'bp' || m.cls === 'diuretic') { var bp = merged('bp').slice(0, 14).reverse(); if (bp.length >= 2) h += '<section class="c"><div class="l">Your BP since then (systolic)</div>' + spark(bp.map(function (x) { return x.sys; }), 320, 70, 'var(--bad)', 130) + '<div class="l">' + bp.length + ' recent readings · line at 130</div></section>'; }
  if (m.cls === 'sugar') { var su = merged('sugar').filter(function (x) { return x.type === 'fasting'; }).slice(0, 14).reverse(); if (su.length >= 2) h += '<section class="c"><div class="l">Fasting sugar</div>' + spark(su.map(function (x) { return x.val; }), 320, 70, 'var(--warn)', 100) + '<div class="l">line at 100 mg/dL</div></section>'; }
  var ls = labSeries(c[4]); if (ls.length) h += '<section class="c"><h2>From your lab reports</h2>' + ls.map(function (x) { return '<div class="rd"><span>' + esc(x.name) + '<small class="l"> · ' + niceDate(x.date) + (m.start && x.date >= m.start ? ' · on this medicine' : '') + '</small></span><b>' + esc(x.value) + ' ' + esc(x.unit) + '</b></div>'; }).join('') + '</section>';
  var ins = medInsights(m.id); if (ins.length) h += '<section class="c"><h2>What Arogya noticed</h2>' + insightList(ins) + '</section>';
  h += '<div class="g2">' + (m.on === false ? '<button class="btn sec" data-act="medRestart" data-id="' + m.id + '">Start again</button>' : '<button class="btn sec" data-act="medStop" data-id="' + m.id + '">Stop taking</button>') + '<button class="btn sec" data-act="medDel" data-id="' + m.id + '">' + icon('trash', 18) + 'Delete</button></div>';
  return h;
};
ACT.medRefill = function (el) { var m = medById(el.getAttribute('data-id')); sheet('<h2>Refill ' + esc(m.name) + '</h2><p class="l">How many ' + unitOf(m, 2) + ' did you get?</p><div class="chips">' + [10, 15, 30, 60, 90].map(function (n) { return '<button class="chip" data-act="medRefillN" data-id="' + m.id + '" data-n="' + n + '">+' + n + '</button>'; }).join('') + '</div><label class="fld">Or set the exact count now<input id="rfn" type="number" inputmode="numeric" value="' + (m.stock == null ? '' : m.stock) + '"></label><button class="btn mt" data-act="medRefillSet" data-id="' + m.id + '">Save count</button>'); };
ACT.medRefillN = function (el) { var m = medById(el.getAttribute('data-id')); m.stock = (+m.stock || 0) + +el.getAttribute('data-n'); save(); sheet(null); rerender(); toast(n1(m.stock) + ' in stock'); };
ACT.medRefillSet = function (el) { var m = medById(el.getAttribute('data-id')), v = document.getElementById('rfn').value; m.stock = v === '' ? null : Math.max(0, +v); save(); sheet(null); rerender(); };
ACT.medStop = function (el) { var m = medById(el.getAttribute('data-id')); m.on = false; m.end = today(); save(); rerender(); toast('Stopped. History is kept.'); };
ACT.medRestart = function (el) { var m = medById(el.getAttribute('data-id')); m.on = true; m.end = ''; save(); rerender(); };
ACT.medDel = function (el) { var id = el.getAttribute('data-id'); sheet('<h2>Delete this medicine?</h2><p class="p">Its dose history goes too. To keep the history, use Stop taking instead.</p><div class="g2 mt"><button class="btn sec" data-act="closeSheet">Cancel</button><button class="btn" data-act="medDelYes" data-id="' + id + '">Delete</button></div>'); };
ACT.medDelYes = function (el) { var id = el.getAttribute('data-id'); DB.meds = DB.meds.filter(function (m) { return m.id !== id; }); save(); sheet(null); go('meds'); };

/* ---------- add / edit ---------- */
var ME = null;
ROUTES.medEdit = function (id) {
  if (!ME || ME._for !== id) { var src = id !== 'new' && medById(id); ME = src ? JSON.parse(JSON.stringify(src)) : { id: uid(), added: today(), name: '', dose: '', form: 'tablet', qty: 1, times: ['08:00'], food: 'after', days: [], every: 1, start: today(), end: '', cls: 'other', stock: null, refill: 7, notes: '', on: true, remind: true, amt: '', amtU: '' }; ME._for = id; ME._clsSet = !!src; }
  var m = ME, c = mcls(m.cls), h = head(id === 'new' ? 'Add medicine' : 'Edit medicine');
  h += '<section class="c"><label class="fld">Medicine name<input data-inp="me" data-chg="meName" data-k="name" value="' + esc(m.name) + '" placeholder="e.g. Telma 40, Thyronorm, Shelcal" autocomplete="off"></label>' +
    '<div><label class="fld">Strength or potency<input data-inp="me" data-k="dose" value="' + esc(m.dose) + '" placeholder="40 mg, 30C, 200"></label></div>' + '<div class="l mt">FORM</div><div class="chips">' + FORMS.map(function (f) { return '<button class="chip' + (m.form === f[0] ? ' dk' : '') + '" data-act="meForm" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
    '<div class="l mt">WHAT IT IS FOR</div><div class="chips" id="mecc">' + clsChips(m) + '</div><div class="l" id="mecls">' + (m.cls !== 'other' && !m._clsSet ? 'Worked out from the name. Change it if wrong.' : '') + '</div></section>';
  h += '<section class="c"><div class="l">HOW MUCH EACH TIME</div><div class="stepper"><button class="step" data-act="meQty" data-d="-1" aria-label="Less">−</button><div class="ctr"><b class="huge">' + frac(+m.qty) + '</b><div class="l">' + unitOf(m) + '</div></div><button class="step" data-act="meQty" data-d="1" aria-label="More">+</button></div>' +
    '<div class="l mt">TIMES</div><div class="chips">' + [['07:00', 'Early'], ['08:00', 'Morning'], ['14:00', 'Afternoon'], ['20:00', 'Evening'], ['22:00', 'Bedtime']].map(function (t) { var on = m.times.indexOf(t[0]) >= 0; return '<button class="chip' + (on ? ' dk' : '') + '" data-act="meTime" data-t="' + t[0] + '">' + t[1] + ' ' + t12(t[0]) + '</button>'; }).join('') + '</div>' +
    '<div class="chips">' + m.times.filter(function (t) { return ['07:00', '08:00', '14:00', '20:00', '22:00'].indexOf(t) < 0; }).map(function (t) { return '<button class="chip dk" data-act="meTime" data-t="' + t + '">' + t12(t) + ' ✕</button>'; }).join('') + '</div>' +
    '<div class="row g10 mt"><label class="fld f1">Other time<input id="metm" type="time" value="09:00"></label><button class="btn sec sm0" data-act="meTimeAdd">Add</button></div>' +
    '<div class="l mt">FOOD</div><div class="chips">' + FOODW.map(function (f) { return '<button class="chip' + (m.food === f[0] ? ' dk' : '') + '" data-act="meFood" data-v="' + f[0] + '">' + (f[0] === 'empty' && m.cls === 'homeo' ? 'Away from food' : f[1]) + '</button>'; }).join('') + '</div>' + (m.cls === 'homeo' ? '<div class="l mt6">Homeopathy: keep 15–30 min clear of food, tea, coffee and mint.</div>' : '') +
    '<div class="l mt">DAYS</div><div class="chips">' + [['daily', 'Every day'], ['week', 'Some weekdays'], ['every', 'Every few days']].map(function (x) { var on = x[0] === 'every' ? m.every > 1 : x[0] === 'week' ? m.every <= 1 && m.days.length > 0 : m.every <= 1 && !m.days.length; return '<button class="chip' + (on ? ' dk' : '') + '" data-act="meDays" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    (m.every <= 1 && m.days.length ? '<div class="chips c7">' + MDOW.map(function (d, i) { return '<button class="chip' + (m.days.indexOf(i) >= 0 ? ' dk' : '') + '" data-act="meDow" data-i="' + i + '">' + d + '</button>'; }).join('') + '</div>' : '') +
    (m.every > 1 ? '<div class="stepper"><button class="step" data-act="meEvery" data-d="-1" aria-label="Fewer">−</button><div class="ctr"><b class="huge">' + m.every + '</b><div class="l">every ' + m.every + ' days' + (m.every === 7 ? ' (weekly)' : '') + '</div></div><button class="step" data-act="meEvery" data-d="1" aria-label="More">+</button></div>' : '') +
    '<div class="g2"><label class="fld">Start<input type="date" data-chg="me" data-k="start" value="' + esc(m.start) + '"></label><label class="fld">End (if a course)<input type="date" data-chg="me" data-k="end" value="' + esc(m.end) + '"></label></div></section>';
  if (c[3] != null) h += '<section class="c"><div class="l">AMOUNT IN EACH ' + esc(form(m.form)[2].toUpperCase()) + '</div><div class="g2"><label class="fld">Amount<input type="number" inputmode="decimal" data-inp="me" data-k="amt" value="' + esc(m.amt) + '" placeholder="' + (m.cls === 'vitd' ? '60000' : m.cls === 'calcium' ? '500' : '') + '"></label><label class="fld">Unit<select data-chg="me" data-k="amtU">' + (m.cls === 'vitd' ? ['IU', 'µg'] : ['mg']).map(function (u) { return '<option' + (m.amtU === u ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label></div><div class="l mt">Printed on the strip. Added to your vitamins and minerals on days you take it.</div></section>';
  h += '<section class="c">' + (form(m.form)[6] ? '<div class="g2">' : '<div>') + (form(m.form)[6] ? '<label class="fld">' + cap(form(m.form)[3]) + ' in hand<input type="number" inputmode="numeric" data-inp="me" data-k="stock" value="' + (m.stock == null ? '' : m.stock) + '" placeholder="optional"></label><label class="fld">Warn me when<select data-chg="me" data-k="refill">' + [3, 5, 7, 10, 14].map(function (d) { return '<option value="' + d + '"' + (+m.refill === d ? ' selected' : '') + '>' + d + ' days left</option>'; }).join('') + '</select></label>' : '') + '</div>' +
    '<button class="tog" data-act="meRemind" role="switch" aria-checked="' + !!m.remind + '"><span>Remind me at these times</span><i class="' + (m.remind ? 'on' : '') + '"></i></button>' +
    '<label class="fld">Notes<input data-inp="me" data-k="notes" value="' + esc(m.notes) + '" placeholder="Prescribed by, why, side effects…"></label></section>';
  h += '<button class="btn big" data-act="meSave">' + (id === 'new' ? 'Add medicine' : 'Save') + '</button>';
  return h;
};
INP.me = function (el) { if (!ME) return; var k = el.getAttribute('data-k'); ME[k] = el.value; if (k === 'name' && !ME._clsSet) { var g = guessCls(el.value); if (g !== ME.cls) { ME.cls = g; var s = document.getElementById('mecc'); if (s) s.innerHTML = clsChips(ME); var n = document.getElementById('mecls'); if (n) n.textContent = g !== 'other' ? 'Looks like ' + mcls(g)[1].toLowerCase() + '. Change it if wrong.' : ''; if (mcls(g)[3] != null || document.querySelector('[data-k=amt]')) rerender(); } } };
CHG.me = function (el) { if (!ME) return; var k = el.getAttribute('data-k'); ME[k] = el.value; if (k === 'cls') { ME._clsSet = true; if (ME.cls === 'vitd' && !ME.amtU) ME.amtU = 'IU'; if (/calcium|iron|magnesium|zinc/.test(ME.cls) && !ME.amtU) ME.amtU = 'mg'; rerender(); } if (k === 'form') rerender(); };
ACT.meQty = function (el) { var st = form(ME.form)[4]; ME.qty = clamp((+ME.qty || 1) + +el.getAttribute('data-d') * st, st, 200); rerender(); };
ACT.meForm = function (el) { var f = form(el.getAttribute('data-v')); ME._formSet = true; ME.form = f[0]; ME.qty = f[5]; if (!f[6]) ME.stock = null; rerender(); };
ACT.meCls = function (el) { ME.cls = el.getAttribute('data-v'); ME._clsSet = true; if (ME.cls === 'vitd' && !ME.amtU) ME.amtU = 'IU'; if (/calcium|iron|magnesium|zinc/.test(ME.cls) && !ME.amtU) ME.amtU = 'mg'; if (ME.cls === 'homeo') { if (ME.form === 'tablet') { ME.form = 'pills'; ME.qty = 4; } if (ME.food === 'after') ME.food = 'empty'; } rerender(); };
CHG.meName = function () { if (ME && ME.cls === 'homeo' && !ME._formSet && ME.form === 'tablet') { ME.form = 'pills'; ME.qty = 4; if (ME.food === 'after') ME.food = 'empty'; rerender(); } };
ACT.meFood = function (el) { ME.food = el.getAttribute('data-v'); rerender(); };
function clsChips(m) { return MCLS.map(function (x) { return '<button class="chip' + (m.cls === x[0] ? ' dk' : '') + '" data-act="meCls" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join(''); }
ACT.meTime = function (el) { var t = el.getAttribute('data-t'), i = ME.times.indexOf(t); if (i >= 0) { if (ME.times.length > 1) ME.times.splice(i, 1); } else ME.times.push(t); ME.times.sort(); rerender(); };
ACT.meTimeAdd = function () { var t = document.getElementById('metm').value; if (t && ME.times.indexOf(t) < 0) { ME.times.push(t); ME.times.sort(); } rerender(); };
ACT.meDays = function (el) { var v = el.getAttribute('data-v'); if (v === 'daily') { ME.days = []; ME.every = 1; } if (v === 'week') { ME.every = 1; ME.days = ME.days.length ? ME.days : [1, 3, 5]; } if (v === 'every') { ME.days = []; ME.every = ME.every > 1 ? ME.every : 7; } rerender(); };
ACT.meDow = function (el) { var i = +el.getAttribute('data-i'), j = ME.days.indexOf(i); if (j >= 0) { if (ME.days.length > 1) ME.days.splice(j, 1); } else ME.days.push(i); ME.days.sort(); rerender(); };
ACT.meEvery = function (el) { ME.every = clamp(ME.every + +el.getAttribute('data-d'), 2, 30); rerender(); };
ACT.meRemind = function () { ME.remind = !ME.remind; rerender(); };
ACT.meSave = function () {
  var m = ME; m.name = String(m.name || '').trim(); if (!m.name) return toast('Add the medicine name');
  if (m.cls === 'other' && !m._clsSet) m.cls = guessCls(m.name);
  m.qty = +m.qty || 1; m.refill = +m.refill || 7; m.every = +m.every || 1; m.stock = m.stock === '' || m.stock == null ? null : +m.stock;
  var id = m._for; delete m._for; delete m._clsSet; delete m._formSet;
  DB.meds = DB.meds || []; var i = DB.meds.map(function (x) { return x.id; }).indexOf(m.id); if (i >= 0) DB.meds[i] = m; else DB.meds.push(m);
  ME = null; save(); if (m.remind) native('askNotify'); toast(id === 'new' ? 'Added · reminders set' : 'Saved'); go('med/' + m.id);
};

/* ---------- reminders on the phone ---------- */
function syncMeds() {
  var k = today(), done = Object.keys((DB.medLog || {})[k] || {}).concat(Object.keys((DB.pschedLog || {})[k] || {}).map(function (id) { return 'ps_' + id + '|' + (pschedById(id) || {}).time; }));
  native('setMeds', JSON.stringify({ date: k, done: done, popup: DB.settings.medPopup !== false, accent: (typeof themeAccent === 'function' ? themeAccent() : '#7C5CFF'), doses: meds().filter(function (m) { return m.remind !== false; }).map(function (m) {
    var fw = FOODW.filter(function (f) { return f[0] === m.food; })[0];
    return { id: m.id, n: medLabel(m), q: medQty(m) + (fw && fw[0] !== 'any' ? ' · ' + fw[1].toLowerCase() : ''), times: m.times, days: m.days || [], every: +m.every || 1, start: m.start || '', end: m.end || '' };
  }).concat((DB.psched || []).filter(function (s) { return s.remind && s.items.length; }).map(function (s) {
    return { id: 'ps_' + s.id, n: s.name, q: s.items.map(function (k) { return PRANA[k][0]; }).join(', ') + ' · ' + Math.round(pschedSec(s) / 60) + ' min', times: [s.time], days: [], every: 1, start: '', end: '', route: 'psched/' + s.id, kind: 'prana' };
  })) }));
}
function takeMedAdds() {
  try { var a = JSON.parse(native('takeMedAdds') || '[]'); a.forEach(function (x) { var l = medLog(x.date), m = medById(String(x.key).split('|')[0]); if (l[x.key] && l[x.key].s === 'taken') return; var sk = x.s === 'skip'; l[x.key] = { s: sk ? 'skip' : 'taken', t: x.t }; if (!sk && m && m.stock != null && m.stock !== '') m.stock = Math.max(0, +m.stock - (+m.qty || 1)); }); if (a.length) save(); } catch (e) { }
}

/* ---------- Dayline-style pop-up reminders ---------- */
function popupCard() {
  if (!AND) return '';
  var on = DB.settings.medPopup !== false, p = {}; try { p = JSON.parse(native('medPerms') || '{}'); } catch (e) { }
  var h = '<section class="c"><div class="row sb"><div><h2>Reminder pop-up</h2><div class="l">A card slides up from the bottom of the screen and rings, like Dayline.</div></div></div>' +
    '<button class="tog" data-act="medPopTog" role="switch" aria-checked="' + on + '"><span>Pop up on screen</span><i class="' + (on ? 'on' : '') + '"></i></button>';
  if (on) {
    if (p.notify === false) h += '<button class="btn sec mt" data-act="medAskNotify">Allow notifications</button>';
    if (p.overlay === false) h += '<div class="note warn mt">To pop up over other apps, allow <b>Display over other apps</b> for Arogya.</div><button class="btn sec mt" data-act="medOverlay">Allow pop-up over apps</button>';
    if (p.fullscreen === false) h += '<div class="note warn mt">To show on the lock screen, allow <b>full-screen notifications</b> for Arogya.</div><button class="btn sec mt" data-act="medFull">Allow on lock screen</button>';
    h += '<button class="btn sec mt" data-act="medTest">' + icon('bell', 18) + 'Try it now</button>';
  }
  return h + '</section>';
}
ACT.medPopTog = function () { DB.settings.medPopup = DB.settings.medPopup === false; save(); rerender(); };
ACT.medOverlay = function () { native('openOverlaySettings'); };
ACT.medFull = function () { native('openFullScreenSettings'); };
ACT.medAskNotify = function () { native('askNotify'); setTimeout(rerender, 1500); };
ACT.medTest = function () { native('testMed'); toast('Sending a test reminder…'); };

/* while Arogya is open, a due dose slides up from the bottom too */
var DUE_SEEN = {};
function checkDue() {
  if (!DB.profile.onboarded || !(DB.meds || []).length) return;
  var k = today(), nm = new Date().getHours() * 60 + new Date().getMinutes();
  var due = dosesFor(k).filter(function (d) { return !d.st && d.m.remind !== false && tmin(d.tm) <= nm && tmin(d.tm) > nm - 120 && !DUE_SEEN[k + d.key]; });
  if (!due.length || document.getElementById('sheet').className.indexOf('on') >= 0) return;
  due.forEach(function (d) { DUE_SEEN[k + d.key] = 1; });
  var fw = function (m) { var f = FOODW.filter(function (x) { return x[0] === m.food; })[0]; return f && f[0] !== 'any' ? ' · ' + f[1].toLowerCase() : ''; };
  sheet('<div class="duecard"><div class="kick2">' + icon('pill', 16) + 'MEDICINE · ' + t12(due[0].tm) + '</div><h2 class="m22">Time for ' + esc(due.map(function (d) { return d.m.name; }).join(', ')) + '</h2>' +
    due.map(function (d) { return '<div class="l mt6">' + esc(medLabel(d.m)) + ' — ' + medQty(d.m) + fw(d.m) + '</div>'; }).join('') +
    '<button class="btn big mt" data-act="dueTake" data-keys="' + due.map(function (d) { return d.key; }).join(',') + '">' + icon('check', 20) + 'Taken</button>' +
    '<div class="g2 mt"><button class="btn sec" data-act="closeSheet">Later</button><button class="btn sec" data-act="dueSkip" data-keys="' + due.map(function (d) { return d.key; }).join(',') + '">Skip</button></div></div>');
  feel('bell');
}
ACT.dueTake = function (el) { el.getAttribute('data-keys').split(',').forEach(function (key) { var l = medLog(today()), m = medById(key.split('|')[0]); if (l[key] && l[key].s === 'taken') return; l[key] = { s: 'taken', t: Date.now() }; if (m && m.stock != null && m.stock !== '') m.stock = Math.max(0, +m.stock - (+m.qty || 1)); }); save(); sheet(null); rerender(); feel('done'); toast('Marked taken'); };
ACT.dueSkip = function (el) { el.getAttribute('data-keys').split(',').forEach(function (key) { medLog(today())[key] = { s: 'skip', t: Date.now() }; }); save(); sheet(null); rerender(); };
setInterval(function () { if (document.visibilityState === 'visible') checkDue(); }, 30000);
setTimeout(checkDue, 2500);

/* ---------- reminder check-up: why reminders might not ring ---------- */
function remindCheck(full) {
  if (!AND) return '';
  var r = {}, p = {}; try { r = JSON.parse(native('remindStatus') || '{}'); p = JSON.parse(native('medPerms') || '{}'); } catch (e) { }
  var items = [
    ['Notifications allowed', r.notify !== false && p.notify !== false, 'medAskNotify2', 'Allow'],
    ['Battery: Unrestricted', r.battery !== false, 'askBattery', 'Fix'],
    ['Exact-time alarms', r.exact !== false, 'openExact', 'Fix'],
    ['Pop-up over other apps', p.overlay !== false, 'medOverlay', 'Allow'],
    ['Show on lock screen', p.fullscreen !== false, 'medFull', 'Allow']
  ];
  var bad = items.filter(function (x) { return !x[1]; }).length;
  if (!full && !bad) return '';
  var h = '<section class="c"><div class="row g12"><span class="mic">' + icon('shield', 20) + '</span><div class="f1"><h2>Reminder check-up</h2><div class="l">' + (bad ? bad + ' setting' + (bad > 1 ? 's' : '') + ' can stop reminders ringing on time.' : 'All good. Reminders ring with sound and vibration.') + '</div></div></div>';
  h += items.map(function (x) { return '<div class="rd chk"><span>' + (x[1] ? '<i class="ok">' + icon('check', 14) + '</i>' : '<i class="no">!</i>') + x[0] + '</span>' + (x[1] ? '<b class="gtxt sm">On</b>' : '<button class="chip dk" data-act="' + x[2] + '">' + x[3] + '</button>') + '</div>'; }).join('');
  if (r.battery === false) h += '<div class="note warn mt">Samsung phones put apps to sleep. Also open <b>Settings → Battery → Background usage limits → Never sleeping apps</b> and add Arogya.</div>';
  h += '<div class="l mt">If the sound is silent, tap <b>Sound settings</b> and set the Medicine reminders sound and Vibrate.</div><div class="g3 mt"><button class="btn sec" data-act="medTest">Test medicine</button><button class="btn sec" data-act="waterTest">Test water</button><button class="btn sec" data-act="openNotify">Sound settings</button></div>';
  return h + '</section>';
}
ACT.askBattery = function () { native('askBattery'); setTimeout(rerender, 2500); };
ACT.openExact = function () { native('openExactSettings'); setTimeout(rerender, 2500); };
ACT.openNotify = function () { native('openNotifySettings'); };
ACT.waterTest = function () { native('testWater'); toast('Sending a test water reminder…'); };
ACT.medAskNotify2 = function () { native('askNotify'); setTimeout(function () { native('openNotifySettings'); }, 800); };
