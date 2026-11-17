/* BP plan: DASH diet (as the doctor advised), daily habits that lower BP, measuring right, weekly progress and a doctor report.
   Only cuff readings count (Omron, or typed in). Watch readings are estimates and are left out. */
'use strict';

/* ---------- readings ---------- */
function cuffBp() { return merged('bp').filter(function (x) { return !/samsung|watch/i.test(x.src || ''); }); }
/* readings within 15 minutes of each other are one sitting; the sitting's average is what counts */
function bpSittings(days) {
  var from = days ? Date.now() - days * 86400000 : 0, out = [];
  cuffBp().filter(function (x) { return x.t >= from; }).sort(function (a, b) { return a.t - b.t; }).forEach(function (x) {
    var s = out[out.length - 1];
    if (s && x.t - s.end <= 15 * 60000) { s.r.push(x); s.end = x.t; } else out.push({ t: x.t, end: x.t, r: [x] });
  });
  out.forEach(function (s) { s.sys = Math.round(dayAvg(s.r.map(function (x) { return x.sys; }))); s.dia = Math.round(dayAvg(s.r.map(function (x) { return x.dia; }))); s.am = new Date(s.t).getHours() < 12; });
  return out.reverse();
}
function bpAvgOf(list) { return list.length ? { sys: Math.round(dayAvg(list.map(function (s) { return s.sys; }))), dia: Math.round(dayAvg(list.map(function (s) { return s.dia; }))), n: list.length } : null; }
function bpWindow(fromDays, toDays, f) { var a = Date.now() - fromDays * 86400000, b = Date.now() - (toDays || 0) * 86400000; return bpAvgOf(bpSittings(fromDays + 1).filter(function (s) { return s.t >= a && s.t < b && (!f || f(s)); })); }
/* 2025 AHA/ACC categories */
function bpStage(s, d) {
  if (s > 180 || d > 120) return [4, 'Severe', '#B0123F'];
  if (s >= 140 || d >= 90) return [3, 'Stage 2', '#E0245E'];
  if (s >= 130 || d >= 80) return [2, 'Stage 1', '#FF8A3D'];
  if (s >= 120) return [1, 'Elevated', '#F5B700'];
  return [0, 'Normal', '#16C79A'];
}
function bpPlan() { DB.bpplan = DB.bpplan || { on: true, am: '07:30', pm: '21:00', remind: true, doctor: true, ticks: {} }; DB.bpplan.ticks = DB.bpplan.ticks || {}; if (!DB.bpplan.start) DB.bpplan.start = today(); return DB.bpplan; }

/* ---------- DASH: count servings from the food you logged ---------- */
var DG = [
  ['grain', 'Whole grains', 'food', '#F5A60B', '1 roti, or ½ katori rice, poha or daliya'],
  ['veg', 'Vegetables', 'yoga', '#16C79A', '½ katori sabzi, or 1 katori salad'],
  ['fruit', 'Fruit', 'spark', '#FF6A3D', '1 fruit, or 1 katori cut fruit'],
  ['dairy', 'Low-fat dairy', 'drop', '#2E8BFF', '1 glass toned milk, or 1 katori curd'],
  ['leg', 'Dal, beans, nuts', 'bolt', '#8B4DFF', '1 katori dal or chole, or a handful of nuts']
];
var DRX = {
  fruit: /\b(banana|kela|apple|papaya|papita|guava|amrood|orange|santra|mosambi|sweet lime|mango|grapes|angoor|pomegranate|anar|watermelon|tarbooz|muskmelon|kharbooja|chikoo|chiku|sapota|pear|nashpati|pineapple|ananas|kiwi|strawberr|berries|jamun|plum|peach|fig|anjeer|dates|khajur|raisins?|kishmish|custard apple|sitaphal|lychee|fruit)/i,
  dairy: /\b(milk|doodh|curd|dahi|yogh?urt|buttermilk|chaas|chhaas|lassi|paneer|cottage cheese|cheese|raita|shrikhand|kadhi)\b/i,
  leg: /\b(dal|daal|dals|sambar|rajma|chole|chana|chickpeas?|moong|mung|masoor|toor|tuvar|arhar|urad|lobia|chawli|matki|moth|kulith|usal|misal|sprouts|soya|soy|tofu|chilla|cheela|dhokla|almonds?|badam|walnuts?|akhrot|cashews?|kaju|peanuts?|groundnuts?|moongphali|pista|pistachio|seeds|flax|chia|makhana)\b/i,
  grain: /\b(roti|chapati|chapatti|phulka|bhakri|bhakhri|paratha|parantha|thepla|naan|kulcha|puri|poori|rice|chawal|pulao|pulav|biryani|khichdi|poha|upma|daliya|dalia|oats|sabudana|idli|dosa|uttapam|appam|bread|pav|toast|vermicelli|seviyan|noodles|pasta|millet|bajra|jowar|ragi|nachni|quinoa|muesli|cornflakes|corn flakes|khakhra)\b/i,
  veg: /\b(sabzi|sabji|subzi|bhaji|bharta|salad|kachumber|koshimbir|soup|palak|spinach|methi|aloo|potato|gobi|cauliflower|cabbage|kobi|bhindi|okra|baingan|brinjal|tendli|tondli|karela|lauki|dudhi|turai|parwal|pumpkin|kaddu|beans|carrot|gajar|beetroot|cucumber|kakdi|tomato|capsicum|mushroom|corn|peas|matar|drumstick|sarson|saag|vegetables?|veg|tinda|arbi|suran|yam|sweet potato|shakarkandi|poriyal|thoran|avial|kofta)\b/i
};
var DNOT = /pakora|pakoda|bhajiya|chips|wafer|fries|halwa|kheer|cake|jam\b|jelly|murabba|ice cream|candy|barfi|burfi|ladoo|laddu|biscuit|cookie|chocolate|soda|cola/i;
var DSPLIT = [
  [/khichdi/i, { grain: 0.5, leg: 0.5 }], [/curd rice|dahi chawal/i, { grain: 0.6, dairy: 0.4 }], [/(palak|matar|kadai|shahi|butter) paneer|paneer (bhurji|tikka|butter)/i, { veg: 0.5, dairy: 0.5 }],
  [/kadhi/i, { dairy: 0.6, leg: 0.4 }], [/raita/i, { dairy: 0.8, veg: 0.2 }], [/\b(tea|chai|coffee)\b/i, { dairy: 0.3 }], [/milkshake|shake|smoothie|lassi/i, { dairy: 0.6, fruit: 0.4 }],
  [/sambar/i, { leg: 0.6, veg: 0.4 }], [/(dal|daal)\b.*(palak|methi|lauki|dudhi|spinach)|(palak|methi|lauki|dudhi|spinach).*(dal|daal)\b/i, { leg: 0.6, veg: 0.4 }]
];
function dashParts(it) {
  var n = it.n, g = it.g || 0, sh = null;
  for (var i = 0; i < DSPLIT.length; i++) if (DSPLIT[i][0].test(n)) { sh = DSPLIT[i][1]; break; }
  if (!sh) {
    var hit = DG.map(function (x) { return x[0]; }).filter(function (k) { return DRX[k].test(n) && !((k === 'veg' || k === 'fruit') && DNOT.test(n)); });
    if (/juice/i.test(n)) hit = hit.filter(function (k) { return k === 'fruit'; });
    if (!hit.length) return {};
    sh = {}; hit.forEach(function (k) { sh[k] = 1 / hit.length; });
  }
  var out = {};
  Object.keys(sh).forEach(function (k) {
    var size = 100;
    if (k === 'grain') size = /roti|chapat|phulka|bhakri|bhakhri|paratha|parantha|thepla|naan|kulcha|puri|poori|bread|pav|toast|khakhra/i.test(n) ? 35 : /oats|muesli|cornflakes|corn flakes/i.test(n) ? 30 : /idli/i.test(n) ? 45 : 90;
    if (k === 'veg') size = 80;
    if (k === 'fruit') size = /juice/i.test(n) ? 125 : /dates|khajur|raisin|kishmish|fig|anjeer/i.test(n) ? 30 : 100;
    if (k === 'dairy') size = /paneer|cheese/i.test(n) ? 40 : 200;
    if (k === 'leg') size = /almond|badam|walnut|akhrot|cashew|kaju|peanut|groundnut|moongphali|pista|seeds|flax|chia|makhana|roasted chana/i.test(n) ? 30 : 100;
    out[k] = g * sh[k] / size;
  });
  return out;
}
function dashTargets(k) {
  var b = budgetFor(k || today()).total, hi = b >= 1800;
  return { grain: hi ? 7 : 6, veg: hi ? 5 : 4, fruit: hi ? 5 : 4, dairy: 3, leg: 2, fatG: Math.round(b * 0.27 / 9), sweetsDay: hi ? 0.7 : 0.4, sweetsWeek: hi ? 5 : 3, na: 1500 };
}
var DCACHE = {};
function dashDay(k) {
  var key = k + '|' + MV; if (DCACHE[key]) return DCACHE[key];
  var items = dayItems(k), T = dashTargets(k), s = { grain: 0, veg: 0, fruit: 0, dairy: 0, leg: 0 }, by = [];
  items.forEach(function (it) { var p = dashParts(it); Object.keys(p).forEach(function (g) { s[g] += p[g]; }); by.push({ it: it, p: p }); });
  var t = dayTotals(k), sweets = (t.su || 0) / 12.5;
  var r = { k: k, s: s, T: T, na: Math.round(t.na || 0), fat: Math.round(t.f || 0), sweets: sweets, by: by, n: items.length, score: null };
  if (items.length) {
    var sc = 0;
    DG.forEach(function (x) { sc += 14 * Math.min(1, s[x[0]] / T[x[0]]); });
    sc += 15 * clamp((3000 - r.na) / 1500, 0, 1);
    sc += 7.5 * clamp((T.fatG * 1.5 - r.fat) / (T.fatG * 0.5), 0, 1);
    sc += 7.5 * clamp((3 - sweets) / (3 - T.sweetsDay), 0, 1);
    r.score = Math.round(sc);
  }
  return (DCACHE[key] = r);
}
function dashWeek(endK) {
  var out = []; for (var i = 6; i >= 0; i--) out.push(dashDay(addDays(endK || today(), -i)));
  return out;
}
/* what to eat to fill a gap: one tap opens the food, ready to add */
var DFILL = {
  fruit: [['Banana (Kela)', 'a banana'], ['Papaya (Papita)', 'a katori of papaya'], ['Guava (Amrood)', 'a guava'], ['Apple', 'an apple']],
  dairy: [['Curd (Dahi)', 'a katori of curd'], ['Milk toned', 'a glass of toned milk'], ['Buttermilk (Chaas)', 'a glass of chaas']],
  veg: [['Mixed vegetable sabzi', 'a full katori of sabzi'], ['Green salad', 'a katori of salad'], ['Cucumber (Kakdi)', 'a cucumber']],
  leg: [['Moong dal (yellow)', 'a katori of moong dal'], ['Roasted chana', 'a fistful of roasted chana'], ['Sprouts moong (raw)', 'a katori of sprouts']],
  grain: [['Chapati', 'a roti'], ['Dalia (Broken wheat porridge)', 'a katori of daliya']]
};
function dashFill(d) {
  return DG.map(function (x) { return { k: x[0], gap: Math.max(0, d.T[x[0]] - d.s[x[0]]), x: x }; }).filter(function (g) { return g.gap >= 0.75; })
    .sort(function (a, b) { return b.gap / d.T[b.k] - a.gap / d.T[a.k]; }).slice(0, 3).map(function (g) {
      var opts = (DFILL[g.k] || []).filter(function (f) { return food(f[0]); });
      return { k: g.k, gap: g.gap, x: g.x, opts: opts };
    });
}
function pips(got, of, col, limit) {
  var n = Math.max(1, Math.ceil(of)), h = '', i;
  for (i = 0; i < n; i++) h += '<i class="' + (got >= i + 0.75 ? 'on' : got > i + 0.25 ? 'half' : '') + '"></i>';
  if (limit && got > of) for (i = n; i < Math.min(Math.ceil(got), n + 6); i++) h += '<i class="over"></i>';
  return '<div class="pips" style="--pc:' + col + '">' + h + '</div>';
}
function sv(x) { return x >= 10 ? Math.round(x) : Math.round(x * 2) / 2; }
function dashRows(d) {
  return DG.map(function (x) {
    return '<div class="dg">' + orb(x[2], 14) + '<div><b>' + x[1] + '</b><div class="s">' + x[4] + '</div>' + pips(d.s[x[0]], d.T[x[0]], x[3]) + '</div><div class="n">' + sv(d.s[x[0]]) + ' / ' + d.T[x[0]] + '</div></div>';
  }).join('') +
    '<div class="dg">' + orb('heart', 14) + '<div><b>Oil, ghee and fat</b><div class="s">Up to 27% of your calories</div>' + pips(d.fat / 10, d.T.fatG / 10, '#C9773A', 1) + '</div><div class="n' + (d.fat > d.T.fatG ? ' bad2' : '') + '">' + d.fat + ' / ' + d.T.fatG + ' g</div></div>' +
    '<div class="dg">' + orb('pill', 14) + '<div><b>Sweets and sugar</b><div class="s">1 serving = 1 tbsp sugar or a small mithai. Up to ' + d.T.sweetsWeek + ' a week</div>' + pips(d.sweets, Math.max(1, d.T.sweetsDay), '#E0245E', 1) + '</div><div class="n' + (d.sweets > 1 ? ' bad2' : '') + '">' + sv(d.sweets) + '</div></div>' +
    '<div class="dg">' + orb('bp', 14) + '<div><b>Salt (sodium)</b><div class="s">Under 1,500 mg</div>' + pips(d.na / 300, 5, '#FF8A3D', 1) + '</div><div class="n' + (d.na > 1500 ? ' bad2' : '') + '">' + n0(d.na) + '</div></div>';
}

/* ---------- daily habits ---------- */
var BPH = [
  ['dash', 'DASH day', 'food', 'Score 70 or more from what you ate'],
  ['salt', 'Salt under 1,500 mg', 'bp', 'No pickle, papad or namkeen'],
  ['walk', 'Brisk walk, 30 min', 'steps', 'Fast enough to talk, not sing'],
  ['wall', 'Wall sit, 4 × 2 min', 'bolt', '3 days a week'],
  ['breath', 'Slow breathing, 10 min', 'yoga', 'Anulom Vilom or Bhramari'],
  ['sleep', 'Sleep 7 hours', 'moon', 'Last night'],
  ['measure', 'BP morning and evening', 'heart', '2 readings each time']
];
function bpHabit(id, k) {
  var P = bpPlan(), man = (P.ticks[k] || {})[id], d = dayIf(k), ys = d ? d.yoga || [] : [];
  if (id === 'dash') { var dd = dashDay(k); return { ok: dd.score != null && dd.score >= 70, auto: 1, note: dd.score == null ? 'Log food to score' : 'Score ' + dd.score }; }
  if (id === 'salt') { var na = dashDay(k).na; return { ok: dashDay(k).n > 0 && na <= 1500, auto: 1, note: dashDay(k).n ? n0(na) + ' mg so far' : 'Log food to count' }; }
  if (id === 'walk') { var w = ys.filter(function (y) { return y.kind === 'walk' || /walk/i.test(y.name || ''); }).reduce(function (a, y) { return a + (y.min || 0); }, 0); return { ok: man || w >= 30, note: w ? Math.round(w) + ' min logged' : 'Tick when done' }; }
  if (id === 'wall') { var wd = 0; for (var i = 0; i < 7; i++) if ((P.ticks[addDays(k, -i)] || {}).wall) wd++; return { ok: !!man, note: wd + ' of 3 this week' }; }
  if (id === 'breath') { var pm = ys.filter(function (y) { return y.prana; }).reduce(function (a, y) { return a + (y.min || 0); }, 0); return { ok: man || pm >= 10, note: pm ? Math.round(pm) + ' min done' : 'Tick when done' }; }
  if (id === 'sleep') { var sl = sleepFor(k); return { ok: !!sl && sl.asleep >= 420, auto: 1, note: sl ? dur(sl.asleep) : 'No sleep data' }; }
  if (id === 'measure') { var ss = bpSittings(2).filter(function (s) { return dkey(new Date(s.t)) === k; }); var am = ss.some(function (s) { return s.am; }), pmm = ss.some(function (s) { return !s.am; }); return { ok: am && pmm, auto: 1, note: (am ? 'Morning ✓' : 'Morning —') + ' · ' + (pmm ? 'Evening ✓' : 'Evening —') }; }
  return { ok: !!man };
}
ACT.bpTick = function (el) { var id = el.getAttribute('data-id'), k = today(), P = bpPlan(); P.ticks[k] = P.ticks[k] || {}; P.ticks[k][id] = !P.ticks[k][id]; if (P.ticks[k][id]) feel('done'); save(); rerender(); };

/* ---------- the BP plan page ---------- */
ROUTES.bpplan = function () {
  var P = bpPlan(), k = today(), h = head('BP plan', 'DASH diet and daily habits');
  var w = bpWindow(7), wam = bpWindow(7, 0, function (s) { return s.am; }), wpm = bpWindow(7, 0, function (s) { return !s.am; });
  if (!w) {
    h += '<section class="c"><h2>Start with a week of readings</h2><div class="l">Measure morning and evening for 7 days with your cuff (Omron). Arogya then shows your real average and tracks it down.</div><button class="btn mt" data-act="logBp">' + icon('plus', 18) + 'Log BP</button></section>';
  } else {
    var st = bpStage(w.sys, w.dia);
    h += '<section class="c"><div class="l">Your BP, last 7 days · ' + w.n + ' sittings with your cuff</div>' +
      '<div class="row sb mt6" style="align-items:flex-end"><b style="font-size:46px;letter-spacing:-1.5px;line-height:1;color:' + st[2] + '">' + w.sys + '/' + w.dia + '</b><span class="gtag" style="background:' + st[2] + '22;color:' + st[2] + '">' + st[1] + '</span></div>' +
      '<div class="big2">' + (wam ? '<div><span class="l">Mornings</span><b>' + wam.sys + '/' + wam.dia + '</b></div>' : '<div><span class="l">Mornings</span><b>—</b></div>') + (wpm ? '<div><span class="l">Evenings</span><b>' + wpm.sys + '/' + wpm.dia + '</b></div>' : '<div><span class="l">Evenings</span><b>—</b></div>') + '</div>' +
      '<div class="lad">' + [['#16C79A', 'Normal', '&lt;120/80'], ['#F5B700', 'Elevated', '120–129'], ['#FF8A3D', 'Stage 1', '130–139 or 80–89'], ['#E0245E', 'Stage 2', '140+ or 90+']].map(function (x, i) { return '<div class="' + (Math.min(st[0], 3) === i ? 'you' : '') + '"><i style="background:' + x[0] + '"></i>' + x[1] + '<br>' + x[2] + '</div>'; }).join('') + '</div>';
    var s1 = bpStage(w.sys, 0)[0], d1 = bpStage(0, w.dia)[0];
    if (s1 !== d1) h += '<div class="l mt">Your top number is ' + bpStage(w.sys, 0)[1].toLowerCase() + ', your bottom number is ' + bpStage(0, w.dia)[1].toLowerCase() + '. The ' + (d1 > s1 ? 'bottom' : 'top') + ' number is the one to bring down.</div>';
    h += '</section>';
    if (st[0] >= 3) h += '<section class="c doc"><b>' + (P.doctor ? 'Following your doctor\'s advice' : 'See a doctor soon') + '</b><div class="l mt6">' + (P.doctor ? 'Your doctor asked you to follow the DASH diet. Take this report to your next visit so they can see how it is going.' : 'Under the 2025 American Heart Association guideline, an average of 140/90 or more means a doctor should look at medicine alongside lifestyle.') + '</div><button class="btn sec mt" data-act="go" data-to="bpreport">' + icon('doc', 18) + 'Doctor report</button></section>';
  }
  /* today */
  var hs = BPH.map(function (x) { var r = bpHabit(x[0], k); r.x = x; return r; }), done = hs.filter(function (r) { return r.ok; }).length;
  h += '<section class="c"><h2>Today · ' + done + ' of ' + hs.length + '</h2>' + hs.map(function (r) {
    var x = r.x;
    return '<div class="lev">' + orb(x[2], 16) + '<div class="f1"><b>' + x[1] + '</b><div class="l">' + esc(r.note || x[3]) + '</div>' +
      (x[0] === 'wall' ? '<button class="lnk" data-act="go" data-to="wallsit">Do it with the timer</button>' : x[0] === 'breath' ? '<button class="lnk" data-act="go" data-to="breaths">Open pranayama</button>' : x[0] === 'dash' ? '<button class="lnk" data-act="go" data-to="dash">See servings</button>' : '') + '</div>' +
      (r.auto ? '<span class="tick' + (r.ok ? ' on' : ' auto') + '" aria-label="' + (r.ok ? 'Done' : 'Not yet') + '">' + (r.ok ? '✓' : '') + '</span>' : '<button class="tick' + (r.ok ? ' on' : '') + '" data-act="bpTick" data-id="' + x[0] + '" aria-label="Mark ' + esc(x[1]) + '">' + (r.ok ? '✓' : '') + '</button>') + '</div>';
  }).join('') + '<div class="l mt6">Ticks with no box fill in by themselves from your food, sleep and BP readings.</div></section>';
  /* DASH summary */
  var dd = dashDay(k), wk = dashWeek(k), wsc = wk.filter(function (d) { return d.score != null; }), wavg = wsc.length ? Math.round(dayAvg(wsc.map(function (d) { return d.score; }))) : null;
  h += '<section class="c" data-act="go" data-to="dash" style="cursor:pointer"><div class="row sb"><div><h2>DASH diet</h2><div class="l">As your doctor advised · tap for details</div></div><b style="font-size:40px;letter-spacing:-1px">' + (dd.score == null ? '—' : dd.score) + '</b></div>' +
    '<div class="dmini">' + DG.map(function (x) { return '<div><span>' + x[1].split(',')[0] + '</span><div class="dm"><i style="width:' + clamp(dd.s[x[0]] / dd.T[x[0]] * 100, 0, 100) + '%;background:' + x[3] + '"></i></div><em>' + sv(dd.s[x[0]]) + '/' + dd.T[x[0]] + '</em></div>'; }).join('') + '</div>' +
    '<div class="rd"><span>Salt today</span><b class="' + (dd.na > 1500 ? 'warnt' : 'gtxt') + '">' + n0(dd.na) + ' of 1,500 mg</b></div>' + (wavg != null ? '<div class="rd"><span>DASH score, 7-day average</span><b>' + wavg + '</b></div>' : '') + '</section>';
  /* goals and trend */
  if (w) {
    h += '<section class="c"><h2>Your goals</h2>' +
      '<div class="rd"><span><b>Under 130/80</b><br><span class="l">The 2025 treatment target. ' + gapTxt(w, 129, 79) + '</span></span><b class="' + (w.sys < 130 && w.dia < 80 ? 'gtxt' : 'warnt') + '">' + (w.sys < 130 && w.dia < 80 ? 'Reached' : 'Goal 1') + '</b></div>' +
      '<div class="rd"><span><b>120/80</b><br><span class="l">Normal. ' + gapTxt(w, 119, 79) + '</span></span><b class="' + (w.sys < 120 && w.dia < 80 ? 'gtxt' : 'mute') + '">' + (w.sys < 120 && w.dia < 80 ? 'Reached' : 'Goal 2') + '</b></div>' + weekChart() + '</section>';
    h += weekReport();
  }
  /* measuring */
  h += '<section class="c"><h2>How to measure</h2>' + ['Morning before tea and medicines, after the toilet. Evening before dinner.', 'Sit 5 minutes first: back supported, feet flat, arm on the table at heart level. No talking.', 'Take 2 readings, 1 minute apart. Arogya averages them into one sitting.'].map(function (t, i) { return '<div class="mst"><span class="n">' + (i + 1) + '</span><span>' + t + '</span></div>'; }).join('');
  var last = bpSittings(3)[0];
  if (last) h += '<div class="l mt">Last sitting, ' + niceDate(dkey(new Date(last.t))) + ' ' + hm(last.t) + ' · ' + last.r.length + ' reading' + (last.r.length > 1 ? 's' : '') + '</div><div class="sit">' + last.r.slice(0, 4).map(function (x) { return '<div><b>' + x.sys + '/' + x.dia + '</b>' + hm(x.t) + '</div>'; }).join('') + '</div><div class="rd"><span>Sitting average</span><b>' + last.sys + '/' + last.dia + '</b></div>';
  h += '<button class="tog" data-act="bpRemTog" role="switch" aria-checked="' + !!P.remind + '"><span>Remind me to measure</span><i class="' + (P.remind ? 'on' : '') + '"></i></button>' +
    (P.remind ? '<div class="g2"><label class="fld">Morning<input type="time" value="' + P.am + '" data-chg="bpAm"></label><label class="fld">Evening<input type="time" value="' + P.pm + '" data-chg="bpPm"></label></div>' : '') +
    '<div class="l mt6">Only cuff readings (Omron, or typed in) count here. Watch readings are estimates and are left out.</div></section>';
  h += '<section class="c"><h2>Get help at once if</h2><div class="l">A reading above <b>180/120</b>: sit 5 minutes and measure again. If it is still that high, call your doctor today. With chest pain, breathlessness, a bad headache, weakness on one side or trouble speaking, go to the emergency room.</div></section>';
  if (!P.doctor) h += '<button class="lnk" data-act="bpDoc">My doctor asked me to follow DASH</button>';
  return h;
};
TABOF.bpplan = 'vitals'; TABOF.dash = 'vitals'; TABOF.wallsit = 'vitals'; TABOF.bpreport = 'vitals';
function gapTxt(w, s, d) { var a = Math.max(0, w.sys - s), b = Math.max(0, w.dia - d); return a || b ? 'Down ' + (a ? a + ' on top' : '') + (a && b ? ', ' : '') + (b ? b + ' at the bottom' : '') + '.' : 'You are there.'; }
ACT.bpDoc = function () { bpPlan().doctor = true; save(); rerender(); };
ACT.bpRemTog = function () { var P = bpPlan(); P.remind = !P.remind; save(); syncMeds(); rerender(); };
CHG.bpAm = function (el) { bpPlan().am = el.value || '07:30'; save(); syncMeds(); };
CHG.bpPm = function (el) { bpPlan().pm = el.value || '21:00'; save(); syncMeds(); };

/* weekly averages, last 8 weeks */
function weekChart() {
  var wk = []; for (var i = 7; i >= 0; i--) { var a = bpWindow(7 * (i + 1), 7 * i); wk.push(a); }
  var has = wk.filter(Boolean); if (has.length < 1) return '';
  var W = 320, H = 130, lo = 70, hi = 160, y = function (v) { return H - 18 - (clamp(v, lo, hi) - lo) / (hi - lo) * (H - 28); }, x = function (i) { return 14 + i * (W - 28) / 7; };
  var line = function (key, col) { var pts = wk.map(function (a, i) { return a ? x(i) + ',' + y(a[key]) : null; }).filter(Boolean); return pts.length > 1 ? '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' : ''; };
  var dots = function (key, col) { return wk.map(function (a, i) { return a ? '<circle cx="' + x(i) + '" cy="' + y(a[key]) + '" r="3.5" fill="' + col + '"/>' : ''; }).join(''); };
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" class="mt" aria-label="Weekly BP averages">' +
    '<rect x="0" y="' + y(129) + '" width="' + W + '" height="' + (y(lo) - y(129)) + '" fill="rgba(22,199,154,.10)"/><line x1="0" x2="' + W + '" y1="' + y(130) + '" y2="' + y(130) + '" stroke="#16C79A" stroke-dasharray="4 4"/><line x1="0" x2="' + W + '" y1="' + y(80) + '" y2="' + y(80) + '" stroke="#16C79A" stroke-dasharray="4 4"/>' +
    '<text x="' + (W - 4) + '" y="' + (y(130) - 4) + '" font-size="10" text-anchor="end" fill="#0E8A6A">130</text><text x="' + (W - 4) + '" y="' + (y(80) - 4) + '" font-size="10" text-anchor="end" fill="#0E8A6A">80</text>' +
    line('sys', '#E0245E') + line('dia', '#7A4DFF') + dots('sys', '#E0245E') + dots('dia', '#7A4DFF') +
    '<text x="14" y="' + (H - 3) + '" font-size="10" fill="#5B5280">8 weeks ago</text><text x="' + (W - 14) + '" y="' + (H - 3) + '" font-size="10" text-anchor="end" fill="#5B5280">this week</text></svg>' +
    '<div class="l">Weekly average: <b style="color:#E0245E">top</b> and <b style="color:#7A4DFF">bottom</b> numbers. Green is the goal zone.</div>';
}
/* this week against last week, and what seems to move your BP */
function weekReport() {
  var a = bpWindow(7), b = bpWindow(14, 7); if (!a) return '';
  var k = today(), done = 0, tot = 0;
  var st0 = bpPlan().start; for (var i = 0; i < 7; i++) { var dk = addDays(k, -i); if (dk < st0) break; BPH.forEach(function (x) { tot++; if (bpHabit(x[0], dk).ok) done++; }); }
  var h = '<section class="c"><h2>This week vs last week</h2><div class="wk"><div>Last week<b>' + (b ? b.sys + '/' + b.dia : '—') + '</b></div><div>This week<b>' + a.sys + '/' + a.dia + '</b></div><div>Change<b class="' + (b && a.dia < b.dia ? 'gtxt' : b && a.dia > b.dia ? 'bad2' : '') + '">' + (b ? sgn(a.sys - b.sys) + '/' + sgn(a.dia - b.dia) : '—') + '</b></div><div>Plan done<b>' + (tot ? Math.round(done / tot * 100) + '%' : '—') + '</b></div></div>';
  var f = bpFactors(); if (f) h += '<div class="note mt">' + f + '</div>';
  return h + '</section>';
}
function sgn(v) { return v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0'; }
/* compare next-morning BP after days with and without a habit (needs a few of each) */
function bpFactors() {
  var mornings = bpSittings(60).filter(function (s) { return s.am; }), byDay = {};
  mornings.forEach(function (s) { var d = dkey(new Date(s.t)); (byDay[d] = byDay[d] || []).push(s.dia); });
  var tests = [
    ['salt', 'salt under 1,500 mg', function (k) { var d = dashDay(k); return d.n ? d.na <= 1500 : null; }],
    ['sleep', '7 hours of sleep', function (k) { var s = sleepFor(addDays(k, 1)); return s ? s.asleep >= 420 : null; }],
    ['dash', 'a DASH score of 70+', function (k) { var d = dashDay(k); return d.score == null ? null : d.score >= 70; }],
    ['walk', 'a brisk walk', function (k) { return bpHabit('walk', k).ok; }]
  ], best = null;
  tests.forEach(function (t) {
    var yes = [], no = [];
    Object.keys(byDay).forEach(function (d) { var prev = addDays(d, -1), r = t[2](prev); if (r == null) return; (r ? yes : no).push(dayAvg(byDay[d])); });
    if (yes.length >= 3 && no.length >= 3) { var diff = dayAvg(no) - dayAvg(yes); if (!best || diff > best.diff) best = { t: t, diff: diff, n: yes.length + no.length }; }
  });
  if (!best || best.diff < 2) return '';
  return 'Your clearest pattern so far: after a day with <b>' + best.t[1] + '</b>, your next-morning bottom number is about <b>' + Math.round(best.diff) + ' lower</b> (from ' + best.n + ' mornings).';
}

/* ---------- DASH detail ---------- */
var DSEL = null;
ROUTES.dash = function (k) {
  k = k || DSEL || today();
  var d = dashDay(k), h = head('DASH diet', 'As your doctor advised');
  var days = []; for (var i = 6; i >= 0; i--) days.push(addDays(today(), -i));
  h += '<div class="days">' + days.map(function (dk) { var x = dashDay(dk); return '<button class="day' + (dk === k ? ' on' : '') + '" data-act="go" data-to="dash/' + dk + '">' + DOW[fromKey(dk).getDay()].slice(0, 3) + '<b>' + fromKey(dk).getDate() + '</b><i style="background:' + (x.score == null ? 'transparent' : x.score >= 70 ? 'var(--g)' : 'var(--warn)') + '"></i></button>'; }).join('') + '</div>';
  h += '<section class="c"><div class="row sb"><div><div class="l">DASH score' + (k === today() ? ' today' : ', ' + niceDate(k)) + '</div><div class="l">Counted from what you logged</div></div><b style="font-size:52px;letter-spacing:-2px;line-height:1">' + (d.score == null ? '—' : d.score) + '</b></div>' +
    (d.score == null ? '<div class="l mt">Nothing logged ' + (k === today() ? 'yet today' : 'that day') + '.</div>' : '') + '</section>';
  h += '<section class="c"><h2>Servings</h2>' + dashRows(d) + '<div class="l mt6">Targets for your ' + n0(budgetFor(k).total) + ' kcal day, with dal and nuts in place of meat. Tea sugar counts as sweets.</div></section>';
  if (k === today() && d.n) {
    var fill = dashFill(d);
    if (fill.length) h += '<section class="c"><h2>To fill the gaps</h2>' + fill.map(function (g) {
      return '<div class="nx">' + orb(g.x[2], 14) + '<div class="f1"><b>' + g.x[1] + ' +' + sv(g.gap) + '</b><span class="l">' + g.opts.slice(0, 2).map(function (o) { return o[1]; }).join(', or ') + '</span></div>' + (g.opts[0] ? '<button class="btn sm sec" data-act="go" data-to="dish/' + mealFor() + '/' + esc(g.opts[0][0]) + '">Add</button>' : '') + '</div>';
    }).join('') + '</section>';
  }
  var wk = dashWeek(today()), sweetsW = wk.reduce(function (a, x) { return a + x.sweets; }, 0), T = d.T;
  h += '<section class="c"><h2>Last 7 days</h2><div class="dw">' + wk.map(function (x) { return '<div><i><em style="height:' + (x.score || 0) + '%"></em></i>' + DOW[fromKey(x.k).getDay()].slice(0, 3) + '<br><b>' + (x.score == null ? '—' : x.score) + '</b></div>'; }).join('') + '</div>';
  var wl = wk.filter(function (x) { return x.n; });
  if (wl.length) {
    var avgS = {}; DG.forEach(function (x) { avgS[x[0]] = dayAvg(wl.map(function (dd) { return dd.s[x[0]] / dd.T[x[0]]; })); });
    var weak = DG.slice().sort(function (a, b) { return avgS[a[0]] - avgS[b[0]]; }).slice(0, 2);
    h += '<div class="l mt">Weakest groups this week: <b>' + weak.map(function (x) { return x[1].toLowerCase(); }).join('</b> and <b>') + '</b>. Sweets: ' + sv(sweetsW) + ' servings (up to ' + T.sweetsWeek + ' a week).</div>';
  }
  h += '</section>';
  if (d.n) h += '<details class="c"><summary class="lnk">How ' + (k === today() ? 'today\'s' : 'this day\'s') + ' food was counted</summary>' + d.by.map(function (b) {
    var ks = Object.keys(b.p).filter(function (g) { return b.p[g] >= 0.05; });
    return '<div class="rd"><span>' + esc(b.it.n) + '<br><span class="l">' + frac(b.it.q) + ' ' + esc(b.it.u) + '</span></span><b class="sm">' + (ks.length ? ks.map(function (g) { return sv(b.p[g]) + ' ' + DG.filter(function (x) { return x[0] === g; })[0][1].split(',')[0].toLowerCase(); }).join(', ') : '<span class="mute">not a DASH group</span>') + '</b></div>';
  }).join('') + '</details>';
  h += '<section class="c"><h2>What DASH means</h2><div class="l">Dietary Approaches to Stop Hypertension: plenty of vegetables, fruit, low-fat dairy, whole grains, dal and nuts; little salt, sugar and fat. In the original studies it lowered BP within 2 weeks, most in people with high BP.</div></section>';
  return h;
};

/* ---------- wall sit timer: 4 × 2 min hold, 2 min rest ---------- */
var WS = null;
ROUTES.wallsit = function () {
  var h = head('Wall sit', '4 × 2 minutes, 3 days a week');
  h += '<section class="c ctrtxt"><svg viewBox="0 0 200 150" width="200" aria-hidden="true"><rect x="150" y="5" width="12" height="140" rx="3" fill="#C9B8FF"/><line x1="10" y1="145" x2="190" y2="145" stroke="#C9B8FF" stroke-width="4"/>' +
    '<circle cx="132" cy="30" r="12" fill="url(#wsg)"/><defs><linearGradient id="wsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B5CFF"/><stop offset="1" stop-color="#FF4F9A"/></linearGradient></defs>' +
    '<path d="M138,44 L140,96 L94,98 L96,142 M140,96 L96,96" fill="none" stroke="url(#wsg)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M136,56 L112,72" stroke="url(#wsg)" stroke-width="9" stroke-linecap="round"/></svg>' +
    '<div class="l">Back flat on the wall, slide down until your knees are bent, feet a step out. Thighs as close to level as you can hold for 2 minutes. Keep breathing; do not hold your breath.</div>' +
    '<div class="bph"><b id="wsph">' + (WS ? WS.ph : 'Ready') + '</b></div><div class="huge" id="wst" style="font-size:56px;font-weight:700">' + (WS ? fmtS(WS.left) : '2:00') + '</div><div class="l" id="wsr">' + (WS ? 'Round ' + WS.r + ' of 4' : '4 rounds · 14 min with rests') + '</div>' +
    '<button class="btn big mt" data-act="wsGo">' + icon(WS && WS.run ? 'pause' : 'play', 20) + (WS && WS.run ? 'Pause' : WS ? 'Resume' : 'Start') + '</button>' + (WS ? '<button class="lnk" data-act="wsEnd">Finish and save</button>' : '') + '</section>';
  h += '<section class="c"><div class="l">In a 2023 review of 270 trials, isometric exercise like the wall sit lowered BP the most of all exercise types. Stop if you feel dizzy or have chest pain. If your knees hurt, do not slide down as far.</div></section>';
  return h;
};
function fmtS(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + pad(s % 60); }
var WSPH = [['Hold', 120], ['Rest', 120], ['Hold', 120], ['Rest', 120], ['Hold', 120], ['Rest', 120], ['Hold', 120]];
ACT.wsGo = function () {
  if (!WS) WS = { i: 0, left: 120, ph: 'Hold', r: 1, run: false, held: 0 };
  WS.run = !WS.run;
  if (WS.run) { native('keepAwake', true); feel('bell'); WS.last = Date.now(); WS.tm = setInterval(wsTick, 250); } else { clearInterval(WS.tm); native('keepAwake', false); }
  rerender();
};
function wsTick() {
  if (!WS || !WS.run) return;
  var now = Date.now(), dt = (now - WS.last) / 1000; WS.last = now; WS.left -= dt; if (WS.ph === 'Hold') WS.held += dt;
  if (WS.left <= 0) {
    WS.i++;
    if (WS.i >= WSPH.length) { wsSave(); return; }
    WS.ph = WSPH[WS.i][0]; WS.left = WSPH[WS.i][1]; if (WS.ph === 'Hold') WS.r++;
    feel(WS.ph === 'Hold' ? 'bell' : 'done'); if (typeof plSay === 'function') plSay(WS.ph === 'Hold' ? 'Hold' : 'Rest');
  }
  var a = document.getElementById('wst'), b = document.getElementById('wsph'), c = document.getElementById('wsr');
  if (a) a.textContent = fmtS(WS.left); if (b) b.textContent = WS.ph; if (c) c.textContent = 'Round ' + WS.r + ' of 4';
}
function wsSave() {
  if (!WS) return; clearInterval(WS.tm); native('keepAwake', false);
  var held = Math.round(WS.held / 60 * 10) / 10;
  if (held >= 1) { day(today()).yoga.push({ t: Date.now(), min: held, kind: 'other', name: 'Wall sit' }); var P = bpPlan(), k = today(); P.ticks[k] = P.ticks[k] || {}; P.ticks[k].wall = true; feel('win'); toast('Wall sit saved · ' + held + ' min held'); }
  WS = null; save(); rerender();
}
ACT.wsEnd = function () { wsSave(); };

/* ---------- doctor report ---------- */
function bpReportText() {
  var P = DB.profile, all = bpSittings(30), a = bpAvgOf(all), am = bpAvgOf(all.filter(function (s) { return s.am; })), pm = bpAvgOf(all.filter(function (s) { return !s.am; }));
  var hi = all.slice().sort(function (x, y) { return y.sys - x.sys; })[0], lo = all.slice().sort(function (x, y) { return x.sys - y.sys; })[0];
  var wk = []; for (var i = 0; i < 30; i++) { var d = dashDay(addDays(today(), -i)); if (d.score != null) wk.push(d); }
  var L = [];
  L.push('Blood pressure report · ' + (P.name || 'Arogya user') + (P.age ? ', ' + P.age + ' y' : '') + (P.sex ? ', ' + (P.sex === 'f' ? 'female' : 'male') : ''));
  L.push('Last 30 days, home cuff readings (2 readings per sitting, averaged). Made ' + niceDate(today()) + '.');
  L.push('');
  if (a) { L.push('Average: ' + a.sys + '/' + a.dia + ' mmHg (' + a.n + ' sittings)'); if (am) L.push('Mornings: ' + am.sys + '/' + am.dia + ' (' + am.n + ')'); if (pm) L.push('Evenings: ' + pm.sys + '/' + pm.dia + ' (' + pm.n + ')'); L.push('Highest: ' + hi.sys + '/' + hi.dia + ' on ' + niceDate(dkey(new Date(hi.t))) + '. Lowest: ' + lo.sys + '/' + lo.dia + ' on ' + niceDate(dkey(new Date(lo.t))) + '.'); }
  else L.push('No cuff readings in the last 30 days.');
  var w1 = bpWindow(7), w4 = bpWindow(28, 21); if (w1 && w4) L.push('First week ' + w4.sys + '/' + w4.dia + ' → last week ' + w1.sys + '/' + w1.dia + '.');
  L.push('');
  var ms = (typeof meds === 'function' ? meds() : []); if (ms.length) { L.push('Medicines: ' + ms.map(function (m) { return medLabel(m) + ' (' + medQty(m) + ', ' + (m.times || []).join(', ') + ')'; }).join('; ')); }
  if (wk.length) { L.push('DASH diet: average score ' + Math.round(dayAvg(wk.map(function (d) { return d.score; }))) + '/100 over ' + wk.length + ' logged days. Sodium average ' + n0(dayAvg(wk.map(function (d) { return d.na; }))) + ' mg/day.'); }
  var sl = []; for (i = 0; i < 14; i++) { var s = sleepFor(addDays(today(), -i)); if (s) sl.push(s.asleep); } if (sl.length) L.push('Sleep: ' + dur(dayAvg(sl)) + ' a night on average (watch).');
  var wt = merged('weight'); if (wt.length) L.push('Weight: ' + n1(wt[0].kg) + ' kg' + (wt.length > 1 && wt[wt.length - 1].t < Date.now() - 20 * 86400000 ? ' (' + n1(wt[wt.length - 1].kg) + ' kg on ' + niceDate(dkey(new Date(wt[wt.length - 1].t))) + ')' : '') + '.');
  L.push('');
  L.push('All sittings (date, time, average):');
  all.forEach(function (s) { L.push(niceDate(dkey(new Date(s.t))) + ' ' + hm(s.t) + '  ' + s.sys + '/' + s.dia + (s.r.length > 1 ? '  (' + s.r.map(function (x) { return x.sys + '/' + x.dia; }).join(', ') + ')' : '')); });
  return L.join('\n');
}
ROUTES.bpreport = function () {
  var t = bpReportText();
  return head('Doctor report', 'Last 30 days') + '<section class="c"><pre class="rep">' + esc(t) + '</pre></section>' +
    '<div class="g2"><button class="btn" data-act="bpShare">' + icon('send', 18) + 'Share</button><button class="btn sec" data-act="bpSaveRep">Save as file</button></div>';
};
ACT.bpShare = function () { if (!AND) return toast('Works in the phone app'); native('shareText', 'BP report', bpReportText()); };
ACT.bpSaveRep = function () { native('saveFile', 'bp-report-' + today() + '.txt', 'text/plain', bpReportText()); };

/* ---------- a very high reading: say so at once ---------- */
function bpSevereCheck() {
  var x = cuffBp()[0]; if (!x || x.t < Date.now() - 6 * 3600000) return;
  if (!(x.sys > 180 || x.dia > 120)) return;
  var P = bpPlan(); if (P.sevAt === x.t) return; P.sevAt = x.t; save();
  feel('warn');
  sheet('<h2 class="bad2">' + x.sys + '/' + x.dia + ' is very high</h2><p class="p">Sit quietly for 5 minutes and measure again. If it is still above 180/120, call your doctor today.</p><p class="p"><b>Go to the emergency room now</b> if you also have chest pain, breathlessness, a bad headache, blurred vision, weakness on one side or trouble speaking.</p><button class="btn mt" data-act="closeSheet">I understand</button>');
}

/* BP check reminders go through the same pop-up as medicines */
function bpReminderDoses() {
  var P = DB.bpplan; if (!P || !P.remind) return [];
  return [['bp_am', P.am || '07:30', 'Morning'], ['bp_pm', P.pm || '21:00', 'Evening']].map(function (x) { return { id: x[0], n: 'Time to check your BP', q: x[2] + ' · sit 5 min, then 2 readings', times: [x[1]], days: [], every: 1, start: '', end: '', route: 'bpplan', kind: 'bp' }; });
}
function bpReminderDone() {
  var P = DB.bpplan; if (!P || !P.remind) return [];
  var k = today(), ss = bpSittings(1).filter(function (s) { return dkey(new Date(s.t)) === k; }), out = [];
  if (ss.some(function (s) { return s.am; })) out.push('bp_am|' + (P.am || '07:30'));
  if (ss.some(function (s) { return !s.am; })) out.push('bp_pm|' + (P.pm || '21:00'));
  return out;
}
