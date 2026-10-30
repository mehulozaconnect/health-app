/* The brain: one place that turns everything we know (body composition, BP, sugar, medicines, reports, sleep,
   activity, what you actually ate) into targets, food rules, a verdict on every dish, and the next meal. */
'use strict';

/* ---------- 1. your numbers ---------- */
var BRAIN = { v: -1 };
function bodyNow() { var L = typeof bodyList === 'function' ? bodyList() : []; var b = L[0]; return b && Date.now() - b.t < 45 * 86400000 ? b : null; }
function brain() {
  if (BRAIN.v === MV && BRAIN.T) return BRAIN.T;
  var p = DB.profile, X = planContext(), C = X.C, b = bodyNow(), w = lastWeight() || p.weight, why = [];
  var fat = b && b.fat ? b.fat : null, ffm = b && b.ffm ? b.ffm : (fat ? w * (1 - fat / 100) : null);
  /* energy: watch BMR > lean-mass formula > Mifflin */
  var bmrV, bmrSrc;
  if (b && b.bmr) { bmrV = b.bmr; bmrSrc = 'your watch (body composition ' + niceDate(dkey(new Date(b.t))) + ')'; }
  else if (ffm) { bmrV = Math.round(370 + 21.6 * ffm); bmrSrc = 'your lean mass'; }
  else { bmrV = Math.round(bmr()); bmrSrc = 'age, height and weight'; }
  var act = +p.activity || 1.3, st = []; for (var i = 1; i <= 7; i++) { var s = stepsFor(addDays(today(), -i)); if (s) st.push(s); }
  var stepsAvg = st.length >= 3 ? dayAvg(st) : null;
  var tdee = bmrV * act;
  /* how much to lose: fat above target, else BMI, else your goal */
  var fatTarget = p.sex === 'f' ? 28 : 20, toLoseFat = fat ? Math.max(0, w * (fat - fatTarget) / (100 - fatTarget)) : null;
  var lose = fat ? toLoseFat > 0.5 : (w > +p.goal + 0.5);
  var deficit = lose ? clamp((+p.pace || 0.5) * 7700 / 7, 250, 750) : 0;
  var kcal = Math.round((tdee - deficit) / 50) * 50, floor = Math.max(p.sex === 'f' ? 1200 : 1500, Math.round(bmrV / 50) * 50);
  if (kcal < floor) { kcal = floor; }
  why.push('Calories: BMR ' + n0(bmrV) + ' from ' + bmrSrc + ' × daily life ' + act + (deficit ? ' − ' + n0(deficit) + ' to lose about ' + n1(deficit * 7 / 7700) + ' kg a week' : '') + ' = ' + n0(kcal) + ' kcal. Exercise you do is added on top.');
  /* protein from lean mass */
  var prot = ffm ? Math.round(ffm * 1.6) : Math.round(w * 1.2);
  prot = clamp(prot, Math.round(kcal * 0.18 / 4), Math.round(kcal * 0.35 / 4));
  why.push('Protein: ' + prot + ' g' + (ffm ? ' (1.6 g per kg of your ' + n1(ffm) + ' kg lean mass, to keep muscle while losing fat)' : ' (1.2 g per kg body weight)') + '.');
  /* carbs and fat */
  var sugarHi = C.sugar && C.sugar.sev >= 2, chol = !!C.chol, bpHi = C.bp && C.bp.sev >= 2;
  var fatPct = chol ? 0.25 : 0.28, fatG = Math.round(kcal * fatPct / 9);
  var carbG = Math.round((kcal - prot * 4 - fatG * 9) / 4);
  var carbCap = Math.round(kcal * (sugarHi ? 0.40 : (fat && fat > fatTarget + 4) ? 0.45 : 0.55) / 4);
  if (carbG > carbCap) { fatG += Math.round((carbG - carbCap) * 4 / 9); carbG = carbCap; }
  if (sugarHi) why.push('Carbs kept to 40% (' + carbG + ' g) because: ' + C.sugar.ev[0] + '.');
  var T = {
    kcal: kcal, p: prot, c: carbG, f: fatG, fi: sugarHi || chol ? 35 : 30,
    su: sugarHi ? 15 : 25, na: bpHi ? 1500 : 2000, water: Math.round(w * 35 / 250) * 250,
    bmr: bmrV, bmrSrc: bmrSrc, tdee: Math.round(tdee), deficit: Math.round(deficit), fat: fat, ffm: ffm, fatTarget: fatTarget, toLoseFat: toLoseFat, stepsAvg: stepsAvg, why: why, X: X, sugarHi: sugarHi, bpHi: bpHi, chol: chol
  };
  if (bpHi) why.push('Salt limit 1,500 mg sodium (not 2,000) because: ' + C.bp.ev[0] + '.');
  if (sugarHi) why.push('Added sugar limit 15 g a day (about 3 tsp).');
  if (fat) why.push('Body fat ' + n1(fat) + '% · healthy is under ' + fatTarget + '% · about ' + n1(toLoseFat) + ' kg of fat to lose.');
  BRAIN = { v: MV, T: T };
  return T;
}
function smartOn() { return DB.settings.smart !== false; }

/* ---------- 2. food rules ---------- */
/* each: when (applies to you), kind avoid | less | more, foods (regex on dish names), why, swap */
var FRULES = [
  { id: 'salt', when: function (T) { return T.bpHi || (T.X.C.bp && T.X.C.bp.sev >= 1); }, kind: 'avoid', title: 'Salty foods', re: /pickle|achar|papad|namkeen|farsan|chips|wafers|sev\b|bhujia|chakli|mathri|gathiya|khakhra|maggi|noodles|instant|cheese|bhakarwadi|kurkure|chivda|chiwda|soya sauce|schezwan|manchurian|chutney powder/i, why: function (T) { return T.X.C.bp.ev[0] + '. Salt raises BP within days.'; }, swap: 'roasted chana, makhana, fruit, salad with lemon' },
  { id: 'potassium', when: function (T) { return (T.bpHi || (T.X.C.bp && T.X.C.bp.sev >= 1)) && !(T.X.ev.cls.diuretic || /telm|losar|olmes|valsar|irbes|ramip|enalap|lisinop|spironol/i.test(meds().map(function (m) { return m.name; }).join(' '))); }, kind: 'more', title: 'Potassium-rich foods', re: /banana|coconut water|curd|dahi|palak|spinach|methi|dal|rajma|chana|sweet potato|shakarkandi|papaya|orange|tomato|beet/i, why: function () { return 'Potassium helps the body let go of salt and lowers BP.'; } },
  { id: 'sweets', when: function (T) { return T.sugarHi || (T.fat && T.fat > T.fatTarget); }, kind: 'avoid', title: 'Sweets and sugary drinks', re: /gulab|jalebi|ladoo|laddu|barfi|burfi|katli|halwa|kheer|rasgulla|rasmalai|peda|mithai|ghevar|malpua|shrikhand|basundi|rabdi|imarti|mohanthal|soan|ice cream|kulfi|cola|soda|fanta|sprite|frooti|maaza|juice|shake|sharbat|rooh afza|glucon|gulkand|chocolate|cake|pastry|biscuit/i, why: function (T) { return T.sugarHi ? T.X.C.sugar.ev[0] + '. Sugar goes straight into the blood.' : 'Body fat is ' + n1(T.fat) + '%; sweets are the easiest calories to cut.'; }, swap: 'a fruit, or 2 dates; tea with ½ tsp sugar' },
  { id: 'chai', when: function (T) { return T.sugarHi || (T.fat && T.fat > T.fatTarget); }, kind: 'less', title: 'Sugar in tea and coffee', re: /tea with milk|masala chai|coffee with milk|filter coffee/i, why: function () { return 'Each tsp of sugar is 20 kcal and 5 g of sugar; 3 cups a day adds up.'; }, swap: '½ tsp or no sugar; add elaichi or ginger for taste' },
  { id: 'fried', when: function (T) { return (T.fat && T.fat > T.fatTarget) || T.chol || (T.X.C.weight && T.X.C.weight.sev >= 1); }, kind: 'avoid', title: 'Deep-fried food', re: /samosa|kachori|vada|wada|pakora|pakoda|bhajiya|bhaji pav|bhajji|puri|poori|bhatura|fafda|chips|fries|mirchi vada|spring roll|fried momos|cutlet|tikki|jalebi|mathri|chakli/i, why: function (T) { return (T.fat ? 'Body fat ' + n1(T.fat) + '%' : 'Weight above goal') + (T.chol ? ' and cholesterol' : '') + ': one fried snack is 250–400 kcal, mostly oil.'; }, swap: 'dhokla, idli, roasted chana, sprouts chaat, grilled paneer tikka' },
  { id: 'refined', when: function (T) { return T.sugarHi; }, kind: 'less', title: 'White rice, maida and big portions of roti', re: /rice - plain|jeera rice|pulao|biryani|naan|kulcha|bread white|pav|pizza|pasta|maggi|noodles|bhatura|khichdi/i, why: function (T) { return T.X.C.sugar.ev[0] + '. These raise sugar fast; pair them with dal, curd and salad.'; }, swap: 'phulka instead of naan, 1 katori rice not 2, brown rice or millet roti' },
  { id: 'protein', when: function (T) { return true; }, kind: 'more', title: 'Protein in every meal', re: /paneer|tofu|\bdal\b|chilla|curd|dahi|sprouts|chana|chole|rajma|moong|soya|buttermilk|chaas|besan|usal|lassi|milk toned|pithla/i, why: function (T) { return 'Your target is ' + T.p + ' g a day' + (T.ffm ? ' to protect your ' + n1(T.ffm) + ' kg of lean mass while losing fat' : '') + '. About 20–25 g at each main meal.'; } },
  { id: 'fibre', when: function (T) { return T.sugarHi || T.chol || (T.fat && T.fat > T.fatTarget); }, kind: 'more', title: 'Salad and vegetables first', re: /salad|sabzi|vegetable|palak|methi|bhindi|lauki|cabbage|gobi|karela|soup|sprouts|guava|apple|papaya/i, why: function () { return 'Eating vegetables first slows how fast sugar rises and keeps you full.'; } },
  { id: 'late', when: function (T) { return T.X.C.digest && /late/i.test(T.X.C.digest.label + T.X.C.digest.ev.join(' ')); }, kind: 'less', title: 'Late dinners', re: null, why: function (T) { return T.X.C.digest.ev[0] + '. Late meals hurt sleep and next-morning sugar.'; }, swap: 'dinner by 8:30 pm, light; a 10-minute walk after' },
  { id: 'teaThyroid', when: function (T) { return !!T.X.ev.cls.thyroid; }, kind: 'less', title: 'Tea or coffee right after your thyroid tablet', re: null, why: function () { return 'Wait 30–60 minutes after the tablet before tea or breakfast so it absorbs.'; } },
  { id: 'nightTea', when: function (T) { return T.X.C.sleep; }, kind: 'avoid', title: 'Tea and coffee after 4 pm', re: null, why: function (T) { return T.X.C.sleep.ev[0] + '. Caffeine stays in the body 6–8 hours.'; }, swap: 'haldi milk or chamomile at night' }
];
function foodRules() {
  var T = brain(), out = [], week = []; for (var i = 0; i < 7; i++) week = week.concat(dayItems(addDays(today(), -i)));
  FRULES.forEach(function (r) {
    if (!r.when(T)) return;
    var hits = r.re ? week.filter(function (it) { return r.re.test(it.n); }) : [];
    var seen = {}; hits.forEach(function (h) { var n = h.n.replace(/\s*\(.*\)$/, ''); seen[n] = (seen[n] || 0) + 1; });
    out.push({ r: r, why: r.why(T), hits: hits.length, names: Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; }).slice(0, 3).map(function (n) { return n + (seen[n] > 1 ? ' ×' + seen[n] : ''); }) });
  });
  return out;
}

/* ---------- 3. verdict on a dish for you ---------- */
var SWAPS = [[/samosa|kachori|vada|wada|pakora|pakoda|bhaji|bhajiya|cutlet|tikki|fafda|mirchi/i, 'Khaman dhokla', 'steamed, same snack feel'], [/jalebi|gulab|ladoo|laddu|barfi|burfi|katli|halwa|peda|rasgulla|mithai|sweet|ghevar|malpua/i, 'Dates (Khajur)', '2 dates satisfy the sweet craving'],
  [/pav bhaji|vada pav|samosa pav|dabeli|bhajji pav/i, 'Sprouts chaat', 'chaat taste, 3× the protein'], [/maggi|noodles/i, 'Poha', 'lighter, less salt'], [/pizza|burger|sandwich/i, 'Paneer tikka', 'protein instead of maida'],
  [/biryani|pulao|fried rice/i, 'Dal khichdi', 'gentler on sugar, more protein'], [/naan|kulcha|bhatura|puri|poori|paratha/i, 'Roti / Phulka (no ghee)', 'half the fat'], [/chips|wafers|namkeen|sev|bhujia|chivda|farsan|khakhra/i, 'Makhana roasted', 'crunchy, very little salt'],
  [/juice|shake|cola|soda|frooti|maaza|sharbat/i, 'Buttermilk (Chaas)', 'cooling, almost no sugar'], [/rice - plain|jeera rice/i, 'Brown rice cooked', 'more fibre'], [/ice cream|kulfi/i, 'Curd (Dahi)', 'cool and sweet with a little fruit']];
function dishVerdict(r, grams, mealKey) {
  var T = brain(), s = grams / 100, k = r[1] * s, p = r[2] * s, c = r[3] * s, f = r[4] * s, fi = r[5] * s, su = (r[8] || 0) * s, na = (r[9] || 0) * s;
  var t = dayTotals(SEL || today()), bud = budgetFor(SEL || today()), left = bud.total - t.kcal, good = [], bad = [], score = 0;
  var pd = k > 0 ? p * 4 / k : 0, fd = k > 0 ? f * 9 / k : 0;
  if (pd >= 0.2 && p >= 6) { good.push(n0(p) + ' g protein'); score += 2; } else if (k > 200 && pd < 0.1) { bad.push('little protein for ' + n0(k) + ' kcal'); score -= 1; }
  if (fi >= 4) { good.push(n0(fi) + ' g fibre'); score += 1; }
  if (k > 150 && fd > 0.45) { bad.push(Math.round(fd * 100) + '% of calories from fat'); score -= (T.fat && T.fat > T.fatTarget) || T.chol ? 2 : 1; }
  var naLeft = T.na - t.na;
  if (na > 500 || (T.bpHi && na > 350)) { bad.push(n0(na) + ' mg sodium' + (T.bpHi ? ' (your limit is ' + n0(T.na) + ' a day)' : '')); score -= T.bpHi ? 2 : 1; }
  if (su > 8) { bad.push(n0(su) + ' g added sugar' + (T.sugarHi ? ' (your limit ' + T.su + ' g a day)' : '')); score -= T.sugarHi ? 3 : 1; }
  if (T.sugarHi && c > 60 && fi < 4) { bad.push(n0(c) + ' g quick carbs'); score -= 1; }
  if (k > left) { bad.push('more than the ' + n0(Math.max(0, left)) + ' kcal left today'); score -= 2; }
  FRULES.forEach(function (fr) { if (fr.re && fr.kind === 'avoid' && fr.when(T) && fr.re.test(r[0])) { score -= 2; if (bad.indexOf(fr.title) < 0) bad.unshift('on your avoid list: ' + fr.title.toLowerCase()); } });
  var level = score >= 2 ? 'great' : score >= 0 ? 'ok' : score >= -2 ? 'small' : 'avoid';
  /* the most you should have: fits calories left for this meal and the salt left */
  var slot = mealSlot(mealKey || mealFor()), maxG = grams;
  if (r[1] > 0) maxG = Math.min(maxG * 3, slot.kcal / r[1] * 100);
  if (na > 0 && T.bpHi) maxG = Math.min(maxG, Math.max(0, naLeft) / (r[9] || 1) * 100);
  var swap = null; SWAPS.forEach(function (sw) { if (!swap && sw[0].test(r[0]) && food(sw[1]) && sw[1] !== r[0]) swap = { n: sw[1], why: sw[2] }; });
  return { level: level, good: good, bad: bad, maxG: Math.max(0, maxG), swap: level === 'great' || level === 'ok' ? null : swap, kcal: k };
}
var VLABEL = { great: ['Great choice for you', 'ok'], ok: ['Fine for you', 'ok'], small: ['Have a small portion', 'warn'], avoid: ['Better to skip today', 'bad'] };
function verdictHtml(r, grams, unitName, perUnit, mealKey) {
  var v = dishVerdict(r, grams, mealKey), L = VLABEL[v.level];
  var h = '<section class="c verdict ' + L[1] + '"><div class="row sb"><b class="m16">' + L[0] + '</b>' + (v.level === 'small' || v.level === 'avoid' ? '' : icon('check', 18)) + '</div>';
  if (v.good.length) h += '<div class="sm gtxt">+ ' + esc(v.good.join(' · ')) + '</div>';
  if (v.bad.length) h += '<div class="sm ' + (L[1] === 'bad' ? 'badt' : 'warnt') + '">− ' + esc(v.bad.join(' · ')) + '</div>';
  if (perUnit && unitName !== 'grams' && v.maxG < grams * 0.95) { var q = Math.max(0.5, Math.floor(v.maxG / perUnit * 2) / 2); h += '<div class="sm mt6">Best amount for you now: <b>' + frac(q) + ' ' + esc(unitName) + '</b> (about ' + n0(r[1] * q * perUnit / 100) + ' kcal)</div>'; }
  if (v.swap) h += '<button class="lnk" data-act="swapTo" data-n="' + esc(v.swap.n) + '">Swap for ' + esc(v.swap.n.replace(/\s*\(.*\)$/, '')) + ' — ' + esc(v.swap.why) + ' →</button>';
  return h + '</section>';
}
ACT.swapTo = function (el) { var n = el.getAttribute('data-n'), m = cur.arg.split('/')[0]; ACT.pickFood({ getAttribute: function (a) { return a === 'data-n' ? n : m; } }); };

/* ---------- 4. the next meal, with exact amounts ---------- */
var MEALT = {
  breakfast: [[['Moong dal chilla', 2, 'piece'], ['Curd (Dahi)', 1, 'katori']], [['Besan chilla', 2, 'piece'], ['Curd (Dahi)', 1, 'katori']], [['Paneer bhurji', 1, 'katori'], ['Roti / Phulka (no ghee)', 1, 'piece', 1]], [['Idli', 3, 'piece', 1], ['Sambar', 1, 'katori']],
    [['Poha', 1, 'katori', 1], ['Sprouts chaat', 1, 'katori']], [['Upma', 1, 'katori', 1], ['Curd (Dahi)', 1, 'katori']], [['Oats cooked with milk', 1, 'katori', 1], ['Almonds (Badam)', 1, '10 almonds']], [['Methi thepla', 2, 'piece', 1], ['Curd (Dahi)', 1, 'katori']]],
  morning: [[['Roasted chana', 1, 'fistful']], [['Apple', 1, 'medium'], ['Almonds (Badam)', 1, '10 almonds']], [['Buttermilk (Chaas)', 1, 'glass'], ['Guava (Amrood)', 1, 'medium']], [['Sprouts chaat', 1, 'katori']], [['Papaya (Papita)', 1, 'katori']]],
  lunch: [[['Roti / Phulka (no ghee)', 2, 'piece', 1], ['Dal tadka (toor)', 1, 'katori'], ['Mixed vegetable sabzi', 1, 'katori'], ['Green salad', 1, 'katori'], ['Curd (Dahi)', 1, 'katori']],
    [['Roti / Phulka (no ghee)', 2, 'piece', 1], ['Rajma curry', 1, 'katori'], ['Green salad', 1, 'katori'], ['Raita', 1, 'katori']], [['Rice - plain (cooked)', 1, 'katori', 1], ['Dal tadka (toor)', 1, 'katori'], ['Bhindi sabzi', 1, 'katori'], ['Green salad', 1, 'katori']],
    [['Roti / Phulka (no ghee)', 2, 'piece', 1], ['Palak paneer', 1, 'katori'], ['Moong dal (yellow)', 1, 'katori'], ['Green salad', 1, 'katori']], [['Bhakri (Jowar)', 1, 'piece', 1], ['Pithla', 1, 'katori'], ['Cabbage sabzi', 1, 'katori'], ['Buttermilk (Chaas)', 1, 'glass']],
    [['Roti / Phulka (no ghee)', 2, 'piece', 1], ['Chole (chickpea curry)', 1, 'katori'], ['Green salad', 1, 'katori'], ['Curd (Dahi)', 1, 'katori']]],
  evening: [[['Tea with milk (chai)', 1, 'tea cup'], ['Roasted chana', 1, 'fistful']], [['Makhana roasted', 1, 'katori'], ['Buttermilk (Chaas)', 1, 'glass']], [['Sprouts chaat', 1, 'katori']], [['Khaman dhokla', 2, 'piece']], [['Apple', 1, 'medium'], ['Walnut (Akhrot)', 1, '5 halves']]],
  dinner: [[['Moong dal chilla', 2, 'piece'], ['Curd (Dahi)', 1, 'katori'], ['Green salad', 1, 'katori']], [['Roti / Phulka (no ghee)', 1, 'piece', 1], ['Dal tadka (toor)', 1, 'katori'], ['Lauki (bottle gourd) sabzi', 1, 'katori'], ['Green salad', 1, 'katori']],
    [['Vegetable soup', 1, 'bowl'], ['Paneer tikka', 1, 'plate']], [['Dal khichdi', 1, 'katori', 1], ['Curd (Dahi)', 1, 'katori'], ['Green salad', 1, 'katori']], [['Roti / Phulka (no ghee)', 1, 'piece', 1], ['Soya chunks curry', 1, 'katori'], ['Green salad', 1, 'katori']], [['Tofu', 1, 'katori cubes'], ['Mixed vegetable sabzi', 1, 'katori'], ['Roti / Phulka (no ghee)', 1, 'piece', 1]]]
};
/* calories and protein this meal should carry, from what is left today */
function mealSlot(m) {
  var k = SEL || today(), T = brain(), t = dayTotals(k), b = budgetFor(k), left = Math.max(0, b.total - t.kcal), pLeft = Math.max(0, T.p - t.p);
  var d = dayIf(k), idx = MEALS.map(function (x) { return x[0]; }).indexOf(m), rest = MEALS.filter(function (x, i) { return i >= idx && !(d && (d.meals[x[0]] || []).length && x[0] !== m); });
  var share = rest.reduce(function (a, x) { return a + x[2]; }, 0) || 1, mine = (MEALS[idx] || MEALS[0])[2] / share;
  var done = d ? sumItems(d.meals[m] || []).kcal : 0;
  return { kcal: Math.max(0, Math.round(left * mine)), p: Math.round(pLeft * mine), done: done };
}
function unitG(r, u) { var x = unitsOf(r).filter(function (y) { return y[0] === u; })[0]; return x ? x[1] : 100; }
function buildMeal(tpl, slot) {
  var items = tpl.map(function (x) { var r = food(x[0]); return r ? { r: r, q: x[1], u: unitsOf(r).some(function (y) { return y[0] === x[2]; }) ? x[2] : unitsOf(r)[0][0], flex: !!x[3] } : null; });
  if (items.some(function (x) { return !x; })) return null;
  var tot = function () { var s = { k: 0, p: 0, c: 0, f: 0, fi: 0, na: 0, su: 0 }; items.forEach(function (x) { var g = unitG(x.r, x.u) * x.q / 100; s.k += x.r[1] * g; s.p += x.r[2] * g; s.c += x.r[3] * g; s.f += x.r[4] * g; s.fi += x.r[5] * g; s.na += (x.r[9] || 0) * g; s.su += (x.r[8] || 0) * g; }); return s; };
  /* fit the staple (roti / rice) to the calories this meal should carry */
  var fx = items.filter(function (x) { return x.flex; })[0], s = tot();
  if (fx && slot.kcal > 0) {
    var step = /piece/.test(fx.u) ? 1 : 0.5, per = fx.r[1] * unitG(fx.r, fx.u) / 100;
    while (s.k - per * step > slot.kcal * 1.05 && fx.q - step >= (step === 1 ? 1 : 0.5)) { fx.q -= step; s = tot(); }
    while (s.k + per * step < slot.kcal * 0.85 && fx.q + step <= 4) { fx.q += step; s = tot(); }
  }
  return { items: items, s: s };
}
function scoreMeal(M, slot, T) {
  var s = M.s, sc = 0;
  sc -= Math.abs(s.k - slot.kcal) / Math.max(150, slot.kcal) * 4;
  sc += Math.min(s.p, slot.p + 5) / Math.max(10, slot.p) * 3;
  sc += s.fi / 8;
  if (T.bpHi) sc -= s.na / 600; else sc -= s.na / 1500;
  if (T.sugarHi) sc -= Math.max(0, s.c - 55) / 25 + s.su / 5;
  if ((T.fat && T.fat > T.fatTarget) || T.chol) sc -= Math.max(0, s.f * 9 / Math.max(1, s.k) - 0.35) * 6;
  M.items.forEach(function (x) { var u = DB.usual[x.r[0]]; if (u) sc += Math.min(1.5, u.n * 0.2); });
  return sc;
}
function suggestMeals(m, n) {
  var T = brain(), slot = mealSlot(m), list = (MEALT[m] || MEALT.lunch).map(function (tpl) { return buildMeal(tpl, slot); }).filter(Boolean);
  list.forEach(function (M) { M.sc = scoreMeal(M, slot, T); });
  list.sort(function (a, b) { return b.sc - a.sc; });
  return { slot: slot, list: list.slice(0, n || 3) };
}
function mealWhy(M, T) {
  var s = M.s, w = [];
  if (s.p >= 18) w.push(n0(s.p) + ' g protein'); if (s.fi >= 7) w.push(n0(s.fi) + ' g fibre');
  if (T.bpHi && s.na < 500) w.push('low salt'); if (T.sugarHi && s.c < 55) w.push('gentle on sugar');
  return w.join(' · ');
}
function mealCard(m, compact) {
  var T = brain(), S = suggestMeals(m, compact ? 2 : 3);
  if (!S.list.length) return '';
  if (S.slot.kcal < 80) return '<div class="tip">' + icon('check', 16) + '<span>You\'ve used today\'s budget. If hungry: a glass of buttermilk or a katori of salad.</span></div>';
  return '<section class="c"><div class="row sb"><div><div class="l">' + mealName(m).toUpperCase() + ' FOR YOU</div><b class="m16">About ' + n0(S.slot.kcal) + ' kcal · ' + S.slot.p + ' g protein</b></div></div>' +
    S.list.map(function (M, i) {
      return '<div class="mealopt"><div class="f1"><b>' + M.items.map(function (x) { return frac(x.q) + ' ' + x.u.replace(/^(piece|katori|glass|medium|plate|bowl|fistful|tea cup)$/, '$1' + (x.q > 1 && /piece|katori|glass|plate|bowl/.test(x.u) ? 's' : '')) + ' ' + esc(x.r[0].replace(/\s*\(.*\)$/, '').replace(/ \/ Phulka/, '')); }).join(' + ') + '</b><small>' + n0(M.s.k) + ' kcal · ' + esc(mealWhy(M, T)) + '</small></div><button class="btn sm" data-act="addMealOpt" data-m="' + m + '" data-i="' + i + '">Add</button></div>';
    }).join('') + '</section>';
}
ACT.addMealOpt = function (el) {
  var m = el.getAttribute('data-m'), M = suggestMeals(m, 3).list[+el.getAttribute('data-i')]; if (!M) return;
  M.items.forEach(function (x) { var g = unitG(x.r, x.u) * x.q; var it = itemOf(x.r, x.q, x.u, g); if (/^(Tea with milk|Masala chai|Coffee with milk)/.test(x.r[0])) it = withExtras(it, { sugar: brain().sugarHi ? 0.5 : 1 }); pushItem(SEL || today(), m, it); });
  save(); toast('Added to ' + mealName(m) + ' · ' + n0(M.s.k) + ' kcal'); rerender();
};

/* ---------- 5. screens ---------- */
function nextMeal() {
  var h = new Date().getHours() + new Date().getMinutes() / 60, d = dayIf(today());
  var order = [['breakfast', 10.5], ['morning', 12.5], ['lunch', 15.5], ['evening', 19], ['dinner', 23.9]];
  for (var i = 0; i < order.length; i++) { var mk = order[i][0]; if (h < order[i][1] && !(d && (d.meals[mk] || []).length)) return mk; }
  return null;
}
function guideCard() {
  var T = brain(), m = nextMeal(), R = foodRules(), avoid = R.filter(function (x) { return x.r.kind === 'avoid'; }).slice(0, 2);
  var h = m ? mealCard(m, true) : '';
  if (avoid.length) h += '<section class="c" data-act="go" data-to="guide"><div class="l">KEEP AWAY TODAY</div>' + avoid.map(function (a) { return '<div class="rd"><span>' + esc(a.r.title) + (a.hits ? ' <small class="warnt">· had ' + a.hits + '× this week</small>' : '') + '</span>' + icon('chev', 14) + '</div>'; }).join('') + '<span class="lnk">Your full food guide →</span></section>';
  return h;
}
ROUTES.guide = function () {
  var T = brain(), R = foodRules(), h = head('Your food guide', 'Built from your body, BP, sugar and habits');
  h += '<section class="c"><h2>Your daily targets</h2><div class="g3 mt"><div><div class="l">Calories</div><b class="m18">' + n0(T.kcal) + '</b></div><div><div class="l">Protein</div><b class="m18">' + T.p + ' g</b></div><div><div class="l">Carbs</div><b class="m18">' + T.c + ' g</b></div><div><div class="l">Fibre</div><b class="m18">' + T.fi + ' g</b></div><div><div class="l">Salt (sodium)</div><b class="m18">≤ ' + n0(T.na) + '</b></div><div><div class="l">Added sugar</div><b class="m18">≤ ' + T.su + ' g</b></div></div>' +
    '<details><summary class="lnk">How these were worked out</summary>' + T.why.map(function (w) { return '<p class="p">' + esc(w) + '</p>'; }).join('') + '</details>' +
    (smartOn() ? '' : '<div class="note warn mt">You set your own calorie budget, so these smart targets are only shown here. Turn on smart targets in Me and my budget.</div>') + '</section>';
  ['avoid', 'less', 'more'].forEach(function (kd) {
    var L = R.filter(function (x) { return x.r.kind === kd; }); if (!L.length) return;
    h += '<h3 class="sech">' + { avoid: 'Avoid', less: 'Cut down', more: 'Eat more' }[kd] + '</h3>';
    h += L.map(function (x) { return '<section class="c rule ' + kd + '"><b class="m16">' + esc(x.r.title) + '</b><p class="p">' + esc(x.why) + '</p>' + (x.hits && kd !== 'more' ? '<div class="sm warnt">This week: ' + esc(x.names.join(', ')) + '</div>' : x.hits && kd === 'more' ? '<div class="sm gtxt">This week: ' + esc(x.names.join(', ')) + '</div>' : kd === 'more' ? '<div class="sm warnt">Not in your meals this week</div>' : '') + (x.r.swap ? '<div class="sm mt6"><b>Instead:</b> ' + esc(x.r.swap) + '</div>' : '') + '</section>'; }).join('');
  });
  var m = nextMeal(); if (m) h += mealCard(m);
  return h;
};
TABOF.guide = 'food';
