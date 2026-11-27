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
function insAvoid(n) { try { return typeof dpOK === 'function' && food(n) && !dpOK(n); } catch (e) { return false; } }
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
  if (R.pranaDays) good.push('Pranayama on ' + R.pranaDays + ' of ' + R.n + ' days.');
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
  gAsk([{ text: 'MY PROFILE AND CONDITIONS:\n' + healthContext() + '\n\n' + sum + '\n\nGive me a short verdict on this period (1 line), then the 3 specific changes that would help me most next period, using Indian food I actually eat. Never suggest raw curd (I have hives). Under 130 words.' }], { system: COACH_SYS, temp: 0.5 })
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
