/* Yoga: pose library, your own poses and routines, guided player, session log, streak */
'use strict';
/* pose library: key: [name, also known as, category, mode 'time'|'reps', default (sec or rounds), both sides?, sec per round, how to do it, caution] */
var POSES = {
  neck: ['Neck rolls', 'Greeva sanchalan', 'Warm-up', 'time', 60, false, 0, 'Slowly drop the chin, roll the head to one shoulder, back to centre, then the other side.', ''],
  shoulder: ['Shoulder rotations', 'Skandha chakra', 'Warm-up', 'time', 60, false, 0, 'Fingertips on shoulders, draw big circles with the elbows, forward then back.', ''],
  wrist: ['Wrist and ankle rotations', 'Sukshma vyayam', 'Warm-up', 'time', 60, false, 0, 'Rotate wrists and ankles slowly, 10 times each way.', ''],
  surya: ['Surya Namaskar', 'Sun salutation', 'Sun salutation', 'reps', 6, false, 75, 'The 12 steps: prayer, arms up, forward bend, lunge, plank, eight-limb, cobra, mountain, lunge, forward bend, arms up, prayer. One round is both legs.', 'Go slow if you have back or BP trouble.'],
  chandra: ['Chandra Namaskar', 'Moon salutation', 'Sun salutation', 'reps', 4, false, 80, 'A slower, cooling flow of the salutation with a side stretch and low lunge.', ''],
  tadasana: ['Tadasana', 'Mountain pose', 'Standing', 'time', 60, false, 0, 'Stand tall, feet together, arms by your side. Breathe slowly and feel your weight even on both feet.', ''],
  tiryaka: ['Tiryaka Tadasana', 'Swaying palm tree', 'Standing', 'time', 90, false, 0, 'Arms up, fingers locked. Breathe out and bend to one side, breathe in to come up, then the other side.', ''],
  katichakra: ['Kati Chakrasana', 'Standing waist twist', 'Standing', 'time', 60, false, 0, 'Feet apart, swing the arms and twist the waist left and right, slowly.', ''],
  trikona: ['Trikonasana', 'Triangle', 'Standing', 'time', 30, true, 0, 'Feet wide, front foot out. Reach the front hand down to the shin, other arm up, look up.', ''],
  virabhadra: ['Virabhadrasana II', 'Warrior II', 'Standing', 'time', 30, true, 0, 'Feet wide, bend the front knee over the ankle, arms out at shoulder height, look over the front hand.', ''],
  utkata: ['Utkatasana', 'Chair pose', 'Standing', 'time', 30, false, 0, 'Feet together, bend the knees as if sitting on a chair, arms up beside the ears.', ''],
  padahasta: ['Padahastasana', 'Standing forward bend', 'Standing', 'time', 45, false, 0, 'Breathe out and fold from the hips, hands towards the feet. Knees can bend.', 'Skip with slipped disc or high BP.'],
  ardhachakra: ['Ardha Chakrasana', 'Standing backward bend', 'Standing', 'time', 30, false, 0, 'Hands on the lower back, breathe in and gently bend back, looking up.', ''],
  vriksha: ['Vrikshasana', 'Tree', 'Balance', 'time', 30, true, 0, 'Stand on one leg, sole of the other foot on the inner thigh, palms together at the chest or overhead.', ''],
  garuda: ['Garudasana', 'Eagle', 'Balance', 'time', 20, true, 0, 'Wrap one leg over the other and one arm under the other, sink slightly.', ''],
  vajra: ['Vajrasana', 'Thunderbolt', 'Seated', 'time', 180, false, 0, 'Kneel and sit back on your heels, back straight, hands on the knees. Good right after a meal.', 'Avoid with knee injury.'],
  sukhasana: ['Sukhasana', 'Easy sitting pose', 'Seated', 'time', 60, false, 0, 'Sit cross-legged, spine tall, hands on knees.', ''],
  baddha: ['Baddha Konasana', 'Butterfly', 'Seated', 'time', 60, false, 0, 'Soles of the feet together, hold the feet and gently flap the knees.', ''],
  paschim: ['Paschimottanasana', 'Seated forward bend', 'Seated', 'time', 45, false, 0, 'Legs straight, breathe in arms up, breathe out fold forward to the shins or feet.', 'Skip with slipped disc.'],
  janu: ['Janu Sirsasana', 'Head-to-knee', 'Seated', 'time', 30, true, 0, 'One leg straight, other foot on the inner thigh. Fold over the straight leg.', ''],
  matsyendra: ['Ardha Matsyendrasana', 'Seated twist', 'Seated', 'time', 30, true, 0, 'Cross one foot over the other knee and twist towards the bent knee, spine tall.', ''],
  ustra: ['Ustrasana', 'Camel', 'Seated', 'time', 20, false, 0, 'Kneel, hands on the lower back or heels, lift the chest and bend back.', 'Skip with neck or back pain.'],
  manduka: ['Mandukasana', 'Frog pose', 'Seated', 'reps', 3, false, 25, 'In Vajrasana, fists pressed beside the navel, breathe out and bend forward. Hold 15 seconds each round.', ''],
  gomukha: ['Gomukhasana', 'Cow face', 'Seated', 'time', 30, true, 0, 'One knee stacked over the other, one hand from above and one from below the back to clasp.', ''],
  marjari: ['Marjariasana', 'Cat and cow', 'On all fours', 'time', 90, false, 0, 'On hands and knees. Breathe in, look up and drop the belly. Breathe out, round the back and tuck the chin.', ''],
  balasana: ['Balasana', 'Child pose', 'On all fours', 'time', 60, false, 0, 'Sit back on your heels, forehead to the floor, arms forward. Let the back relax.', ''],
  adho: ['Adho Mukha Svanasana', 'Downward dog', 'On all fours', 'time', 30, false, 0, 'Hands and feet on the floor, hips high, body like an upside-down V.', ''],
  plank: ['Kumbhakasana', 'Plank', 'On all fours', 'time', 30, false, 0, 'Straight line from head to heels on hands and toes, belly tight.', ''],
  bhujanga: ['Bhujangasana', 'Cobra', 'On stomach', 'reps', 3, false, 30, 'Lie on your stomach, palms under shoulders. Breathe in and lift the chest, elbows soft. Hold 20 seconds each round.', ''],
  shalabha: ['Shalabhasana', 'Locust', 'On stomach', 'reps', 3, false, 25, 'Lie on your stomach, arms under the thighs, lift both legs. Hold 10–15 seconds each round.', ''],
  dhanura: ['Dhanurasana', 'Bow', 'On stomach', 'reps', 2, false, 30, 'Hold the ankles, breathe in and lift chest and thighs. Hold 15 seconds each round.', 'Skip with back pain or high BP.'],
  makara: ['Makarasana', 'Crocodile (rest)', 'On stomach', 'time', 60, false, 0, 'Lie on your stomach, head resting on folded arms, breathe into the belly.', ''],
  setu: ['Setu Bandhasana', 'Bridge', 'On back', 'reps', 3, false, 30, 'On your back, knees bent. Breathe in and lift the hips. Hold 20 seconds each round.', ''],
  pawan: ['Pawanmuktasana', 'Knees to chest', 'On back', 'time', 60, false, 0, 'Hug both knees to the chest and rock gently side to side.', ''],
  uttanapada: ['Uttanpadasana', 'Raised legs', 'On back', 'reps', 3, false, 25, 'On your back, lift both straight legs to 30–45 degrees and hold 10–15 seconds.', 'Skip with lower back pain.'],
  supta: ['Supta Matsyendrasana', 'Lying twist', 'On back', 'time', 30, true, 0, 'On your back, drop both bent knees to one side, look the other way.', ''],
  supta_baddha: ['Supta Baddha Konasana', 'Reclined butterfly', 'On back', 'time', 90, false, 0, 'On your back, soles together, knees open, hands on the belly.', ''],
  viparita: ['Viparita Karani', 'Legs up the wall', 'On back', 'time', 180, false, 0, 'Lie down with legs up against a wall. Close your eyes and breathe slowly.', ''],
  sarvanga: ['Sarvangasana', 'Shoulder stand', 'On back', 'time', 30, false, 0, 'Lift legs and hips up, hands supporting the back, body straight.', 'Skip with neck problems or high BP.'],
  shava: ['Shavasana', 'Corpse pose (relax)', 'Relax', 'time', 180, false, 0, 'Lie flat, arms away from the body, palms up. Relax each part of the body from toes to head.', ''],
  yoganidra: ['Yoga Nidra', 'Guided deep rest', 'Relax', 'time', 600, false, 0, 'Lie in Shavasana and move your attention slowly through each body part.', ''],
  anulom: ['Anulom Vilom', 'Alternate nostril breathing', 'Pranayama', 'time', 300, false, 0, 'Close the right nostril, breathe in left. Close left, breathe out right. Breathe in right, out left. Slow and even.', ''],
  kapal: ['Kapalbhati', 'Skull-shining breath', 'Pranayama', 'reps', 3, false, 45, 'Short, sharp breaths out through the nose by pulling the belly in, 30 per round. Breathing in happens by itself.', 'Skip with high BP, heart trouble or pregnancy.'],
  bhastrika: ['Bhastrika', 'Bellows breath', 'Pranayama', 'reps', 3, false, 45, 'Deep, forceful breaths in and out through the nose, 20 per round.', 'Skip with high BP.'],
  bhramari: ['Bhramari', 'Humming bee breath', 'Pranayama', 'reps', 7, false, 15, 'Close your ears with the thumbs, eyes closed. Breathe in, and hum softly like a bee as you breathe out.', ''],
  ujjayi: ['Ujjayi', 'Ocean breath', 'Pranayama', 'time', 180, false, 0, 'Breathe slowly through the nose with the throat slightly closed, making a soft ocean sound.', ''],
  sheetali: ['Sheetali', 'Cooling breath', 'Pranayama', 'reps', 9, false, 10, 'Roll the tongue, breathe in through it, close the mouth and breathe out through the nose.', ''],
  udgeeth: ['Udgeeth', 'Om chanting', 'Pranayama', 'reps', 5, false, 20, 'Breathe in deep, chant a long Om on the out-breath.', ''],
  dhyana: ['Dhyana', 'Meditation', 'Relax', 'time', 300, false, 0, 'Sit still, eyes closed, watch the breath. When the mind wanders, come back to the breath.', ''],
  palming: ['Palming', 'Eye rest', 'Relax', 'time', 60, false, 0, 'Rub your palms warm and cup them over closed eyes. Breathe slowly.', ''],
  chair_twist: ['Seated chair twist', 'Desk twist', 'Desk', 'time', 30, true, 0, 'Sit tall, hold the back of the chair and twist.', ''],
  desk_stretch: ['Standing stretch', 'Tadasana with arms up', 'Desk', 'time', 45, false, 0, 'Stand, lock fingers, push palms to the ceiling and rise on your toes.', '']
};
var PCATS = ['Warm-up', 'Sun salutation', 'Standing', 'Balance', 'Seated', 'On all fours', 'On stomach', 'On back', 'Pranayama', 'Relax', 'Desk', 'My poses'];
function pose(k) {
  var c = (DB.myPoses || []).filter(function (p) { return p.k === k; })[0];
  if (c) return { k: k, name: c.name, aka: c.aka || '', cat: 'My poses', mode: c.mode, def: c.def, sides: !!c.sides, repSec: c.repSec || 30, cue: c.cue || '', caution: '' };
  var p = POSES[k]; if (!p) return { k: k, name: k, aka: '', cat: '', mode: 'time', def: 60, sides: false, repSec: 30, cue: '', caution: '' };
  return { k: k, name: p[0], aka: p[1], cat: p[2], mode: p[3], def: p[4], sides: p[5], repSec: p[6] || 30, cue: p[7], caution: p[8] };
}
function step(k, v, sides) { var p = pose(k); return { k: k, mode: p.mode, v: v != null ? v : p.def, sides: sides != null ? sides : p.sides }; }
var FLOWS = [
  { id: 'b_calm', name: 'Calm evening flow', for: 'After a short night or a stressful day. Ends with breathing that helps sleep and BP.', rest: 5, steps: [step('tadasana'), step('tiryaka'), step('marjari'), step('balasana', 90), step('bhujanga'), step('supta_baddha'), step('viparita'), step('anulom', 240), step('bhramari')] },
  { id: 'b_morning', name: 'Morning energiser', for: 'For a good-energy morning. Wakes up the whole body.', rest: 5, steps: [step('neck'), step('shoulder'), step('surya', 6), step('trikona'), step('vriksha'), step('setu'), step('kapal'), step('anulom', 180)] },
  { id: 'b_sugar', name: 'Sugar and digestion', for: 'Helps after meals and when fasting sugar is above 100.', rest: 5, steps: [step('vajra'), step('manduka'), step('matsyendra'), step('pawan'), step('paschim'), step('dhanura'), step('kapal')] },
  { id: 'b_bp', name: 'BP calm-down', for: 'Slow and gentle. For days when BP reads high.', rest: 10, steps: [step('sukhasana', 120), step('balasana', 90), step('setu', 2), step('viparita'), step('shava'), step('anulom', 180)] },
  { id: 'b_desk', name: 'Office desk break', for: 'At your desk, no mat needed.', rest: 0, steps: [step('neck'), step('shoulder'), step('chair_twist'), step('desk_stretch'), step('palming')] }
];
function routines() { return (DB.routines || []).concat(FLOWS); }
function routineById(id) { return routines().filter(function (r) { return r.id === id; })[0] || null; }
function stepSec(s) { var p = pose(s.k); return (s.mode === 'reps' ? s.v * p.repSec : s.v) * (s.sides ? 2 : 1); }
function routineSec(r) { return r.steps.reduce(function (a, s) { return a + stepSec(s); }, 0) + Math.max(0, r.steps.length - 1) * (r.rest || 0); }
function stepLabel(s) { var p = pose(s.k); return (s.mode === 'reps' ? s.v + (s.v === 1 ? ' round' : ' rounds') : dur(s.v / 60).replace(' 00 m', '').replace(/^0 h /, '')) + (s.sides ? ' each side' : ''); }
function secTxt(sec) { return sec < 60 ? sec + ' s' : sec % 60 ? Math.floor(sec / 60) + ' min ' + sec % 60 + ' s' : sec / 60 + ' min'; }
function yogaGoal() { return +DB.settings.yogaGoal || 20; }
function yogaMin(k) { var d = dayIf(k); return d ? Math.round(d.yoga.filter(function (y) { return !y.kind || y.kind === 'yoga'; }).reduce(function (a, y) { return a + y.min; }, 0)) : 0; }
function moveMin(k) { var d = dayIf(k); return d ? Math.round(d.yoga.reduce(function (a, y) { return a + y.min; }, 0)) : 0; }

function pickFlow() {
  var k = today(), en = energyFor(k), sl = sleepFor(k), bp = merged('bp')[0], su = merged('sugar').filter(function (x) { return x.type === 'fasting'; })[0], hr = new Date().getHours();
  var lastMeal = dayItems(k).reduce(function (a, i) { return Math.max(a, i.t); }, 0);
  if (bp && Date.now() - bp.t < 2 * 86400000 && (bp.sys >= 135 || bp.dia >= 88)) return ['b_bp', 'BP read ' + bp.sys + '/' + bp.dia];
  if (Date.now() - lastMeal < 90 * 60000 || (su && Date.now() - su.t < 2 * 86400000 && su.val >= 100)) return ['b_sugar', su && su.val >= 100 ? 'fasting sugar ' + su.val : 'you just ate'];
  if ((en != null && en < 65) || (sl && sl.score < 65) || hr >= 18) return ['b_calm', sl ? 'sleep score ' + sl.score + (en != null ? ', energy ' + en : '') : 'evening'];
  if (hr >= 10 && hr < 18 && new Date().getDay() % 6) return ['b_desk', 'work hours'];
  return ['b_morning', en != null ? 'energy ' + en : 'fresh start'];
}

/* ---------- main yoga screen ---------- */
ROUTES.yoga = function () {
  var k = today(), mine = DB.routines || [], h = head('Yoga', yogaMin(k) + ' of ' + yogaGoal() + ' min today');
  var p = pickFlow(), fav = mine.filter(function (r) { return r.fav; })[0], f = fav || routineById(p[0]);
  h += '<section class="c dark"><div class="kick">' + (fav ? 'YOUR DAILY ROUTINE' : 'PICKED FOR NOW · ' + esc(p[1].toUpperCase())) + '</div><h2 class="w">' + esc(f.name) + ' · ' + Math.round(routineSec(f) / 60) + ' min</h2>' + (f.for ? '<p class="p dim">' + esc(f.for) + '</p>' : '<p class="p dim">' + f.steps.length + ' poses</p>') +
    '<div class="g2 mt"><button class="btn mintb" data-act="startRoutine" data-id="' + f.id + '">' + icon('play', 18) + 'Start</button><button class="btn sec onDark" data-act="go" data-to="routine/' + f.id + '">' + (f.id.indexOf('b_') === 0 ? 'Customise' : 'Edit') + '</button></div></section>';
  var bt = (DB.days[k] && DB.days[k].yoga || []).filter(function (x) { return x.prana; }).reduce(function (a, x) { return a + x.sec; }, 0);
  h += '<section class="c row g14" data-act="go" data-to="breaths"><span class="mic">' + icon('drop', 20) + '</span><div class="f1"><b class="m16">Pranayama</b><div class="l">Anulom Vilom, Bhramari, Kapalbhati and 9 more. Set inhale : hold : exhale and rounds.' + (bt ? ' Today ' + mmss(bt) + '.' : '') + '</div></div>' + icon('chev', 18) + '</section>';
  h += '<div class="row sb"><h3 class="sech">My routines</h3><button class="lnk" data-act="newRoutine">+ Create routine</button></div>';
  if (mine.length) h += mine.map(function (r) { return routineRow(r); }).join('');
  else h += '<div class="empty-s">Make your own routine: pick poses, set time or rounds for each, and the order. Or open any routine below and tap Customise.</div>';
  h += '<h3 class="sech">Ready-made</h3>' + FLOWS.map(function (r) { return routineRow(r); }).join('');
  h += '<div class="g2"><button class="btn sec" data-act="logYoga">' + icon('plus', 18) + 'Log a session</button><button class="btn sec" data-act="go" data-to="poses">Pose library</button></div>';
  /* month calendar */
  var now = new Date(), y = now.getFullYear(), mo = now.getMonth(), first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), cells = '', sessions = 0, streak = 0, total = 0;
  for (var i = 0; i < (first.getDay() + 6) % 7; i++) cells += '<span></span>';
  for (var dd = 1; dd <= n; dd++) {
    var dk = dkey(new Date(y, mo, dd)), m = yogaMin(dk), cls = m >= yogaGoal() ? 'full' : m > 0 ? 'part' : '';
    if (m) { sessions += dayIf(dk).yoga.filter(function (x) { return !x.kind || x.kind === 'yoga'; }).length; total += m; }
    cells += '<span class="dt ' + cls + (dk === k ? ' today' : '') + '">' + dd + '</span>';
  }
  for (i = 0; i < 400; i++) { if (yogaMin(addDays(k, -i)) > 0) streak++; else if (i > 0) break; }
  h += '<section class="c"><div class="row sb"><h2>' + MON[mo] + '</h2><span class="sm gtxt">' + (streak ? streak + '-day streak · ' : '') + sessions + ' sessions · ' + total + ' min</span></div><div class="cal"><span class="l">M</span><span class="l">T</span><span class="l">W</span><span class="l">T</span><span class="l">F</span><span class="l">S</span><span class="l">S</span>' + cells + '</div><div class="row sb mt"><span class="l">Dark = ' + yogaGoal() + ' min or more · light = less</span><button class="lnk" data-act="yogaGoalSet">Goal: ' + yogaGoal() + ' min</button></div></section>';
  /* history */
  var hist = []; for (i = 0; i < 14; i++) { dk = addDays(k, -i); var dy = dayIf(dk); if (dy) dy.yoga.forEach(function (x, j) { hist.push([dk, j, x]); }); }
  if (hist.length) h += '<section class="c"><h2>Recent sessions</h2>' + hist.slice(0, 10).map(function (x) { var s = x[2]; return '<button class="it" data-act="editSession" data-k="' + x[0] + '" data-i="' + x[1] + '"><span>' + esc(s.name || (s.flow === 'own' ? 'Yoga' : (routineById(s.flow) || {}).name || 'Yoga')) + '<small>' + niceDate(x[0]) + ', ' + hm(s.t) + (s.poses && s.poses.length ? ' · ' + s.poses.length + ' poses' : '') + (s.feel ? ' · felt ' + s.feel : '') + '</small></span><b>' + s.min + ' min</b></button>'; }).join('') + '</section>';
  var rh = DB.health && DB.health.restingHr;
  if (rh) { var yes = [], no = []; Object.keys(rh).forEach(function (d) { (yogaMin(addDays(d, -1)) > 0 ? yes : no).push(rh[d]); }); if (yes.length >= 3 && no.length >= 3) { var a = function (v) { return v.reduce(function (s, x) { return s + x; }, 0) / v.length; }, diff = Math.round(a(yes) - a(no)); h += '<section class="c row sb"><div><div class="l">Resting heart rate the day after yoga</div><b class="m18">' + (diff <= 0 ? '−' : '+') + Math.abs(diff) + ' bpm</b></div><div class="sm gtxt">From your watch</div></section>'; } }
  return h;
};
function routineRow(r) {
  return '<div class="rrow"><button class="rmain" data-act="go" data-to="routine/' + r.id + '"><span>' + (r.fav ? '★ ' : '') + esc(r.name) + '<small>' + Math.round(routineSec(r) / 60) + ' min · ' + r.steps.length + ' poses' + (r.for ? ' · ' + esc(r.for) : '') + '</small></span></button><button class="ib g" data-act="startRoutine" data-id="' + r.id + '" aria-label="Start ' + esc(r.name) + '">' + icon('play', 20) + '</button></div>';
}
ACT.yogaGoalSet = function () { sheet('<h2>Daily yoga goal</h2><div class="chips">' + [10, 15, 20, 30, 45, 60].map(function (m) { return '<button class="chip' + (yogaGoal() === m ? ' dk' : '') + '" data-act="yogaGoalPick" data-m="' + m + '">' + m + ' min</button>'; }).join('') + '</div>'); };
ACT.yogaGoalPick = function (el) { DB.settings.yogaGoal = +el.getAttribute('data-m'); save(); sheet(null); rerender(); };

/* ---------- routine editor ---------- */
var ED = null;
ACT.newRoutine = function () { ED = { id: 'r_' + uid(), name: 'My routine', rest: 5, steps: [], fav: false, isNew: true }; go('routine/' + ED.id); };
ROUTES.routine = function (id) {
  if (!ED || ED.id !== id) {
    var r = routineById(id); if (!r) return head('Routine') + '<div class="empty-s">Not found.</div>';
    ED = JSON.parse(JSON.stringify(r)); ED.builtIn = id.indexOf('b_') === 0;
  }
  var r = ED, h = head(r.builtIn ? r.name : 'Edit routine', r.builtIn ? 'Ready-made · changes save as your own copy' : Math.round(routineSec(r) / 60) + ' min · ' + r.steps.length + ' poses');
  h += '<section class="c"><label class="fld">Routine name<input id="rt_n" value="' + esc(r.name) + '" data-inp="rtName"></label>' +
    '<div class="row sb mt"><span class="sm">Rest between poses</span><div class="chips nm">' + [0, 5, 10, 15, 30].map(function (s) { return '<button class="chip' + ((r.rest || 0) === s ? ' dk' : '') + '" data-act="rtRest" data-s="' + s + '">' + (s ? s + ' s' : 'None') + '</button>'; }).join('') + '</div></div>' +
    tog('My daily routine (show it first)', 'rtFav', r.fav) + '</section>';
  h += '<section class="c"><div class="row sb"><h2>Poses</h2><span class="sm gtxt">' + secTxt(routineSec(r)) + ' total</span></div>';
  if (!r.steps.length) h += '<div class="l mt">No poses yet. Tap “Add pose”.</div>';
  r.steps.forEach(function (s, i) {
    var p = pose(s.k), unit = s.mode === 'reps' ? (s.v === 1 ? 'round' : 'rounds') : '';
    h += '<div class="stp"><div class="row sb"><div class="f1"><b>' + (i + 1) + '. ' + esc(p.name) + '</b><div class="l">' + esc(p.aka) + ' · ' + secTxt(stepSec(s)) + '</div></div>' +
      '<div class="row g6"><button class="ib sm" data-act="stMove" data-i="' + i + '" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button class="ib sm" data-act="stMove" data-i="' + i + '" data-d="1" aria-label="Move down"' + (i < r.steps.length - 1 ? '' : ' disabled') + '>↓</button><button class="ib sm" data-act="stDel" data-i="' + i + '" aria-label="Remove">' + icon('x', 18) + '</button></div></div>' +
      '<div class="row sb mt6"><div class="seg"><button class="' + (s.mode === 'time' ? 'on' : '') + '" data-act="stMode" data-i="' + i + '" data-m="time">Time</button><button class="' + (s.mode === 'reps' ? 'on' : '') + '" data-act="stMode" data-i="' + i + '" data-m="reps">Rounds</button></div>' +
      '<div class="row g6"><button class="exb" data-act="stVal" data-i="' + i + '" data-d="-1" aria-label="Less">−</button><b class="stv">' + (s.mode === 'reps' ? s.v + ' ' + unit : secTxt(s.v)) + '</b><button class="exb" data-act="stVal" data-i="' + i + '" data-d="1" aria-label="More">+</button></div></div>' +
      '<button class="tog sm" data-act="stSides" data-i="' + i + '" role="switch" aria-checked="' + !!s.sides + '"><span>Both sides (right, then left)</span><i class="' + (s.sides ? 'on' : '') + '"></i></button></div>';
  });
  h += '<button class="btn sec mt" data-act="addPose">' + icon('plus', 18) + 'Add pose</button></section>';
  h += '<div class="g2"><button class="btn" data-act="rtSave">Save</button><button class="btn sec" data-act="rtStart">' + icon('play', 18) + 'Save & start</button></div>';
  if (!r.builtIn && !r.isNew) h += '<button class="btn sec" data-act="rtDel">' + icon('trash', 18) + 'Delete routine</button>';
  return h;
};
INP.rtName = function (el) { ED.name = el.value; };
ACT.rtRest = function (el) { ED.rest = +el.getAttribute('data-s'); rerender(); };
TOGS.rtFav = function () { ED.fav = !ED.fav; };
ACT.stMove = function (el) { var i = +el.getAttribute('data-i'), j = i + +el.getAttribute('data-d'); if (j < 0 || j >= ED.steps.length) return; var t = ED.steps[i]; ED.steps[i] = ED.steps[j]; ED.steps[j] = t; rerender(); };
ACT.stDel = function (el) { ED.steps.splice(+el.getAttribute('data-i'), 1); rerender(); };
ACT.stMode = function (el) { var s = ED.steps[+el.getAttribute('data-i')], m = el.getAttribute('data-m'); if (s.mode === m) return; var p = pose(s.k); s.mode = m; s.v = m === 'reps' ? (p.mode === 'reps' ? p.def : 3) : (p.mode === 'time' ? p.def : 60); rerender(); };
ACT.stVal = function (el) {
  var s = ED.steps[+el.getAttribute('data-i')], d = +el.getAttribute('data-d');
  if (s.mode === 'reps') s.v = clamp(s.v + d, 1, 108);
  else { var stepS = s.v < 60 ? 5 : s.v < 300 ? 15 : 60; if (d < 0 && s.v <= 60) stepS = 5; s.v = clamp(s.v + d * stepS, 5, 3600); }
  rerender();
};
ACT.stSides = function (el) { var s = ED.steps[+el.getAttribute('data-i')]; s.sides = !s.sides; rerender(); };
function saveRoutine() {
  var n = (document.getElementById('rt_n') || {}).value; if (n != null) ED.name = n.trim() || 'My routine';
  if (!ED.steps.length) { toast('Add at least one pose'); return null; }
  DB.routines = DB.routines || [];
  if (ED.builtIn) { ED = Object.assign({}, ED, { id: 'r_' + uid(), name: ED.name === routineById(ED.id).name ? ED.name + ' (mine)' : ED.name, builtIn: false, for: '' }); }
  delete ED.isNew;
  if (ED.fav) DB.routines.forEach(function (r) { r.fav = false; });
  var copy = JSON.parse(JSON.stringify(ED)); delete copy.builtIn;
  var i = DB.routines.map(function (r) { return r.id; }).indexOf(copy.id);
  if (i >= 0) DB.routines[i] = copy; else DB.routines.unshift(copy);
  save(); return copy;
}
ACT.rtSave = function () { var r = saveRoutine(); if (!r) return; toast('Saved ' + r.name); ED = null; go('yoga'); };
ACT.rtStart = function () { var r = saveRoutine(); if (!r) return; ED = null; PL = null; go('flow/' + r.id); };
ACT.rtDel = function () { DB.routines = (DB.routines || []).filter(function (r) { return r.id !== ED.id; }); save(); ED = null; toast('Routine deleted'); go('yoga'); };
ACT.startRoutine = function (el) { PL = null; go('flow/' + el.getAttribute('data-id')); };

/* add pose sheet: search library + my poses */
var PQ = '';
ACT.addPose = function () { PQ = ''; poseSheet(); };
function poseList(pick) {
  var q = PQ.trim().toLowerCase(), keys = Object.keys(POSES).concat((DB.myPoses || []).map(function (p) { return p.k; })), h = '';
  PCATS.forEach(function (c) {
    var ks = keys.filter(function (k) { var p = pose(k); return p.cat === c && (!q || (p.name + ' ' + p.aka).toLowerCase().indexOf(q) >= 0); });
    if (!ks.length) return;
    h += '<h3 class="sech">' + c + '</h3>' + ks.map(function (k) { var p = pose(k); return '<button class="res" data-act="' + pick + '" data-k="' + k + '"><span>' + esc(p.name) + '<small>' + (p.aka ? esc(p.aka) + ' · ' : '') + (p.mode === 'reps' ? p.def + ' rounds' : secTxt(p.def)) + (p.sides ? ' each side' : '') + '</small></span>' + icon(pick === 'pickPose' ? 'plus' : 'chev', 18) + '</button>'; }).join('');
  });
  return h || '<div class="empty-s">No pose called “' + esc(PQ) + '”. Create it as your own.</div>';
}
function poseSheet() {
  sheet('<h2>Add a pose</h2><label class="search on mt">' + icon('search', 18) + '<input id="pq" data-inp="pq" value="' + esc(PQ) + '" placeholder="Search poses or pranayama" autocomplete="off"></label>' +
    '<button class="btn sec mt" data-act="newPose">' + icon('plus', 18) + 'Create my own pose or exercise</button><div id="pres">' + poseList('pickPose') + '</div>');
}
INP.pq = function (el) { PQ = el.value; document.getElementById('pres').innerHTML = poseList('pickPose'); };
ACT.pickPose = function (el) { ED.steps.push(step(el.getAttribute('data-k'))); sheet(null); rerender(); toast('Added ' + pose(el.getAttribute('data-k')).name); };

/* own pose / exercise */
var NP = null;
ACT.newPose = function (el) { NP = { k: 'c_' + uid(), name: PQ, aka: '', mode: 'time', def: 60, sides: false, repSec: 30, cue: '' }; poseForm(); };
ACT.editMyPose = function (el) { var k = el.getAttribute('data-k'); NP = JSON.parse(JSON.stringify((DB.myPoses || []).filter(function (p) { return p.k === k; })[0])); poseForm(); };
function poseForm() {
  sheet('<h2>' + (DB.myPoses && DB.myPoses.some(function (p) { return p.k === NP.k; }) ? 'Edit my pose' : 'My own pose or exercise') + '</h2>' +
    '<label class="fld">Name<input id="np_n" value="' + esc(NP.name) + '" placeholder="e.g. Skandhasana, squats, Tibetan rites"></label>' +
    '<label class="fld">Also known as (optional)<input id="np_a" value="' + esc(NP.aka) + '"></label>' +
    '<div class="l mt">Count it by</div><div class="seg wide mt6"><button class="' + (NP.mode === 'time' ? 'on' : '') + '" data-act="npMode" data-m="time">Time</button><button class="' + (NP.mode === 'reps' ? 'on' : '') + '" data-act="npMode" data-m="reps">Rounds / reps</button></div>' +
    '<div class="g2"><label class="fld">' + (NP.mode === 'reps' ? 'Rounds' : 'Seconds') + '<input id="np_d" type="number" inputmode="numeric" value="' + NP.def + '"></label>' + (NP.mode === 'reps' ? '<label class="fld">Seconds per round<input id="np_r" type="number" inputmode="numeric" value="' + NP.repSec + '"></label>' : '<span></span>') + '</div>' +
    '<button class="tog" data-act="npSides" role="switch" aria-checked="' + NP.sides + '"><span>Done on both sides</span><i class="' + (NP.sides ? 'on' : '') + '"></i></button>' +
    '<label class="fld">How to do it (read out by the voice guide)<textarea id="np_c" rows="3">' + esc(NP.cue) + '</textarea></label>' +
    '<button class="btn mt" data-act="npSave">Save</button>' + (DB.myPoses && DB.myPoses.some(function (p) { return p.k === NP.k; }) ? '<button class="btn sec mt" data-act="npDel">' + icon('trash', 18) + 'Delete this pose</button>' : ''));
}
function npRead() { var g = function (id) { var e = document.getElementById(id); return e ? e.value : null; }; NP.name = (g('np_n') || '').trim(); NP.aka = (g('np_a') || '').trim(); NP.def = +g('np_d') || NP.def; if (g('np_r') != null) NP.repSec = +g('np_r') || 30; NP.cue = (g('np_c') || '').trim(); }
ACT.npMode = function (el) { npRead(); var m = el.getAttribute('data-m'); if (m !== NP.mode) { NP.mode = m; NP.def = m === 'reps' ? 10 : 60; } poseForm(); };
ACT.npSides = function () { npRead(); NP.sides = !NP.sides; poseForm(); };
ACT.npSave = function () {
  npRead(); if (!NP.name) return toast('Give it a name');
  DB.myPoses = (DB.myPoses || []).filter(function (p) { return p.k !== NP.k; }); DB.myPoses.push(NP); save();
  if (ED && cur.name === 'routine') { if (!ED.steps.some(function (s) { return s.k === NP.k; })) ED.steps.push(step(NP.k)); sheet(null); rerender(); toast('Saved and added ' + NP.name); }
  else { sheet(null); rerender(); toast('Saved ' + NP.name); }
};
ACT.npDel = function () { DB.myPoses = (DB.myPoses || []).filter(function (p) { return p.k !== NP.k; }); save(); sheet(null); rerender(); toast('Deleted'); };

/* pose library screen */
ROUTES.poses = function () {
  var h = head('Pose library', Object.keys(POSES).length + ' poses' + ((DB.myPoses || []).length ? ' + ' + DB.myPoses.length + ' of yours' : ''));
  h += '<label class="search on">' + icon('search', 18) + '<input id="pq2" data-inp="pq2" value="' + esc(PQ) + '" placeholder="Search poses or pranayama" autocomplete="off"></label>';
  h += '<button class="btn sec" data-act="newPose">' + icon('plus', 18) + 'Create my own pose or exercise</button><div id="pres2">' + poseList('poseInfo') + '</div>';
  return h;
};
INP.pq2 = function (el) { PQ = el.value; document.getElementById('pres2').innerHTML = poseList('poseInfo'); };
ACT.poseInfo = function (el) {
  var k = el.getAttribute('data-k'), p = pose(k), mine = k.indexOf('c_') === 0;
  sheet('<h2>' + esc(p.name) + '</h2><div class="l">' + (p.aka ? esc(p.aka) + ' · ' : '') + esc(p.cat) + ' · ' + (p.mode === 'reps' ? p.def + ' rounds' : secTxt(p.def)) + (p.sides ? ' each side' : '') + '</div>' + (p.cue ? '<p class="p">' + esc(p.cue) + '</p>' : '') + (p.caution ? '<div class="note warn mt">' + esc(p.caution) + '</div>' : '') +
    (mine ? '<button class="btn sec mt" data-act="editMyPose" data-k="' + k + '">' + icon('edit', 18) + 'Edit</button>' : '') + '<button class="btn mt" data-act="closeSheet">OK</button>');
};

/* ---------- log a session (yoga or any exercise) ---------- */
var LG = null;
var KINDS = [['yoga', 'Yoga'], ['walk', 'Walk'], ['gym', 'Gym / strength'], ['cycle', 'Cycling'], ['swim', 'Swimming'], ['sport', 'Sport'], ['other', 'Other']];
ACT.logYoga = function () { LG = { kind: 'yoga', rid: (routines()[0] || {}).id || '', min: 20, poses: {}, feel: '', note: '', name: '' }; logSheet(); };
function logSheet() {
  var r = LG.kind === 'yoga' && LG.rid ? routineById(LG.rid) : null;
  var h = '<h2>Log a session</h2><div class="chips">' + KINDS.map(function (k) { return '<button class="chip' + (LG.kind === k[0] ? ' dk' : '') + '" data-act="lgKind" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>';
  if (LG.kind === 'yoga') {
    h += '<label class="fld">Routine<select data-chg="lgRoutine"><option value="">Free session</option>' + routines().map(function (x) { return '<option value="' + x.id + '"' + (x.id === LG.rid ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>';
    if (r) h += '<div class="l mt">Tick what you did</div>' + r.steps.map(function (s, i) { var on = LG.poses[i] !== false; return '<button class="todo" data-act="lgPose" data-i="' + i + '"><span class="bx' + (on ? ' on' : '') + '">' + (on ? icon('check', 16) : '') + '</span><span>' + esc(pose(s.k).name) + ' <span class="l">· ' + stepLabel(s) + '</span></span></button>'; }).join('');
  } else h += '<label class="fld">What did you do?<input id="lg_n" value="' + esc(LG.name) + '" placeholder="' + (LG.kind === 'gym' ? 'e.g. weights, legs day' : LG.kind === 'walk' ? 'e.g. evening walk' : 'Name') + '"></label>';
  h += '<label class="fld">Minutes<input id="lg_m" type="number" inputmode="numeric" value="' + (r && !LG.minTouched ? Math.round(routineSec(r) / 60) : LG.min) + '" data-inp="lgMin"></label>';
  h += '<div class="l mt">How do you feel after?</div><div class="chips">' + ['Energised', 'Relaxed', 'Same', 'Tired', 'Some pain'].map(function (f) { return '<button class="chip' + (LG.feel === f ? ' on' : '') + '" data-act="lgFeel">' + f + '</button>'; }).join('') + '</div>';
  h += '<label class="fld">Note (optional)<input id="lg_note" value="' + esc(LG.note) + '"></label><button class="btn mt" data-act="lgSave">Save</button>';
  sheet(h);
}
function lgRead() { var m = document.getElementById('lg_m'), n = document.getElementById('lg_n'), no = document.getElementById('lg_note'); if (m) LG.min = +m.value || LG.min; if (n) LG.name = n.value; if (no) LG.note = no.value; }
ACT.lgKind = function (el) { lgRead(); LG.kind = el.getAttribute('data-k'); logSheet(); };
CHG.lgRoutine = function (el) { lgRead(); LG.rid = el.value; LG.poses = {}; LG.minTouched = false; logSheet(); };
INP.lgMin = function () { LG.minTouched = true; };
ACT.lgPose = function (el) { lgRead(); var i = el.getAttribute('data-i'); LG.poses[i] = LG.poses[i] === false; logSheet(); };
ACT.lgFeel = function (el) { lgRead(); LG.feel = LG.feel === el.textContent ? '' : el.textContent; logSheet(); };
ACT.lgSave = function () {
  lgRead(); if (!(LG.min > 0 && LG.min < 600)) return toast('Enter minutes');
  var r = LG.kind === 'yoga' && LG.rid ? routineById(LG.rid) : null, rec = { t: Date.now(), min: LG.min, kind: LG.kind, feel: LG.feel, note: LG.note };
  if (r) { rec.flow = r.id; rec.name = r.name; rec.poses = r.steps.filter(function (s, i) { return LG.poses[i] !== false; }).map(function (s) { return s.k; }); }
  else rec.name = LG.kind === 'yoga' ? 'Yoga' : (LG.name || KINDS.filter(function (k) { return k[0] === LG.kind; })[0][1]);
  if (EDS) { var d = day(EDS.k); rec.t = d.yoga[EDS.i].t; d.yoga[EDS.i] = rec; EDS = null; } else day(today()).yoga.push(rec);
  save(); sheet(null); rerender(); toast('Saved ' + rec.min + ' min');
};
var EDS = null;
ACT.editSession = function (el) {
  var k = el.getAttribute('data-k'), i = +el.getAttribute('data-i'), s = day(k).yoga[i];
  sheet('<h2>' + esc(s.name || 'Session') + '</h2><div class="l">' + niceDate(k) + ', ' + hm(s.t) + ' · ' + s.min + ' min' + (s.feel ? ' · felt ' + esc(s.feel) : '') + '</div>' + (s.poses && s.poses.length ? '<p class="p">' + s.poses.map(function (x) { return esc(pose(x).name); }).join(', ') + '</p>' : '') + (s.note ? '<p class="p">' + esc(s.note) + '</p>' : '') +
    '<div class="g2 mt"><button class="btn sec" data-act="delSession" data-k="' + k + '" data-i="' + i + '">' + icon('trash', 18) + 'Delete</button><button class="btn" data-act="closeSheet">Done</button></div>');
};
ACT.delSession = function (el) { day(el.getAttribute('data-k')).yoga.splice(+el.getAttribute('data-i'), 1); save(); sheet(null); rerender(); toast('Session deleted'); };

/* ---------- guided player ---------- */
var PL = null;
function segments(r) {
  var out = [];
  r.steps.forEach(function (s, i) {
    var p = pose(s.k), sides = s.sides ? ['right side', 'left side'] : [''];
    sides.forEach(function (sd, j) {
      out.push({ k: s.k, name: p.name, aka: p.aka, cue: p.cue, side: sd, mode: s.mode, v: s.v, sec: s.mode === 'reps' ? s.v * p.repSec : s.v, repSec: p.repSec, caution: p.caution });
      if ((r.rest || 0) > 0 && !(i === r.steps.length - 1 && j === sides.length - 1)) out.push({ rest: true, sec: r.rest, name: 'Rest' });
    });
  });
  return out;
}
function segSay(g) { if (g.rest) return; plSay(g.name + (g.side ? ', ' + g.side : '') + '. ' + (g.mode === 'reps' ? g.v + ' rounds. ' : '') + (g.cue || '')); }
ROUTES.flow = function (id) {
  var r = routineById(id); if (!r) return head('Routine') + '<div class="empty-s">Not found.</div>';
  if (!PL || PL.id !== r.id) { var sg = segments(r); PL = { id: r.id, segs: sg, i: 0, left: sg[0].sec, rep: 1, run: false, done: 0, t: 0, did: {} }; }
  var g = PL.segs[PL.i], total = PL.segs.reduce(function (a, x) { return a + x.sec; }, 0), doneSec = PL.segs.slice(0, PL.i).reduce(function (a, x) { return a + x.sec; }, 0) + (g.sec - PL.left);
  var nx = PL.segs.slice(PL.i + 1).filter(function (x) { return !x.rest; })[0], poseNo = PL.segs.slice(0, PL.i + 1).filter(function (x) { return !x.rest; }).length, poses = PL.segs.filter(function (x) { return !x.rest; }).length;
  var h = head(r.name, (g.rest ? 'Rest' : 'Pose ' + poseNo + ' of ' + poses) + ' · ' + Math.round((total - doneSec) / 60) + ' min left');
  h += '<div class="bar thick"><div style="width:' + (doneSec / total * 100).toFixed(1) + '%;background:var(--g)"></div></div>';
  var clock = Math.floor(PL.left / 60) + ':' + pad(PL.left % 60);
  if (g.rest) h += '<section class="c ctrtxt player"><div class="l">REST</div><h1 class="big">Breathe</h1><div class="ringc">' + ring((1 - PL.left / g.sec) * 100, 200, 14, 'var(--w)', '<text x="100" y="112" text-anchor="middle" class="rt0">' + clock + '</text>') + '</div>' + (nx ? '<p class="p">Next: <b>' + esc(nx.name) + (nx.side ? ' (' + nx.side + ')' : '') + '</b></p>' : '') + '</section>';
  else {
    var repNow = g.mode === 'reps' ? Math.min(g.v, Math.floor((g.sec - PL.left) / g.repSec) + 1) : 0;
    h += '<section class="c ctrtxt player"><div class="l">' + esc(g.aka) + (g.side ? ' · ' + g.side.toUpperCase() : '') + '</div><h1 class="big">' + esc(g.name) + '</h1><div class="ringc">' + ring((1 - PL.left / g.sec) * 100, 200, 14, 'var(--g)', '<text x="100" y="' + (g.mode === 'reps' ? 100 : 112) + '" text-anchor="middle" class="rt0">' + clock + '</text>' + (g.mode === 'reps' ? '<text x="100" y="132" text-anchor="middle" class="rt2">round ' + repNow + ' of ' + g.v + '</text>' : '')) + '</div><p class="p">' + esc(g.cue) + '</p>' + (g.caution ? '<div class="note warn mt">' + esc(g.caution) + '</div>' : '') + '</section>';
  }
  h += '<div class="g3"><button class="btn sec" data-act="plPrev" aria-label="Previous">Back</button><button class="btn" data-act="plToggle">' + icon(PL.run ? 'pause' : 'play', 18) + (PL.run ? 'Pause' : 'Start') + '</button><button class="btn sec" data-act="plNext">' + (g.rest ? 'Skip rest' : 'Next') + '</button></div>';
  h += '<div class="g2"><button class="btn sec" data-act="plMore" data-d="30">+30 s</button><button class="btn sec" data-act="plEnd">Finish now</button></div>';
  if (nx && !g.rest) h += '<div class="l ctrtxt mt">Next: ' + esc(nx.name) + (nx.side ? ' (' + nx.side + ')' : '') + ' · ' + secTxt(nx.sec) + '</div>';
  return h;
};
function plSay(t) { native('speak', t); }
function plAdvance() {
  var g = PL.segs[PL.i]; if (!g.rest) PL.did[g.k] = 1;
  if (PL.i + 1 >= PL.segs.length) return plFinish();
  PL.i++; PL.left = PL.segs[PL.i].sec;
  var n = PL.segs[PL.i]; if (n.rest) { var nx = PL.segs[PL.i + 1]; plSay('Rest. Next, ' + (nx ? nx.name + (nx.side ? ', ' + nx.side : '') : '')); } else segSay(n);
}
function plTick() {
  if (!PL || !PL.run) return;
  var g = PL.segs[PL.i];
  PL.left--; PL.done++;
  if (g.mode === 'reps' && !g.rest && PL.left > 0 && (g.sec - PL.left) % g.repSec === 0) { var rn = (g.sec - PL.left) / g.repSec + 1; if (rn <= g.v) plSay('Round ' + rn); }
  if (!g.rest && PL.left === 10 && g.sec > 30) plSay('Ten seconds');
  if (PL.left <= 0) plAdvance();
  if (cur.name === 'flow') rerender();
}
function plFinish() {
  var r = routineById(PL.id), mins = Math.max(1, Math.round(PL.done / 60));
  clearInterval(PL.t); PL.run = false; native('keepAwake', false);
  var did = Object.keys(PL.did);
  day(today()).yoga.push({ t: Date.now(), min: mins, kind: 'yoga', flow: PL.id, name: r ? r.name : 'Yoga', poses: did });
  save(); plSay('Well done. ' + (r ? r.name : 'Session') + ' complete.');
  PL = null; toast('Logged ' + mins + ' min of yoga'); go('yoga');
}
ACT.plToggle = function () {
  PL.run = !PL.run;
  if (PL.run) { if (PL.left === PL.segs[PL.i].sec) segSay(PL.segs[PL.i]); clearInterval(PL.t); PL.t = setInterval(plTick, 1000); native('keepAwake', true); }
  else { clearInterval(PL.t); native('keepAwake', false); native('stopSpeak'); }
  rerender();
};
ACT.plNext = function () { plAdvance(); if (PL) rerender(); };
ACT.plPrev = function () { PL.i = Math.max(0, PL.i - 1); if (PL.segs[PL.i].rest && PL.i > 0) PL.i--; PL.left = PL.segs[PL.i].sec; rerender(); };
ACT.plMore = function (el) { PL.left += +el.getAttribute('data-d'); PL.segs[PL.i].sec += +el.getAttribute('data-d'); rerender(); };
ACT.plEnd = function () { if (PL.done < 30) { clearInterval(PL.t); native('keepAwake', false); PL = null; go('yoga'); return; } plFinish(); };
