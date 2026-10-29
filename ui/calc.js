/* Arogya calculations: food, budget, health summaries, local coach rules */
'use strict';
var F = window.FOODS || [];
var FX = {}; F.forEach(function (r, i) { FX[r[0]] = i; });
/* row: [name,kcal,p,c,f,fi,veg,units,sugar,na,fe,ca,src] per 100 g */
function food(name) { var i = FX[name]; if (i != null) return F[i]; for (var j = 0; j < DB.custom.length; j++) if (DB.custom[j][0] === name) return DB.custom[j]; return null; }
function unitsOf(r) { var u = String(r[7] || '').split('|').filter(Boolean).map(function (s) { var p = s.split(':'); return [p[0], +p[1]]; }); u.push(['grams', 1]); return u; }

/* ---------- search ---------- */
var SYN = { roti: 'chapati', chapati: 'roti', dahi: 'curd', curd: 'dahi', chawal: 'rice', bhat: 'rice', sabji: 'sabzi', subzi: 'sabzi', sabzi: 'vegetable', aloo: 'potato', gobi: 'cauliflower', gobhi: 'cauliflower', bhindi: 'ladies', palak: 'spinach', chai: 'tea', doodh: 'milk', paratha: 'parantha', parantha: 'paratha', idly: 'idli', dosai: 'dosa', chilla: 'cheela', cheela: 'chilla', rava: 'semolina', suji: 'semolina', sooji: 'semolina', besan: 'gram flour', chole: 'chickpeas', chana: 'chickpeas', rajma: 'kidney', lauki: 'bottle gourd', dudhi: 'bottle gourd', makhana: 'fox nut', poha: 'flattened', kanda: 'onion', pyaz: 'onion', matar: 'pea', mattar: 'pea', khichri: 'khichdi', moong: 'mung', anda: 'egg' };
function searchFoods(q, limit) {
  q = q.trim().toLowerCase(); if (!q) return [];
  var toks = q.split(/\s+/), vegOnly = DB.profile.vegOnly, out = [];
  var all = F.concat(DB.custom);
  for (var i = 0; i < all.length; i++) {
    var r = all[i]; if (vegOnly && r[6] !== 1) continue;
    var n = r[0].toLowerCase(), s = 0, ok = true;
    for (var t = 0; t < toks.length; t++) {
      var tk = toks[t], alt = SYN[tk], hit = 0;
      [tk, alt].forEach(function (w) {
        if (!w) return;
        if (n.indexOf(w) === 0) hit = Math.max(hit, 100);
        else if (new RegExp('(^|[\\s(/,-])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n)) hit = Math.max(hit, 70);
        else if (n.indexOf(w) >= 0) hit = Math.max(hit, 30);
      });
      if (!hit) { ok = false; break; }
      s += hit;
    }
    if (!ok) continue;
    s -= n.length * 0.4; if (r[12] === 'Basic' || r[12] === 'Mine') s += 12;
    var used = DB.usual[r[0]]; if (used) s += Math.min(40, used.n * 6);
    out.push([s, r]);
  }
  out.sort(function (a, b) { return b[0] - a[0]; });
  return out.slice(0, limit || 40).map(function (x) { return x[1]; });
}

/* ---------- items / totals ---------- */
function itemOf(r, q, unit, grams) { return { id: uid(), n: r[0], q: q, u: unit, g: grams, k: r[1], p: r[2], c: r[3], f: r[4], fi: r[5], su: r[8] || 0, na: r[9] || 0, t: Date.now() }; }
function iv(it, key) { return (it[key] || 0) * it.g / 100; }
function sumItems(list) {
  var s = { kcal: 0, p: 0, c: 0, f: 0, fi: 0, su: 0, na: 0 };
  list.forEach(function (it) { s.kcal += iv(it, 'k'); s.p += iv(it, 'p'); s.c += iv(it, 'c'); s.f += iv(it, 'f'); s.fi += iv(it, 'fi'); s.su += iv(it, 'su'); s.na += iv(it, 'na'); });
  return s;
}
function dayItems(k) { var d = dayIf(k); if (!d) return []; var a = []; MEALS.forEach(function (m) { a = a.concat(d.meals[m[0]] || []); }); return a; }
function dayTotals(k) { return sumItems(dayItems(k)); }
function mealTotals(k, m) { var d = dayIf(k); return sumItems(d ? d.meals[m] || [] : []); }

/* ---------- budget ---------- */
function bmr() { var p = DB.profile, w = lastWeight() || p.weight; return 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5); }
function suggestedBudget() {
  var p = DB.profile, base = bmr() * (+p.activity || 1.2), deficit = (+p.pace || 0) * 7700 / 7;
  var b = Math.round((base - deficit) / 50) * 50;
  return Math.max(p.sex === 'f' ? 1200 : 1500, b);
}
function baseBudget() { return DB.profile.budget > 0 ? +DB.profile.budget : suggestedBudget(); }
function earnedKcal(k) { var h = DB.health; if (!h || !h.activeKcal) return 0; return Math.round(h.activeKcal[k] || 0); }
function budgetFor(k) {
  var d = dayIf(k), carry = d && d.carry ? d.carry : 0;
  var base = baseBudget(), earned = earnedKcal(k);
  return { base: base, earned: earned, carry: carry, total: base + earned - carry };
}
function macroTargets() {
  var p = DB.profile, b = baseBudget();
  return { p: Math.round(b * p.protein / 100 / 4), c: Math.round(b * p.carb / 100 / 4), f: Math.round(b * p.fat / 100 / 9), fi: +p.fibre || 30 };
}

/* ---------- water ---------- */
function waterMl(k) { var d = dayIf(k); return d ? d.water.reduce(function (a, w) { return a + w.ml; }, 0) : 0; }
function waterPace() {
  var w = DB.settings.water, now = new Date(), f = w.from.split(':'), t = w.to.split(':');
  var a = +f[0] * 60 + +f[1], b = +t[0] * 60 + +t[1], m = now.getHours() * 60 + now.getMinutes();
  var frac = clamp((m - a) / Math.max(1, b - a), 0, 1);
  return Math.round(w.goal * frac);
}

/* ---------- weight / vitals lists (manual + Samsung Health merged) ---------- */
function merged(kind) {
  var mine = (DB[kind] || []).slice(), h = DB.health, src = h ? (kind === 'sugar' ? h.glucose : h[kind]) : null;
  (src || []).forEach(function (x) {
    var t = x.t, dupe = mine.some(function (m) { return Math.abs(m.t - t) < 10 * 60000; });
    if (dupe) return;
    if (kind === 'bp') mine.push({ t: t, sys: x.sys, dia: x.dia, pulse: x.pulse || 0, src: 'Samsung' });
    if (kind === 'sugar') mine.push({ t: t, val: Math.round(x.mgdl), type: x.relation || 'random', src: 'Samsung' });
    if (kind === 'weight') mine.push({ t: t, kg: x.kg, src: 'Samsung' });
  });
  return mine.sort(function (a, b) { return b.t - a.t; });
}
function lastWeight() { var w = merged('weight'); return w.length ? w[0].kg : 0; }
function bpLabel(s, d) { if (s >= 140 || d >= 90) return ['High', 'bad']; if (s >= 130 || d >= 85) return ['Slightly high', 'warn']; if (s >= 120 || d >= 80) return ['Upper normal', 'warn']; if (s < 90 || d < 60) return ['Low', 'warn']; return ['Normal', 'ok']; }
function sugarLabel(v, type) {
  if (type === 'fasting') { if (v >= 126) return ['High', 'bad']; if (v >= 100) return ['Above 100: watch it', 'warn']; if (v < 70) return ['Low', 'bad']; return ['Normal', 'ok']; }
  if (type === 'pp') { if (v >= 200) return ['High', 'bad']; if (v >= 140) return ['A bit high after meal', 'warn']; return ['Normal', 'ok']; }
  if (v >= 200) return ['High', 'bad']; if (v < 70) return ['Low', 'bad']; return ['OK', 'ok'];
}

/* ---------- health (from phone) ---------- */
var STG = { awake: 'awake', light: 'light', deep: 'deep', rem: 'rem' };
function sleepFor(k) {
  var h = DB.health; if (!h || !h.sleep || !h.sleep.length) return null;
  var end0 = fromKey(k).getTime() - 6 * 3600000, end1 = fromKey(k).getTime() + 18 * 3600000;
  var ss = h.sleep.filter(function (s) { return s.end > end0 && s.end <= end1; });
  if (!ss.length) return null;
  ss.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); });
  var s = ss[0], m = { awake: 0, rem: 0, light: 0, deep: 0 }, total = (s.end - s.start) / 60000;
  (s.stages || []).forEach(function (g) { var t = STG[g.type] || 'light'; m[t] += (g.e - g.s) / 60000; });
  var staged = m.awake + m.rem + m.light + m.deep;
  if (!staged) { m.light = total; staged = total; }
  var asleep = staged - m.awake;
  var sc = s.score > 0 ? s.score : null;
  var mine = ownSleepScore(asleep, m.deep / staged, m.rem / staged, m.awake / staged);
  return { start: s.start, end: s.end, total: total, asleep: asleep, m: m, staged: staged, score: sc != null ? sc : mine, scoreSrc: sc != null ? 'Samsung' : 'Arogya', stages: s.stages || [] };
}
function ownSleepScore(asleepMin, deep, rem, awake) {
  var d = clamp(asleepMin / 450, 0, 1) * 50;
  var dp = clamp(deep / 0.15, 0, 1) * 20, rm = clamp(rem / 0.2, 0, 1) * 15, aw = clamp(1 - (awake - 0.05) / 0.2, 0, 1) * 15;
  return Math.round(d + dp + rm + aw);
}
function stepsFor(k) { var h = DB.health; return h && h.steps ? Math.round(h.steps[k] || 0) : null; }
function energyFor(k) { var h = DB.health; return h && h.energy && h.energy[k] != null ? Math.round(h.energy[k]) : null; }
function hrDay(k) { var h = DB.health; return h && h.hr ? h.hr[k] || null : null; }
function spo2Night(k) {
  var h = DB.health, s = sleepFor(k); if (!h || !h.spo2 || !s) return null;
  var v = h.spo2.filter(function (x) { return x.t >= s.start && x.t <= s.end; }).map(function (x) { return x.pct; });
  if (!v.length) return null;
  var low = v.filter(function (x) { return x < 90; }).length;
  return { avg: Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length), min: Math.min.apply(null, v), lowCount: low, n: v.length };
}
function latestHr() { var h = DB.health; if (!h || !h.hrRecent || !h.hrRecent.length) return null; return h.hrRecent[h.hrRecent.length - 1]; }

/* ---------- report flags ---------- */
function reportFlags() {
  var latest = {}; DB.reports.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (r) { (r.values || []).forEach(function (v) { latest[v.name.toLowerCase()] = v; }); });
  return Object.keys(latest).map(function (k) { return latest[k]; }).filter(function (v) { return v.status && v.status !== 'normal'; });
}

/* ---------- local coach (works offline, no AI key needed) ---------- */
function coachRules(k) {
  var out = { body: [], right: [], wrong: [], plan: [] };
  var y = addDays(k, -1), yt = dayTotals(y), yItems = dayItems(y), tg = macroTargets(), yb = budgetFor(y);
  var tt = dayTotals(k), tb = budgetFor(k);
  var sl = sleepFor(k), st = stepsFor(y), sp = spo2Night(k);
  var bp = merged('bp')[0], su = merged('sugar').filter(function (x) { return x.type === 'fasting'; })[0];
  if (sl) {
    var dp = sl.m.deep / sl.staged;
    if (sl.asleep < 390) out.body.push('Short night: ' + dur(sl.asleep) + ' asleep. Under 6½ hours raises hunger and next-morning sugar.');
    if (dp < 0.13) out.body.push('Deep sleep only ' + Math.round(dp * 100) + '% (usual 13–23%). Late dinners and screens before bed cut deep sleep.');
    if (sl.asleep >= 420 && dp >= 0.13) out.right.push('Good sleep: ' + dur(sl.asleep) + ' with ' + Math.round(dp * 100) + '% deep.');
  }
  if (sp && sp.lowCount > 2) out.body.push('Oxygen dipped under 90% ' + sp.lowCount + ' times last night (avg ' + sp.avg + '%). If this repeats most nights, mention it to your doctor.');
  if (bp && Date.now() - bp.t < 3 * 86400000) { var bl = bpLabel(bp.sys, bp.dia); if (bl[1] !== 'ok') out.body.push('BP ' + bp.sys + '/' + bp.dia + ' is ' + bl[0].toLowerCase() + '. Less salt (pickle, papad, namkeen) and a daily walk bring it down.'); }
  if (su && Date.now() - su.t < 3 * 86400000 && su.val >= 100) out.body.push('Fasting sugar ' + su.val + ' mg/dL is above 100. Keep dinner light and early, and walk 15 min after meals.');
  reportFlags().slice(0, 2).forEach(function (v) { out.body.push('Report: ' + v.name + ' ' + v.value + ' ' + (v.unit || '') + ' (' + v.status + '). ' + (v.plain || '')); });
  if (yItems.length) {
    var over = yt.kcal - yb.total;
    if (over > 100) out.wrong.push('Yesterday you ate ' + n0(yt.kcal) + ' kcal, ' + n0(over) + ' over budget.');
    else if (yt.kcal > yb.total * 0.75) out.right.push('Yesterday stayed within budget: ' + n0(yt.kcal) + ' of ' + n0(yb.total) + ' kcal.');
    if (yt.p < tg.p * 0.7) out.wrong.push('Protein was ' + n0(yt.p) + ' g of ' + tg.p + ' g. Add curd, paneer, dal, sprouts or chana to each meal.');
    else out.right.push('Protein on track: ' + n0(yt.p) + ' g.');
    if (yt.fi >= tg.fi * 0.8) out.right.push('Fibre was good: ' + n0(yt.fi) + ' g.');
    else out.wrong.push('Fibre only ' + n0(yt.fi) + ' g of ' + tg.fi + ' g. Add a salad, fruit or sabzi.');
    MEALS.forEach(function (m) {
      var mt = mealTotals(y, m[0]); if (mt.kcal < 250) return;
      var cp = mt.c * 4 / mt.kcal; if (cp > 0.65) out.wrong.push(m[1] + ' was ' + Math.round(cp * 100) + '% carbs. Have roti or rice, not both, and add dal or curd.');
    });
    var din = (dayIf(y).meals.dinner || []); if (din.length) { var lt = Math.max.apply(null, din.map(function (x) { return x.t; })); if (new Date(lt).getHours() >= 21 && new Date(lt).getHours() < 24) out.wrong.push('Dinner logged at ' + hm(lt) + '. Eating after 9 pm hurts sleep and morning sugar.'); }
    if (yt.su > 25) out.wrong.push('Added sugar about ' + n0(yt.su) + ' g. Keep it under 25 g.');
  } else out.wrong.push('Nothing was logged yesterday, so I can only guess. Logging all 4 meals makes this coach useful.');
  var wy = waterMl(y); if (wy) { if (wy >= DB.settings.water.goal) out.right.push('Water goal met: ' + (wy / 1000).toFixed(1) + ' L.'); else out.wrong.push('Water ' + (wy / 1000).toFixed(1) + ' L of ' + (DB.settings.water.goal / 1000).toFixed(1) + ' L.'); }
  if (st != null) { if (st >= 8000) out.right.push(n0(st) + ' steps yesterday.'); else out.wrong.push('Only ' + n0(st) + ' steps yesterday.'); }
  /* plan */
  var left = tb.total - tt.kcal, pl = tg.p - tt.p;
  if (pl > 25) out.plan.push('Get ' + n0(pl) + ' g more protein today: moong chilla, paneer bhurji, dal + curd, or sprouts.');
  if (yt.c * 4 > yt.kcal * 0.6 || yItems.length === 0) out.plan.push('At lunch: roti or rice, not both. Fill half the plate with sabzi and salad.');
  out.plan.push('Dinner by 8:45 pm' + (left > 0 && left < 900 ? ', about ' + n0(Math.min(left, 600)) + ' kcal' : '') + ', then a 15-minute walk.');
  if (sl && (sl.asleep < 420 || sl.m.deep / sl.staged < 0.13)) out.plan.push('Phone down by 10:45, in bed by 11:15. 5 minutes of Bhramari before sleep.');
  var w = DB.settings.water; out.plan.push('Water: ' + (w.goal / 1000).toFixed(1) + ' L — a glass every hour till 8 pm.');
  return out;
}
function dayScore(k) {
  var t = dayTotals(k), b = budgetFor(k), tg = macroTargets(), parts = [];
  if (dayItems(k).length) { var dev = Math.abs(t.kcal - b.total) / b.total; parts.push(['Food', Math.round(clamp(100 - dev * 150, 0, 100) * 0.6 + clamp(t.p / tg.p, 0, 1) * 40)]); }
  var sl = sleepFor(addDays(k, 1)) || sleepFor(k); if (sl) parts.push(['Sleep', sl.score]);
  var st = stepsFor(k); if (st != null) parts.push(['Move', Math.round(clamp(st / 10000, 0, 1) * 100)]);
  var w = waterMl(k); parts.push(['Water', Math.round(clamp(w / DB.settings.water.goal, 0, 1) * 100)]);
  var avg = Math.round(parts.reduce(function (a, p) { return a + p[1]; }, 0) / parts.length);
  return { score: avg, parts: parts };
}
