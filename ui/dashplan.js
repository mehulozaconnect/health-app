/* DASH meal plan: plans the rest of today from what is still missing, prefers the foods you usually eat,
   logs a planned meal in one tap, reminds you before each meal, and reviews the week on Sundays. */
'use strict';
/* for each meal: the groups it should cover, with choices (food name, qty, unit). Your usual foods come first. */
var DTPL = {
  breakfast: [['grain', [['Vegetable poha', 1, 'katori'], ['Oats cooked with milk', 1, 'katori'], ['Upma', 1, 'katori'], ['Methi thepla', 2, 'piece'], ['Idli', 3, 'piece']]],
    ['dairy', [['Milk toned', 1, 'glass'], ['Curd (Dahi)', 1, 'katori']]], ['fruit', [['Banana (Kela)', 1, 'medium'], ['Apple', 1, 'medium'], ['Papaya (Papita)', 1, 'katori']]]],
  morning: [['fruit', [['Papaya (Papita)', 1, 'katori'], ['Guava (Amrood)', 1, 'medium'], ['Orange (Santra)', 1, 'medium'], ['Pomegranate (Anar)', 1, 'katori seeds'], ['Apple', 1, 'medium']]]],
  lunch: [['grain', [['Roti / Phulka (no ghee)', 2, 'piece'], ['Bajra roti', 2, 'piece']]], ['leg', [['Moong dal (yellow)', 1, 'katori'], ['Dal tadka (toor)', 1, 'katori'], ['Varan (plain dal)', 1, 'katori']]],
    ['veg', [['Bhindi sabzi', 1, 'katori'], ['Mixed vegetable sabzi', 1, 'katori'], ['Cabbage sabzi', 1, 'katori'], ['Lauki (bottle gourd) sabzi', 1, 'katori']]], ['veg', [['Green salad', 1, 'katori']]], ['dairy', [['Curd (Dahi)', 1, 'katori'], ['Buttermilk (Chaas)', 1, 'glass']]]],
  evening: [['fruit', [['Guava (Amrood)', 1, 'medium'], ['Orange (Santra)', 1, 'medium'], ['Apple', 1, 'medium'], ['Banana (Kela)', 1, 'medium']]], ['leg', [['Roasted chana', 1, 'fistful'], ['Sprouts moong (raw)', 1, 'katori'], ['Makhana roasted', 1, 'bowl']]]],
  dinner: [['grain', [['Bajra roti', 2, 'piece'], ['Roti / Phulka (no ghee)', 2, 'piece'], ['Dal khichdi', 1, 'katori']]], ['veg', [['Lauki (bottle gourd) sabzi', 1, 'katori'], ['Mixed vegetable sabzi', 1, 'katori'], ['Cabbage sabzi', 1, 'katori']]],
    ['dairy', [['Buttermilk (Chaas)', 1, 'glass'], ['Curd (Dahi)', 1, 'katori']]], ['leg', [['Moong dal (yellow)', 1, 'katori']]]]
};
/* fast day (upvas / vrat): no wheat, rice or dal */
var DFAST = {
  breakfast: [['dairy', [['Milk toned', 1, 'glass']]], ['fruit', [['Banana (Kela)', 1, 'medium'], ['Apple', 1, 'medium']]], ['leg', [['Almonds (Badam)', 1, '10 almonds']]]],
  morning: [['fruit', [['Papaya (Papita)', 1, 'katori'], ['Apple', 1, 'medium'], ['Coconut water', 1, 'glass']]]],
  lunch: [['grain', [['Rajgira roti (vrat)', 2, 'piece'], ['Sama khichdi (vrat)', 1, 'katori'], ['Sabudana khichdi', 1, 'katori']]], ['veg', [['Vrat aloo (jeera aloo, sendha namak)', 1, 'katori'], ['Lauki (bottle gourd) sabzi', 1, 'katori']]], ['dairy', [['Buttermilk (Chaas)', 1, 'glass']]]],
  evening: [['fruit', [['Apple', 1, 'medium'], ['Papaya (Papita)', 1, 'katori'], ['Banana (Kela)', 1, 'medium']]], ['leg', [['Makhana roasted', 1, 'bowl'], ['Peanuts roasted (Moongfali)', 1, 'fistful']]]],
  dinner: [['grain', [['Sama khichdi (vrat)', 1, 'katori'], ['Rajgira roti (vrat)', 2, 'piece']]], ['veg', [['Shakarkandi (sweet potato) boiled', 1, 'medium'], ['Lauki (bottle gourd) sabzi', 1, 'katori']]], ['dairy', [['Milk toned', 1, 'glass']]]]
};
function isFast(k) { return !!((DB.fast || {})[k || today()]); }
ACT.fastToggle = function () { DB.fast = DB.fast || {}; var k = today(); if (DB.fast[k]) delete DB.fast[k]; else DB.fast[k] = 1; save(); feel('tick'); syncMeds(); toast(DB.fast[k] ? 'Fast day: plan switched to fast food' : 'Fast day off'); rerender(); };
/* foods never to suggest: your own list, plus anything your conditions say to skip or keep small */
function dpAvoidRe() { var a = (dplan().avoid || []).filter(Boolean); return a.length ? new RegExp(a.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'i') : null; }
var DPOK = {};
function dpOK(n) {
  var key = n + '|' + MV + '|' + (dplan().avoid || []).join(',');
  if (DPOK[key] != null) return DPOK[key];
  var r = food(n), ok = !!r && !(DB.hidden || {})[n], re = dpAvoidRe();
  if (ok && re && re.test(fname(r))) ok = false;
  /* skip what a condition lists to avoid or keep small; a nutrient flag only counts when it says avoid */
  if (ok && typeof hpConds === 'function') { var nm = fname(r), u = unitsOf(r)[0], g = u ? u[1] : 100;
    hpConds().forEach(function (c) { if (!ok) return; var D = hpDef(c);
      if ((D.avoid || []).concat(D.limit || []).some(function (x) { return x[1] && x[1].test(nm); })) ok = false;
      else if (D.nutr) { var v = D.nutr(r, g); if (v && v[0] === 'avoid') ok = false; } }); }
  return (DPOK[key] = ok);
}

/* where a leftover gap goes when earlier meals missed it */
var DCATCH = { fruit: ['morning', 'evening', 'breakfast', 'dinner'], veg: ['lunch', 'dinner', 'evening'], dairy: ['dinner', 'evening', 'lunch', 'breakfast'], leg: ['evening', 'dinner', 'lunch'], grain: ['dinner', 'lunch', 'breakfast'] };
var DGN = { grain: 'GRAIN', veg: 'VEG', fruit: 'FRUIT', dairy: 'DAIRY', leg: 'DAL' };
var DGC = { grain: 'g', veg: 'v', fruit: 'fr', dairy: 'da', leg: 'dl' };
function dplan() {
  DB.dplan = DB.dplan || { swap: {} }; DB.dplan.swap = DB.dplan.swap || {};
  /* diet reminders only when asked for; curd is never suggested (raw curd raises pitta, bad with hives) */
  if (!DB.dplan.v2) { DB.dplan.v2 = 1; DB.dplan.remind = false; DB.dplan.avoid = ['curd', 'dahi', 'raita', 'lassi', 'shrikhand', 'curd rice']; }
  DB.dplan.avoid = DB.dplan.avoid || []; return DB.dplan;
}
function dpOn() { return !!(DB.bpplan || (DB.dplan && DB.dplan.on)); }
function dpTime(m) { var t = (dplan().times || {})[m[0]]; return t || m[3]; }
/* your usual foods for this meal that fill this group and are not salty */
function dpUsual(meal, g) {
  return Object.keys(DB.usual || {}).map(function (n) { return [n, DB.usual[n]]; }).filter(function (x) {
    var u = x[1], r = food(x[0]); if (!r || u.m !== meal || u.n < 3 || !dpOK(x[0])) return false;
    var gg = (u.q || 1) * unitG(r, u.u), p = dashParts({ n: r[0], g: gg }); if (!(p[g] >= 0.5)) return false;
    return (r[9] || 0) * gg / 100 < 450;
  }).sort(function (a, b) { return b[1].n - a[1].n; }).map(function (x) { var q = x[1].q || 1, u = x[1].u || ''; return [x[0], /piece|roti|phulka|chapati|idli|thepla|puri/i.test(u + ' ' + x[0]) ? Math.min(q, 2) : Math.min(q, 1), u]; });
}
function dpItem(c) { var r = food(c[0]); if (!r) return null; var g = c[1] * unitG(r, c[2]); return { n: r[0], q: c[1], u: c[2], g: g, ug: unitG(r, c[2]), p: dashParts({ n: r[0], g: g }), na: (r[9] || 0) * g / 100, k: r[1] * g / 100 }; }
/* the plan for a day: done meals show what you ate; the rest are planned to cover what's still missing */
function dashPlanFor(k) {
  k = k || today(); var D = dashDay(k), T = D.T, need = {}, d = dayIf(k), now = new Date(), isT = k === today(), nowM = now.getHours() * 60 + now.getMinutes(), P = dplan();
  DG.forEach(function (x) { need[x[0]] = T[x[0]] - D.s[x[0]]; });
  var slots = MEALS.map(function (m) {
    var t = dpTime(m), tm = +t.slice(0, 2) * 60 + +t.slice(3), ate = d ? (d.meals[m[0]] || []) : [];
    var st = ate.length ? 'done' : isT && nowM > tm + 120 ? 'missed' : 'plan';
    return { m: m[0], name: m[1], time: t, tm: tm, st: st, ate: ate, items: [] };
  });
  slots.forEach(function (s) {
    if (s.st !== 'plan') return;
    var sw = P.swap[k + s.m] || 0, used = {}, fast = isFast(k);
    ((fast ? DFAST : DTPL)[s.m] || []).forEach(function (row) {
      var g = row[0]; if (need[g] < 0.4 && !(fast && g === 'grain')) return;
      var ch = (fast ? [] : dpUsual(s.m, g)).concat(row[1]).filter(function (c) { return !used[c[0]] && dpOK(c[0]); }); if (!ch.length) return;
      var it = dpItem(ch[sw % ch.length]); if (!it) return; used[it.n] = 1; s.items.push(it);
      Object.keys(it.p).forEach(function (x) { need[x] -= it.p[x]; });
    });
  });
  /* still short? add it to the next meal that suits it */
  if (!isFast(k)) DG.forEach(function (x) {
    var g = x[0], guard = 0;
    while (need[g] >= 0.75 && guard++ < 3) {
      var s = DCATCH[g].map(function (m) { return slots.filter(function (z) { return z.m === m && z.st === 'plan'; })[0]; }).filter(Boolean)[0]; if (!s) break;
      var c = (DFILL[g] || []).filter(function (f) { return dpOK(f[0]) && !s.items.some(function (i) { return i.n === f[0]; }); })[0]; if (!c) break;
      var r = food(c[0]), u = unitsOf(r)[0], it = dpItem([r[0], 1, u[0]]); s.items.push(it); Object.keys(it.p).forEach(function (z) { need[z] -= it.p[z]; });
    }
  });
  /* projected score if the rest is followed */
  var s2 = {}; DG.forEach(function (x) { s2[x[0]] = D.s[x[0]]; });
  slots.forEach(function (s) { s.items.forEach(function (it) { Object.keys(it.p).forEach(function (g) { s2[g] += it.p[g]; }); }); });
  var addNa = slots.reduce(function (a, s) { return a + s.items.reduce(function (b, i) { return b + i.na; }, 0); }, 0), na = D.na + addNa, proj = 0;
  DG.forEach(function (x) { proj += 14 * Math.min(1, s2[x[0]] / T[x[0]]); });
  proj += 15 * clamp((3000 - na) / 1500, 0, 1) + 7.5 * clamp((T.fatG * 1.5 - D.fat) / (T.fatG * 0.5), 0, 1) + 7.5 * clamp((3 - D.sweets) / (3 - T.sweetsDay), 0, 1);
  var next = slots.filter(function (s) { return s.st === 'plan' && s.items.length; })[0] || null;
  return { k: k, D: D, slots: slots, next: next, proj: Math.round(proj), s2: s2, need: need };
}
function dpTags(it) { return Object.keys(it.p).filter(function (g) { return it.p[g] >= 0.3; }).map(function (g) { var v = it.p[g]; return '<span class="dtg ' + DGC[g] + '">+' + frac(Math.max(0.5, Math.round(v * 2) / 2)) + ' ' + DGN[g] + '</span>'; }).join(''); }
function dpSlotTags(s) { var t = {}; s.items.forEach(function (it) { Object.keys(it.p).forEach(function (g) { t[g] = (t[g] || 0) + it.p[g]; }); }); return Object.keys(t).filter(function (g) { return t[g] >= 0.3; }).map(function (g) { return '<span class="dtg ' + DGC[g] + '">+' + frac(Math.max(0.5, Math.round(t[g] * 2) / 2)) + ' ' + DGN[g] + '</span>'; }).join(''); }
function dpLabel(it) { return (it.q === 1 ? '1 ' : frac(it.q) + ' ') + (it.u === 'piece' ? '' : unitLabel(it.u, it.n) + ' ') + it.n.replace(/\s*\([^)]*\)/g, '').replace(/^Roti \/ Phulka.*/, 'phulka').toLowerCase(); }
function dpWhy(PL, s) {
  var t = {}; (s && s.items || []).forEach(function (it) { Object.keys(it.p).forEach(function (g) { t[g] = (t[g] || 0) + it.p[g]; }); });
  var gl = { grain: 'whole grains', veg: 'vegetables', fruit: 'fruit', dairy: 'dairy', leg: 'dal or nuts' };
  var main = Object.keys(t).filter(function (g) { return PL.D.s[g] < PL.D.T[g] - 0.3; }).sort(function (a, b) { return (PL.D.s[a] / PL.D.T[a]) - (PL.D.s[b] / PL.D.T[b]); })[0];
  var salt = PL.D.na > 1100 ? ' Salt is already ' + n0(PL.D.na) + ' mg, so keep it unsalted.' : '';
  return (main ? 'You\'re at ' + Math.floor(PL.D.s[main] + 0.2) + ' of ' + PL.D.T[main] + ' ' + gl[main] + ' today.' : 'You\'re on track today.') + salt;
}

/* ---------- log a planned meal ---------- */
ACT.dpEat = function (el) {
  var m = el.getAttribute('data-m'), k = el.getAttribute('data-k') || today(), PL = dashPlanFor(k), s = PL.slots.filter(function (z) { return z.m === m; })[0]; if (!s || !s.items.length) return;
  var d = day(k); s.items.forEach(function (it) { var r = food(it.n); if (!r) return; var x = itemOf(r, it.q, it.u, it.g); d.meals[m].push(x); var u = DB.usual[x.n] || { n: 0 }; u.n++; u.q = x.q; u.u = x.u; u.m = m; DB.usual[x.n] = u; });
  save(); sheet(null); feel('done'); syncMeds();
  var D2 = dashDay(k); toast(s.name + ' logged · DASH ' + (D2.score == null ? '' : D2.score)); rerender();
};
ACT.dpSwap = function (el) { var m = el.getAttribute('data-m'), k = el.getAttribute('data-k') || today(), P = dplan(); P.swap[k + m] = (P.swap[k + m] || 0) + 1; save(); feel('tick'); rerender(); };
ACT.dpOther = function (el) { var m = el.getAttribute('data-m'); sheet(null); SQ = ''; go('add/' + m); };
/* opened from a reminder: ask before logging */
ROUTES.dpeat = function (m) {
  setTimeout(function () {
    var PL = dashPlanFor(today()), s = PL.slots.filter(function (z) { return z.m === m; })[0];
    if (!s || !s.items.length) return;
    sheet('<h2>' + esc(s.name) + '</h2><p class="p">' + esc(dpWhy(PL, s)) + '</p><div class="dpopt"><b>' + esc(s.items.map(dpLabel).join(', ')) + '</b><div>' + dpSlotTags(s) + '</div></div>' +
      '<button class="btn mt" data-act="dpEat" data-m="' + m + '">' + icon('check', 18) + 'Had the planned ' + esc(s.name.toLowerCase()) + '</button><button class="btn sec mt" data-act="dpOther" data-m="' + m + '">I ate something else</button><button class="btn sec mt" data-act="dpSwap" data-m="' + m + '">Show me another option</button>');
  }, 60);
  return ROUTES.dashplan();
};
TABOF.dpeat = 'food';

/* ---------- Home card ---------- */
function dashNextCard() {
  if (!dpOn()) return '';
  var PL = dashPlanFor(today()), s = PL.next, D = PL.D;
  var pip = DG.map(function (x) { var n = Math.max(1, Math.round(D.T[x[0]])), got = D.s[x[0]], b = ''; for (var i = 0; i < n; i++) b += '<b class="' + (got >= i + 0.75 ? 'on' : got > i + 0.2 ? 'half' : '') + '"></b>'; return '<div><span>' + x[1].replace('Whole grains', 'Grains').replace('Vegetables', 'Veg').replace('Low-fat dairy', 'Dairy').replace('Dal, beans, nuts', 'Dal/nuts') + '</span><i>' + b + '</i></div>'; }).join('');
  var sun = new Date().getDay() === 0 ? '<button class="dnlink" data-act="go" data-to="dashweek">Your week\'s DASH review ›</button>' : '';
  if (!s) return '<section class="dnext"><div class="k">DASH TODAY · ' + (D.score == null ? '—' : D.score) + '</div><div class="nx">All meals done for today</div><div class="dpips">' + pip + '</div><div class="dhb"><button class="w" data-act="go" data-to="dashplan">See the day</button></div>' + sun + '</section>';
  return '<section class="dnext"><div class="k">NEXT · ' + esc(s.name.toUpperCase()) + ', ' + esc(hm12(s.time)) + '</div><div class="nx">' + esc(s.items.map(dpLabel).join(' + ')) + '</div><div class="nxs">' + esc(dpWhy(PL, s)) + '</div>' +
    '<div class="dpips">' + pip + '</div><div class="dhb"><button class="w" data-act="dpEat" data-m="' + s.m + '">' + icon('check', 16) + 'Ate it</button><button class="t" data-act="dpSwap" data-m="' + s.m + '">Swap</button><button class="t" data-act="go" data-to="dashplan">Day plan</button></div>' +
    '<div class="nxf">DASH ' + (D.score == null ? 0 : D.score) + ' now → ' + PL.proj + ' if you follow today\'s plan</div>' + sun + '</section>';
}
function hm12(t) { var h = +t.slice(0, 2), m = t.slice(3); return (h % 12 || 12) + ':' + m + ' ' + (h < 12 ? 'am' : 'pm'); }

/* ---------- the day's plan ---------- */
ROUTES.dashplan = function () {
  var PL = dashPlanFor(today()), D = PL.D, P = dplan(), h = head('Today\'s DASH meals', isFast() ? 'Fast day: no wheat, rice or dal' : 'Planned from what you still need today');
  h += '<section class="c"><button class="tog' + (isFast() ? ' on' : '') + '" data-act="fastToggle" style="border:0;margin:0;padding:0"><span><b>I\'m fasting today</b><br><span class="l">Rajgira, sama, sabudana, fruit, milk, makhana</span></span><i></i></button></section>';
  h += '<section class="c"><div class="row sb"><div><div class="l">DASH score</div><div class="dpsc">' + (D.score == null ? 0 : D.score) + ' <span>→ ' + PL.proj + '</span></div><div class="l">now → if you follow the rest of today</div></div><button class="lnk" data-act="go" data-to="dash">Servings</button></div>' +
    '<div class="dprows">' + DG.map(function (x) { var got = D.s[x[0]], pl = PL.s2[x[0]], T = D.T[x[0]]; return '<div class="dpr"><span>' + x[1].replace('Low-fat dairy', 'Dairy').replace('Dal, beans, nuts', 'Dal, nuts') + '</span><i><b style="width:' + Math.min(100, got / T * 100) + '%;background:' + x[3] + '"></b><b class="pl" style="width:' + Math.max(0, Math.min(100, (pl - got) / T * 100)) + '%;background:' + x[3] + '"></b></i><em>' + n1(got).replace(/\.0$/, '') + '/' + T + '</em></div>'; }).join('') + '</div><div class="l mt6">Solid: eaten. Light: planned below.</div></section>';
  h += '<section class="c">' + PL.slots.map(function (s) {
    var cls = s.st === 'done' ? ' dn' : PL.next === s ? ' now' : s.st === 'missed' ? ' ms' : '';
    var body = s.st === 'done' ? esc(s.ate.map(function (i) { return i.n.replace(/\s*\(.*\)$/, ''); }).join(', ')) : s.st === 'missed' ? 'Skipped. What it had is moved to your next meals.' : s.items.length ? esc(s.items.map(dpLabel).join(' · ')) : 'Nothing more needed. Eat light if hungry.';
    return '<div class="dpm' + cls + '"><span class="hpbox' + (s.st === 'done' ? ' on' : '') + '">' + (s.st === 'done' ? icon('check', 14) : '') + '</span><div class="f1"><div class="row sb"><b>' + esc(s.name) + '</b><span class="l">' + hm12(s.time) + '</span></div><div class="dpf">' + body + '</div>' +
      (s.st === 'plan' && s.items.length ? '<div>' + dpSlotTags(s) + '</div><div class="dpb"><button class="hpgo" data-act="dpEat" data-m="' + s.m + '">' + icon('check', 14) + 'Ate it</button><button class="lnk" data-act="dpSwap" data-m="' + s.m + '">Swap</button><button class="lnk" data-act="dpOther" data-m="' + s.m + '">Ate something else</button></div>' : '') + '</div></div>';
  }).join('') + '</section>';
  h += '<section class="c"><button class="tog' + (P.remind !== false ? ' on' : '') + '" data-act="dpRemind" style="border:0;margin:0;padding:0"><span><b>Remind me before each meal</b><br><span class="l">A card from the bottom, 15 minutes before</span></span><i></i></button>' +
    '<button class="lnk mt6" data-act="dpTimes">Change meal times</button></section>';
  h += '<section class="c"><h2>Never suggest</h2><div class="l">Foods you don\'t eat. Foods your health plan says to skip (hives, BP) are left out too.</div><div class="chips mt6">' + P.avoid.map(function (w, i) { return '<button class="chip" data-act="dpAvoidDel" data-i="' + i + '">' + esc(w) + ' ✕</button>'; }).join('') + '<button class="chip dk" data-act="dpAvoidAdd">+ Add</button></div></section>';
  h += '<button class="gt w2" data-act="go" data-to="dashweek" style="width:100%"><div class="h"><span>This week</span>' + orb('trophy', 16) + '</div><b style="font-size:18px">Is DASH working for you?</b><div class="s">Scores, your BP after good and bad days, shopping list</div></button>';
  h += '<p class="l mt">The plan uses foods you log often for each meal, and changes as you log. Swap gives another food that fills the same need.</p>';
  return h;
};
TABOF.dashplan = 'food'; HERO['Today\'s DASH meals'] = ['food', '#F05A3C']; HERO['Your DASH week'] = ['trophy', '#F05A3C'];
ACT.dpRemind = function () { var P = dplan(); P.remind = P.remind === false; save(); syncMeds(); rerender(); toast(P.remind ? 'Meal reminders on' : 'Meal reminders off'); };
ACT.dpTimes = function () {
  sheet('<h2>Meal times</h2><div class="l">Reminders come 15 minutes before.</div>' + MEALS.map(function (m) { return '<label class="fld">' + m[1] + '<input type="time" id="dpt_' + m[0] + '" value="' + dpTime(m) + '"></label>'; }).join('') + '<button class="btn mt" data-act="dpTimesSave">Save</button>');
};
ACT.dpTimesSave = function () { var P = dplan(); P.times = {}; MEALS.forEach(function (m) { var v = (document.getElementById('dpt_' + m[0]) || {}).value; if (v && v !== m[3]) P.times[m[0]] = v; }); save(); syncMeds(); sheet(null); rerender(); toast('Meal times saved'); };

/* ---------- reminders ---------- */
function dpMinus(t, mins) { var x = +t.slice(0, 2) * 60 + +t.slice(3) - mins; return ('0' + Math.floor(x / 60)).slice(-2) + ':' + ('0' + x % 60).slice(-2); }
function dashReminderDoses() {
  if (!dpOn() || dplan().remind === false) return [];
  var PL = dashPlanFor(today());
  return PL.slots.map(function (s) {
    var it = s.items.length ? s.items : null, miss = DG.filter(function (x) { return PL.D.s[x[0]] < PL.D.T[x[0]] - 0.5; }).length;
    return { id: 'meal_' + s.m, n: s.name + (it ? ': ' + it.map(function (i) { return i.n.replace(/\s*\([^)]*\)/g, '').replace(/^Roti \/ Phulka.*/, 'phulka'); }).slice(0, 3).join(', ') : ' time'), q: it ? dpWhy(PL, s) + ' Tap to log it in one go.' : 'Log what you eat to keep your DASH plan on track.', times: [dpMinus(s.time, 15)], days: [], every: 1, start: '', end: '', route: 'dpeat/' + s.m, kind: 'meal' };
  });
}
function dashReminderDone() { if (!dpOn()) return []; var d = dayIf(today()); return MEALS.filter(function (m) { return d && (d.meals[m[0]] || []).length; }).map(function (m) { return 'meal_' + m[0] + '|' + dpMinus(dpTime(m), 15); }); }
var _bpDoses = bpReminderDoses, _bpDone = bpReminderDone;
bpReminderDoses = function () { return _bpDoses().concat(dashReminderDoses()); };
bpReminderDone = function () { return _bpDone().concat(dashReminderDone()); };
/* keep the reminder text in step with what you logged */
var DPSYNC = 0;
function dpSyncSoon() { clearTimeout(DPSYNC); DPSYNC = setTimeout(function () { if (dpOn()) syncMeds(); }, 4000); }

/* ---------- Sunday review ---------- */
function morningAfter(k) { var nk = addDays(k, 1), ss = bpSittings(14).filter(function (s) { return s.am && dkey(new Date(s.t)) === nk; }); return ss[0] || null; }
ROUTES.dashweek = function () {
  var W = dashWeek(today()), L = dashWeek(addDays(today(), -7)), avg = function (a) { var x = a.filter(function (d) { return d.score != null; }); return x.length ? Math.round(x.reduce(function (s, d) { return s + d.score; }, 0) / x.length) : null; };
  var a = avg(W), b = avg(L), h = head('Your DASH week', niceDate(addDays(today(), -6)) + ' – ' + niceDate(today()));
  h += '<section class="c"><div class="l">Average DASH score</div><div class="row g10" style="align-items:baseline"><span class="dpsc">' + (a == null ? '—' : a) + '</span>' + (a != null && b != null ? '<b style="color:' + (a >= b ? '#16A34A' : '#E0245E') + '">' + (a >= b ? '↑ ' : '↓ ') + Math.abs(a - b) + ' from last week</b>' : '') + '</div>' +
    '<div class="dwbars">' + W.map(function (d) { return '<div><i class="' + (d.score != null && d.score >= 65 ? '' : 'lo') + '" style="height:' + Math.max(4, d.score || 0) + '%"></i><span>' + DOW[fromKey(d.k).getDay()].slice(0, 2) + '</span></div>'; }).join('') + '</div></section>';
  /* your BP after good and bad DASH days (last 4 weeks) */
  var hi = [], lo = []; for (var i = 1; i <= 28; i++) { var k = addDays(today(), -i), d = dashDay(k); if (d.score == null) continue; var m = morningAfter(k); if (!m) continue; (d.score >= 65 ? hi : d.score < 45 ? lo : []).push(m); }
  var av = function (l) { return Math.round(l.reduce(function (s, x) { return s + x.sys; }, 0) / l.length) + '/' + Math.round(l.reduce(function (s, x) { return s + x.dia; }, 0) / l.length); };
  h += '<section class="c"><h2>Does it lower your BP?</h2>' + (hi.length >= 2 && lo.length >= 2 ? '<div class="g2 mt6"><div class="dwcmp"><span>Next-morning BP after a DASH 65+ day</span><b style="color:#16A34A">' + av(hi) + '</b><em>' + hi.length + ' days</em></div><div class="dwcmp"><span>Next-morning BP after a DASH under 45 day</span><b style="color:#E0245E">' + av(lo) + '</b><em>' + lo.length + ' days</em></div></div><div class="l mt6">From your own cuff readings over the last 4 weeks.</div>'
    : '<div class="l">Needs at least 2 good days (65+) and 2 low days (under 45), each followed by a morning BP reading. So far: ' + hi.length + ' good, ' + lo.length + ' low. Keep logging and measuring.</div>') + '</section>';
  /* biggest gaps and shopping */
  var gaps = DG.map(function (x) { var got = W.reduce(function (s, d) { return s + d.s[x[0]]; }, 0) / 7, T = W[6].T[x[0]]; return { x: x, got: got, T: T }; }).sort(function (p, q) { return p.got / p.T - q.got / q.T; });
  h += '<section class="c"><h2>Where you fell short</h2>' + gaps.slice(0, 3).map(function (g) { return '<div class="rd"><span>' + g.x[1] + '</span><b>' + n1(g.got).replace(/\.0$/, '') + ' of ' + g.T + ' a day</b></div>'; }).join('') + '</section>';
  h += '<section class="c"><div class="row sb"><h2>Shopping for next week</h2><button class="lnk" data-act="dpShop">Share</button></div>' + dpShop().map(function (l) { return '<div class="rd"><span>' + esc(l[0]) + '</span><span class="l">' + esc(l[1]) + '</span></div>'; }).join('') + '</section>';
  return h;
};
TABOF.dashweek = 'food';
function dpShop() {
  var T = dashTargets(today());
  return [['Fruit: papaya, guava, bananas, oranges', T.fruit * 7 + ' servings'], ['Toned milk and curd', T.dairy * 7 + ' servings'], ['Vegetables: bhindi, lauki, cabbage, palak, salad', T.veg * 7 + ' servings'], ['Moong and toor dal, chana, sprouts', T.leg * 7 + ' servings'], ['Bajra or jowar atta, oats, poha', 'whole grains'], ['Roasted chana, makhana, unsalted nuts', 'for snacks']];
}
ACT.dpShop = function () { var t = 'DASH shopping for the week\n' + dpShop().map(function (l) { return '• ' + l[0] + ' (' + l[1] + ')'; }).join('\n'); if (AND) native('shareText', 'DASH shopping list', t); else { try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { } } };
var _dpSave = save;
save = function () { var r = _dpSave.apply(this, arguments); dpSyncSoon(); return r; };

ACT.dpAvoidDel = function (el) { var P = dplan(); P.avoid.splice(+el.getAttribute('data-i'), 1); DPOK = {}; save(); rerender(); };
ACT.dpAvoidAdd = function () { sheet('<h2>Never suggest</h2><label class="fld">Food or word<input id="dpav" placeholder="For example: brinjal, maida, paneer"></label><button class="btn mt" data-act="dpAvoidSave">Add</button>'); setTimeout(function () { var i = document.getElementById('dpav'); if (i) i.focus(); }, 80); };
ACT.dpAvoidSave = function () { var v = ((document.getElementById('dpav') || {}).value || '').trim().toLowerCase(); if (!v) return; var P = dplan(); v.split(',').forEach(function (w) { w = w.trim(); if (w && P.avoid.indexOf(w) < 0) P.avoid.push(w); }); DPOK = {}; save(); sheet(null); rerender(); };

/* ---------- Home: what matters most right now ---------- */
function focusItems() {
  var k = today(), now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), out = [];
  var tm = function (t) { return +t.slice(0, 2) * 60 + +t.slice(3); };
  /* BP readings due */
  if (DB.bpplan) {
    var P = bpPlan(), ss = bpSittings(1).filter(function (s) { return dkey(new Date(s.t)) === k; });
    var am = ss.some(function (s) { return s.am; }), pm = ss.some(function (s) { return !s.am; });
    if (!am && nm >= tm(P.am) && nm < 12 * 60) out.push({ p: 95, ic: 'heart', c: '#E0245E', t: 'Morning BP reading', s: 'Due at ' + hm12(P.am) + '. Sit 5 minutes first, then take 2 readings.', a: 'go', to: 'bp', b: 'Log BP' });
    else if (!pm && nm >= tm(P.pm) - 30) out.push({ p: 95, ic: 'heart', c: '#E0245E', t: 'Evening BP reading', s: 'Due at ' + hm12(P.pm) + '. Sit 5 minutes first, then take 2 readings.', a: 'go', to: 'bp', b: 'Log BP' });
  }
  /* fast day */
  if (isFast(k)) out.push({ p: 88, ic: 'food', c: '#F08A0B', t: 'Fast day', s: 'Keep water up and have fruit, milk or makhana every 3–4 hours. Sendha namak still counts as salt.', a: 'go', to: 'dashplan', b: 'Fast plan' });
  /* salt */
  var D = dashDay(k);
  if (D.na > 1000) out.push({ p: D.na > 1500 ? 90 : 75, ic: 'warn', c: '#E0245E', t: 'Salt ' + n0(D.na) + ' of 1,500 mg', s: D.na > 1500 ? 'Over your limit. Keep the rest of today unsalted and drink water.' : 'Keep the rest of today unsalted: no pickle, papad or namkeen.', a: 'go', to: 'dash', b: 'See' });
  /* condition check-ins in the evening */
  if (typeof hpConds === 'function' && nm >= 19 * 60) hpConds().forEach(function (c) { var D2 = hpDef(c); if (D2.check && !hpChk(c, k)) out.push({ p: 80, ic: D2.ic, c: D2.col, t: D2.check.q, s: '5-second check-in for ' + D2.name.toLowerCase().replace(/\s*\(.*\)/, '') + '. It finds your triggers over time.', a: 'go', to: 'hpc/' + c.id, b: 'Check in' }); });
  /* health plan exercise */
  if (typeof hpProgress === 'function' && hpConds().length) {
    var HP = hpProgress(k), nx = HP.list.filter(function (e) { return !hpExDone(e.id, k).ok; })[0];
    if (nx) out.push({ p: nm >= 18 * 60 ? 78 : 60, ic: nx.x.ic, c: '#16C79A', t: nx.x.n, s: HP.done + ' of ' + HP.total + ' done today. ' + (nx.x.how || '').split('. ')[0] + '.', a: 'hpStart', id: nx.id, b: 'Start' });
  }
  /* water */
  var wg = DB.settings.water.glass, behind = Math.round((waterPace() - waterMl(k)) / wg);
  if (behind >= 2) out.push({ p: 55, ic: 'drop', c: '#4E8FD0', t: behind + ' glasses behind on water', s: isFast(k) ? 'Water matters more on a fast day.' : 'Have one now; it also helps constipation and bloating.', a: 'qWater', b: '+1 glass' });
  return out.sort(function (a, b) { return b.p - a.p; });
}
function focusCard() {
  var L = focusItems().slice(0, 3), w7 = DB.bpplan ? bpWindow(7) : null, w14 = DB.bpplan ? bpWindow(14, 7) : null;
  var h = '<section class="c fcard"><div class="row sb"><b class="fhd">Today for you</b>' + (w7 ? '<button class="fbp" data-act="go" data-to="bpplan">BP ' + w7.sys + '/' + w7.dia + (w14 ? ' <span style="color:' + (w7.dia <= w14.dia ? '#16A34A' : '#E0245E') + '">' + (w7.dia <= w14.dia ? '↓' : '↑') + Math.abs(w7.dia - w14.dia) + '</span>' : '') + '</button>' : '') + '</div>';
  h += L.length ? L.map(function (x) { return '<div class="frow">' + orb(x.ic, 15) + '<div class="f1"><b>' + esc(x.t) + '</b><div class="l">' + esc(x.s) + '</div></div><button class="hpgo" data-act="' + x.a + '"' + (x.to ? ' data-to="' + x.to + '"' : '') + (x.id ? ' data-id="' + x.id + '"' : '') + '>' + esc(x.b) + '</button></div>'; }).join('')
    : '<div class="l mt6">Nothing pending right now. Well done.</div>';
  h += '<div class="fbar"><button class="' + (isFast() ? 'on' : '') + '" data-act="fastToggle">' + (isFast() ? '✓ Fasting today' : 'Fasting today?') + '</button><button data-act="go" data-to="dashplan">' + icon('food', 15) + 'Diet plan</button>' + (new Date().getDay() === 0 ? '<button data-act="go" data-to="dashweek">Week review</button>' : '') + '</div></section>';
  return h;
}
