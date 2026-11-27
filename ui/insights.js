/* Insights: where you stand, every day and over any period (7 days → all years), with a score and plain
   "going well / fix this" findings from what you logged. Also a month calendar to open any past food day. */
'use strict';
IC.chart = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
IC.cal = '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>';
NAV.splice(NAV.findIndex(function (n) { return n[0] === 'coach'; }) + 1, 0, ['ins', 'Insights', 'chart']);
TABOF.ins = 'ins'; TABOF.foodcal = 'food';
HERO['Insights'] = ['chart', '#7A5AF8'];

/* ---------- one day, analysed ---------- */
var FRIED = /fried|pakod|pakor|bhaji|bhajia|bhajiya|vada|wada|samosa|kachori|puri|poori|bhatura|chips|wafers|namkeen|farsan|mixture|sev\b|gathiya|fafda|jalebi|french fries|pakoda/i;
var SWEETS = /sweet|mithai|ladoo|laddu|barfi|burfi|halwa|halva|jalebi|gulab jamun|rasgulla|kheer|payasam|shrikhand|basundi|peda|chocolate|cake|pastry|ice cream|cookie|biscuit|kulfi|rabdi|modak|sheera|chikki|soft drink|cola|mithai/i;
var IDC = {};
/* only what is truly on an avoid list: your never-suggest words (curd…) and each condition's AVOID foods (not "keep small") */
function insAvoidWhy(n) {
  try {
    var r = food(n), nm = r ? fname(r) : n, re = typeof dpAvoidRe === 'function' ? dpAvoidRe() : null;
    if (re && re.test(nm)) return 'on your never-suggest list';
    if (typeof hpConds === 'function') { var why = null; hpConds().forEach(function (c) { if (why) return; var D = hpDef(c); (D.avoid || []).forEach(function (x) { if (!why && x[1] && x[1].test && x[1].test(nm)) why = 'avoid for ' + D.name; }); }); return why; }
  } catch (e) { }
  return null;
}
function insAvoid(n) { return !!insAvoidWhy(n); }
function dayA(k) {
  var key = k + '|' + MV; if (IDC[key]) return IDC[key];
  var items = dayItems(k), t = dayTotals(k), b = budgetFor(k), tg = macroTargets(), d = dayIf(k) || {};
  var meals = MEALS.filter(function (m) { return ((d.meals || {})[m[0]] || []).length; }).length;
  var A = { k: k, n: items.length, meals: meals, kcal: t.kcal, bud: b.total, earned: b.earned, p: t.p, pt: tg.p, fi: t.fi, fit: tg.fi || 30, na: t.na, nalim: DB.bpplan ? 1500 : (tg.na || 2000), su: t.su, sut: tg.su || 25, items: items };
  A.logged = meals >= 2 || t.kcal >= b.total * 0.4;
  var times = items.map(function (x) { return x.t; }).filter(Boolean).map(function (x) { var dd = new Date(x); return dd.getHours() * 60 + dd.getMinutes(); });
  A.first = times.length ? Math.min.apply(null, times) : null; A.last = times.length ? Math.max.apply(null, times) : null;
  A.fried = items.filter(function (x) { return FRIED.test(x.n); }).length; A.sweet = items.filter(function (x) { return SWEETS.test(x.n); }).length;
  A.avoid = items.filter(function (x) { return insAvoid(x.n); }).map(function (x) { return x.n; });
  try { A.dash = DB.bpplan && A.logged ? dashDay(k).score : null; } catch (e) { A.dash = null; }
  /* food score out of 100 */
  if (A.logged) {
    var dev = Math.abs(A.kcal - A.bud) / Math.max(1, A.bud), P = [];
    P.push(['Calories on budget', 30 * clamp(1 - Math.max(0, dev - 0.1) / 0.4, 0, 1), 30]);
    P.push(['Protein', 15 * clamp(A.p / Math.max(1, A.pt), 0, 1), 15]);
    P.push(['Fibre', 10 * clamp(A.fi / Math.max(1, A.fit), 0, 1), 10]);
    P.push(['Salt', 15 * clamp(1 - Math.max(0, A.na - A.nalim) / A.nalim, 0, 1), 15]);
    P.push(['Added sugar', 10 * clamp(1 - Math.max(0, A.su - A.sut) / A.sut, 0, 1), 10]);
    var q = A.dash != null ? A.dash / 100 : clamp(1 - (A.fried + A.sweet) / Math.max(3, A.n) * 1.5, 0, 1);
    P.push([A.dash != null ? 'DASH balance' : 'Food quality', 20 * q, 20]);
    var pen = Math.min(15, A.avoid.length * 5);
    A.food = Math.round(clamp(P.reduce(function (a, x) { return a + x[1]; }, 0) - pen, 0, 100));
    A.fparts = P; A.pen = pen;
  } else A.food = null;
  /* activity, sleep, water */
  var acts = []; try { acts = dayActs(k); } catch (e) { acts = (d.yoga || []); }
  A.actMin = Math.round(acts.reduce(function (a, y) { return a + (y.min || 0); }, 0));
  A.prana = acts.some(function (y) { return y.prana || y.act === 'prana'; });
  A.steps = stepsFor(k);
  A.move = (A.actMin || A.steps != null) ? Math.round(clamp(Math.max(A.actMin / 30, (A.steps || 0) / 8000), 0, 1) * 100) : null;
  var sl = null; try { sl = sleepFor(k); } catch (e) { }
  A.sleep = sl ? sl.score : null; A.sleepMin = sl ? sl.asleep || sl.min || null : null;
  A.water = waterMl(k); A.wat = d.water && d.water.length ? Math.round(clamp(A.water / (DB.settings.water.goal || 2500), 0, 1) * 100) : null;
  var W = [[A.food, 40], [A.move, 25], [A.sleep, 20], [A.wat, 15]].filter(function (x) { return x[0] != null; });
  var tw = W.reduce(function (a, x) { return a + x[1]; }, 0);
  A.score = tw ? Math.round(W.reduce(function (a, x) { return a + x[0] * x[1]; }, 0) / tw) : null;
  IDC[key] = A; return A;
}
function grade(s) { return s == null ? ['No data', 'mute'] : s >= 85 ? ['Excellent', 'gtxt'] : s >= 70 ? ['Good', 'gtxt'] : s >= 55 ? ['Fair', 'warnt'] : ['Needs work', 'warnt']; }
function gcol(s) { return s == null ? 'var(--track)' : s >= 70 ? 'var(--g)' : s >= 55 ? 'var(--warn)' : 'var(--bad)'; }

/* ---------- a period ---------- */
var PERIODS = [['7', '7 days', 7], ['15', '15 days', 15], ['30', '1 month', 30], ['90', '3 months', 91], ['180', '6 months', 182], ['365', '1 year', 365], ['all', 'All years', 0]];
function firstLogKey() { var ks = Object.keys(DB.days || {}).filter(function (k) { return dayItems(k).length || ((DB.days[k].yoga || []).length); }).sort(); return ks[0] || today(); }
function periodDays(p, endK) {
  var P = PERIODS.filter(function (x) { return x[0] === p; })[0], end = endK || today(), n = P[2];
  if (!n) { var f = firstLogKey(), dn = Math.round((fromKey(end) - fromKey(f)) / 864e5) + 1; n = Math.max(1, dn); }
  var out = []; for (var i = n - 1; i >= 0; i--) out.push(addDays(end, -i)); return out;
}
function avg(list, f) { var v = list.map(f).filter(function (x) { return x != null && !isNaN(x); }); return v.length ? v.reduce(function (a, x) { return a + x; }, 0) / v.length : null; }
function periodA(keys) {
  var D = keys.map(dayA), L = D.filter(function (a) { return a.logged; });
  var R = { keys: keys, days: D, logged: L, n: keys.length };
  R.score = avg(D, function (a) { return a.score; }); R.food = avg(L, function (a) { return a.food; });
  R.move = avg(D, function (a) { return a.move; }); R.sleep = avg(D, function (a) { return a.sleep; }); R.wat = avg(D, function (a) { return a.wat; });
  R.kcal = avg(L, function (a) { return a.kcal; }); R.bud = avg(L, function (a) { return a.bud; });
  R.p = avg(L, function (a) { return a.p / Math.max(1, a.pt) * 100; }); R.fi = avg(L, function (a) { return a.fi; }); R.fit = L.length ? L[0].fit : 30;
  R.na = avg(L, function (a) { return a.na; }); R.nalim = L.length ? L[0].nalim : 1500; R.su = avg(L, function (a) { return a.su; });
  R.dash = avg(L, function (a) { return a.dash; });
  R.over = L.filter(function (a) { return a.kcal > a.bud * 1.1; }).length; R.under = L.filter(function (a) { return a.kcal < a.bud * 0.7; }).length;
  R.saltOver = L.filter(function (a) { return a.na > a.nalim; }).length; R.lowP = L.filter(function (a) { return a.p < a.pt * 0.7; }).length;
  R.late = L.filter(function (a) { return a.last != null && a.last >= 22 * 60; }).length;
  R.noBf = L.filter(function (a) { return a.first == null || a.first >= 11 * 60; }).length;
  R.fried = L.reduce(function (s, a) { return s + a.fried; }, 0); R.sweet = L.reduce(function (s, a) { return s + a.sweet; }, 0);
  R.actMin = D.reduce(function (s, a) { return s + a.actMin; }, 0); R.actDays = D.filter(function (a) { return a.actMin >= 30 || (a.steps || 0) >= 8000; }).length;
  R.pranaDays = D.filter(function (a) { return a.prana; }).length;
  var by = function (f) { var m = {}; L.forEach(function (a) { a.items.forEach(function (it) { var v = f(it); if (v > 0) m[it.n] = (m[it.n] || 0) + v; }); }); return Object.keys(m).map(function (n) { return [n, m[n]]; }).sort(function (a, b) { return b[1] - a[1]; }); };
  R.topNa = by(function (it) { return iv(it, 'na'); }).slice(0, 4); R.topK = by(function (it) { return iv(it, 'k'); }).slice(0, 4);
  R.topSu = by(function (it) { return iv(it, 'su'); }).slice(0, 3); R.most = by(function () { return 1; }).slice(0, 6);
  var av = {}; L.forEach(function (a) { a.avoid.forEach(function (n) { av[n] = (av[n] || 0) + 1; }); }); R.avoid = Object.keys(av).map(function (n) { return [n, av[n]]; }).sort(function (a, b) { return b[1] - a[1]; });
  /* body */
  var t0 = fromKey(keys[0]).getTime(), t1 = fromKey(keys[keys.length - 1]).getTime() + 864e5;
  var inP = function (x) { return x.t >= t0 && x.t < t1; };
  var bp = merged('bp').filter(inP), wt = merged('weight').filter(inP), sg = merged('sugar').filter(inP);
  R.bp = bp.length ? [Math.round(avg(bp, function (x) { return x.sys; })), Math.round(avg(bp, function (x) { return x.dia; })), bp.length] : null;
  R.wt = wt.length ? [wt[wt.length - 1].kg, wt[0].kg] : null;
  R.sugar = sg.length ? [Math.round(avg(sg, function (x) { return x.val; })), sg.length] : null;
  return R;
}
function prevKeys(keys) { var n = keys.length, out = []; for (var i = n; i >= 1; i--) out.push(addDays(keys[0], -i)); return out; }

/* the findings, worded plainly with the numbers behind them */
function findings(R, P) {
  var good = [], fix = [], L = R.logged.length, pct = function (x) { return Math.round(x / Math.max(1, L) * 100); };
  if (L < Math.max(2, R.n * 0.5)) fix.push('Food logged on only ' + L + ' of ' + R.n + ' days, so these numbers are rough. Log at least breakfast, lunch and dinner.');
  if (!L) return { good: good, fix: fix };
  var dk = Math.round(R.kcal - R.bud);
  if (Math.abs(dk) <= R.bud * 0.1) good.push('Calories on budget: ' + n0(R.kcal) + ' a day against ' + n0(R.bud) + '.');
  else if (dk > 0) fix.push('Eating ' + n0(dk) + ' kcal a day over budget (' + n0(R.kcal) + ' vs ' + n0(R.bud) + '); over on ' + R.over + ' of ' + L + ' days.' + (R.topK.length ? ' Biggest calorie sources: ' + R.topK.slice(0, 3).map(function (x) { return x[0]; }).join(', ') + '.' : ''));
  else fix.push('Eating ' + n0(-dk) + ' kcal a day under budget' + (R.under ? ', very low on ' + R.under + ' days' : '') + '. Too little makes you tired and hungry later.');
  if (R.p >= 90) good.push('Protein at ' + Math.round(R.p) + '% of target.'); else fix.push('Protein only ' + Math.round(R.p) + '% of target; below 70% on ' + R.lowP + ' days. Add dal, paneer, sprouts, chana or eggs.');
  var nlab = n0(R.nalim) + ' mg';
  if (R.na <= R.nalim) good.push('Salt within ' + nlab + ' (avg ' + n0(R.na) + ' mg).');
  else fix.push('Salt averaging ' + n0(R.na) + ' mg, over ' + nlab + ' on ' + R.saltOver + ' of ' + L + ' days.' + (R.topNa.length ? ' Most salt from ' + R.topNa.slice(0, 3).map(function (x) { return x[0] + ' (' + n0(x[1]) + ' mg)'; }).join(', ') + '.' : ''));
  if (R.fi >= R.fit * 0.8) good.push('Fibre good at ' + Math.round(R.fi) + ' g a day.'); else fix.push('Fibre low at ' + Math.round(R.fi) + ' g a day (aim ' + R.fit + ' g): more salad, sabzi, fruit, whole grains.');
  if (R.su > 25) fix.push('Added sugar ' + Math.round(R.su) + ' g a day (limit 25 g).' + (R.topSu.length ? ' From ' + R.topSu.map(function (x) { return x[0]; }).join(', ') + '.' : ''));
  if (R.fried) (R.fried / L > 0.5 ? fix : good).push(R.fried / L > 0.5 ? 'Fried food ' + R.fried + ' times in ' + L + ' days.' : 'Fried food kept low: ' + R.fried + ' times in ' + L + ' days.');
  else good.push('No fried food logged.');
  if (R.sweet / L > 0.5) fix.push('Sweets ' + R.sweet + ' times in ' + L + ' days.');
  if (R.avoid.length) fix.push('Foods on your avoid list: ' + R.avoid.slice(0, 4).map(function (x) { return x[0] + (x[1] > 1 ? ' ×' + x[1] : ''); }).join(', ') + '.');
  if (R.late) fix.push('Late dinner (after 10 pm) on ' + R.late + ' days.');
  if (R.noBf > L * 0.3) fix.push('Breakfast skipped or after 11 am on ' + R.noBf + ' days.');
  if (R.dash != null) (R.dash >= 70 ? good : fix).push('DASH score averaging ' + Math.round(R.dash) + (R.dash >= 70 ? ', on track for BP.' : '; aim 70+ (more fruit, vegetables, low-fat milk, nuts).'));
  var per = R.actMin / R.n;
  if (R.actDays >= R.n * 0.7) good.push('Active ' + R.actDays + ' of ' + R.n + ' days (' + Math.round(per) + ' min a day).'); else fix.push('Active on only ' + R.actDays + ' of ' + R.n + ' days (30 min or 8,000 steps).');
  if (R.pranaDays >= R.n * 0.5) good.push('Pranayama on ' + R.pranaDays + ' of ' + R.n + ' days.');
  if (R.sleep != null) (R.sleep >= 70 ? good : fix).push('Sleep score ' + Math.round(R.sleep) + ' on average.');
  if (P && P.bp && R.bp) { var ds = R.bp[0] - P.bp[0]; if (Math.abs(ds) >= 3) (ds < 0 ? good : fix).push('BP ' + (ds < 0 ? 'down' : 'up') + ' ' + Math.abs(ds) + ' points: ' + R.bp[0] + '/' + R.bp[1] + ' vs ' + P.bp[0] + '/' + P.bp[1] + ' before.'); }
  return { good: good, fix: fix };
}

/* ---------- screen ---------- */
var INS = { p: '7' };
function insChart(R) {
  /* daily bars up to a month; weekly to 6 months; monthly beyond */
  var D = R.days, n = D.length, buckets = [];
  if (n <= 31) buckets = D.map(function (a) { return [a.score, fromKey(a.k).getDate(), a.k]; });
  else {
    var size = n <= 190 ? 7 : 0;
    if (size) for (var i = 0; i < n; i += size) { var g = D.slice(i, i + size); buckets.push([avg(g, function (a) { return a.score; }), fromKey(g[0].k).getDate() + ' ' + MON[fromKey(g[0].k).getMonth()], g[0].k]); }
    else { var m = {}; D.forEach(function (a) { var mk = a.k.slice(0, 7); (m[mk] = m[mk] || []).push(a); }); Object.keys(m).sort().forEach(function (mk) { buckets.push([avg(m[mk], function (a) { return a.score; }), MON[+mk.slice(5, 7) - 1] + (Object.keys(m).length > 12 ? " '" + mk.slice(2, 4) : ''), m[mk][0].k]); }); }
  }
  var W = 340, H = 120, bw = W / buckets.length, every = Math.ceil(buckets.length / 8);
  var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 18) + '" class="insch" role="img" aria-label="Score trend">' +
    [55, 70, 85].map(function (y) { var yy = H - y / 100 * H; return '<line x1="0" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="insgl"/>'; }).join('') +
    buckets.map(function (b, i) { var v = b[0], h = v == null ? 3 : Math.max(3, v / 100 * H); return '<rect x="' + (i * bw + bw * 0.15) + '" y="' + (H - h) + '" width="' + Math.max(2, bw * 0.7) + '" height="' + h + '" rx="' + Math.min(4, bw * 0.3) + '" fill="' + gcol(v) + '"' + (v == null ? ' opacity=".35"' : '') + '><title>' + b[1] + ': ' + (v == null ? 'no data' : Math.round(v)) + '</title></rect>' + (i % every === 0 ? '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle" class="insax">' + b[1] + '</text>' : ''); }).join('') + '</svg>';
  return svg;
}
function insWeeks(R) {
  var D = R.days, rows = [], k0 = D[0].k, d0 = fromKey(k0), start = addDays(k0, -((d0.getDay() + 6) % 7));
  for (var w = start; w <= D[D.length - 1].k; w = addDays(w, 7)) {
    var ks = []; for (var i = 0; i < 7; i++) { var kk = addDays(w, i); if (kk <= today() && kk >= k0) ks.push(kk); }
    if (!ks.length) continue; var P = periodA(ks); rows.push([w, P]);
  }
  return rows.reverse();
}
function insYears(R) {
  var m = {}; R.days.forEach(function (a) { (m[a.k.slice(0, 4)] = m[a.k.slice(0, 4)] || []).push(a.k); });
  return Object.keys(m).sort().reverse().map(function (y) { return [y, periodA(m[y])]; });
}
function rowLine(label, P, to) {
  var g = grade(P.score);
  return '<button class="insw" data-act="go" data-to="' + to + '"><span class="f1"><b>' + label + '</b><small>' + (P.logged.length ? n0(P.kcal) + ' kcal · salt ' + n0(P.na) + ' mg · ' : 'no food logged · ') + Math.round(P.actMin / P.n) + ' min active a day</small></span><span class="insg"><b style="color:' + gcol(P.score) + '">' + (P.score == null ? '—' : Math.round(P.score)) + '</b><small class="' + g[1] + '">' + g[0] + '</small></span></button>';
}
ROUTES.ins = function () {
  var keys = periodDays(INS.p), R = periodA(keys), PV = INS.p === 'all' ? null : periodA(prevKeys(keys)), F = findings(R, PV), g = grade(R.score);
  var h = '<h1 class="big">Insights</h1><div class="l">Where you stand, from everything you log</div>';
  h += '<div class="chips insp">' + PERIODS.map(function (p) { return '<button class="chip' + (INS.p === p[0] ? ' dk' : '') + '" data-act="insP" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
  /* today, live */
  var T = dayA(today());
  h += '<section class="c instoday"><div class="row sb"><div><div class="l">Today so far</div><b class="m18">' + (T.score == null ? 'Log something to start' : grade(T.score)[0] + ' day') + '</b></div><b class="insbig" style="color:' + gcol(T.score) + '">' + (T.score == null ? '—' : T.score) + '</b></div>' +
    '<div class="insmini">' + [['Food', T.food], ['Move', T.move], ['Sleep', T.sleep], ['Water', T.wat]].map(function (x) { return '<div><span>' + x[0] + '</span><b style="color:' + gcol(x[1]) + '">' + (x[1] == null ? '—' : x[1]) + '</b></div>'; }).join('') + '</div>' +
    '<div class="l mt6">' + n0(T.kcal) + ' of ' + n0(T.bud) + ' kcal · protein ' + Math.round(T.p) + ' of ' + T.pt + ' g · salt ' + n0(T.na) + ' of ' + n0(T.nalim) + ' mg · ' + T.actMin + ' min active</div></section>';
  /* period score */
  var ch = PV && PV.score != null && R.score != null ? Math.round(R.score - PV.score) : null;
  h += '<section class="c"><div class="row sb"><div><div class="l">' + (PERIODS.filter(function (p) { return p[0] === INS.p; })[0][1]) + ' · ' + niceDate(keys[0]) + ' to ' + niceDate(keys[keys.length - 1]) + '</div><b class="m22 ' + g[1] + '">' + g[0] + '</b>' +
    (ch != null ? '<div class="l ' + (ch >= 0 ? 'gtxt' : 'warnt') + '">' + (ch >= 0 ? '↑ ' : '↓ ') + Math.abs(ch) + ' vs the ' + keys.length + ' days before</div>' : '') + '</div><b class="insbig" style="color:' + gcol(R.score) + '">' + (R.score == null ? '—' : Math.round(R.score)) + '</b></div>' +
    '<div class="insmini">' + [['Food', R.food], ['Move', R.move], ['Sleep', R.sleep], ['Water', R.wat]].map(function (x) { return '<div><span>' + x[0] + '</span><b style="color:' + gcol(x[1]) + '">' + (x[1] == null ? '—' : Math.round(x[1])) + '</b></div>'; }).join('') + '</div>' +
    insChart(R) + '<div class="l ctr">Day score out of 100: food 40%, movement 25%, sleep 20%, water 15%</div></section>';
  /* findings */
  if (F.good.length) h += '<section class="c"><h2 class="gtxt">Going well</h2>' + F.good.map(function (x) { return '<div class="insf ok">' + icon('check', 16) + '<span>' + esc(x) + '</span></div>'; }).join('') + '</section>';
  if (F.fix.length) h += '<section class="c"><h2 class="warnt">Fix this</h2>' + F.fix.map(function (x) { return '<div class="insf bad">' + icon('warn', 16) + '<span>' + esc(x) + '</span></div>'; }).join('') + '</section>';
  /* food numbers */
  if (R.logged.length) {
    var cell = function (l, v, s, c) { return '<div><span>' + l + '</span><b class="' + (c || '') + '">' + v + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; };
    h += '<section class="c"><h2>Food, daily average</h2><div class="insgrid">' +
      cell('Eaten', n0(R.kcal) + ' kcal', 'budget ' + n0(R.bud), R.kcal > R.bud * 1.1 ? 'warnt' : '') +
      cell('Days logged', R.logged.length + ' / ' + R.n, R.over + ' over budget') +
      cell('Protein', Math.round(R.p) + '%', 'of target', R.p < 80 ? 'warnt' : '') +
      cell('Fibre', Math.round(R.fi) + ' g', 'aim ' + R.fit + ' g', R.fi < R.fit * 0.8 ? 'warnt' : '') +
      cell('Salt', n0(R.na) + ' mg', 'limit ' + n0(R.nalim), R.na > R.nalim ? 'warnt' : '') +
      cell('Added sugar', Math.round(R.su) + ' g', 'limit 25 g', R.su > 25 ? 'warnt' : '') +
      (R.dash != null ? cell('DASH score', Math.round(R.dash), 'aim 70+', R.dash < 70 ? 'warnt' : '') : '') +
      cell('Fried · sweets', R.fried + ' · ' + R.sweet, 'times') + '</div>';
    if (R.most.length) h += '<div class="l mt">Most eaten</div><div class="chips">' + R.most.map(function (x) { return '<span class="chip">' + esc(x[0]) + ' ×' + x[1] + '</span>'; }).join('') + '</div>';
    if (R.topNa.length) h += '<div class="l mt">Most salt from (total over this period)</div><p class="p">' + R.topNa.map(function (x) { return esc(x[0]) + ' ' + n0(x[1]) + ' mg'; }).join(' · ') + '</p>';
    h += '</section>';
  }
  /* body and movement */
  h += '<section class="c"><h2>Body and movement</h2><div class="insgrid">' +
    '<div><span>Active</span><b>' + Math.round(R.actMin / R.n) + ' min</b><small>a day · ' + R.actDays + ' active days</small></div>' +
    '<div><span>Pranayama</span><b>' + R.pranaDays + ' days</b><small>of ' + R.n + '</small></div>' +
    '<div><span>BP average</span><b>' + (R.bp ? R.bp[0] + '/' + R.bp[1] : '—') + '</b><small>' + (R.bp ? R.bp[2] + ' readings' + (PV && PV.bp ? ' · was ' + PV.bp[0] + '/' + PV.bp[1] : '') : 'no readings') + '</small></div>' +
    '<div><span>Weight</span><b>' + (R.wt ? n1(R.wt[1]) + ' kg' : '—') + '</b><small>' + (R.wt && R.wt[0] !== R.wt[1] ? (R.wt[1] - R.wt[0] > 0 ? '+' : '') + n1(R.wt[1] - R.wt[0]) + ' kg in this period' : 'no change logged') + '</small></div>' +
    (R.sugar ? '<div><span>Sugar average</span><b>' + R.sugar[0] + '</b><small>mg/dL · ' + R.sugar[1] + ' readings</small></div>' : '') +
    (R.sleep != null ? '<div><span>Sleep score</span><b>' + Math.round(R.sleep) + '</b><small>average</small></div>' : '') + '</div></section>';
  /* each week / each year */
  if (INS.p === 'all') {
    var Y = insYears(R);
    h += '<section class="c"><h2>Year by year</h2>' + Y.map(function (y) { return rowLine(y[0], y[1], 'foodcal/' + y[0] + '-' + (y[0] === today().slice(0, 4) ? today().slice(5, 7) : '12')); }).join('') + '</section>';
  }
  if (INS.p !== '7') {
    var Wk = insWeeks(R);
    h += '<section class="c"><h2>Week by week</h2>' + Wk.slice(0, INS.p === 'all' ? 12 : 60).map(function (w) { var e = addDays(w[0], 6); return rowLine(fromKey(w[0]).getDate() + ' ' + MON[fromKey(w[0]).getMonth()] + ' – ' + fromKey(e).getDate() + ' ' + MON[fromKey(e).getMonth()], w[1], 'foodcal/' + w[0].slice(0, 7)); }).join('') + '</section>';
  } else {
    h += '<section class="c"><h2>Day by day</h2>' + R.days.slice().reverse().map(function (a) { return rowLine(niceDate(a.k), periodA([a.k]), 'insday/' + a.k); }).join('') + '</section>';
  }
  /* AI read */
  var ak = INS.p + '|' + keys[keys.length - 1], ai = (DB.insAI || {})[ak];
  h += '<section class="c"><div class="row sb"><h2>Coach\'s read of this period</h2>' + (DB.settings.gkey ? '<button class="lnk" data-act="insAsk">' + (ai ? 'Refresh' : 'Ask Gemini') + '</button>' : '') + '</div>' +
    (INS_BUSY ? '<p class="l">Reading your ' + keys.length + ' days…</p>' : ai ? '<div class="p">' + fmt(ai.t) + '</div><div class="l mt6">Written ' + ago(ai.at) + '</div>' : '<p class="l">' + (DB.settings.gkey ? 'Gemini reads the numbers above and tells you the 3 changes that would help most.' : 'Add a Gemini key in Settings for a written read.') + '</p>') + '</section>';
  return h;
};
ACT.insP = function (el) { INS.p = el.getAttribute('data-p'); rerender(); };
var INS_BUSY = false;
ACT.insAsk = function () {
  if (INS_BUSY) return; var keys = periodDays(INS.p), R = periodA(keys), PV = INS.p === 'all' ? null : periodA(prevKeys(keys)), F = findings(R, PV);
  var sum = 'PERIOD: ' + niceDate(keys[0]) + ' to ' + niceDate(keys[keys.length - 1]) + ' (' + keys.length + ' days, food logged ' + R.logged.length + ').\nScore ' + (R.score == null ? '-' : Math.round(R.score)) + (PV && PV.score != null ? ' (previous ' + Math.round(PV.score) + ')' : '') + '. Food ' + Math.round(R.food || 0) + ', move ' + Math.round(R.move || 0) + ', sleep ' + Math.round(R.sleep || 0) + '.\n' +
    (R.logged.length ? 'Avg ' + n0(R.kcal) + ' kcal vs budget ' + n0(R.bud) + '; protein ' + Math.round(R.p) + '% of target; fibre ' + Math.round(R.fi) + ' g; salt ' + n0(R.na) + ' mg; added sugar ' + Math.round(R.su) + ' g; fried ' + R.fried + ', sweets ' + R.sweet + '.\nMost eaten: ' + R.most.map(function (x) { return x[0] + ' x' + x[1]; }).join(', ') + '.\nTop salt: ' + R.topNa.map(function (x) { return x[0]; }).join(', ') + '.\n' : '') +
    'Active ' + Math.round(R.actMin / R.n) + ' min/day; pranayama ' + R.pranaDays + ' days. BP ' + (R.bp ? R.bp[0] + '/' + R.bp[1] : 'none') + (PV && PV.bp ? ' (before ' + PV.bp[0] + '/' + PV.bp[1] + ')' : '') + '. Weight ' + (R.wt ? R.wt[0] + '→' + R.wt[1] + ' kg' : 'none') + '.\nWent well: ' + F.good.join(' ') + '\nTo fix: ' + F.fix.join(' ');
  INS_BUSY = true; rerender();
  gAsk([{ text: 'MY PROFILE AND CONDITIONS:\n' + healthContext() + '\n\n' + sum + '\n\nInterpret this for me like a good doctor-nutritionist friend: 1) one line on how I did and why, 2) the one pattern that matters most and what it means for my BP/health, 3) exactly what to change next week, using foods I actually eat (name them). No restating raw numbers unless needed. Never suggest raw curd (I have hives). Under 120 words.' }], { system: COACH_SYS, temp: 0.5 })
    .then(function (a) { DB.insAI = DB.insAI || {}; DB.insAI[INS.p + '|' + keys[keys.length - 1]] = { t: a, at: Date.now() }; save(); })
    .catch(function (e) { aiErr(e); })
    .then(function () { INS_BUSY = false; if (cur.name === 'ins') rerender(); });
};

/* one day in detail */
ROUTES.insday = function (k) {
  var A = dayA(k), g = grade(A.score);
  var h = head(niceDate(k), 'Day score ' + (A.score == null ? '—' : A.score) + ' · ' + g[0]);
  if (A.food != null) {
    h += '<section class="c"><div class="row sb"><h2>Food score</h2><b class="m22" style="color:' + gcol(A.food) + '">' + A.food + '</b></div>' +
      A.fparts.map(function (p) { return '<div class="rd"><span>' + p[0] + '</span><b>' + Math.round(p[1]) + ' / ' + p[2] + '</b></div>' + bar(p[1] / p[2] * 100, p[1] / p[2] >= 0.7 ? 'var(--g)' : 'var(--warn)'); }).join('') +
      (A.pen ? '<div class="rd"><span>Avoid-list foods: ' + esc(A.avoid.join(', ')) + '</span><b class="warnt">−' + A.pen + '</b></div>' : '') + '</section>';
    var F = findings(periodA([k]), null);
    if (F.fix.length) h += '<section class="c"><h2 class="warnt">Fix this</h2>' + F.fix.map(function (x) { return '<div class="insf bad">' + icon('warn', 16) + '<span>' + esc(x) + '</span></div>'; }).join('') + '</section>';
    if (F.good.length) h += '<section class="c"><h2 class="gtxt">Went well</h2>' + F.good.map(function (x) { return '<div class="insf ok">' + icon('check', 16) + '<span>' + esc(x) + '</span></div>'; }).join('') + '</section>';
  } else h += '<div class="empty-s">No meals logged this day.</div>';
  h += '<button class="btn sec" data-act="insOpenDay" data-k="' + k + '">' + icon('food', 18) + 'Open the food diary for this day</button>';
  return h;
};
TABOF.insday = 'ins';
ACT.insOpenDay = function (el) { SEL = el.getAttribute('data-k'); go('food'); };

/* ---------- any past day: month calendar ---------- */
ROUTES.foodcal = function (ym) {
  ym = ym || SEL.slice(0, 7);
  var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7;
  var prev = dkey(new Date(y, m - 1, 1)).slice(0, 7), next = dkey(new Date(y, m + 1, 1)).slice(0, 7), ks = [];
  for (var i = 1; i <= days; i++) ks.push(dkey(new Date(y, m, i)));
  var P = periodA(ks.filter(function (k) { return k <= today(); }));
  var h = head('Food history', 'Tap any day to open it');
  h += '<section class="c"><div class="row sb"><button class="ib sm" data-act="go" data-to="foodcal/' + prev + '" aria-label="Previous month">‹</button><b class="m18">' + MON[m] + ' ' + y + '</b><button class="ib sm" data-act="go" data-to="foodcal/' + next + '" aria-label="Next month"' + (next > today().slice(0, 7) ? ' disabled' : '') + '>›</button></div>' +
    '<div class="fcal">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<span class="l">' + d + '</span>'; }).join('');
  for (i = 0; i < lead; i++) h += '<span></span>';
  ks.forEach(function (k) {
    var fut = k > today(), A = fut ? null : dayA(k), s = A ? A.food : null;
    h += '<button class="fcd' + (k === SEL ? ' on' : '') + (k === today() ? ' td' : '') + '"' + (fut ? ' disabled' : ' data-act="calPick" data-k="' + k + '"') + '><b>' + fromKey(k).getDate() + '</b>' + (A && A.n ? '<i style="background:' + gcol(s) + '"></i><small>' + n0(A.kcal) + '</small>' : '') + '</button>';
  });
  h += '</div><div class="row g14 mt l"><span><i class="fdot" style="background:var(--g)"></i>Good</span><span><i class="fdot" style="background:var(--warn)"></i>Fair</span><span><i class="fdot" style="background:var(--bad)"></i>Needs work</span><span>number = kcal</span></div></section>';
  if (P.logged.length) h += '<section class="c"><h2>' + MON[m] + ' at a glance</h2><div class="insgrid"><div><span>Days logged</span><b>' + P.logged.length + '</b></div><div><span>Food score</span><b style="color:' + gcol(P.food) + '">' + Math.round(P.food) + '</b></div><div><span>Avg eaten</span><b>' + n0(P.kcal) + '</b><small>kcal</small></div><div><span>Avg salt</span><b>' + n0(P.na) + '</b><small>mg</small></div></div><button class="lnk mt" data-act="insMonth" data-k="' + ks[ks.length - 1] + '">See full analysis</button></section>';
  return h;
};
ACT.calPick = function (el) { SEL = el.getAttribute('data-k'); go('food'); };
ACT.insMonth = function () { INS.p = '30'; go('ins'); };

/* ========== insights, not just numbers: what is pulling the score down, what to do, what patterns show ========== */
var PROT = [['1 katori dal', 9, /dal|lentil/i], ['1 fistful roasted chana', 7, /chana|chickpea/i], ['1 katori moong sprouts', 7, /sprout|moong/i], ['50 g paneer', 9, /paneer/i], ['30 g soya chunks', 15, /soya/i], ['2 eggs', 12, /egg|anda|omelette/i]];
function eatsEgg(R) { return R.logged.some(function (a) { return a.items.some(function (it) { return /egg|anda|omelette|bhurji/i.test(it.n); }); }); }
function mealShare(R) { var m = {}, tot = 0; R.logged.forEach(function (a) { var d = dayIf(a.k); MEALS.forEach(function (x) { var v = sumItems((d.meals || {})[x[0]] || []).kcal; m[x[1]] = (m[x[1]] || 0) + v; tot += v; }); }); return Object.keys(m).map(function (k) { return [k, tot ? m[k] / tot : 0]; }).sort(function (a, b) { return b[1] - a[1]; }); }
function freq(R, re) { var n = 0, kc = 0, su = 0; R.logged.forEach(function (a) { a.items.forEach(function (it) { if (re.test(it.n)) { n += it.q || 1; kc += iv(it, 'k'); su += iv(it, 'su'); } }); }); return { n: n, kc: kc, su: su }; }
function itemStats(R) { var m = {}; R.logged.forEach(function (a) { a.items.forEach(function (it) { var x = m[it.n] = m[it.n] || { n: it.n, times: 0, k: 0, na: 0, su: 0 }; x.times++; x.k += iv(it, 'k'); x.na += iv(it, 'na'); x.su += iv(it, 'su'); }); }); return Object.keys(m).map(function (k) { return m[k]; }); }

/* points each part costs on the 100-point day score, averaged over the period */
function drags(R) {
  var acc = {}, add = function (key, v) { var a = acc[key] = acc[key] || { s: 0, n: 0 }; a.s += v; a.n++; };
  R.days.forEach(function (a) {
    if (a.food != null) { a.fparts.forEach(function (p) { add(p[0], (p[2] - p[1]) * 0.4); }); add('Avoid foods', a.pen * 0.4); }
    if (a.move != null) add('Movement', (100 - a.move) * 0.25);
    if (a.sleep != null) add('Sleep', (100 - a.sleep) * 0.2);
    if (a.wat != null) add('Water', (100 - a.wat) * 0.15);
  });
  return Object.keys(acc).map(function (k) { return [k, acc[k].s / acc[k].n]; }).filter(function (x) { return x[1] >= 1; }).sort(function (a, b) { return b[1] - a[1]; });
}
/* turn a drag into a concrete action, with the numbers that justify it */
function actionFor(key, R) {
  var L = R.logged.length, IS = itemStats(R);
  if (key === 'Calories on budget') {
    var dk = Math.round(R.kcal - R.bud), ms = mealShare(R)[0];
    if (dk > 0) { var top = IS.slice().sort(function (a, b) { return b.k - a.k; })[0];
      return { t: 'Eat about ' + n0(dk) + ' kcal less a day', why: 'You averaged ' + n0(R.kcal) + ' kcal against a budget of ' + n0(R.bud) + ', and went over on ' + R.over + ' of ' + L + ' days.', how: (top ? top.n + ' gave you the most calories (' + n0(top.k) + ' kcal over ' + top.times + ' times). Take a smaller portion of it. ' : '') + (ms && ms[1] > 0.35 ? ms[0] + ' is ' + Math.round(ms[1] * 100) + '% of your day; make it lighter.' : '') }; }
    return { t: 'Eat enough: about ' + n0(-dk) + ' kcal more a day', why: 'You averaged ' + n0(R.kcal) + ' kcal against ' + n0(R.bud) + '. Under-eating on ' + R.under + ' days leaves you tired and hungry later.', how: 'Don\'t skip meals. Add a filling snack: roasted chana, fruit, or a besan chilla.' };
  }
  if (key === 'Protein') {
    var tgt = L ? R.logged[0].pt : 84, have = Math.round(R.p / 100 * tgt), gap = Math.max(0, tgt - have), egg = eatsEgg(R), pick = [], g = 0;
    PROT.filter(function (x) { return egg || !/egg/.test(x[0]); }).forEach(function (x) { if (g < gap && pick.length < 2) { pick.push(x[0]); g += x[1]; } });
    return { t: 'Add ' + gap + ' g protein a day', why: 'You get about ' + have + ' g a day; your target is ' + tgt + ' g (' + Math.round(R.p) + '%). Low on ' + R.lowP + ' of ' + L + ' days.', how: 'Add ' + pick.join(' and ') + ' (+' + g + ' g). Spread it across lunch and dinner.' };
  }
  if (key === 'Fibre') { var gp = Math.max(0, Math.round(R.fit - R.fi)); return { t: 'Add ' + gp + ' g fibre a day', why: 'You average ' + Math.round(R.fi) + ' g; aim for ' + R.fit + ' g. Fibre keeps BP, sugar and digestion steady.', how: 'A katori of salad or sabzi at lunch and dinner (+6 g) and one guava, apple or pear a day (+5 g).' }; }
  if (key === 'Salt') { var ts = IS.slice().sort(function (a, b) { return b.na - a.na; }).slice(0, 2);
    return { t: 'Cut salt to under ' + n0(R.nalim) + ' mg', why: 'You average ' + n0(R.na) + ' mg and went over on ' + R.saltOver + ' of ' + L + ' days.', how: ts.map(function (x) { return x.n + ' gives ' + n0(x.na / x.times) + ' mg each time (eaten ' + x.times + '×)'; }).join('; ') + '. Have these less often, and skip pickle and papad.' }; }
  if (key === 'Added sugar') { var tsu = IS.slice().sort(function (a, b) { return b.su - a.su; })[0];
    return { t: 'Cut added sugar to 25 g', why: 'You average ' + Math.round(R.su) + ' g a day.', how: tsu ? tsu.n + ' adds the most (' + Math.round(tsu.su / tsu.times) + ' g each time, ' + tsu.times + '×). Take it with half the sugar or none.' : 'Cut sweets and sweetened drinks.' }; }
  if (key === 'DASH balance' || key === 'Food quality') { var fr = IS.filter(function (x) { return FRIED.test(x.n); }).sort(function (a, b) { return b.times - a.times; })[0];
    return { t: key === 'DASH balance' ? 'Balance your plate for BP (DASH ' + Math.round(R.dash) + ' → 70)' : 'Less fried, more fresh food', why: (R.dash != null ? 'Your DASH score averages ' + Math.round(R.dash) + '. ' : '') + 'Fried food ' + R.fried + ' times in ' + L + ' days.', how: (fr ? 'Swap ' + fr.n + ' (' + fr.times + '×) for a roasted or steamed option. ' : '') + 'Add 2 fruits and a katori of vegetables a day; low-fat milk or chaas instead of fried snacks.' }; }
  if (key === 'Avoid foods') { return { t: 'Stop the foods on your avoid list', why: R.avoid.slice(0, 3).map(function (x) { return x[0] + ' ' + x[1] + '× (' + insAvoidWhy(x[0]) + ')'; }).join(', ') + '.', how: 'Each one takes 5 points off that day. Ask Coach for a substitute you like.' }; }
  if (key === 'Movement') { var per = Math.round(R.actMin / R.n), need = Math.max(10, 30 - per);
    return { t: 'Move ' + need + ' more minutes a day', why: 'You average ' + per + ' active minutes; active on ' + R.actDays + ' of ' + R.n + ' days. Walking is the single best thing for BP.', how: 'A ' + need + '-minute brisk walk after dinner. Start it from Exercise → Walk so it counts steps and km.' }; }
  if (key === 'Sleep') return { t: 'Sleep better (score ' + Math.round(R.sleep) + ' → 70+)', why: 'Your sleep score averages ' + Math.round(R.sleep) + (R.late ? '; dinner after 10 pm on ' + R.late + ' days.' : '.'), how: 'Finish dinner by 8:30 pm, no screens 30 minutes before bed, same wake time every day.' };
  if (key === 'Water') { var wa = Math.round(avg(R.days.filter(function (a) { return a.wat != null; }), function (a) { return a.water; }) || 0), goal = DB.settings.water.goal || 2500;
    return { t: 'Drink ' + Math.max(1, Math.round((goal - wa) / 250)) + ' more glasses of water', why: 'You average ' + n0(wa) + ' ml of ' + n0(goal) + ' ml on the days you log water.', how: 'A glass on waking, one before each meal, one mid-afternoon.' }; }
  return null;
}
/* patterns: compare groups of days (needs at least 3 days in each) */
function patterns(R) {
  var out = [], L = R.logged, D = R.days;
  var bpNext = function (k) { var t0 = fromKey(addDays(k, 1)).getTime(), b = merged('bp').filter(function (x) { return x.t >= t0 && x.t < t0 + 864e5; }); return b.length ? avg(b, function (x) { return x.sys; }) : null; };
  var cmp = function (g1, g2, f) { var a = avg(g1, f), b = avg(g2, f); return g1.length >= 3 && g2.length >= 3 && a != null && b != null ? [a, b] : null; };
  /* late dinner vs that night's sleep */
  var c1 = cmp(L.filter(function (a) { return a.last >= 22 * 60; }), L.filter(function (a) { return a.last != null && a.last < 21 * 60; }), function (a) { var s = sleepFor(addDays(a.k, 1)); return s ? s.score : null; });
  if (c1 && Math.abs(c1[0] - c1[1]) >= 4) out.push(['Late dinners ' + (c1[0] < c1[1] ? 'hurt' : 'don\'t hurt') + ' your sleep', 'Sleep score ' + Math.round(c1[0]) + ' after dinner past 10 pm vs ' + Math.round(c1[1]) + ' when you ate before 9.', c1[0] < c1[1]]);
  /* active days vs next-morning BP */
  var c2 = cmp(D.filter(function (a) { return a.actMin >= 30; }), D.filter(function (a) { return a.actMin < 10; }), function (a) { return bpNext(a.k); });
  if (c2 && Math.abs(c2[0] - c2[1]) >= 2) out.push(['Walking ' + (c2[0] < c2[1] ? 'lowers' : 'hasn\'t lowered') + ' your BP', 'Next-day BP averaged ' + Math.round(c2[0]) + ' after active days vs ' + Math.round(c2[1]) + ' after inactive days.', c2[0] < c2[1]]);
  /* salty days vs next-day BP */
  var c3 = cmp(L.filter(function (a) { return a.na > a.nalim; }), L.filter(function (a) { return a.na <= a.nalim; }), function (a) { return bpNext(a.k); });
  if (c3 && Math.abs(c3[0] - c3[1]) >= 2) out.push(['Salt shows up in your BP', 'Next-day BP ' + Math.round(c3[0]) + ' after salty days vs ' + Math.round(c3[1]) + ' after low-salt days.', c3[0] <= c3[1]]);
  /* weekend vs weekday */
  var we = function (a) { var d = fromKey(a.k).getDay(); return d === 0 || d === 6; }, c4 = cmp(L.filter(we), L.filter(function (a) { return !we(a); }), function (a) { return a.kcal; });
  if (c4 && Math.abs(c4[0] - c4[1]) >= 150) out.push(['You eat ' + n0(Math.abs(c4[0] - c4[1])) + ' kcal ' + (c4[0] > c4[1] ? 'more' : 'less') + ' on weekends', n0(c4[0]) + ' kcal on Sat–Sun vs ' + n0(c4[1]) + ' on weekdays.', c4[0] <= c4[1]]);
  /* biggest meal */
  var ms = mealShare(R)[0]; if (ms && ms[1] >= 0.35) out.push([ms[0] + ' is ' + Math.round(ms[1] * 100) + '% of your day\'s calories', 'A heavy ' + ms[0].toLowerCase() + ' makes it hard to stay on budget' + (ms[0] === 'Dinner' ? ' and affects sleep and morning sugar.' : '.'), false]);
  /* tea and coffee */
  var tc = freq(R, /\btea\b|chai|coffee/i); if (L.length && tc.n / L.length >= 1.5) out.push([n1(tc.n / L.length) + ' cups of tea or coffee a day', 'That is ' + n0(tc.kc / L.length) + ' kcal and ' + Math.round(tc.su / L.length) + ' g sugar a day from cups alone.', false]);
  /* breakfast skippers */
  var c5 = cmp(L.filter(function (a) { return a.first != null && a.first < 10 * 60; }), L.filter(function (a) { return a.first == null || a.first >= 11 * 60; }), function (a) { return a.kcal - a.bud; });
  if (c5 && c5[1] - c5[0] >= 150) out.push(['Skipping breakfast makes you overeat later', 'On late-breakfast days you ended ' + n0(c5[1] - c5[0]) + ' kcal higher than on early-breakfast days.', false]);
  /* trend of the last weeks */
  if (R.n >= 21) { var W = insWeeks(R).slice(0, 3).map(function (w) { return w[1].food; }).filter(function (x) { return x != null; });
    if (W.length === 3) { if (W[0] > W[1] && W[1] > W[2]) out.push(['Your food score has improved 3 weeks running', Math.round(W[2]) + ' → ' + Math.round(W[1]) + ' → ' + Math.round(W[0]) + '. Keep going.', true]);
      else if (W[0] < W[1] && W[1] < W[2]) out.push(['Your food score has dropped 3 weeks running', Math.round(W[2]) + ' → ' + Math.round(W[1]) + ' → ' + Math.round(W[0]) + '.', false]); } }
  return out;
}
function headline(R, PV, D) {
  var g = grade(R.score), ch = PV && PV.score != null && R.score != null ? Math.round(R.score - PV.score) : null, top = D[0];
  var lab = { 'Calories on budget': 'calories off budget', 'Protein': 'too little protein', 'Fibre': 'too little fibre', 'Salt': 'too much salt', 'Added sugar': 'too much sugar', 'DASH balance': 'not enough fruit and vegetables', 'Food quality': 'fried and processed food', 'Avoid foods': 'foods on your avoid list', 'Movement': 'not moving enough', 'Sleep': 'poor sleep', 'Water': 'not drinking enough water' };
  return (ch == null ? '' : ch > 2 ? 'Better than the period before (↑' + ch + '). ' : ch < -2 ? 'Worse than the period before (↓' + (-ch) + '). ' : 'About the same as the period before. ') +
    (top ? 'The biggest thing holding you back is ' + lab[top[0]] + ': it costs you about ' + Math.round(top[1]) + ' points a day.' : 'Nothing major is pulling you down.');
}
var INS_AUTO = {};
ROUTES.ins = function () {
  var keys = periodDays(INS.p), R = periodA(keys), PV = INS.p === 'all' ? null : periodA(prevKeys(keys)), g = grade(R.score), D = drags(R), F = findings(R, PV), PT = patterns(R);
  var h = '<h1 class="big">Insights</h1>';
  h += '<div class="chips insp">' + PERIODS.map(function (p) { return '<button class="chip' + (INS.p === p[0] ? ' dk' : '') + '" data-act="insP" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
  /* verdict */
  h += '<section class="c insv"><div class="row sb"><div class="f1"><div class="l">' + niceDate(keys[0]) + ' – ' + niceDate(keys[keys.length - 1]) + '</div><b class="m22 ' + g[1] + '">' + g[0] + '</b></div><b class="insbig" style="color:' + gcol(R.score) + '">' + (R.score == null ? '—' : Math.round(R.score)) + '</b></div>' +
    '<p class="p insh">' + esc(headline(R, PV, D)) + '</p>' + (R.logged.length < R.n * 0.5 ? '<div class="note warn mt6">Food logged on ' + R.logged.length + ' of ' + R.n + ' days, so this is a rough picture.</div>' : '') + '</section>';
  /* coach's take (Gemini, written once a day per period) */
  var ak = INS.p + '|' + keys[keys.length - 1], ai = (DB.insAI || {})[ak];
  if (DB.settings.gkey && !ai && !INS_BUSY && !INS_AUTO[ak] && R.logged.length >= 2) { INS_AUTO[ak] = 1; setTimeout(ACT.insAsk, 50); }
  if (ai || INS_BUSY) h += '<section class="c"><div class="row sb"><h2>' + icon('spark', 18) + ' Coach\'s take</h2>' + (ai && !INS_BUSY ? '<button class="lnk" data-act="insAsk">Refresh</button>' : '') + '</div>' + (INS_BUSY ? '<p class="l">Reading your ' + keys.length + ' days…</p>' : '<div class="p">' + fmt(ai.t) + '</div>') + '</section>';
  /* do these */
  var acts = D.slice(0, 3).map(function (d) { var a = actionFor(d[0], R); if (a) a.pts = d[1]; return a; }).filter(Boolean);
  if (acts.length) h += '<h2 class="insh2">Do these to raise your score</h2>' + acts.map(function (a, i) { return '<section class="c insa"><div class="row sb"><b class="m16">' + (i + 1) + '. ' + esc(a.t) + '</b><span class="insup">+' + Math.round(a.pts) + '</span></div><p class="p">' + esc(a.why) + '</p><div class="inshow">' + icon('check', 16) + '<span>' + esc(a.how) + '</span></div></section>'; }).join('');
  /* charts that explain themselves */
  h += '<h2 class="insh2">Your charts</h2>' + insCharts(R, D, PT);
  /* patterns */
  if (PT.length) h += '<h2 class="insh2">What your data shows</h2><section class="c">' + PT.map(function (p) { return '<div class="insf ' + (p[2] ? 'ok' : 'bad') + '">' + icon(p[2] ? 'check' : 'warn', 16) + '<span><b>' + esc(p[0]) + '</b><br>' + esc(p[1]) + '</span></div>'; }).join('') + '</section>';
  /* going well */
  if (F.good.length) h += '<h2 class="insh2">Keep doing</h2><section class="c">' + F.good.slice(0, 4).map(function (x) { return '<div class="insf ok">' + icon('check', 16) + '<span>' + esc(x) + '</span></div>'; }).join('') + '</section>';
  /* today, live */
  var T = dayA(today()), TD = drags(periodA([today()]))[0];
  h += '<section class="c"><div class="row sb"><div><div class="l">Today so far</div><b class="m18">' + (T.score == null ? 'Nothing logged yet' : grade(T.score)[0]) + '</b></div><b class="m22" style="color:' + gcol(T.score) + '">' + (T.score == null ? '—' : T.score) + '</b></div>' +
    '<p class="l mt6">' + n0(T.kcal) + ' of ' + n0(T.bud) + ' kcal · protein ' + Math.round(T.p) + ' of ' + T.pt + ' g · salt ' + n0(T.na) + ' mg · ' + T.actMin + ' min active' + (TD ? '. Most to gain today: ' + TD[0].toLowerCase() + '.' : '') + '</p></section>';
  /* trend */
  /* the numbers, folded away */
  var cell = function (l, v, s2, c) { return '<div><span>' + l + '</span><b class="' + (c || '') + '">' + v + '</b>' + (s2 ? '<small>' + s2 + '</small>' : '') + '</div>'; };
  h += '<details class="c"><summary class="lnk">See the numbers</summary>' + (R.logged.length ? '<div class="insgrid mt">' +
    cell('Eaten', n0(R.kcal) + ' kcal', 'budget ' + n0(R.bud)) + cell('Days logged', R.logged.length + ' / ' + R.n, R.over + ' over budget') + cell('Protein', Math.round(R.p) + '%', 'of target') + cell('Fibre', Math.round(R.fi) + ' g', 'aim ' + R.fit + ' g') +
    cell('Salt', n0(R.na) + ' mg', 'limit ' + n0(R.nalim)) + cell('Added sugar', Math.round(R.su) + ' g', 'limit 25 g') + (R.dash != null ? cell('DASH score', Math.round(R.dash), 'aim 70+') : '') + cell('Fried · sweets', R.fried + ' · ' + R.sweet, 'times') +
    cell('Active', Math.round(R.actMin / R.n) + ' min', 'a day') + cell('BP average', R.bp ? R.bp[0] + '/' + R.bp[1] : '—', R.bp ? R.bp[2] + ' readings' : '') + cell('Weight', R.wt ? n1(R.wt[1]) + ' kg' : '—', R.wt && R.wt[0] !== R.wt[1] ? (R.wt[1] - R.wt[0] > 0 ? '+' : '') + n1(R.wt[1] - R.wt[0]) + ' kg' : '') + (R.sleep != null ? cell('Sleep score', Math.round(R.sleep), 'average') : '') + '</div>' : '<p class="l mt">No food logged in this period.</p>') +
    (INS.p !== '7' ? '<h2 class="mt">Week by week</h2>' + insWeeks(R).slice(0, 26).map(function (w) { var e = addDays(w[0], 6); return rowLine(fromKey(w[0]).getDate() + ' ' + MON[fromKey(w[0]).getMonth()] + ' – ' + fromKey(e).getDate() + ' ' + MON[fromKey(e).getMonth()], w[1], 'foodcal/' + w[0].slice(0, 7)); }).join('') : '<h2 class="mt">Day by day</h2>' + R.days.slice().reverse().map(function (a) { return rowLine(niceDate(a.k), periodA([a.k]), 'insday/' + a.k); }).join('')) +
    (INS.p === 'all' ? '<h2 class="mt">Year by year</h2>' + insYears(R).map(function (y) { return rowLine(y[0], y[1], 'foodcal/' + y[0] + '-12'); }).join('') : '') + '</details>';
  return h;
};

/* ========== interactive charts: each one answers a question, says what it found, and explains how to read it ========== */
var INSD = {};
function hmm(m) { if (m == null) return '–'; m = Math.round(m); var h = Math.floor(m / 60) % 24, mm = m % 60, ap = h >= 12 ? 'pm' : 'am'; return ((h % 12) || 12) + ':' + pad(mm) + ' ' + ap; }
function insBuckets(R) {
  var D = R.days, n = D.length, out = [];
  if (n <= 31) return D.map(function (a) { return { label: fromKey(a.k).getDate() + '', long: niceDate(a.k), days: [a] }; });
  if (n <= 190) { for (var i = 0; i < n; i += 7) { var g = D.slice(i, i + 7); out.push({ label: fromKey(g[0].k).getDate() + ' ' + MON[fromKey(g[0].k).getMonth()], long: 'Week of ' + niceDate(g[0].k), days: g }); } return out; }
  var m = {}; D.forEach(function (a) { var mk = a.k.slice(0, 7); (m[mk] = m[mk] || []).push(a); });
  var many = Object.keys(m).length > 12;
  return Object.keys(m).sort().map(function (mk) { return { label: MON[+mk.slice(5, 7) - 1] + (many ? " '" + mk.slice(2, 4) : ''), long: MON[+mk.slice(5, 7) - 1] + ' ' + mk.slice(0, 4), days: m[mk] }; });
}
/* one card: question, takeaway, chart, tap-detail line, how-to-read */
function icard(id, q, take, svg, how, det, legend) {
  INSD[id] = det || [];
  return '<section class="c icard" id="ic-' + id + '"><div class="iq">' + q + '</div><div class="itake">' + take + '</div>' + svg + (legend || '') +
    '<div class="idet" id="id-' + id + '">' + (det && det.length ? 'Tap a bar or point to see the details.' : '') + '</div><details class="ihow"><summary>How to read this</summary><p>' + how + '</p></details></section>';
}
ACT.insTap = function (el) {
  var id = el.getAttribute('data-c'), i = +el.getAttribute('data-i'), box = document.getElementById('id-' + id), card = document.getElementById('ic-' + id);
  if (!box || !INSD[id]) return;
  card.querySelectorAll('.isel').forEach(function (x) { x.classList.remove('isel'); }); el.classList.add('isel');
  box.innerHTML = INSD[id][i] || ''; box.classList.add('on'); feel('tick');
};
var IW = 340;
function ibars(id, vals, opt) {
  /* vals: [{v, label, col}]; opt: {max, line, lineLab, H, fmt} */
  var H = opt.H || 130, n = vals.length, bw = IW / Math.max(1, n), max = opt.max || Math.max.apply(null, vals.map(function (x) { return x.v || 0; }).concat([opt.line || 0, 1])) * 1.12, every = Math.ceil(n / 8), y = function (v) { return H - v / max * H; };
  var s = '<svg viewBox="0 0 ' + IW + ' ' + (H + 18) + '" class="isvg" role="img">';
  if (opt.line) s += '<line x1="0" x2="' + IW + '" y1="' + y(opt.line) + '" y2="' + y(opt.line) + '" class="iline"/>';
  if (opt.path) s += '<path d="' + opt.path.map(function (v, i) { return v == null ? '' : (i && opt.path[i - 1] != null ? 'L' : 'M') + (i * bw + bw / 2) + ' ' + y(v); }).join(' ') + '" class="ipath"/>';
  vals.forEach(function (x, i) {
    var v = x.v, h = v == null ? 0 : Math.max(2, v / max * H);
    s += '<g class="itap" data-act="insTap" data-c="' + id + '" data-i="' + i + '"><rect x="' + i * bw + '" y="0" width="' + bw + '" height="' + (H + 18) + '" fill="transparent"/>' +
      (v == null ? '<rect x="' + (i * bw + bw * 0.2) + '" y="' + (H - 2) + '" width="' + Math.max(2, bw * 0.6) + '" height="2" fill="var(--line)"/>' : '<rect class="ibar" style="--d:' + (i * 12) + 'ms" x="' + (i * bw + bw * 0.16) + '" y="' + (H - h) + '" width="' + Math.max(2, bw * 0.68) + '" height="' + h + '" rx="' + Math.min(5, bw * 0.3) + '" fill="' + x.col + '"/>') +
      (i % every === 0 ? '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle" class="iax">' + x.label + '</text>' : '') + '</g>';
  });
  if (opt.dots) opt.dots.forEach(function (v, i) { if (v != null) s += '<circle cx="' + (i * bw + bw / 2) + '" cy="' + opt.dotY(v) + '" r="4" class="idot" data-act="insTap" data-c="' + id + '" data-i="' + i + '"/>'; });
  if (opt.line && opt.lineLab) { var ly = y(opt.line), tw = opt.lineLab.length * 5.6 + 10; s += '<rect x="0" y="' + (ly - 9) + '" width="' + tw + '" height="18" rx="9" class="ipill"/><text x="5" y="' + (ly + 3.5) + '" class="ilab">' + opt.lineLab + '</text>'; }
  return s + '</svg>';
}
function insCharts(R, D, PT) {
  var B = insBuckets(R), L = R.logged, out = '', unit = R.n <= 31 ? 'day' : R.n <= 190 ? 'week' : 'month';
  /* 1. score */
  var sv = B.map(function (b) { return avg(b.days, function (a) { return a.score; }); });
  var best = null, worst = null; sv.forEach(function (v, i) { if (v == null) return; if (best == null || v > sv[best]) best = i; if (worst == null || v < sv[worst]) worst = i; });
  out += icard('sc', 'How did each ' + unit + ' go?', best != null ? 'Best ' + unit + ': ' + B[best].long + ' (' + Math.round(sv[best]) + '). Toughest: ' + B[worst].long + ' (' + Math.round(sv[worst]) + ').' : 'Log food, walks and water to see your score.',
    ibars('sc', B.map(function (b, i) { return { v: sv[i], label: b.label, col: gcol(sv[i]) }; }), { max: 100, line: 70, lineLab: 'Good 70' }),
    'Each bar is your day score out of 100 for that ' + unit + ': food counts 40%, movement 25%, sleep 20%, water 15%. Green is good (70+), orange fair (55–69), red needs work. Bars above the dotted line are good ' + unit + 's.',
    B.map(function (b, i) { var a = b.days.length === 1 ? b.days[0] : null, f = function (k) { var v = avg(b.days, function (x) { return x[k]; }); return v == null ? '–' : Math.round(v); };
      return '<b>' + b.long + ': ' + (sv[i] == null ? 'no data' : Math.round(sv[i]) + ' · ' + grade(sv[i])[0]) + '</b><br>Food ' + f('food') + ' · Move ' + f('move') + ' · Sleep ' + f('sleep') + ' · Water ' + f('wat') + (a && a.food != null ? '<br>' + n0(a.kcal) + ' kcal, protein ' + Math.round(a.p) + ' g, salt ' + n0(a.na) + ' mg' : ''); }));
  if (!L.length) return out;
  /* 2. calories vs budget */
  var kv = B.map(function (b) { return avg(b.days.filter(function (a) { return a.logged; }), function (a) { return a.kcal; }); }), bv = B.map(function (b) { return avg(b.days.filter(function (a) { return a.logged; }), function (a) { return a.bud; }); });
  out += icard('kc', 'Are you eating to your budget?', 'Over budget on ' + R.over + ' and well under on ' + R.under + ' of ' + L.length + ' logged days. You average ' + n0(R.kcal) + ' kcal against ' + n0(R.bud) + '.',
    ibars('kc', B.map(function (b, i) { var v = kv[i], bd = bv[i]; return { v: v, label: b.label, col: v == null ? '' : v > bd * 1.1 ? 'var(--bad)' : v < bd * 0.7 ? 'var(--warn)' : 'var(--g)' }; }), { path: bv }),
    'Bars are calories eaten; the line is your budget (it rises on days you burn more with walks or workouts). Green is within 10% of budget, red is over, orange is far under. Under-eating is as unhelpful as over-eating: it leaves you hungry and tired later.',
    B.map(function (b, i) { return kv[i] == null ? '<b>' + b.long + '</b>: no food logged' : '<b>' + b.long + '</b>: ate ' + n0(kv[i]) + ' of ' + n0(bv[i]) + ' kcal (' + (kv[i] > bv[i] ? '+' : '−') + n0(Math.abs(kv[i] - bv[i])) + ')'; }),
    '<div class="ileg"><span><i style="background:var(--g)"></i>On budget</span><span><i style="background:var(--bad)"></i>Over</span><span><i style="background:var(--warn)"></i>Far under</span><span><i class="ln"></i>Budget</span></div>');
  /* 3. where the points go */
  if (D.length) {
    var DD = D.slice(0, 6), mx = DD[0][1], rowH = 30, H = DD.length * rowH;
    var svg = '<svg viewBox="0 0 ' + IW + ' ' + H + '" class="isvg" role="img">' + DD.map(function (d, i) { var w = Math.max(6, d[1] / mx * 170); return '<g class="itap" data-act="insTap" data-c="dr" data-i="' + i + '"><rect x="0" y="' + i * rowH + '" width="' + IW + '" height="' + rowH + '" fill="transparent"/><text x="0" y="' + (i * rowH + 19) + '" class="irl">' + d[0] + '</text><rect class="ibarh" style="--d:' + (i * 60) + 'ms" x="140" y="' + (i * rowH + 7) + '" width="' + w + '" height="16" rx="8" fill="' + (i === 0 ? 'var(--bad)' : i < 3 ? 'var(--warn)' : 'var(--mute)') + '"/><text x="' + (146 + w) + '" y="' + (i * rowH + 19) + '" class="irv">−' + Math.round(d[1]) + '</text></g>'; }).join('') + '</svg>';
    out += icard('dr', 'What is costing you points?', DD[0][0] + ' costs you the most: about ' + Math.round(DD[0][1]) + ' points a day out of 100.', svg,
      'Each bar is how many points that part takes off your average day score. Fix the longest bars first; that is where the quickest improvement is.',
      DD.map(function (d) { var a = actionFor(d[0], R); return a ? '<b>' + esc(a.t) + '</b><br>' + esc(a.why) + '<br><span class="gtxt">' + esc(a.how) + '</span>' : '<b>' + d[0] + '</b>'; }));
  }
  /* 4. plate balance */
  var P = L.reduce(function (s, a) { var t = dayTotals(a.k); s.p += t.p * 4; s.c += t.c * 4; s.f += t.f * 9; return s; }, { p: 0, c: 0, f: 0 }), tot = P.p + P.c + P.f;
  if (tot > 0) {
    var parts = [['Protein', P.p / tot, [0.18, 0.25], '#7A5AF8', 'builds and repairs muscle and keeps you full'], ['Carbs', P.c / tot, [0.45, 0.6], '#F59E0B', 'roti, rice, poha, sugar: your main fuel'], ['Fat', P.f / tot, [0.2, 0.3], '#EC4899', 'oil, ghee, nuts, fried food']];
    var C = 2 * Math.PI * 52, off = 0, arcs = parts.map(function (x, i) { var l = x[1] * C, s = '<circle class="itap iarc" data-act="insTap" data-c="pl" data-i="' + i + '" cx="70" cy="70" r="52" fill="none" stroke="' + x[3] + '" stroke-width="22" stroke-dasharray="' + l + ' ' + (C - l) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)"/>'; off += l; return s; }).join('');
    var worstP = parts.slice().sort(function (a, b) { var da = a[1] < a[2][0] ? a[2][0] - a[1] : a[1] > a[2][1] ? a[1] - a[2][1] : 0, db = b[1] < b[2][0] ? b[2][0] - b[1] : b[1] > b[2][1] ? b[1] - b[2][1] : 0; return db - da; })[0];
    var okP = worstP[1] >= worstP[2][0] && worstP[1] <= worstP[2][1];
    var svg2 = '<div class="iplate"><svg viewBox="0 0 140 140" class="idonut">' + arcs + '<text x="70" y="66" text-anchor="middle" class="idc1">' + n0(R.kcal) + '</text><text x="70" y="84" text-anchor="middle" class="idc2">kcal a day</text></svg><div class="iplg">' +
      parts.map(function (x, i) { var ok = x[1] >= x[2][0] && x[1] <= x[2][1]; return '<button class="iprow itap" data-act="insTap" data-c="pl" data-i="' + i + '"><i style="background:' + x[3] + '"></i><span class="f1">' + x[0] + '<small>aim ' + Math.round(x[2][0] * 100) + '–' + Math.round(x[2][1] * 100) + '%</small></span><b class="' + (ok ? 'gtxt' : 'warnt') + '">' + Math.round(x[1] * 100) + '%</b></button>'; }).join('') + '</div></div>';
    out += icard('pl', 'Is your plate balanced?', okP ? 'Your plate is well balanced.' : worstP[0] + ' is ' + Math.round(worstP[1] * 100) + '% of your calories; aim for ' + Math.round(worstP[2][0] * 100) + '–' + Math.round(worstP[2][1] * 100) + '%.', svg2,
      'The ring splits your calories into protein, carbs and fat. Most Indian meals run high on carbs and low on protein; moving a few percent from carbs to protein helps weight, sugar and energy.',
      parts.map(function (x) { return '<b>' + x[0] + ': ' + Math.round(x[1] * 100) + '% of calories</b> (aim ' + Math.round(x[2][0] * 100) + '–' + Math.round(x[2][1] * 100) + '%)<br>' + x[4] + '.'; }));
  }
  /* 5. salt */
  var nv = B.map(function (b) { return avg(b.days.filter(function (a) { return a.logged; }), function (a) { return a.na; }); });
  out += icard('na', 'How much salt are you eating?', R.saltOver ? 'Over ' + n0(R.nalim) + ' mg on ' + R.saltOver + ' of ' + L.length + ' days.' + (R.topNa[0] ? ' Most came from ' + R.topNa[0][0] + '.' : '') : 'Within ' + n0(R.nalim) + ' mg every logged day. Well done.',
    ibars('na', B.map(function (b, i) { return { v: nv[i], label: b.label, col: nv[i] > R.nalim ? 'var(--bad)' : 'var(--g)' }; }), { line: R.nalim, lineLab: 'Limit ' + n0(R.nalim) }),
    'Salt (sodium) is the food that moves BP the most. Bars above the dotted line are days over your limit. Pickle, papad, namkeen, bakery items and restaurant food carry most hidden salt.',
    B.map(function (b, i) { var top = null; b.days.forEach(function (a) { a.items.forEach(function (it) { var v = iv(it, 'na'); if (!top || v > top[1]) top = [it.n, v]; }); }); return nv[i] == null ? '<b>' + b.long + '</b>: no food logged' : '<b>' + b.long + '</b>: ' + n0(nv[i]) + ' mg salt' + (top ? '<br>Biggest source: ' + esc(top[0]) + ' (' + n0(top[1]) + ' mg)' : ''); }));
  /* 6. meal timing */
  var MT = MEALS.map(function (m) { var ts = [], ks = []; L.forEach(function (a) { var it = ((dayIf(a.k).meals || {})[m[0]] || []); if (!it.length) return; var t = it.map(function (x) { return x.t; }).filter(Boolean); if (t.length) { var d = new Date(Math.min.apply(null, t)); ts.push(d.getHours() * 60 + d.getMinutes()); } ks.push(sumItems(it).kcal); }); return { m: m[1], t: avg(ts, function (x) { return x; }), k: avg(ks, function (x) { return x; }), n: ks.length }; }).filter(function (x) { return x.n; });
  if (MT.length) {
    var x0 = 6 * 60, x1 = 24 * 60, X = function (m) { return 14 + (clamp(m, x0, x1) - x0) / (x1 - x0) * (IW - 28); }, kmax = Math.max.apply(null, MT.map(function (x) { return x.k || 0; }));
    var svg3 = '<svg viewBox="0 0 ' + IW + ' 96" class="isvg" role="img"><rect x="' + X(22 * 60) + '" y="4" width="' + (X(24 * 60) - X(22 * 60)) + '" height="64" rx="8" class="ilate"/><text x="' + (X(23 * 60)) + '" y="18" text-anchor="middle" class="ilab">late</text><line x1="14" x2="' + (IW - 14) + '" y1="44" y2="44" class="iline2"/>' +
      [6, 9, 12, 15, 18, 21, 24].map(function (hh) { return '<text x="' + X(hh * 60) + '" y="88" text-anchor="middle" class="iax">' + ((hh % 12) || 12) + (hh < 12 || hh === 24 ? 'am' : 'pm') + '</text>'; }).join('') +
      MT.map(function (x, i) { return x.t == null ? '' : '<circle class="itap ibub" data-act="insTap" data-c="mt" data-i="' + i + '" cx="' + X(x.t) + '" cy="44" r="' + (6 + (x.k || 0) / Math.max(1, kmax) * 14) + '" fill="' + (x.t >= 22 * 60 ? 'var(--bad)' : 'var(--g)') + '" fill-opacity=".85"/>'; }).join('') + '</svg>';
    var din = MT.filter(function (x) { return x.m === 'Dinner'; })[0];
    out += icard('mt', 'When do you eat?', (din && din.t != null ? 'Dinner is usually at ' + hmm(din.t) + (R.late ? '; after 10 pm on ' + R.late + ' days.' : '.') : '') + (R.noBf ? ' Breakfast late or skipped on ' + R.noBf + ' days.' : ''), svg3,
      'Each circle is a meal at its usual time; bigger circles are bigger meals. Eating most of your food early in the day and finishing dinner 2–3 hours before bed helps sleep, sugar and weight.',
      MT.map(function (x) { var share = R.kcal ? (x.k || 0) / R.kcal : 0; return '<b>' + x.m + '</b>: usually ' + hmm(x.t) + ', about ' + n0(x.k) + ' kcal (' + Math.round(share * 100) + '% of your day), logged on ' + x.n + ' days'; }));
  }
  /* 7. movement and BP */
  var mv = B.map(function (b) { return avg(b.days, function (a) { return a.actMin; }); }), t0 = function (k) { return fromKey(k).getTime(); };
  var bpv = B.map(function (b) { var s = fromKey(b.days[0].k).getTime(), e = fromKey(b.days[b.days.length - 1].k).getTime() + 864e5, r = merged('bp').filter(function (x) { return x.t >= s && x.t < e; }); return r.length ? avg(r, function (x) { return x.sys; }) : null; });
  if (bpv.some(function (v) { return v != null; }) || R.actMin) {
    var pat = PT.filter(function (p) { return /BP/.test(p[0]); })[0], H2 = 130, mvMax = Math.max(30, Math.max.apply(null, mv.map(function (v) { return v || 0; }))) * 1.15;
    out += icard('bp', 'Does moving help your BP?', pat ? pat[0] + '. ' + pat[1] : 'Keep logging BP and walks; the link shows up after a couple of weeks.',
      ibars('bp', B.map(function (b, i) { return { v: mv[i], label: b.label, col: (mv[i] || 0) >= 30 ? 'var(--g)' : 'var(--g2)' }; }), { max: mvMax, line: 30, lineLab: '30 min', H: H2, dots: bpv, dotY: function (v) { return H2 - clamp((v - 100) / 70, 0, 1) * H2; } }),
      'Bars are active minutes (walks, workouts, yoga); the dots are your average top BP number for that ' + unit + '. Lower dots on taller-bar ' + unit + 's mean exercise is working for you.',
      B.map(function (b, i) { return '<b>' + b.long + '</b>: ' + Math.round(mv[i] || 0) + ' min active' + (bpv[i] != null ? ' · BP about ' + Math.round(bpv[i]) + ' (top number)' : ' · no BP reading'); }),
      '<div class="ileg"><span><i style="background:var(--g)"></i>Active minutes</span><span><i class="dt"></i>BP (top number)</span></div>');
  }
  /* 8. weekday pattern */
  if (L.length >= 7) {
    var wd = [1, 2, 3, 4, 5, 6, 0].map(function (d) { var g = L.filter(function (a) { return fromKey(a.k).getDay() === d; }); return { d: d, v: avg(g, function (a) { return a.kcal; }), n: g.length }; });
    var hi = wd.filter(function (x) { return x.v != null; }).sort(function (a, b) { return b.v - a.v; })[0];
    out += icard('wd', 'Which day do you eat the most?', hi ? DOW[hi.d] + ' is your heaviest day: ' + n0(hi.v) + ' kcal on average.' : '',
      ibars('wd', wd.map(function (x) { return { v: x.v, label: DOW[x.d], col: x.v > R.bud * 1.1 ? 'var(--bad)' : 'var(--g)' }; }), { line: R.bud, lineLab: 'Budget' }),
      'Average calories for each day of the week. Most people slip on weekends or on one busy weekday; plan that day\'s meals ahead.',
      wd.map(function (x) { return '<b>' + DOW[x.d] + '</b>: ' + (x.v == null ? 'no data' : n0(x.v) + ' kcal on average over ' + x.n + ' ' + DOW[x.d] + 's'); }));
  }
  return out;
}
