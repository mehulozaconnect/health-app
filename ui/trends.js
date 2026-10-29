/* Trends: week / month / year averages for any daily number (water, sleep, energy, steps, heart rate, BP, sugar, weight) */
'use strict';
function dayAvg(list) { return list.length ? list.reduce(function (a, x) { return a + x; }, 0) / list.length : null; }
function readingsOn(kind, k, f) { return merged(kind).filter(function (x) { return dkey(new Date(x.t)) === k && (!f || f(x)); }); }
var TM = {
  water: { name: 'Water', icon: 'drop', day: function (k) { var v = waterMl(k); return v ? v / 1000 : null; }, fmt: function (v) { return n1(v) + ' L'; }, goal: function () { return DB.settings.water.goal / 1000; }, up: true },
  sleep: { name: 'Sleep', icon: 'moon', day: function (k) { var s = sleepFor(k); return s ? s.asleep : null; }, fmt: function (v) { return dur(v); }, goal: function () { return 450; }, up: true },
  sleepscore: { name: 'Sleep score', icon: 'moon', day: function (k) { var s = sleepFor(k); return s ? s.score : null; }, fmt: function (v) { return Math.round(v); }, up: true },
  energy: { name: 'Energy score', icon: 'bolt', day: energyFor, fmt: function (v) { return Math.round(v); }, goal: function () { return 80; }, up: true },
  steps: { name: 'Steps', icon: 'steps', day: function (k) { var s = stepsFor(k); return s ? s : null; }, fmt: function (v) { return n0(v); }, goal: function () { return 10000; }, up: true },
  rhr: { name: 'Resting heart rate', icon: 'heart', day: function (k) { var h = DB.health; return h && h.restingHr && h.restingHr[k] ? h.restingHr[k] : null; }, fmt: function (v) { return Math.round(v) + ' bpm'; }, up: false },
  weight: { name: 'Weight', icon: 'scale', day: function (k) { var w = merged('weight').filter(function (x) { return dkey(new Date(x.t)) === k; }); return w.length ? w[0].kg : null; }, fmt: function (v) { return n1(v) + ' kg'; }, goal: function () { return +DB.profile.goal; }, up: false },
  kcal: { name: 'Calories eaten', icon: 'food', day: function (k) { return dayItems(k).length ? dayTotals(k).kcal : null; }, fmt: function (v) { return n0(v) + ' kcal'; }, goal: function () { return baseBudget(); }, up: false },
  bp: { name: 'Blood pressure', icon: 'bp', two: true, day: function (k) { var r = readingsOn('bp', k); return r.length ? [dayAvg(r.map(function (x) { return x.sys; })), dayAvg(r.map(function (x) { return x.dia; }))] : null; }, fmt: function (v) { return Math.round(v[0]) + '/' + Math.round(v[1]); }, goal: function () { return 130; }, up: false },
  sugar: { name: 'Fasting sugar', icon: 'pulse', day: function (k) { var r = readingsOn('sugar', k, function (x) { return x.type === 'fasting'; }); return r.length ? dayAvg(r.map(function (x) { return x.val; })) : null; }, fmt: function (v) { return Math.round(v) + ' mg/dL'; }, goal: function () { return 100; }, up: false },
  sugarpp: { name: 'Sugar after meals', icon: 'pulse', day: function (k) { var r = readingsOn('sugar', k, function (x) { return x.type !== 'fasting'; }); return r.length ? dayAvg(r.map(function (x) { return x.val; })) : null; }, fmt: function (v) { return Math.round(v) + ' mg/dL'; }, goal: function () { return 140; }, up: false }
};
var TP = {};
/* buckets for a period: week = 7 days, month = 30 days, year = 12 months */
function tBuckets(m, per, back) {
  var M = TM[m], k0 = addDays(today(), -(back || 0) * (per === 'week' ? 7 : per === 'month' ? 30 : 365)), out = [];
  if (per === 'year') {
    var d0 = fromKey(k0);
    for (var i = 11; i >= 0; i--) {
      var y = d0.getFullYear(), mo = d0.getMonth() - i; while (mo < 0) { mo += 12; y--; }
      var n = new Date(y, mo + 1, 0).getDate(), vals = [];
      for (var dd = 1; dd <= n; dd++) { var dk = dkey(new Date(y, mo, dd)); if (dk > k0) break; var v = M.day(dk); if (v != null) vals.push(v); }
      out.push({ label: MON[mo][0], full: MON[mo] + ' ' + y, v: vals.length ? (M.two ? [dayAvg(vals.map(function (x) { return x[0]; })), dayAvg(vals.map(function (x) { return x[1]; }))] : dayAvg(vals)) : null, n: vals.length });
    }
    return out;
  }
  var nd = per === 'week' ? 7 : 30;
  for (i = nd - 1; i >= 0; i--) { dk = addDays(k0, -i); out.push({ k: dk, label: per === 'week' ? 'SMTWTFS'[fromKey(dk).getDay()] : (fromKey(dk).getDate() % 5 === 0 ? String(fromKey(dk).getDate()) : ''), full: niceDate(dk), v: M.day(dk), n: 1 }); }
  return out;
}
function tAvg(m, b) {
  var M = TM[m], v = b.filter(function (x) { return x.v != null; });
  if (!v.length) return null;
  if (M.two) return [dayAvg(v.map(function (x) { return x.v[0]; })), dayAvg(v.map(function (x) { return x.v[1]; }))];
  if (b[0] && b[0].k) return dayAvg(v.map(function (x) { return x.v; }));
  var tot = 0, n = 0; v.forEach(function (x) { tot += x.v * x.n; n += x.n; }); return tot / n;
}
function tChart(m, b) {
  var M = TM[m], W = 330, H = 120, vals = [], g = M.goal ? M.goal() : null;
  b.forEach(function (x) { if (x.v != null) vals = vals.concat(M.two ? x.v : [x.v]); });
  if (!vals.length) return '<div class="empty-s mt">Nothing logged in this period yet.</div>';
  var hi = Math.max.apply(null, vals.concat(g ? [g] : [])), lo = M.two || m === 'weight' || m === 'rhr' || /sugar/.test(m) ? Math.min.apply(null, vals) * 0.9 : 0;
  if (hi === lo) hi = lo + 1;
  var y = function (v) { return (H - 4 - (v - lo) / (hi - lo) * (H - 14)).toFixed(1); }, bw = W / b.length, s = '';
  if (g && g > lo) s += '<line x1="0" x2="' + W + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="var(--g)" stroke-dasharray="4 4" opacity=".5"/>';
  b.forEach(function (x, i) {
    if (x.v == null) return; var cx = i * bw + bw * 0.2, w = Math.max(2, bw * 0.6);
    if (M.two) s += '<rect x="' + cx.toFixed(1) + '" y="' + y(x.v[0]) + '" width="' + w.toFixed(1) + '" height="' + Math.max(3, y(x.v[1]) - y(x.v[0])).toFixed(1) + '" rx="' + Math.min(4, w / 2).toFixed(1) + '" fill="' + (x.v[0] >= 140 || x.v[1] >= 90 ? 'var(--bad)' : x.v[0] >= 130 || x.v[1] >= 85 ? 'var(--warn)' : 'var(--g)') + '"/>';
    else { var top = y(x.v); s += '<rect x="' + cx.toFixed(1) + '" y="' + top + '" width="' + w.toFixed(1) + '" height="' + (H - 4 - top).toFixed(1) + '" rx="' + Math.min(4, w / 2).toFixed(1) + '" fill="var(--g)" opacity="' + (g && (M.up ? x.v >= g : x.v <= g) ? 1 : 0.55) + '"/>'; }
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" class="mt" aria-hidden="true">' + s + '</svg><div class="tlab">' + b.map(function (x) { return '<span>' + x.label + '</span>'; }).join('') + '</div>';
}
function trendBlock(m, opts) {
  opts = opts || {}; var M = TM[m], per = TP[m] || 'week', b = tBuckets(m, per, 0), pb = tBuckets(m, per, 1), a = tAvg(m, b), pa = tAvg(m, pb);
  var cmp = '';
  if (a != null && pa != null) {
    var d = M.two ? a[0] - pa[0] : a - pa, base = M.two ? pa[0] : pa, good = M.up ? d > 0 : d < 0, pct = Math.abs(d) / (base || 1) * 100;
    cmp = pct < 1.5 ? 'Same as last ' + per : (d > 0 ? '▲ ' : '▼ ') + (M.two ? Math.round(Math.abs(d)) + ' mmHg' : m === 'sleep' ? dur(Math.abs(d)) : M.fmt(Math.abs(d))) + ' vs last ' + per;
    cmp = '<span class="' + (pct < 1.5 ? 'l' : good ? 'gtxt' : 'warnt') + '">' + cmp + '</span>';
  }
  var logged = b.filter(function (x) { return x.v != null; });
  var h = '<section class="c">' + (opts.title === false ? '' : '<div class="row sb"><h2>' + esc(opts.title || 'Averages') + '</h2></div>') +
    '<div class="seg wide mt6">' + [['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(function (p) { return '<button class="' + (per === p[0] ? 'on' : '') + '" data-act="tPer" data-m="' + m + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
    '<div class="row sb end mt"><div><div class="l">' + (per === 'year' ? '12-month' : per === 'week' ? '7-day' : '30-day') + ' average</div><b class="m30">' + (a != null ? M.fmt(a) : '—') + '</b></div><div class="r sm">' + cmp + '<div class="l">' + logged.length + ' ' + (per === 'year' ? 'months' : 'days') + ' with data</div></div></div>' + tChart(m, b);
  if (logged.length > 1 && !M.two) { var mx = logged.reduce(function (a, x) { return x.v > a.v ? x : a; }), mn = logged.reduce(function (a, x) { return x.v < a.v ? x : a; }); h += '<div class="g2 mt"><div><div class="l">Highest</div><b>' + M.fmt(mx.v) + '</b><div class="l">' + mx.full + '</div></div><div><div class="l">Lowest</div><b>' + M.fmt(mn.v) + '</b><div class="l">' + mn.full + '</div></div></div>'; }
  if (M.goal && per !== 'year' && logged.length) { var g = M.goal(), hit = logged.filter(function (x) { return M.two ? x.v[0] < g : M.up ? x.v >= g : x.v <= g; }).length; h += '<div class="l mt6">' + (M.two ? 'Under 130 on ' : 'Goal met on ') + hit + ' of ' + logged.length + ' days</div>'; }
  return h + '</section>';
}
ACT.tPer = function (el) { TP[el.getAttribute('data-m')] = el.getAttribute('data-p'); rerender(); };
ROUTES.trend = function (m) {
  var M = TM[m]; if (!M) return head('Trends');
  var h = head(M.name, 'Averages and history') + trendBlock(m, { title: false });
  var per = TP[m] || 'week', b = tBuckets(m, per, 0).slice().reverse().filter(function (x) { return x.v != null; });
  if (b.length) h += '<section class="c"><h2>' + (per === 'year' ? 'By month' : 'By day') + '</h2>' + b.map(function (x) { return '<div class="rd"><span>' + x.full + '</span><b>' + M.fmt(x.v) + '</b></div>'; }).join('') + '</section>';
  if (m === 'energy') h += '<div class="l ctrtxt">Energy score comes from Samsung Health (Galaxy Watch). It needs the watch worn through the night.</div>';
  return h;
};
TABOF.trend = 'vitals';
