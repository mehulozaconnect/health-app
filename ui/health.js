/* My health plan: your conditions, what to eat and avoid, "Can I eat this?", daily exercise with rewards, a daily check-in that finds your own triggers, and a Gemini coach that knows all of it */
'use strict';

/* ---------- exercises ---------- */
/* id: name, minutes, how, icon, kind for the log, days (0 Sun … 6 Sat; null = every day), start action */
var HPX = {
  walk: { n: 'Brisk walk', min: 30, how: 'Fast enough to talk, not to sing. Split into 3 × 10 min if that is easier.', ic: 'steps', kind: 'walk', go: 'walk' },
  walkmeal: { n: 'Walk after meals', min: 10, how: '10 minutes of easy walking after lunch and after dinner. Lowers the sugar rise after eating.', ic: 'steps', kind: 'walk', go: 'timer' },
  gentle: { n: 'Easy walk in the cool part of the day', min: 20, how: 'Early morning or after sunset. Stop before you sweat heavily, then take a cool shower.', ic: 'steps', kind: 'walk', go: 'walk' },
  wall: { n: 'Wall sit, 4 × 2 min', min: 8, how: 'Back flat on the wall, knees bent, hold. Lowers BP as much as some tablets in studies.', ic: 'bolt', kind: 'strength', go: 'wallsit', days: [1, 3, 5] },
  strength: { n: 'Strength, 15 min', min: 15, how: '3 rounds: 12 chair squats, 10 wall push-ups, 20 step-ups on a stair, 30-second plank on the knees.', ic: 'bolt', kind: 'strength', go: 'timer', days: [2, 6] },
  anulom: { n: 'Anulom Vilom, 10 min', min: 10, how: 'Slow alternate-nostril breathing, about 6 breaths a minute.', ic: 'yoga', kind: 'yoga', go: 'breath/anulom', prana: 'anulom' },
  sheetali: { n: 'Sheetali, 5 min', min: 5, how: 'Cooling breath through a rolled tongue. Calms heat and itch.', ic: 'yoga', kind: 'yoga', go: 'breath/sheetali', prana: 'sheetali' },
  bhramari: { n: 'Bhramari, 5 min', min: 5, how: 'Humming bee breath. Calms stress, which makes many conditions worse.', ic: 'yoga', kind: 'yoga', go: 'breath/bhramari', prana: 'bhramari' },
  vajrasana: { n: 'Vajrasana after a meal, 5 min', min: 5, how: 'Kneel and sit back on your heels, back straight. Helps digestion. Skip with knee pain.', ic: 'yoga', kind: 'yoga', go: 'timer' },
  easymove: { n: 'Easy walk or cycling, 20 min', min: 20, how: 'Low impact keeps the joints moving. On a day the joint is hot and swollen, rest it instead.', ic: 'steps', kind: 'walk', go: 'walk' }
};

/* ---------- the condition library ---------- */
var R_SALTY = /pickle|achar|papad|namkeen|farsan|chips|wafer|\bsev\b|bhujia|chakli|gathiya|kurkure|chivda|chiwda|bhakarwadi|khakhra/i;
var R_SWEET = /gulab|jalebi|ladoo|laddu|barfi|burfi|katli|halwa|kheer|rasgulla|rasmalai|peda|mithai|ghevar|malpua|shrikhand|basundi|rabdi|imarti|mohanthal|soan|kalakand|ice cream|kulfi|chocolate|cake|pastry|sweet\b/i;
var R_DRINK = /cola|soda|fanta|sprite|frooti|maaza|juice|sharbat|rooh afza|soft drink|energy drink|milkshake|shake\b/i;
var R_FRIED = /samosa|kachori|vada|wada|pakora|pakoda|bhajiya|bhajji|puri\b|poori|bhatura|fafda|fries|spring roll|cutlet|tikki|mathri|chakli|chips|wafer/i;
var R_MAIDA = /maida|naan|kulcha|bread white|white bread|pav\b|pizza|pasta|maggi|noodles|bhatura|khari|puff|biscuit|cookie|toast|bun\b/i;
var R_ALC = /beer|wine|whisky|whiskey|alcohol|rum\b|vodka|gin\b|toddy/i;
var HPL = {
  bp: {
    name: 'High blood pressure', re: /blood pressure|\bbp\b|hypertension|high bp/i, ic: 'heart', col: '#E0245E',
    what: 'Your doctor asked for the DASH diet: less salt; more fruit, vegetables, curd and dal; daily walking.',
    link: ['bpplan', 'Open your BP plan'],
    eat: ['Fruit: banana, papaya, orange, guava, coconut water', 'Vegetables at lunch and dinner', 'Curd, toned milk, buttermilk without salt', 'Dal, rajma, chana, sprouts', 'Unsalted nuts and seeds'],
    eatRe: /banana|papaya|orange|guava|apple|coconut water|salad|sabzi|palak|lauki|curd|dahi|chaas|buttermilk|milk toned|\bdal\b|rajma|chana|sprouts|moong|almond|walnut|makhana/i,
    avoid: [['Pickle, papad, namkeen and chips', R_SALTY, 'Very salty. One spoon of pickle can be a third of your salt for the day.'], ['Instant noodles, packet soups and sauces', /maggi|noodles|instant|ketchup|soya sauce|schezwan|manchurian/i, 'Hidden salt.']],
    limit: [['Bread, pav, cheese and bakery', /cheese|bread|pav\b|khari|toast|pizza|burger|sandwich/i, 'Salt you don\'t taste.'], ['Street food: pav bhaji, vada pav, chaat', /pav bhaji|vada pav|chaat|pani puri|dabeli|samosa|kachori|misal/i, 'Salty and oily. Keep it to once a week.']],
    nutr: function (r, g) { var na = (r[9] || 0) * g / 100; return na > 600 ? ['avoid', n0(na) + ' mg sodium in this portion; your limit is 1,500 a day'] : na > 350 ? ['small', n0(na) + ' mg sodium in this portion'] : null; },
    habits: ['No salt shaker at the table; add lemon, jeera or amchur instead.', 'Measure BP morning and evening with your cuff.'],
    ex: ['walk', 'wall', 'anulom'],
    doctor: ['A reading above 180/120 that stays there after 5 minutes of rest: call your doctor today.', 'With chest pain, breathlessness, a bad headache, weakness on one side or trouble speaking: go to the emergency room.']
  },
  urticaria: {
    name: 'Hives (urticaria)', re: /urticaria|hives|itch|rash|allerg/i, ic: 'shield', col: '#C2629A',
    what: 'Itchy raised welts that come and go. Long-lasting hives are rarely caused by one food, but some foods and habits make them worse. Fill in the check-in each evening, and Arogya looks for your own triggers.',
    eat: ['Fresh food cooked the same day', 'Rice, roti, poha, upma, khichdi', 'Moong dal', 'Lauki, pumpkin, carrot, cucumber, beans, bhindi', 'Apple, pear, papaya, melon', 'Fresh paneer and milk', 'Plain water and coconut water'],
    eatRe: /rice|roti|phulka|poha|upma|khichdi|moong|lauki|doodhi|pumpkin|kaddu|carrot|gajar|cucumber|kakdi|beans|bhindi|apple|pear|papaya|melon|paneer|milk|coconut water/i,
    avoid: [['Alcohol', R_ALC, 'Widens blood vessels and sets off hives in many people.'], ['Packaged food with colours and preservatives', /namkeen|chips|kurkure|cola|soda|frooti|maaza|jelly|jam\b|candy|ketchup|sauce|instant|maggi|noodles|ice cream|pastry|cake|biscuit|cookie/i, 'Additives are the most common food factor in long-lasting hives.'], ['Pickles and vinegar', /pickle|achar|vinegar/i, 'Fermented and high in histamine.']],
    limit: [['Tomato, brinjal and spinach', /tomato|brinjal|baingan|palak|spinach/i, 'They hold more histamine. Try 3 weeks without, then add back one at a time.'], ['Cheese and very sour curd', /cheese|kadhi|sour curd/i, 'Aged and fermented foods hold histamine.'], ['Very spicy food', /mirchi|chilli|chili|schezwan|vada pav|pav bhaji|misal|pani puri/i, 'Heat and spice can bring on itch.'], ['Citrus, strawberry, pineapple and chocolate', /orange|lemon|mosambi|strawberr|pineapple|chocolate|cocoa/i, 'These release histamine in some people. Test them one at a time.']],
    habits: ['Painkillers like aspirin and ibuprofen can set off hives. Ask your doctor before taking them.', 'Hot showers, tight clothes and heavy sweating can bring on hives. Cool showers help.', 'Stress and short sleep make hives worse.'],
    check: { q: 'How was your skin today?', a: [['Hives (how many welts)', ['None', 'Under 20', '20–50', 'Over 50']], ['Itch', ['None', 'Mild', 'Bothersome', 'Severe']]], score: 'uas' },
    ex: ['sheetali', 'bhramari', 'gentle'],
    doctor: ['Swelling of the lips, tongue or throat, or trouble breathing: go to the emergency room at once.', 'Hives on most days for 6 weeks or more: see a dermatologist. A daily non-drowsy antihistamine is the usual first treatment; the doctor sets the dose.']
  },
  diabetes: {
    name: 'Diabetes or prediabetes', re: /diabet|sugar|prediab|glucose|hba1c/i, ic: 'pulse', col: '#F08A0B',
    what: 'Keep sugar steady: fewer quick carbs, protein and fibre with every meal, and a short walk after eating.',
    link: ['sugar', 'See your sugar readings'],
    eat: ['Dal, sprouts, chana, paneer, curd with every meal', 'Salad or vegetables first, then roti or rice', 'Jowar, bajra or ragi roti', 'Methi, karela, bhindi, green leafy vegetables', 'Guava, apple, pear, orange, jamun', 'A handful of nuts'],
    eatRe: /\bdal\b|sprouts|chana|paneer|curd|dahi|salad|jowar|bajra|ragi|nachni|methi|karela|bhindi|palak|guava|apple|pear|orange|jamun|almond|walnut|chilla|besan/i,
    avoid: [['Sweets and mithai', R_SWEET, 'Sugar goes straight into the blood.'], ['Juice and sugary drinks', R_DRINK, 'Liquid sugar raises it fastest.'], ['Maida and bakery', R_MAIDA, 'Raises sugar like sugar does.']],
    limit: [['White rice and potato', /rice - plain|jeera rice|pulao|biryani|potato|aloo|batata/i, 'Have 1 katori with dal and salad, not 2.'], ['Mango, chikoo, grapes, custard apple', /mango|aam\b|chikoo|sapota|grapes|custard apple|sitaphal/i, 'Sweet fruit: a small portion after a meal, not alone.']],
    nutr: function (r, g) { var su = (r[8] || 0) * g / 100, c = r[3] * g / 100, fi = r[5] * g / 100; return su > 6 ? ['avoid', n0(su) + ' g added sugar in this portion'] : c > 45 && fi < 5 ? ['small', n0(c) + ' g carbs with little fibre'] : null; },
    habits: ['Never skip breakfast if you take sugar tablets.', 'Check fasting sugar on the same days each week.'],
    ex: ['walkmeal', 'walk', 'strength'],
    doctor: ['Fasting sugar 126 or more on two tests, or HbA1c 6.5% or more, means diabetes: see your doctor.', 'Sugar under 70 with shaking or sweating: take 3 teaspoons of sugar in water, then check again in 15 minutes.']
  },
  cholesterol: {
    name: 'High cholesterol', re: /cholest|ldl|lipid|triglycer/i, ic: 'heart', col: '#D0566B',
    what: 'Less saturated and trans fat, more soluble fibre, and regular brisk walks.',
    eat: ['Oats, jau (barley), rajma, chana and moong for soluble fibre', 'Almonds, walnuts, flaxseed (alsi)', 'Fruit and vegetables at every meal', 'Small amounts of mustard, groundnut or rice bran oil'],
    eatRe: /oats|barley|jau\b|rajma|chana|moong|almond|walnut|flax|alsi|salad|sabzi|apple|guava|papaya|orange/i,
    avoid: [['Vanaspati, dalda and deep-fried food', R_FRIED, 'Trans and heated fats raise LDL the most.'], ['Bakery: puffs, khari, biscuits', /puff|khari|biscuit|cookie|pastry|cake|bakery/i, 'Usually made with vanaspati.']],
    limit: [['Ghee, butter, cream and malai', /ghee|butter|cream|malai|makhani|rabdi|basundi/i, 'Saturated fat. A teaspoon of ghee a day is fine.'], ['Cheese and full-fat paneer', /cheese|paneer/i, 'Saturated fat; have smaller portions.']],
    nutr: function (r, g) { var k = r[1] * g / 100, f = r[4] * g / 100; return k > 150 && f * 9 / k > 0.45 ? ['small', Math.round(f * 9 / k * 100) + '% of its calories from fat'] : null; },
    ex: ['walk', 'strength'],
    doctor: ['Recheck your lipid profile 3 months after you change your diet.']
  },
  acidity: {
    name: 'Acidity or reflux', re: /acid|reflux|gerd|heartburn|gastritis|indigestion/i, ic: 'food', col: '#E58A3A',
    what: 'Smaller meals, dinner at least 3 hours before bed, and fewer of the foods that set it off.',
    eat: ['Smaller meals, more often', 'Oats, khichdi, curd rice, poha', 'Banana, papaya, melon', 'Lauki, cucumber, pumpkin', 'Coconut water; saunf after meals'],
    eatRe: /oats|khichdi|curd rice|poha|banana|papaya|melon|lauki|cucumber|pumpkin|coconut water|saunf|idli/i,
    avoid: [['Deep-fried food', R_FRIED, 'Fat keeps food in the stomach longer.'], ['Very spicy food', /mirchi|chilli|chili|schezwan|misal|vada pav|pani puri/i, 'Irritates the food pipe.'], ['Cola and soda', /cola|soda|fanta|sprite|soft drink/i, 'Gas pushes acid up.']],
    limit: [['Tea and coffee, never on an empty stomach', /tea|chai|coffee/i, 'Have them after food, not first thing.'], ['Tomato, citrus, chocolate and mint', /tomato|orange|lemon|mosambi|chocolate|mint|pudina/i, 'These set off heartburn in many people.']],
    habits: ['Don\'t lie down for 3 hours after eating.', 'Raise the head end of your bed by 6 inches if it comes at night.', 'Loosen tight belts after meals.'],
    check: { q: 'Acidity or heartburn today?', a: [['Acidity', ['None', 'Mild', 'Bothersome', 'Severe']]] },
    ex: ['walkmeal', 'vajrasana'],
    doctor: ['Trouble swallowing, black stools, vomiting blood or losing weight without trying: see a doctor at once.', 'Chest pain can be the heart, not acid. If unsure, get checked the same day.']
  },
  thyroid: {
    name: 'Underactive thyroid', re: /thyroid|hypothyroid|tsh|thyronorm|eltroxin/i, ic: 'pill', col: '#8B6CC9',
    what: 'The tablet does most of the work. Take it right, eat well, and keep active for weight and energy.',
    eat: ['Protein at every meal: dal, paneer, curd, sprouts', 'Iodised salt in normal amounts', 'Vegetables, fruit and whole grains'],
    eatRe: /\bdal\b|paneer|curd|sprouts|chana|salad|sabzi|fruit|apple|guava/i,
    avoid: [],
    limit: [['Soya near your tablet time', /soya|soy|tofu/i, 'Keep soya 4 hours away from the tablet; it stops it absorbing.'], ['Sweets and fried food', R_SWEET, 'Weight gain is easier with a slow thyroid.']],
    habits: ['Take the tablet on an empty stomach with water, 30–60 minutes before tea or breakfast.', 'Keep calcium and iron tablets 4 hours away from it.', 'Cabbage and cauliflower are fine cooked, in normal portions.'],
    ex: ['walk', 'strength'],
    doctor: ['Check TSH every 6–12 months, or 6 weeks after any dose change.']
  },
  fattyliver: {
    name: 'Fatty liver', re: /fatty liver|liver|nafld|masld/i, ic: 'shield', col: '#C9773A',
    what: 'Losing 7–10% of your weight can reverse it. Cut sugar and alcohol first, and walk daily.',
    eat: ['Vegetables, dal and sprouts', 'Whole grains: jowar, bajra, oats, brown rice', 'Nuts in small amounts', 'Coffee without sugar is fine'],
    eatRe: /salad|sabzi|\bdal\b|sprouts|jowar|bajra|oats|brown rice|almond|walnut|black coffee/i,
    avoid: [['Alcohol', R_ALC, 'Even small amounts add to liver fat.'], ['Juice and sugary drinks', R_DRINK, 'Fructose turns into liver fat.'], ['Sweets and mithai', R_SWEET, 'Sugar turns into liver fat.']],
    limit: [['Fried food and maida', R_FRIED, 'Extra calories the liver stores as fat.'], ['Big portions of white rice', /rice - plain|jeera rice|pulao|biryani/i, 'Have 1 katori, with dal and salad.']],
    nutr: function (r, g) { var su = (r[8] || 0) * g / 100; return su > 8 ? ['avoid', n0(su) + ' g added sugar in this portion'] : null; },
    ex: ['walk', 'strength'],
    doctor: ['Recheck liver tests (SGPT) and ultrasound as your doctor advises.']
  },
  uricacid: {
    name: 'High uric acid or gout', re: /uric|gout/i, ic: 'drop', col: '#4E8FD0',
    what: 'Drink plenty of water, cut sugary drinks and alcohol. Dal, rajma, palak and mushrooms are fine: plant purines don\'t raise gout risk the way meat and beer do.',
    eat: ['Water, 2.5–3 litres a day', 'Low-fat milk and curd (they lower uric acid)', 'Amla, guava, orange (vitamin C)', 'Cherries when in season', 'Dal, vegetables and whole grains as usual'],
    eatRe: /water|milk|curd|dahi|amla|guava|orange|cherr|\bdal\b|sabzi|salad/i,
    avoid: [['Alcohol, especially beer', R_ALC, 'Raises uric acid and sets off attacks.'], ['Juice and sugary drinks', R_DRINK, 'Fructose raises uric acid.']],
    limit: [['Sweets', R_SWEET, 'Sugar raises uric acid a little and adds weight.']],
    check: { q: 'Joint pain today?', a: [['Joint pain', ['None', 'Mild', 'Bothersome', 'Severe']]] },
    ex: ['easymove'],
    doctor: ['A hot, swollen joint with fever: see a doctor the same day.']
  },
  weight: {
    name: 'Losing weight', re: /weight|obes|overweight|fat loss/i, ic: 'scale', col: '#3E9C86',
    what: 'Stay inside your calorie budget, eat protein at every meal, and walk daily. Half a kilo a week is a good pace.',
    link: ['food', 'Open your food diary'],
    eat: ['Protein at every meal: dal, paneer, curd, sprouts, chilla', 'Half the plate vegetables', 'Fruit instead of sweets'],
    eatRe: /\bdal\b|paneer|curd|sprouts|chilla|salad|sabzi|apple|guava|papaya/i,
    avoid: [['Deep-fried snacks', R_FRIED, '250–400 kcal each, mostly oil.'], ['Sugary drinks', R_DRINK, 'Calories that don\'t fill you up.']],
    limit: [['Sweets', R_SWEET, 'Keep for once a week.'], ['Big portions of rice and roti', /rice|roti|paratha|puri/i, 'Fill up on dal and sabzi instead.']],
    nutr: function (r, g) { var k = r[1] * g / 100, b = budgetFor(today()), left = b.total - dayTotals(today()).kcal; return k > left && left > 0 ? ['small', n0(k) + ' kcal; only ' + n0(left) + ' left today'] : null; },
    ex: ['walk', 'strength'],
    doctor: []
  },
  migraine: {
    name: 'Migraine', re: /migraine|headache/i, ic: 'cloud', col: '#5A5FC2',
    what: 'Regular meals, water and sleep prevent more migraines than any diet. Fill in the check-in, and Arogya looks for your own triggers.',
    eat: ['Meals at regular times, never skipped', 'Water through the day', 'Magnesium-rich food: nuts, seeds, green vegetables, whole grains'],
    eatRe: /almond|walnut|pumpkin seed|palak|methi|jowar|bajra|oats|water/i,
    avoid: [['Alcohol', R_ALC, 'A common trigger, red wine most of all.']],
    limit: [['Too much tea or coffee', /tea|chai|coffee/i, 'Keep it the same each day; both too much and suddenly none can trigger a migraine.'], ['Aged cheese and chocolate', /cheese|chocolate/i, 'Triggers for some people.'], ['Chinese food and instant noodles', /maggi|noodles|manchurian|schezwan|fried rice|chinese/i, 'Often have MSG (ajinomoto).']],
    habits: ['Sleep and wake at the same time every day, weekends too.', 'Don\'t go more than 4–5 hours without food.'],
    check: { q: 'Headache today?', a: [['Headache', ['None', 'Mild', 'Bothersome', 'Severe']]] },
    ex: ['walk', 'bhramari'],
    doctor: ['A sudden, very bad headache, or one with weakness, trouble speaking, fever or a stiff neck: go to the emergency room.']
  },
  constipation: {
    name: 'Constipation', re: /constipat|bowel|motion|ibs/i, ic: 'food', col: '#16C79A',
    what: 'Fibre, water and movement, every day.',
    eat: ['Fruit: papaya, guava, pear, orange', 'Vegetables at both main meals', 'Whole wheat roti, oats, dal', 'Water, 2.5 litres a day', 'Soaked raisins or figs (anjeer)'],
    eatRe: /papaya|guava|pear|orange|salad|sabzi|oats|\bdal\b|roti|raisin|kishmish|fig|anjeer|isabgol/i,
    avoid: [],
    limit: [['Maida and bakery', R_MAIDA, 'Very little fibre.'], ['Too much tea', /tea|chai/i, 'Can dry you out.']],
    ex: ['walk', 'vajrasana'],
    doctor: ['Blood in the stool, weight loss, or a change lasting more than 3 weeks: see a doctor.']
  },
  anemia: {
    name: 'Low haemoglobin', re: /anemi|anaemi|haemoglobin|hemoglobin|\bhb\b|iron/i, ic: 'drop', col: '#D0566B',
    what: 'Eat iron-rich food with vitamin C at the same meal, and keep tea away from meals.',
    eat: ['Rajma, chana, sprouts, moong', 'Ragi, bajra, poha', 'Garden cress seeds (halim), dates, jaggery in small amounts', 'Cooked palak and methi with lemon', 'Amla, guava, orange or lemon with meals'],
    eatRe: /rajma|chana|sprouts|moong|ragi|nachni|bajra|poha|halim|dates|khajur|palak|methi|amla|guava|orange|lemon/i,
    avoid: [],
    limit: [['Tea or coffee within an hour of meals', /tea|chai|coffee/i, 'Blocks iron absorption.'], ['Milk with iron-rich meals', /milk|lassi/i, 'Calcium competes with iron. Have milk at another time.']],
    ex: ['gentle'],
    doctor: ['Take iron tablets as prescribed and recheck Hb after 2–3 months.']
  }
};
var HPORDER = ['bp', 'urticaria', 'diabetes', 'cholesterol', 'acidity', 'thyroid', 'fattyliver', 'uricacid', 'weight', 'migraine', 'constipation', 'anemia'];

/* ---------- state ---------- */
function hp() { DB.hp = DB.hp || { conds: [], ticks: {}, chk: {}, chat: [] }; ['ticks', 'chk'].forEach(function (x) { DB.hp[x] = DB.hp[x] || {}; }); DB.hp.chat = DB.hp.chat || []; return DB.hp; }
function hpConds() { return hp().conds; }
function wre(words) { var w = (words || []).map(function (x) { return String(x).trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).filter(function (x) { return x.length > 2; }); return w.length ? new RegExp(w.join('|'), 'i') : null; }
/* the plan behind a condition: the library entry, or what Gemini wrote for one we don't have */
function hpDef(c) {
  if (c.k && HPL[c.k]) return HPL[c.k];
  var a = c.ai || {};
  if (!a._built) {
    a._eatRe = wre(a.eat_words); a._av = (a.avoid || []).map(function (x) { return [x.label, wre(x.words), x.why]; }); a._li = (a.limit || []).map(function (x) { return [x.label, wre(x.words), x.why]; }); a._built = 1;
    (a.exercise || []).forEach(function (x, i) { HPX['c' + c.id + i] = { n: x.name, min: +x.min || 10, how: x.how, ic: /breath|pranayam/i.test(x.name) ? 'yoga' : /walk|cycl|swim/i.test(x.name) ? 'steps' : 'bolt', kind: /walk/i.test(x.name) ? 'walk' : /breath|pranayam|yoga|asana/i.test(x.name) ? 'yoga' : 'strength', go: 'timer', days: x.days === 'weekly3' ? [1, 3, 5] : x.days === 'weekly2' ? [2, 6] : null }; });
  }
  return { name: c.name, ic: 'shield', col: '#7A4DFF', what: a.what || '', eat: a.eat || [], eatRe: a._eatRe, avoid: a._av, limit: a._li, habits: a.habits || [], check: a.check && a.check.q ? { q: a.check.q, a: [[a.check.label || 'Today', (a.check.scale || ['None', 'Mild', 'Bothersome', 'Severe']).slice(0, 4)]] } : null, ex: (a.exercise || []).map(function (x, i) { return 'c' + c.id + i; }), doctor: a.doctor || [], ai: true };
}

/* ---------- today's exercise ---------- */
function hpExToday(k) {
  k = k || today(); var dw = fromKey(k).getDay(), seen = {}, out = [];
  /* keep the day short: one walk, at most two breathing practices, four things in all */
  var walk = null, breaths = 0;
  hpConds().forEach(function (c) { var D = hpDef(c); (D.ex || []).forEach(function (id) {
    var x = HPX[id]; if (!x) return; if (x.days && x.days.indexOf(dw) < 0) return;
    if (seen[id]) { if (seen[id].for.indexOf(D.name) < 0) seen[id].for.push(D.name); return; }
    if (x.kind === 'walk' && id !== 'walkmeal') { if (walk) { if (walk.for.indexOf(D.name) < 0) walk.for.push(D.name); return; } }
    if (x.prana && breaths >= 2) return;
    seen[id] = { id: id, x: x, for: [D.name] }; out.push(seen[id]);
    if (x.kind === 'walk' && id !== 'walkmeal') walk = seen[id]; if (x.prana) breaths++;
  }); });
  return out.slice(0, 4);
}
function hpExDone(id, k) {
  var x = HPX[id], man = (hp().ticks[k] || {})[id], d = dayIf(k), ys = d ? d.yoga || [] : [];
  if (man) return { ok: true, note: 'Done' };
  if (x.prana) { var m = ys.filter(function (y) { return y.prana === x.prana; }).reduce(function (a, y) { return a + (y.min || 0); }, 0); return { ok: m >= x.min * 0.8, note: m ? Math.round(m) + ' of ' + x.min + ' min' : '' }; }
  if (id === 'wall' && DB.bpplan && ((DB.bpplan.ticks || {})[k] || {}).wall) return { ok: true, note: 'Done' };
  if (x.kind === 'walk') { var w = ys.filter(function (y) { return y.kind === 'walk' || /walk/i.test(y.name || ''); }).reduce(function (a, y) { return a + (y.min || 0); }, 0); return { ok: w >= x.min, note: w ? Math.round(w) + ' min walked' : '' }; }
  var mine = ys.filter(function (y) { return y.hpx === id; }).reduce(function (a, y) { return a + (y.min || 0); }, 0);
  return { ok: mine >= x.min * 0.8, note: mine ? Math.round(mine) + ' min done' : '' };
}
function hpProgress(k) { var L = hpExToday(k), d = L.filter(function (e) { return hpExDone(e.id, k).ok; }).length; return { list: L, done: d, total: L.length }; }
ACT.hpTick = function (el) { var id = el.getAttribute('data-id'), k = today(), H = hp(); H.ticks[k] = H.ticks[k] || {}; H.ticks[k][id] = !H.ticks[k][id]; if (H.ticks[k][id]) feel('done'); else feel('tick'); save(); rerender(); };
ACT.hpStart = function (el) {
  var id = el.getAttribute('data-id'), x = HPX[id];
  if (x.go === 'walk') { HPT.after = id; return ACT.quickWalk(); }
  if (x.go === 'timer') return go('hpt/' + id);
  go(x.go);
};

/* rewards: one more daily goal, and a badge */
GOALS.push(['plan', 'Health plan exercise', 'shield', '#E0245E', function (k) { if (!DB.hp || !DB.hp.conds.length || (DB.hp.since && k < DB.hp.since)) return { show: false }; var p = hpProgress(k); if (!p.total) return { show: false }; return { ok: p.done === p.total, now: p.done, of: p.total, unit: 'done', show: true }; }]);
BADGES.push(['plan7', 'Plan keeper', 'shield', '#E0245E', 'Health plan exercise 7 days in a row', function (s) { return [s.best.plan || 0, 7]; }]);
BADGES.push(['plan30', 'Healing habit', 'crown', '#E0245E', 'Health plan exercise on 30 days', function (s) { return [s.cnt.plan || 0, 30]; }]);

/* ---------- simple timer for exercises with no screen of their own ---------- */
var HPT = { id: null, left: 0, run: false, iv: 0, after: null };
ROUTES.hpt = function (id) {
  var x = HPX[id]; if (!x) return head('Exercise') + '<p class="p">Not found.</p>';
  if (HPT.id !== id) { clearInterval(HPT.iv); HPT = { id: id, left: x.min * 60, run: false, iv: 0, start: 0 }; }
  var h = head(x.n, x.min + ' minutes');
  h += '<section class="c ctrtxt"><div class="hpclock" id="hpclock">' + fmtS(HPT.left) + '</div><p class="p">' + esc(x.how || '') + '</p>' +
    '<div class="g2 mt"><button class="btn" data-act="hptGo">' + icon(HPT.run ? 'pause' : 'play', 18) + (HPT.run ? 'Pause' : HPT.left < x.min * 60 ? 'Resume' : 'Start') + '</button><button class="btn sec" data-act="hptDone">' + icon('check', 18) + 'Done</button></div></section>';
  return h;
};
TABOF.hpt = 'home';
ACT.hptGo = function () {
  if (HPT.run) { clearInterval(HPT.iv); HPT.run = false; rerender(); return; }
  HPT.run = true; feel('tick'); var last = Date.now();
  HPT.iv = setInterval(function () {
    var now = Date.now(); HPT.left -= (now - last) / 1000; last = now;
    var el = document.getElementById('hpclock'); if (el) el.textContent = fmtS(HPT.left);
    if (HPT.left <= 0) { clearInterval(HPT.iv); HPT.run = false; feel('bell'); ACT.hptDone(); }
  }, 250);
  rerender();
};
ACT.hptDone = function () {
  var x = HPX[HPT.id], used = Math.round((x.min * 60 - Math.max(0, HPT.left)) / 60);
  clearInterval(HPT.iv); HPT.run = false;
  var min = used >= 1 ? used : x.min;
  day(today()).yoga.push({ t: Date.now(), min: min, kind: x.kind, name: x.n.replace(/,.*$/, ''), hpx: HPT.id });
  var H = hp(), k = today(); H.ticks[k] = H.ticks[k] || {}; H.ticks[k][HPT.id] = true;
  HPT.id = null; save(); feel('done'); toast(x.n.replace(/,.*$/, '') + ' saved · ' + min + ' min'); go('hp');
};

/* ---------- daily check-in ---------- */
function hpChk(c, k) { return (hp().chk[c.id] || {})[k] || null; }
function hpChkScore(c, k) { var v = hpChk(c, k); if (!v) return null; return Object.keys(v).reduce(function (a, x) { return a + (+v[x] || 0); }, 0); }
ACT.hpChk = function (el) {
  var id = el.getAttribute('data-c'), q = el.getAttribute('data-q'), v = +el.getAttribute('data-v'), k = el.getAttribute('data-k') || today(), H = hp();
  H.chk[id] = H.chk[id] || {}; H.chk[id][k] = H.chk[id][k] || {}; H.chk[id][k][q] = v; feel('tick'); save(); rerender();
};
function chkCard(c, D, k, compact) {
  var v = hpChk(c, k) || {};
  var h = '<div class="hpchk"><b>' + esc(D.check.q) + '</b>';
  D.check.a.forEach(function (a, qi) {
    h += (D.check.a.length > 1 ? '<div class="l mt6">' + esc(a[0]) + '</div>' : '') + '<div class="hpscale">' + a[1].map(function (lab, i) { return '<button class="' + (v[qi] === i ? 'on s' + i : '') + '" data-act="hpChk" data-c="' + c.id + '" data-q="' + qi + '" data-v="' + i + '" data-k="' + k + '">' + esc(lab) + '</button>'; }).join('') + '</div>';
  });
  return h + '</div>';
}
/* last 14 days as dots */
function chkDots(c, D) {
  var mx = D.check.a.length * 3, h = '<div class="hpdots">';
  for (var i = 13; i >= 0; i--) { var k = addDays(today(), -i), s = hpChkScore(c, k); h += '<span title="' + niceDate(k) + '" style="' + (s == null ? '' : 'background:' + (s === 0 ? '#16C79A' : s / mx <= 0.34 ? '#F5B700' : s / mx <= 0.67 ? '#FF8A3D' : '#E0245E')) + '"></span>'; }
  return h + '</div><div class="row sb l"><span>2 weeks ago</span><span>Today</span></div>';
}
/* Urticaria Activity Score over 7 days (hives 0–3 + itch 0–3 a day, 0–42) */
function uas7(c) { var s = 0, n = 0; for (var i = 0; i < 7; i++) { var v = hpChk(c, addDays(today(), -i)); if (v && v[0] != null) { s += (+v[0] || 0) + (+v[1] || 0); n++; } } return n >= 4 ? Math.round(s / n * 7) : null; }
function uasLabel(x) { return x === 0 ? ['Hive-free', '#16C79A'] : x <= 6 ? ['Well controlled', '#16C79A'] : x <= 15 ? ['Mild', '#F5B700'] : x <= 27 ? ['Moderate', '#FF8A3D'] : ['Severe', '#E0245E']; }

/* your own triggers: foods eaten that day or the day before, more often before bad days than good ones */
function hpTriggers(c) {
  var bad = [], good = [], H = hp().chk[c.id] || {};
  Object.keys(H).forEach(function (k) { var s = hpChkScore(c, k); if (s == null) return; (s >= 2 ? bad : s === 0 ? good : []).push(k); });
  if (bad.length < 3 || good.length < 3) return { need: true, bad: bad.length, good: good.length };
  var eaten = function (k) { var s = {}; dayItems(k).concat(dayItems(addDays(k, -1))).forEach(function (it) { s[it.n.replace(/\s*\(.*\)$/, '')] = 1; }); return s; };
  var cnt = {}; bad.forEach(function (k) { Object.keys(eaten(k)).forEach(function (n) { cnt[n] = cnt[n] || [0, 0]; cnt[n][0]++; }); });
  good.forEach(function (k) { Object.keys(eaten(k)).forEach(function (n) { cnt[n] = cnt[n] || [0, 0]; cnt[n][1]++; }); });
  var out = Object.keys(cnt).map(function (n) { var b = cnt[n][0] / bad.length, g = cnt[n][1] / good.length; return { n: n, b: cnt[n][0], g: cnt[n][1], bp: b, gp: g, lift: b - g }; })
    .filter(function (x) { return x.b >= 2 && x.lift >= 0.3 && x.bp >= 0.4; }).sort(function (a, b) { return b.lift - a.lift; }).slice(0, 5);
  return { list: out, bad: bad.length, good: good.length };
}

/* ---------- Can I eat this? ---------- */
var VRANK = { good: 0, ok: 1, small: 2, avoid: 3 };
function fname(r) { var al = typeof FA !== 'undefined' && FA[r[0]]; return r[0] + (al ? ' ' + al : ''); }
function hpVerdict(r, g) {
  var nm = fname(r), rows = [];
  hpConds().forEach(function (c) {
    var D = hpDef(c), lvl = 'ok', why = '';
    (D.avoid || []).forEach(function (a) { if (lvl !== 'avoid' && a[1] && a[1].test(nm)) { lvl = 'avoid'; why = a[0] + ': ' + a[2]; } });
    if (lvl === 'ok') (D.limit || []).forEach(function (a) { if (lvl === 'ok' && a[1] && a[1].test(nm)) { lvl = 'small'; why = a[0] + ': ' + a[2]; } });
    var nu = D.nutr ? D.nutr(r, g) : null;
    if (nu && VRANK[nu[0]] > VRANK[lvl]) { lvl = nu[0]; why = nu[1]; } else if (nu && nu[0] === lvl) why += (why ? ' ' : '') + nu[1] + '.';
    if (lvl === 'ok' && D.eatRe && D.eatRe.test(nm)) { lvl = 'good'; why = 'On your eat-more list.'; }
    if (D.check) { var T = hpTriggers(c); if (T.list && T.list.some(function (x) { return nm.indexOf(x.n) === 0; })) { if (VRANK.small > VRANK[lvl]) lvl = 'small'; why = 'Came before your bad days more than your good ones. ' + why; } }
    rows.push({ c: c, D: D, lvl: lvl, why: why || 'Nothing in it that matters for this.' });
  });
  var worst = rows.reduce(function (a, x) { return VRANK[x.lvl] > VRANK[a] ? x.lvl : a; }, rows.length ? 'good' : 'ok');
  if (worst === 'good' && rows.some(function (x) { return x.lvl === 'ok'; })) worst = rows.every(function (x) { return x.lvl === 'ok'; }) ? 'ok' : 'good';
  return { lvl: worst, rows: rows };
}
var HPV = { good: ['Yes, good for you', '#16C79A', 'check'], ok: ['Yes, that\'s fine', '#16C79A', 'check'], small: ['A small portion is OK', '#F59E0B', 'warn'], avoid: ['Better to skip', '#E0245E', 'x'] };
var CANQ = { r: null, u: null };
ACT.hpCan = function (el) { var r = food(el.getAttribute('data-n')); if (!r) return; CANQ = { r: r, u: null }; canSheet(); };
ACT.hpCanU = function (el) { CANQ.u = +el.getAttribute('data-i'); canSheet(); };
function canSheet() {
  var r = CANQ.r, us = unitsOf(r).filter(function (u) { return u[1] > 0 && u[0] !== 'grams' && !/tablespoon|teaspoon|tbsp|tsp/.test(u[0]); }); if (!us.length) us = [['100 g', 100]];
  if (CANQ.u == null) CANQ.u = 0; var u = us[Math.min(CANQ.u, us.length - 1)], g = u[1], V = hpVerdict(r, g), L = HPV[V.lvl];
  var h = '<div class="hpvhead" style="--vc:' + L[1] + '"><span>' + icon(L[2], 22) + '</span><div><div class="l">' + esc(r[0].replace(/\s*\(.*\)$/, '')) + '</div><h2>' + L[0] + '</h2></div></div>' +
    '<div class="chips mt">' + us.slice(0, 3).map(function (x, i) { return '<button class="chip' + (i === CANQ.u ? ' dk' : '') + '" data-act="hpCanU" data-i="' + i + '">' + (x[0] === '100 g' ? '100 ' + gu(r[0]) : '1 ' + esc(unitLabel(x[0], r[0])) + ' · ' + x[1] + ' ' + gu(r[0])) + '</button>'; }).join('') + '</div>' +
    '<div class="l mt6">' + n0(r[1] * g / 100) + ' kcal · protein ' + n1(r[2] * g / 100) + ' g · sodium ' + n0((r[9] || 0) * g / 100) + ' mg · added sugar ' + n1((r[8] || 0) * g / 100) + ' g</div>';
  if (!V.rows.length) h += '<p class="p mt">Add a condition first, and this checks the food against each one.</p>';
  h += V.rows.map(function (x) { var c = HPV[x.lvl]; return '<div class="hpvrow"><i style="background:' + c[1] + '"></i><div><b>' + esc(x.D.name) + ' · ' + { good: 'good', ok: 'fine', small: 'small portion', avoid: 'skip' }[x.lvl] + '</b><div class="l">' + esc(x.why) + '</div></div></div>'; }).join('');
  var sw = null; if (V.lvl === 'avoid' || V.lvl === 'small') SWAPS.forEach(function (s) { if (!sw && s[0].test(r[0]) && food(s[1]) && hpVerdict(food(s[1]), 100).lvl !== 'avoid') sw = s; });
  if (sw) h += '<div class="hpswap"><span class="l">Have this instead</span><button class="lnk" data-act="hpCan" data-n="' + esc(sw[1]) + '">' + esc(sw[1].replace(/\s*\(.*\)$/, '')) + ' — ' + esc(sw[2]) + '</button></div>';
  h += '<button class="btn sec mt" data-act="hpAskFood" data-n="' + esc(r[0]) + '">' + icon('spark', 18) + 'Ask Gemini for more</button>';
  sheet(h);
}
INP.hpq = function (el) {
  var q = el.value.trim(), box = document.getElementById('hpres'); if (!box) return;
  if (q.length < 2) { box.innerHTML = ''; return; }
  var res = searchFoods(q, 6);
  box.innerHTML = res.map(function (r) { var V = hpVerdict(r, unitsOf(r)[0] ? unitsOf(r)[0][1] : 100), L = HPV[V.lvl]; return '<button class="hpres" data-act="hpCan" data-n="' + esc(r[0]) + '"><i style="background:' + L[1] + '"></i><span>' + esc(r[0]) + '</span><em style="color:' + L[1] + '">' + { good: 'Good', ok: 'Fine', small: 'Small', avoid: 'Skip' }[V.lvl] + '</em></button>'; }).join('') +
    '<button class="hpres ai" data-act="hpAskFood" data-q="' + esc(q) + '">' + icon('spark', 16) + '<span>Ask Gemini about “' + esc(q) + '”</span></button>';
};

/* ---------- Gemini ---------- */
function condContext() {
  var C = hpConds(); if (!C.length) return '';
  return '\nHealth conditions the person manages (their own list): ' + C.map(function (c) {
    var D = hpDef(c), s = c.name;
    if (D.check) { var last = []; for (var i = 0; i < 7; i++) { var sc = hpChkScore(c, addDays(today(), -i)); if (sc != null) last.push(sc); } if (last.length) s += ' (symptom score last ' + last.length + ' days, newest first, 0 = none: ' + last.join(',') + ')'; }
    if (c.k === 'urticaria') { var u = uas7(c); if (u != null) s += ', UAS7 ' + u + '/42'; }
    return s;
  }).join('; ') + '. Doctor advised DASH diet for BP where BP is listed. Keep advice consistent with these conditions.';
}
var _hcBase = healthContext;
healthContext = function () { return _hcBase() + condContext(); };
var HP_SYS = COACH_SYS + ' You are also their condition coach. For each condition they list, give practical, evidence-based steps (Indian foods, yoga, pranayama, walking, sleep, stress). Name specific foods and amounts. Say when a doctor is needed. Never change or stop prescribed medicine; tell them to ask their doctor.';
ACT.hpAskFood = function (el) {
  var n = el.getAttribute('data-n') || el.getAttribute('data-q');
  var q = 'Can I eat ' + n + '? Check it against each of my conditions and today\'s food so far. Start with Yes, Small portion, or Skip. Then one line per condition, the best portion and time of day, and a better swap if it is a skip.';
  sheet(null); go('hpcoach'); setTimeout(function () { hpSend(q); }, 50);
};
var HP_BUSY = false;
function hpSend(q) {
  if (!q || HP_BUSY) return;
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  var H = hp(); H.chat.push({ r: 'u', t: q }); HP_BUSY = true; save(); if (cur.name === 'hpcoach') rerender();
  var hist = H.chat.slice(-11, -1).map(function (m) { return { role: m.r === 'u' ? 'user' : 'model', parts: [{ text: m.t }] }; });
  gQuick([{ text: 'MY DATA (latest):\n' + healthContext() + '\n\nNow: ' + new Date().toString().slice(0, 21) + '\nMY QUESTION: ' + q + '\n\nAnswer in under 140 words unless I ask for a plan. Use short lines.' }], { system: HP_SYS, history: hist, temp: 0.5 }, 40000, 3)
    .then(function (a) { H.chat.push({ r: 'a', t: a }); H.chat = H.chat.slice(-40); })
    .catch(function (e) { H.chat.pop(); aiErr(e); })
    .then(function () { HP_BUSY = false; save(); if (cur.name === 'hpcoach') { rerender(); var app = document.getElementById('app'); app.scrollTop = app.scrollHeight; } });
}
ACT.hpSend = function () { var i = document.getElementById('hpask'); if (!i) return; var q = i.value.trim(); i.value = ''; hpSend(q); };
ACT.hpQuick = function (el) { hpSend(el.textContent); };
ACT.hpChatClear = function () { hp().chat = []; save(); rerender(); };
ROUTES.hpcoach = function () {
  var H = hp(), h = head('Health coach', 'Gemini, with your conditions and data');
  h += '<section class="c"><div class="chat">';
  if (!H.chat.length) {
    var qs = ['What should I eat for dinner tonight?', 'Plan my meals for tomorrow'];
    hpConds().forEach(function (c) { qs.push('What is making my ' + c.name.toLowerCase().replace(/\s*\(.*\)/, '') + ' worse?'); });
    h += '<p class="p">Ask anything. Gemini sees your conditions, food diary, readings, sleep, medicines and check-ins.</p><div class="chips mt">' + qs.slice(0, 5).map(function (q) { return '<button class="chip" data-act="hpQuick">' + esc(q) + '</button>'; }).join('') + '</div>';
  }
  H.chat.slice(-20).forEach(function (m) { h += '<div class="bub ' + (m.r === 'u' ? 'me' : 'ai') + '">' + fmt(m.t) + '</div>'; });
  if (HP_BUSY) h += '<div class="bub ai"><span class="dots"><i></i><i></i><i></i></span></div>';
  h += '</div><label class="askbox"><input id="hpask" placeholder="Ask about your health" enterkeyhint="send"><button class="ib g" data-act="hpSend" aria-label="Send">' + icon('send', 20) + '</button></label>' + (H.chat.length ? '<button class="lnk mt6" data-act="hpChatClear">Clear chat</button>' : '') + '</section>';
  return h;
};
ROUTES.hpcoach.after = function () { var i = document.getElementById('hpask'); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') ACT.hpSend(); }); };
TABOF.hpcoach = 'home';

/* ---------- add a condition ---------- */
ACT.hpAdd = function () { hpAddSheet(''); };
function hpAddSheet(q) {
  var have = {}; hpConds().forEach(function (c) { have[c.k || c.name.toLowerCase()] = 1; });
  var L = HPORDER.filter(function (k) { return !have[k] && (!q || HPL[k].re.test(q) || HPL[k].name.toLowerCase().indexOf(q.toLowerCase()) >= 0); });
  var h = '<h2>Add a condition</h2><label class="fld">Type any condition<input id="hpaddq" value="' + esc(q) + '" placeholder="For example: hives, psoriasis, PCOS" data-inp="hpAddQ" autocomplete="off"></label><div id="hpaddl" class="hpaddl">' + hpAddList(L, q) + '</div>';
  sheet(h);
  var i = document.getElementById('hpaddq'); if (i && q) { i.focus(); i.setSelectionRange(q.length, q.length); }
}
function hpAddList(L, q) {
  return L.map(function (k) { var D = HPL[k]; return '<button class="hpadd" data-act="hpAddGo" data-k="' + k + '">' + orb(D.ic, 16) + '<span>' + esc(D.name) + '</span>' + icon('plus', 18) + '</button>'; }).join('') +
    (q && q.length > 2 ? '<button class="hpadd ai" data-act="hpAddAi" data-q="' + esc(q) + '">' + orb('spark', 16) + '<span>Build a plan for “' + esc(q) + '” with Gemini</span>' + icon('plus', 18) + '</button>' : '');
}
INP.hpAddQ = function (el) { var q = el.value.trim(), have = {}; hpConds().forEach(function (c) { have[c.k || ''] = 1; }); var L = HPORDER.filter(function (k) { return !have[k] && (!q || HPL[k].re.test(q) || HPL[k].name.toLowerCase().indexOf(q.toLowerCase()) >= 0); }); document.getElementById('hpaddl').innerHTML = hpAddList(L, q); };
ACT.hpAddGo = function (el) {
  var k = el.getAttribute('data-k'), H = hp(); if (!H.since) H.since = today();
  H.conds.push({ id: uid(), k: k, name: HPL[k].name, added: today() });
  if (k === 'bp') { bpPlan(); syncMeds(); }
  save(); sheet(null); feel('done'); toast(HPL[k].name + ' added'); go('hpc/' + H.conds[H.conds.length - 1].id);
};
var HP_ADDING = '';
ACT.hpAddAi = function (el) {
  var q = el.getAttribute('data-q'); if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  HP_ADDING = q; sheet('<h2>Building your plan</h2><div class="ctrtxt"><div class="spin"></div><p class="p">Gemini is writing a plan for ' + esc(q) + ', using your food diary and readings. About 20 seconds.</p></div>');
  var prompt = 'MY DATA:\n' + healthContext() + '\n\nI want to manage this condition: "' + q + '". Write a practical plan for an Indian vegetarian in Mumbai. Return JSON only:\n' +
    '{"name": short proper name of the condition, "what": 2 plain sentences on what helps most, "eat": [4-6 short lines of Indian foods to have more of], "eat_words": [10-25 single lowercase words or short dish names that match those foods in a food list, like "moong","papaya","curd"], ' +
    '"avoid": [{"label": short group name, "words": [lowercase words or dish names that match it], "why": one sentence}] (0-4 items, only well-supported), "limit": [same shape, 0-4 items, foods to have in small amounts or test one at a time], ' +
    '"habits": [2-4 short daily habits], "exercise": [{"name": short name with minutes, "min": minutes as a number, "how": one or two sentences, "days": "daily" or "weekly3" or "weekly2"}] (2-3 items, safe for this condition; yoga or pranayama by Indian name is welcome), ' +
    '"check": {"q": a daily evening question about symptoms, "label": one word, "scale": [4 answers from none to severe]} or null if the condition has no daily symptoms, "doctor": [1-3 warning signs that need a doctor]}\nUse only well-established medical advice. No medicine doses.';
  gQuick([{ text: prompt }], { json: true, system: HP_SYS, temp: 0.3 }, 45000, 3).then(function (j) {
    if (!j || !j.name) throw new Error('Gemini sent an empty plan. Try again.');
    var H = hp(); if (!H.since) H.since = today();
    var c = { id: uid(), k: '', name: String(j.name).slice(0, 40), added: today(), ai: j, asked: q }; H.conds.push(c);
    save(); sheet(null); feel('done'); toast(c.name + ' added'); go('hpc/' + c.id);
  }).catch(function (e) { sheet(null); aiErr(e); }).then(function () { HP_ADDING = ''; });
};
ACT.hpDel = function (el) {
  var id = el.getAttribute('data-c'), c = hpConds().filter(function (x) { return x.id === id; })[0]; if (!c) return;
  sheet('<h2>Remove ' + esc(c.name) + '?</h2><p class="p">Its plan and check-ins are removed from Arogya. Your food, readings and the BP plan stay.</p><button class="btn mt" style="background:var(--bad)" data-act="hpDelGo" data-c="' + id + '">Remove</button><button class="btn sec mt" data-act="closeSheet">Keep it</button>');
};
ACT.hpDelGo = function (el) { var id = el.getAttribute('data-c'), H = hp(); H.conds = H.conds.filter(function (x) { return x.id !== id; }); delete H.chk[id]; save(); sheet(null); go('hp'); };
ACT.hpTips = function (el) {
  var id = el.getAttribute('data-c'), c = hpConds().filter(function (x) { return x.id === id; })[0]; if (!c) return;
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  c.tipsBusy = true; rerender();
  gQuick([{ text: 'MY DATA:\n' + healthContext() + '\n\nLook at my last 7 days for my ' + c.name + '. Give 3-5 specific changes for this week, each one line, naming foods from my own diary to cut or swap and what to add. Plain text lines starting with "- ".' }], { system: HP_SYS, temp: 0.4 }, 40000, 3)
    .then(function (t) { c.tips = t; c.tipsAt = Date.now(); }).catch(function (e) { aiErr(e); }).then(function () { c.tipsBusy = false; save(); if (cur.name === 'hpc') rerender(); });
};

/* ---------- the hub ---------- */
ROUTES.hp = function () {
  var H = hp(), k = today(), C = H.conds, h = head('My health plan', C.length ? C.length + ' condition' + (C.length > 1 ? 's' : '') + ' · food, exercise and coach' : 'Your conditions, food and exercise');
  /* conditions */
  h += '<div class="hpconds">' + C.map(function (c) { var D = hpDef(c); return '<button class="hpcond" data-act="go" data-to="hpc/' + c.id + '" style="--cc:' + D.col + '">' + icon(D.ic, 16) + esc(D.name) + '</button>'; }).join('') + '<button class="hpcond add" data-act="hpAdd">' + icon('plus', 16) + (C.length ? 'Add' : 'Add a condition') + '</button></div>';
  if (!C.length) {
    h += '<section class="c"><h2>Start with your conditions</h2><p class="p">Add anything you live with: high BP, hives, diabetes, acidity, or something else. Arogya then:</p>' +
      ['Tells you what to eat more of, what to keep small and what to skip', 'Checks any food: “Can I eat this?”', 'Gives you a few exercises a day, with points and streaks when you finish', 'Asks how you felt each evening, and finds your own triggers', 'Lets you ask Gemini anything, knowing all of it'].map(function (t) { return '<div class="mst"><span class="n">✓</span><span>' + t + '</span></div>'; }).join('') +
      '<button class="btn mt" data-act="hpAdd">' + icon('plus', 18) + 'Add a condition</button></section>';
    return h;
  }
  /* can I eat this */
  h += '<section class="c"><h2>Can I eat this?</h2><label class="fld"><input id="hpq" placeholder="Type a food, like pav bhaji or mango" data-inp="hpq" autocomplete="off" enterkeyhint="search"></label><div id="hpres" class="hpresl"></div></section>';
  /* today's exercise */
  var P = hpProgress(k), rs = rwStats(), streak = (rs.cur || {}).plan || 0;
  if (P.total) {
    h += '<section class="c"><div class="row sb"><h2>Today\'s exercise</h2><b class="hpcount">' + P.done + '/' + P.total + '</b></div>';
    h += P.list.map(function (e) {
      var d = hpExDone(e.id, k), x = e.x;
      return '<div class="hprow' + (d.ok ? ' dn' : '') + '"><button class="hpbox' + (d.ok ? ' on' : '') + '" data-act="hpTick" data-id="' + e.id + '" aria-label="Mark ' + esc(x.n) + ' done">' + (d.ok ? icon('check', 16) : '') + '</button><div class="f1"><b>' + esc(x.n) + '</b><div class="l">' + esc(d.note || ('For ' + e.for.join(', ').toLowerCase())) + '</div></div>' + (d.ok ? '' : '<button class="hpgo" data-act="hpStart" data-id="' + e.id + '">' + icon('play', 14) + 'Start</button>') + '</div>';
    }).join('');
    h += '<div class="hpreward">' + (P.done === P.total ? '🏆 All done. +10 points' + (streak > 1 ? ' · ' + streak + '-day streak' : '') + '. Do it again tomorrow to keep the streak going.' : '🔥 Finish all ' + P.total + ' for +10 points' + (streak ? ' and day ' + (streak + 1) + ' of your streak' : ' and a new streak') + '.') + '</div></section>';
  }
  /* check-ins */
  var ch = C.filter(function (c) { return hpDef(c).check; });
  if (ch.length) h += '<section class="c"><h2>Evening check-in</h2>' + ch.map(function (c) { return chkCard(c, hpDef(c), k); }).join('') + '<div class="l mt6">Takes 5 seconds. After a week Arogya starts spotting what comes before your bad days.</div></section>';
  /* per-condition summary */
  h += C.map(function (c) {
    var D = hpDef(c), s = '<section class="c hpsum" data-act="go" data-to="hpc/' + c.id + '" style="--cc:' + D.col + '"><div class="row sb"><div class="row g10">' + orb(D.ic, 16) + '<h2>' + esc(D.name) + '</h2></div>' + icon('chev', 18) + '</div>';
    if (c.k === 'bp') { var w = bpWindow(7); if (w) s += '<div class="l mt6">7-day average <b>' + w.sys + '/' + w.dia + '</b> · DASH today ' + (dashDay(k).score == null ? '—' : dashDay(k).score) + '</div>'; }
    else if (c.k === 'urticaria') { var u = uas7(c); s += '<div class="l mt6">' + (u == null ? 'Check in 4 evenings to see your weekly hive score' : 'Weekly hive score <b>' + u + '/42</b> · ' + uasLabel(u)[0]) + '</div>'; }
    else if (c.k === 'diabetes') { var su = merged('sugar').filter(function (x) { return x.type === 'fasting'; })[0]; s += '<div class="l mt6">' + (su ? 'Last fasting sugar <b>' + su.val + '</b> · ' + ago(su.t) : 'Log a fasting sugar reading') + '</div>'; }
    else s += '<div class="l mt6">' + esc((D.what || '').split('. ')[0]) + '.</div>';
    return s + '</section>';
  }).join('');
  h += '<button class="gt w2 hpcoachbtn" data-act="go" data-to="hpcoach"><div class="h"><span>Ask your health coach</span>' + orb('spark', 16) + '</div><b style="font-size:19px">Gemini knows your conditions</b><div class="s">' + (H.chat.length ? 'Last asked ' + esc((H.chat.filter(function (m) { return m.r === 'u'; }).slice(-1)[0] || {}).t || '').slice(0, 50) : 'Food, symptoms, exercise, anything') + '</div></button>';
  h += '<p class="l mt">General guidance from standard medical advice. Your doctor\'s advice comes first, and never change medicines without them.</p>';
  return h;
};
TABOF.hp = 'home';

/* ---------- one condition ---------- */
ROUTES.hpc = function (id) {
  var c = hpConds().filter(function (x) { return x.id === id; })[0]; if (!c) { return head('My health plan') + '<p class="p">This condition was removed.</p><button class="btn" data-act="go" data-to="hp">Back to my plan</button>'; }
  var D = hpDef(c), k = today(), h = '<header class="hd hero" style="--sc:' + D.col + '"><button class="ib" data-act="back" aria-label="Back">' + icon('back') + '</button><span class="heroi">' + icon(D.ic, 22) + '</span><div class="hdt"><h1>' + esc(D.name) + '</h1><div class="l">Added ' + niceDate(c.added) + (D.ai ? ' · plan by Gemini' : '') + '</div></div><span class="herow">' + icon(D.ic, 92) + '</span></header>';
  h += '<section class="c"><p class="p">' + esc(D.what) + '</p>' + (D.link ? '<button class="btn sec mt" data-act="go" data-to="' + D.link[0] + '">' + esc(D.link[1]) + '</button>' : '') + '</section>';
  /* check-in, score and triggers */
  if (D.check) {
    h += '<section class="c"><h2>How it\'s going</h2>' + chkCard(c, D, k) + '<div class="mt">' + chkDots(c, D) + '</div>';
    if (c.k === 'urticaria') { var u = uas7(c); if (u != null) { var ul = uasLabel(u); h += '<div class="rd"><span>Weekly hive score (UAS7)<br><span class="l">0 is clear, 42 is the worst. Doctors use this score.</span></span><b style="color:' + ul[1] + '">' + u + ' · ' + ul[0] + '</b></div>'; } }
    var T = hpTriggers(c);
    h += '<div class="kick mt">YOUR POSSIBLE TRIGGERS</div>';
    if (T.need) h += '<div class="l">Needs at least 3 bad days and 3 clear days with food logged (' + T.bad + ' bad, ' + T.good + ' clear so far). Keep checking in.</div>';
    else if (!T.list.length) h += '<div class="l">No food stands out yet across ' + T.bad + ' bad and ' + T.good + ' clear days. That is common: often it is stress, heat or sleep, not food.</div>';
    else h += T.list.map(function (x) { return '<div class="rd"><span>' + esc(x.n) + '<br><span class="l">Before ' + x.b + ' of ' + T.bad + ' bad days, ' + x.g + ' of ' + T.good + ' clear days</span></span><b class="warnt">Test it</b></div>'; }).join('') + '<div class="l mt6">This is a pattern, not proof. Skip one food for 2 weeks and see if the score drops.</div>';
    h += '</section>';
  }
  /* food */
  var list = function (title, cls, rows) { return rows && rows.length ? '<div class="kick mt ' + cls + '">' + title + '</div>' + rows.join('') : ''; };
  h += '<section class="c"><h2>Food</h2>' +
    list('HAVE MORE', 'gtxt', (D.eat || []).map(function (t) { return '<div class="hpli good">' + esc(t) + '</div>'; })) +
    list(c.k === 'urticaria' ? 'KEEP SMALL, OR TEST ONE AT A TIME' : 'KEEP SMALL', 'warnt', (D.limit || []).map(function (a) { return '<div class="hpli small"><b>' + esc(a[0]) + '</b><span class="l">' + esc(a[2]) + '</span></div>'; })) +
    list('SKIP', 'badt', (D.avoid || []).map(function (a) { return '<div class="hpli avoid"><b>' + esc(a[0]) + '</b><span class="l">' + esc(a[2]) + '</span></div>'; }));
  /* what you actually ate this week that clashes */
  var wk = {}; for (var i = 0; i < 7; i++) dayItems(addDays(k, -i)).forEach(function (it) { var r = food(it.n); if (!r) return; var nm = fname(r), hit = (D.avoid || []).concat(D.limit || []).filter(function (a) { return a[1] && a[1].test(nm); })[0]; if (hit) { var n = it.n.replace(/\s*\(.*\)$/, ''); wk[n] = (wk[n] || 0) + 1; } });
  var wn = Object.keys(wk).sort(function (a, b) { return wk[b] - wk[a]; });
  if (wn.length) h += '<div class="hpweek"><b>From your diary this week</b><div class="l">' + wn.slice(0, 5).map(function (n) { return esc(n) + (wk[n] > 1 ? ' ×' + wk[n] : ''); }).join(' · ') + '</div></div>';
  h += '</section>';
  /* exercise */
  var dw = new Date().getDay();
  h += '<section class="c"><h2>Exercise</h2>' + (D.ex || []).map(function (id) { var x = HPX[id]; if (!x) return ''; var on = !x.days || x.days.indexOf(dw) >= 0, d = hpExDone(id, k); return '<div class="lev">' + orb(x.ic, 16) + '<div class="f1"><b>' + esc(x.n) + '</b><div class="l">' + esc(x.how) + (x.days ? ' ' + x.days.map(function (z) { return DOW[z]; }).join(', ') + '.' : ' Daily.') + '</div></div>' + (on ? (d.ok ? '<span class="tick on">✓</span>' : '<button class="hpgo" data-act="hpStart" data-id="' + id + '">Start</button>') : '<span class="l">Rest day</span>') + '</div>'; }).join('') + '</section>';
  if ((D.habits || []).length) h += '<section class="c"><h2>Daily habits</h2>' + D.habits.map(function (t) { return '<div class="mst"><span class="n">•</span><span>' + esc(t) + '</span></div>'; }).join('') + '</section>';
  /* Gemini, personal */
  h += '<section class="c"><div class="row sb"><h2>This week, for you</h2>' + orb('spark', 16) + '</div>' + (c.tips ? '<div class="p mt6">' + fmt(c.tips) + '</div><div class="l mt6">Written by Gemini ' + ago(c.tipsAt) + '</div>' : '<div class="l">Gemini reads your last 7 days of food, readings and check-ins, and says what to change.</div>') +
    '<button class="btn sec mt" data-act="hpTips" data-c="' + c.id + '"' + (c.tipsBusy ? ' disabled' : '') + '>' + (c.tipsBusy ? 'Reading your week…' : c.tips ? 'Read my week again' : 'Read my week') + '</button></section>';
  if ((D.doctor || []).length) h += '<section class="c doc"><b>See a doctor if</b>' + D.doctor.map(function (t) { return '<div class="l mt6">' + esc(t) + '</div>'; }).join('') + '</section>';
  h += '<button class="lnk" data-act="hpDel" data-c="' + c.id + '">Remove ' + esc(D.name.toLowerCase()) + ' from my plan</button>';
  return h;
};
TABOF.hpc = 'home';
HERO['My health plan'] = ['shield', '#E0245E']; HERO['Health coach'] = ['spark', '#7A4DFF'];

/* a walk logged from the plan ticks that exercise */
var _qwg = ACT.quickWalkGo;
ACT.quickWalkGo = function (el) { _qwg(el); if (HPT.after) { var H = hp(), k = today(), x = HPX[HPT.after], m = +el.getAttribute('data-m'); if (x && m >= x.min) { H.ticks[k] = H.ticks[k] || {}; H.ticks[k][HPT.after] = true; save(); } HPT.after = null; if (cur.name === 'hp') rerender(); } };

/* home tile */
function hpTile() {
  var C = hpConds();
  if (!C.length) return '<button class="gt w2 hptile" data-act="go" data-to="hp"><div class="h"><span>My health plan</span>' + orb('shield', 16) + '</div><b style="font-size:19px">Add your conditions</b><div class="s">BP, hives, diabetes, acidity… food, exercise and a coach for each</div></button>';
  var P = hpProgress(today());
  return '<button class="gt w2 hptile" data-act="go" data-to="hp"><div class="h"><span>My health plan</span>' + orb('shield', 16) + '</div><b style="font-size:19px">' + esc(C.map(function (c) { return c.name.replace(/\s*\(.*\)/, ''); }).join(' · ')) + '</b>' +
    (P.total ? '<div class="gprog" style="width:100%"><i style="width:' + (P.done / P.total * 100) + '%"></i></div><div class="s">' + (P.done === P.total ? 'Today\'s exercise done 🏆' : P.done + ' of ' + P.total + ' exercises done · tap for Can I eat this?') + '</div>' : '<div class="s">Tap for Can I eat this? and your check-in</div>') + '</button>';
}
