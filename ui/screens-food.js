/* Food diary, search, dish detail, overeat check */
'use strict';
var SEL = today();
function mealName(m) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i][0] === m) return MEALS[i][1]; return m; }
function mealFor(t) { var h = new Date(t || Date.now()).getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'evening' : 'dinner'; }

ROUTES.food = function () {
  var k = SEL, b = budgetFor(k), t = dayTotals(k), d = day(k), h = '';
  h += '<div class="row sb"><h1 class="big">Food diary</h1><button class="ib" data-act="photoMeal" aria-label="Log from a photo">' + icon('cam') + '</button></div>';
  h += '<div class="days">';
  for (var i = -6; i <= 0; i++) {
    var dk = addDays(today(), i), dd = fromKey(dk), dt = dayTotals(dk), db = budgetFor(dk), has = dayItems(dk).length;
    var dot = !has ? 'transparent' : dt.kcal > db.total + 100 ? 'var(--warn)' : 'var(--g)';
    h += '<button class="day' + (dk === k ? ' on' : '') + '" data-act="selDay" data-k="' + dk + '">' + DOW[dd.getDay()].toUpperCase() + '<b>' + dd.getDate() + '</b><i style="background:' + dot + '"></i></button>';
  }
  h += '</div>';
  h += '<button class="search" data-act="go" data-to="add/' + mealFor() + '">' + icon('search', 18) + '<span>Search dal, poha, paneer…</span></button>';
  var left = b.total - t.kcal;
  h += '<section class="c dark trio"><div><div class="l">Eaten</div><b>' + n0(t.kcal) + '</b></div><div><div class="l">' + (b.earned ? 'Burned' : 'Budget') + '</div><b>' + (b.earned ? '+' + n0(b.earned) : n0(b.base)) + '</b></div><div><div class="l">' + (left >= 0 ? 'Left' : 'Over') + '</div><b class="' + (left >= 0 ? 'mint' : 'peach') + '">' + n0(Math.abs(left)) + '</b></div></section>';
  if (b.carry) h += '<div class="note warn">Today\'s budget is ' + b.carry + ' kcal lower to balance yesterday.</div>';
  MEALS.forEach(function (m) {
    var items = d.meals[m[0]] || [], mt = sumItems(items), tgt = Math.round(b.base * m[2]);
    var cp = mt.kcal ? mt.c * 4 / mt.kcal : 0, sub = n0(mt.kcal) + ' of ' + n0(tgt) + ' kcal';
    var cls = mt.kcal > tgt * 1.15 ? 'warnt' : '';
    if (mt.kcal > 250 && cp > 0.65) { sub += ' · carb-heavy'; cls = 'warnt'; }
    if (items.length) { var lt = Math.max.apply(null, items.map(function (x) { return x.t; })); sub += ' · ' + hm(lt); }
    h += '<section class="c meal' + (items.length ? '' : ' empty') + '"><div class="row sb"><div><h2>' + m[1] + '</h2><div class="l ' + cls + '">' + sub + '</div></div><button class="add" data-act="go" data-to="add/' + m[0] + '" aria-label="Add to ' + m[1] + '">' + icon('plus', 20) + '</button></div>';
    items.forEach(function (it) {
      h += '<button class="it" data-act="editItem" data-m="' + m[0] + '" data-id="' + it.id + '"><span>' + esc(it.n) + '<small>' + frac(it.q) + ' ' + esc(it.u) + (it.u === 'grams' ? '' : ' · ' + Math.round(it.g) + ' g') + '</small></span><b>' + n0(iv(it, 'k')) + '</b></button>';
    });
    if (!items.length && k === today()) {
      var sug = suggestFor(m[0], left);
      if (sug) h += '<div class="fit"><b>Fits your day:</b> ' + esc(sug.text) + '<button class="lnk" data-act="addSuggest" data-m="' + m[0] + '">Add in one tap</button></div>';
    }
    h += '</section>';
  });
  var tg = macroTargets();
  h += '<section class="c"><h2>Nutrients today</h2><div class="g2 mt">' +
    macroRow('Protein', t.p, tg.p, 'g') + macroRow('Carbs', t.c, tg.c, 'g') + macroRow('Fat', t.f, tg.f, 'g') + macroRow('Fibre', t.fi, tg.fi, 'g') + macroRow('Added sugar', t.su, 25, 'g', true) + macroRow('Sodium', t.na, 2000, 'mg', true) + '</div></section>';
  return h;
};
function macroRow(name, v, t, u, capIsLimit) {
  var pct = t ? v / t * 100 : 0, col = capIsLimit ? (pct > 100 ? 'var(--bad)' : 'var(--g)') : (pct < 60 ? 'var(--warn)' : 'var(--g)');
  return '<div><div class="row sb sm"><span>' + name + '</span><span>' + n0(v) + ' / ' + n0(t) + ' ' + u + '</span></div>' + bar(pct, col) + '</div>';
}
ACT.selDay = function (el) { SEL = el.getAttribute('data-k'); rerender(); };

/* one-tap suggestion: a usual item for that meal that fits, else a sensible default */
var DEFAULTS = { breakfast: [['Poha', 1, 'katori'], ['Masala chai no sugar', 1, 'cup']], lunch: [['Phulka (no ghee)', 2, 'piece'], ['Mixed dal', 1, 'katori'], ['Green salad', 1, 'katori']], evening: [['Roasted chana', 1, 'fistful'], ['Masala chai no sugar', 1, 'cup']], dinner: [['Gram flour chilla/cheela (Besan chilla/cheela)', 2, ''], ['Curd (Dahi)', 1, 'katori']] };
function suggestFor(m, left) {
  var picks = Object.keys(DB.usual).map(function (n) { return [n, DB.usual[n]]; }).filter(function (x) { return x[1].m === m && x[1].n >= 3 && food(x[0]); }).sort(function (a, b) { return b[1].n - a[1].n; }).slice(0, 2)
    .map(function (x) { return [x[0], x[1].q, x[1].u]; });
  if (!picks.length) picks = DEFAULTS[m];
  var items = picks.map(function (p) { var r = food(p[0]); if (!r) return null; var us = unitsOf(r), u = us.filter(function (x) { return x[0] === p[2]; })[0] || us[0]; return itemOf(r, p[1], u[0], u[1] * p[1]); }).filter(Boolean);
  if (!items.length) return null;
  var s = sumItems(items); if (left > 0 && s.kcal > left + 50) return null;
  return { items: items, text: items.map(function (i) { return i.n.replace(/\s*\(.*\)$/, '') + ' ' + frac(i.q) + ' ' + i.u; }).join(' + ') + '. ' + n0(s.kcal) + ' kcal, ' + n0(s.p) + ' g protein.' };
}
ACT.addSuggest = function (el) {
  var m = el.getAttribute('data-m'), s = suggestFor(m, budgetFor(SEL).total - dayTotals(SEL).kcal); if (!s) return;
  s.items.forEach(function (it) { pushItem(SEL, m, it); }); save(); toast('Added to ' + mealName(m)); rerender();
};
function pushItem(k, m, it) {
  day(k).meals[m].push(it);
  var u = DB.usual[it.n] || { n: 0 }; u.n++; u.q = it.q; u.u = it.u; u.m = m; DB.usual[it.n] = u;
}

/* edit an item */
ACT.editItem = function (el) {
  var m = el.getAttribute('data-m'), id = el.getAttribute('data-id'), it = day(SEL).meals[m].filter(function (x) { return x.id === id; })[0]; if (!it) return;
  EDIT = { m: m, id: id };
  sheet('<h2>' + esc(it.n) + '</h2><div class="l">' + frac(it.q) + ' ' + esc(it.u) + ' · ' + Math.round(it.g) + ' g · ' + n0(iv(it, 'k')) + ' kcal</div>' +
    '<div class="stepper mt"><button class="step" data-act="editQty" data-d="-0.5" aria-label="Less">−</button><b id="eq">' + frac(it.q) + '</b><button class="step" data-act="editQty" data-d="0.5" aria-label="More">+</button></div>' +
    '<div class="l mt">Move to</div><div class="chips">' + MEALS.map(function (x) { return '<button class="chip' + (x[0] === m ? ' on' : '') + '" data-act="moveItem" data-to="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="g2 mt"><button class="btn sec" data-act="delItem">' + icon('trash', 18) + 'Remove</button><button class="btn" data-act="closeSheet">Done</button></div>');
};
var EDIT = null;
function editIt() { return day(SEL).meals[EDIT.m].filter(function (x) { return x.id === EDIT.id; })[0]; }
ACT.editQty = function (el) {
  var it = editIt(); if (!it) return; var per = it.g / it.q, q = clamp(it.q + +el.getAttribute('data-d'), it.u === 'grams' ? 10 : 0.5, it.u === 'grams' ? 2000 : 20);
  if (it.u === 'grams') q = clamp(it.q + +el.getAttribute('data-d') * 50, 10, 2000);
  it.q = q; it.g = per * q; save(); document.getElementById('eq').textContent = frac(q); rerender(); ACT.editItem({ getAttribute: function (a) { return a === 'data-m' ? EDIT.m : EDIT.id; } });
};
ACT.moveItem = function (el) { var it = editIt(), to = el.getAttribute('data-to'); if (!it || to === EDIT.m) return; day(SEL).meals[EDIT.m] = day(SEL).meals[EDIT.m].filter(function (x) { return x !== it; }); day(SEL).meals[to].push(it); save(); sheet(null); rerender(); toast('Moved to ' + mealName(to)); };
ACT.delItem = function () { var it = editIt(); day(SEL).meals[EDIT.m] = day(SEL).meals[EDIT.m].filter(function (x) { return x !== it; }); save(); sheet(null); rerender(); toast('Removed'); };

/* ---------- search ---------- */
var SQ = '';
ROUTES.add = function (m) {
  m = m || mealFor();
  var h = head('Add to ' + mealName(m), niceDate(SEL));
  h += '<label class="search on">' + icon('search', 18) + '<input id="sq" data-inp="sq" value="' + esc(SQ) + '" placeholder="Search 1,100 Indian dishes" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></label>';
  h += '<div class="row sb sm mt"><span class="l">' + (DB.profile.vegOnly ? 'Showing vegetarian only' : 'Showing all foods') + '</span><button class="lnk" data-act="toggleVeg">' + (DB.profile.vegOnly ? 'Show all' : 'Veg only') + '</button></div>';
  h += '<div id="sres">' + searchList(m) + '</div>';
  return h;
};
ROUTES.add.after = function () { var i = document.getElementById('sq'); if (i && !SQ) setTimeout(function () { i.focus(); }, 60); };
function searchList(m) {
  var h = '';
  if (!SQ.trim()) {
    var us = Object.keys(DB.usual).filter(function (n) { return food(n); }).sort(function (a, b) { return (DB.usual[b].m === m) - (DB.usual[a].m === m) || DB.usual[b].n - DB.usual[a].n; }).slice(0, 12);
    if (us.length) h += '<h3 class="sech">Your usual</h3>' + us.map(function (n) { return resRow(food(n), m, DB.usual[n]); }).join('');
    else h += '<div class="empty-s">Type a dish in English or Hindi: <b>roti</b>, <b>dahi</b>, <b>poha</b>, <b>rajma</b>, <b>paneer</b>…</div>';
    h += '<button class="btn sec mt" data-act="customFood">' + icon('plus', 18) + 'Add my own food</button>';
    return h;
  }
  var r = searchFoods(SQ, 40);
  if (!r.length) return '<div class="empty-s">No match for “' + esc(SQ) + '”.' + (DB.profile.vegOnly ? ' Try “Show all”, or' : '') + ' add it as your own food.</div><button class="btn sec mt" data-act="customFood">' + icon('plus', 18) + 'Add “' + esc(SQ) + '” as my own food</button>';
  return r.map(function (x) { return resRow(x, m); }).join('');
}
function resRow(r, m, usual) {
  var us = unitsOf(r), u = usual ? (us.filter(function (x) { return x[0] === usual.u; })[0] || us[0]) : us[0], q = usual ? usual.q : 1;
  var kc = r[1] * u[1] * q / 100;
  return '<button class="res" data-act="pickFood" data-n="' + esc(r[0]) + '" data-m="' + m + '"><span>' + esc(r[0]) + '<small>' + frac(q) + ' ' + esc(u[0]) + ' · ' + n0(kc) + ' kcal · ' + n1(r[2] * u[1] * q / 100) + ' g protein</small></span>' + icon('chev', 18) + '</button>';
}
INP.sq = function (el) { SQ = el.value; document.getElementById('sres').innerHTML = searchList(cur.arg || mealFor()); };
ACT.toggleVeg = function () { DB.profile.vegOnly = !DB.profile.vegOnly; save(); rerender(); };
ACT.pickFood = function (el) { var n = el.getAttribute('data-n'), m = el.getAttribute('data-m'), us = DB.usual[n], r = food(n), units = unitsOf(r); DISH = { q: us ? us.q : 1, u: us && units.some(function (x) { return x[0] === us.u; }) ? us.u : units[0][0] }; go('dish/' + m + '/' + encodeURIComponent(n)); };

/* ---------- dish detail ---------- */
var DISH = { q: 1, u: '' };
var UHELP = { katori: '1 katori = a 150 ml steel bowl, filled level', plate: '1 plate = a full quarter plate', bowl: 'A bowl as served (bigger than a katori)', glass: '1 glass = 200 ml', cup: '1 cup = 150 ml tea cup', tablespoon: '1 tablespoon = a serving spoon', grams: 'Weighing it? Use grams', piece: '1 piece as usually made at home' };
ROUTES.dish = function (arg) {
  var p = arg.split('/'), m = p[0], name = p.slice(1).join('/'), r = food(name);
  if (!r) return head('Not found') + '<div class="empty-s">This food is missing.</div>';
  var units = unitsOf(r), u = units.filter(function (x) { return x[0] === DISH.u; })[0] || units[0];
  var g = u[0] === 'grams' ? DISH.q : u[1] * DISH.q, it = itemOf(r, DISH.q, u[0], g), s = sumItems([it]);
  var tg = macroTargets(), b = budgetFor(SEL), t = dayTotals(SEL), left = b.total - t.kcal - s.kcal;
  var tags = [];
  if (r[6] === 1) tags.push('<span class="tag ok">VEG</span>'); else if (r[6] === 2) tags.push('<span class="tag warn">EGG</span>'); else tags.push('<span class="tag bad">NON-VEG</span>');
  var pk = r[2] * 4 / r[1]; if (pk >= 0.2) tags.push('<span class="tag ok">High protein</span>'); else if (pk < 0.1) tags.push('<span class="tag warn">Low protein</span>');
  if (r[4] * 9 / r[1] > 0.45) tags.push('<span class="tag warn">High fat</span>');
  if (r[5] >= 4) tags.push('<span class="tag ok">High fibre</span>');
  if (r[8] > 10) tags.push('<span class="tag warn">Sugary</span>');
  if (r[9] > 500) tags.push('<span class="tag warn">Salty</span>');
  var h = head('', 'Adding to ' + mealName(m));
  h += '<section class="c"><h1 class="big">' + esc(r[0]) + '</h1><div class="l">Per 100 g: ' + n0(r[1]) + ' kcal · ' + (r[12] === 'INDB' ? 'Indian Nutrient Databank' : r[12] === 'Mine' ? 'Your own food' : 'Standard values') + '</div><div class="chips mt">' + tags.join('') + '</div></section>';
  h += '<section class="c"><div class="l">HOW MUCH?</div><div class="stepper"><button class="step" data-act="dq" data-d="-1" aria-label="Less">−</button><div class="ctr"><b class="huge">' + (u[0] === 'grams' ? Math.round(DISH.q) : frac(DISH.q)) + '</b><div class="l">' + esc(u[0]) + (u[0] === 'grams' ? '' : ' · ' + Math.round(g) + ' g') + '</div></div><button class="step" data-act="dq" data-d="1" aria-label="More">+</button></div>';
  if (u[0] !== 'grams') h += '<div class="chips c4">' + [0.5, 1, 1.5, 2].map(function (q) { return '<button class="chip' + (DISH.q === q ? ' on' : '') + '" data-act="dqSet" data-q="' + q + '">' + frac(q) + '</button>'; }).join('') + '</div>';
  h += '<div class="chips">' + units.map(function (x) { return '<button class="chip' + (x[0] === u[0] ? ' dk' : '') + '" data-act="du" data-u="' + esc(x[0]) + '">' + esc(x[0]) + '</button>'; }).join('') + '</div>';
  h += '<div class="hint">' + esc(UHELP[u[0]] || ('1 ' + u[0] + ' ≈ ' + u[1] + ' g')) + '</div></section>';
  h += '<section class="c"><div class="row sb end"><div><div class="l">Calories</div><b class="huge">' + n0(s.kcal) + '</b></div><div class="r"><div class="l">of today\'s budget</div><b class="mid">' + Math.round(s.kcal / b.total * 100) + '%</b></div></div><div class="g4 mt">' +
    mac('Protein', s.p, tg.p) + mac('Carbs', s.c, tg.c) + mac('Fat', s.f, tg.f) + mac('Fibre', s.fi, tg.fi) + '</div><div class="l mt">Bars show this portion\'s share of your daily target.' + (r[9] ? ' Sodium ' + n0(r[9] * g / 100) + ' mg, sugar ' + n1(r[8] * g / 100) + ' g.' : '') + '</div></section>';
  var over = left < 0, tip;
  if (over) tip = 'That is more than your day can take. I\'ll show you options before adding.';
  else if (s.kcal > 150 && s.p * 4 / s.kcal < 0.1) tip = 'Protein is low in this. Add 1 katori curd (+5 g protein, 90 kcal) to balance it.';
  else if (s.fi < 2 && s.kcal > 200) tip = 'Little fibre here. Add a salad or some fruit with it.';
  else tip = 'Good fit. ' + n0(Math.max(0, tg.p - t.p - s.p)) + ' g protein still to go today.';
  h += '<section class="c ' + (over ? 'peachbg' : 'mintbg') + '"><div class="l2">AFTER YOU ADD THIS</div><b class="mid">' + (over ? n0(-left) + ' kcal over today' : n0(left) + ' kcal left for today') + '</b><p>' + tip + '</p></section>';
  h += '<button class="btn big" data-act="addDish" data-m="' + m + '" data-n="' + esc(name) + '">Add to ' + mealName(m) + ' · ' + n0(s.kcal) + ' kcal</button>';
  return h;
};
function mac(n, v, t) { return '<div class="mac"><span class="l">' + n + '</span><b>' + n1(v) + ' g</b>' + bar(v / t * 100) + '</div>'; }
ACT.dq = function (el) { var d = +el.getAttribute('data-d'); if (DISH.u === 'grams') DISH.q = clamp(DISH.q + d * 25, 10, 2000); else DISH.q = clamp(DISH.q + d * 0.5, 0.5, 20); rerender(); };
ACT.dqSet = function (el) { DISH.q = +el.getAttribute('data-q'); rerender(); };
ACT.du = function (el) { DISH.u = el.getAttribute('data-u'); DISH.q = DISH.u === 'grams' ? 100 : 1; rerender(); };
function dishItem(name) { var r = food(name), units = unitsOf(r), u = units.filter(function (x) { return x[0] === DISH.u; })[0] || units[0]; return itemOf(r, DISH.q, u[0], u[0] === 'grams' ? DISH.q : u[1] * DISH.q); }
ACT.addDish = function (el) {
  var m = el.getAttribute('data-m'), name = el.getAttribute('data-n'), it = dishItem(name);
  if (SEL === today()) it.t = Date.now(); else { var mt = MEALS.filter(function (x) { return x[0] === m; })[0][3].split(':'); var d = fromKey(SEL); d.setHours(+mt[0], +mt[1]); it.t = d.getTime(); }
  var b = budgetFor(SEL), t = dayTotals(SEL), over = t.kcal + iv(it, 'k') - b.total;
  if (over > 50) return overeat(m, it, over, b, t);
  commitAdd(m, it);
};
function commitAdd(m, it, carry) {
  pushItem(SEL, m, it);
  if (carry) { var nx = day(addDays(SEL, 1)); nx.carry = (nx.carry || 0) + carry; }
  save(); sheet(null); SQ = ''; toast('Added ' + it.n.replace(/\s*\(.*\)$/, '') + ' · ' + n0(iv(it, 'k')) + ' kcal');
  SEL_MEAL_DONE = m; go('food');
}
var SEL_MEAL_DONE = '', PENDING = null;
function overeat(m, it, over, b, t) {
  PENDING = { m: m, it: it };
  var room = b.total - t.kcal, per = iv(it, 'k') / it.q, fitQ = Math.floor(Math.max(0, room) / per * 2) / 2;
  var opts = '';
  if (fitQ >= 0.5 && fitQ < it.q) opts += '<button class="opt best" data-act="oeFit" data-q="' + fitQ + '"><span>Have ' + frac(fitQ) + ' ' + esc(it.u) + ' instead<small>' + n0(per * fitQ) + ' kcal · ' + n0(room - per * fitQ) + ' left · best choice</small></span><i>PICK</i></button>';
  else opts += '<button class="opt best" data-act="closeSheet"><span>Skip it today<small>You have ' + n0(Math.max(0, room)) + ' kcal left. A fruit or buttermilk fits instead.</small></span><i>PICK</i></button>';
  var carry = Math.min(Math.round(over), 300);
  opts += '<button class="opt" data-act="oeAdd" data-carry="' + carry + '"><span>Add it, balance tomorrow<small>Tomorrow\'s budget drops by ' + carry + ' kcal. A 30-min walk today helps too.</small></span></button>';
  opts += '<button class="opt" data-act="oeAdd" data-carry="0"><span>Add it anyway<small>Just log it, no changes</small></span></button>';
  var recent = 0; for (var i = 1; i <= 7; i++) { var dk = addDays(SEL, -i); if (dayItems(dk).length && dayTotals(dk).kcal > budgetFor(dk).total + 100) recent++; }
  sheet('<div class="row g8"><span class="wico">' + icon('warn') + '</span><h2>Hold on a second</h2></div><p class="p">' + frac(it.q) + ' ' + esc(it.u) + ' is <b>' + n0(iv(it, 'k')) + ' kcal</b>. You have <b>' + n0(Math.max(0, room)) + '</b> left, so this puts you <b class="warnt">' + n0(over) + ' kcal over</b>' + (iv(it, 'f') > 15 ? ' and adds ' + n0(iv(it, 'f')) + ' g fat' : '') + '.</p>' + opts + (recent ? '<div class="l ctrtxt">You went over on ' + recent + ' of the last 7 days.</div>' : ''));
}
ACT.oeFit = function (el) { var q = +el.getAttribute('data-q'), it = PENDING.it, per = it.g / it.q; it.q = q; it.g = per * q; commitAdd(PENDING.m, it); };
ACT.oeAdd = function (el) { commitAdd(PENDING.m, PENDING.it, +el.getAttribute('data-carry')); };

/* ---------- own food ---------- */
ACT.customFood = function () {
  sheet('<h2>Add my own food</h2><div class="l">Values for 1 serving (check the pack label)</div>' +
    '<label class="fld">Name<input id="cf_n" value="' + esc(SQ) + '"></label><div class="g2">' +
    '<label class="fld">Serving name<input id="cf_u" value="piece"></label><label class="fld">Serving grams<input id="cf_g" type="number" inputmode="decimal" value="100"></label>' +
    '<label class="fld">Calories<input id="cf_k" type="number" inputmode="decimal"></label><label class="fld">Protein g<input id="cf_p" type="number" inputmode="decimal"></label>' +
    '<label class="fld">Carbs g<input id="cf_c" type="number" inputmode="decimal"></label><label class="fld">Fat g<input id="cf_f" type="number" inputmode="decimal"></label></div>' +
    '<button class="btn mt" data-act="saveCustom">Save food</button>');
};
ACT.saveCustom = function () {
  var v = function (id) { return +(document.getElementById(id).value || 0); }, n = document.getElementById('cf_n').value.trim(), g = v('cf_g') || 100, f = 100 / g;
  if (!n || !v('cf_k')) return toast('Name and calories are needed');
  var u = (document.getElementById('cf_u').value.trim() || 'serving').toLowerCase();
  DB.custom = DB.custom.filter(function (r) { return r[0] !== n; });
  DB.custom.push([n, v('cf_k') * f, v('cf_p') * f, v('cf_c') * f, v('cf_f') * f, 0, 1, u + ':' + g, 0, 0, 0, 0, 'Mine']);
  save(); sheet(null); SQ = n; rerender(); toast('Saved ' + n);
};
