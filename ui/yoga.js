/* Yoga: flows, picker, guided player, streak */
'use strict';
var FLOWS = [
  { id: 'calm', name: 'Calm evening flow', min: 20, for: 'After a short night or a stressful day. Ends with breathing that helps sleep and BP.', poses: [
    ['Tadasana', 'Mountain pose', 60, 'Stand tall, feet together, arms by your side. Breathe slowly and feel your weight even on both feet.'],
    ['Tiryaka Tadasana', 'Swaying palm tree', 120, 'Arms up, fingers locked. Breathe out and bend to the right, breathe in to come up, then the left.'],
    ['Marjariasana', 'Cat and cow', 120, 'On hands and knees. Breathe in, look up and drop the belly. Breathe out, round the back and tuck the chin.'],
    ['Balasana', 'Child pose', 120, 'Sit back on your heels, forehead to the floor, arms forward. Let the back relax.'],
    ['Bhujangasana', 'Cobra', 120, 'Lie on your stomach, palms under shoulders. Breathe in and lift the chest, elbows soft. Hold 20 seconds, rest, repeat 3 times.'],
    ['Supta Baddha Konasana', 'Reclined butterfly', 120, 'Lie on your back, soles of the feet together, knees open. Hands on the belly, breathe into them.'],
    ['Viparita Karani', 'Legs up the wall', 180, 'Lie down with legs up against a wall. Close your eyes and breathe slowly.'],
    ['Anulom Vilom', 'Alternate nostril breathing', 240, 'Sit comfortably. Close the right nostril, breathe in left. Close left, breathe out right. Breathe in right, out left. Keep going, slow and even.'],
    ['Bhramari', 'Humming bee breath', 120, 'Close your ears with the thumbs, eyes closed. Breathe in, and hum softly like a bee as you breathe out.']] },
  { id: 'morning', name: 'Morning energiser', min: 20, for: 'For a good-energy morning. Wakes up the whole body.', poses: [
    ['Surya Namaskar', 'Sun salutation, 6 rounds', 480, 'Follow the 12 steps slowly: prayer, arms up, forward bend, lunge, plank, eight-limb, cobra, mountain, lunge, forward bend, arms up, prayer. One round about 80 seconds.'],
    ['Trikonasana', 'Triangle', 120, 'Feet wide. Right foot out, reach right hand down to the shin, left arm up. 30 seconds, then the other side. Repeat.'],
    ['Vrikshasana', 'Tree', 120, 'Stand on the left leg, right sole on the inner thigh, palms together. 30 seconds each side, twice.'],
    ['Setu Bandhasana', 'Bridge', 120, 'Lie on your back, knees bent. Breathe in and lift the hips. Hold 20 seconds, lower, repeat.'],
    ['Kapalbhati', 'Skull-shining breath', 180, 'Sit straight. Short, sharp breaths out through the nose by pulling the belly in; breathing in happens by itself. 3 rounds of 30. Skip if your BP is high.'],
    ['Anulom Vilom', 'Alternate nostril breathing', 180, 'Close the right nostril, breathe in left; close left, breathe out right. Then in right, out left. Slow and even.']] },
  { id: 'sugar', name: 'Sugar and digestion', min: 15, for: 'Helps after meals and when fasting sugar is above 100.', poses: [
    ['Vajrasana', 'Thunderbolt', 180, 'Kneel and sit back on your heels, back straight, hands on the knees. The one pose that is good right after a meal.'],
    ['Mandukasana', 'Frog pose', 120, 'In Vajrasana, make fists and press them into the belly beside the navel. Breathe out and bend forward. Hold 15 seconds, 3 times.'],
    ['Ardha Matsyendrasana', 'Seated twist', 120, 'Sit with legs straight. Cross the right foot over the left knee and twist right. 30 seconds each side, twice.'],
    ['Pawanmuktasana', 'Knees to chest', 120, 'Lie on your back. Hug both knees to the chest and rock gently side to side.'],
    ['Paschimottanasana', 'Seated forward bend', 120, 'Sit with legs straight. Breathe in, arms up. Breathe out and fold forward, hands to the shins or feet.'],
    ['Dhanurasana', 'Bow', 60, 'Lie on your stomach, hold the ankles, breathe in and lift chest and thighs. Hold 15 seconds, twice.'],
    ['Kapalbhati', 'Skull-shining breath', 180, 'Short, sharp breaths out through the nose, pulling the belly in. 3 rounds of 30. Skip if your BP is high.']] },
  { id: 'bp', name: 'BP calm-down', min: 15, for: 'Slow and gentle. For days when BP reads high.', poses: [
    ['Sukhasana breathing', 'Easy sit, long out-breath', 120, 'Sit cross-legged. Breathe in for 4 counts, out for 6. The longer out-breath slows the heart.'],
    ['Balasana', 'Child pose', 120, 'Sit back on your heels, forehead down, arms forward or by your side.'],
    ['Setu Bandhasana', 'Bridge, gentle', 120, 'Lie on your back, knees bent. Lift the hips only halfway, hold 15 seconds, lower slowly.'],
    ['Viparita Karani', 'Legs up the wall', 180, 'Legs up against a wall, arms open, eyes closed.'],
    ['Shavasana', 'Corpse pose', 180, 'Lie flat, arms away from the body, palms up. Relax each part of the body from toes to head.'],
    ['Anulom Vilom', 'Alternate nostril breathing', 180, 'Slow and even. No breath holding.']] },
  { id: 'desk', name: 'Office desk break', min: 8, for: 'At your desk in Andheri, no mat needed.', poses: [
    ['Neck rolls', 'Greeva sanchalan', 60, 'Slowly drop the chin, roll the head to one shoulder, back to centre, then the other side.'],
    ['Shoulder rolls', 'Skandha chakra', 60, 'Fingertips on shoulders, draw big circles with the elbows, forward then back.'],
    ['Seated twist', 'Chair twist', 120, 'Sit tall, hold the back of the chair and twist. 30 seconds each side, twice.'],
    ['Standing stretch', 'Tadasana with arms up', 60, 'Stand, lock fingers, push palms to the ceiling and rise on your toes.'],
    ['Garudasana arms', 'Eagle arms', 60, 'Cross the right elbow under the left, palms together, lift the elbows. Switch.'],
    ['Palming', 'Eye rest', 120, 'Rub your palms warm and cup them over closed eyes. Breathe slowly.']] }
];
function flowById(id) { return FLOWS.filter(function (f) { return f.id === id; })[0] || FLOWS[0]; }
function yogaMin(k) { var d = dayIf(k); return d ? Math.round(d.yoga.reduce(function (a, y) { return a + y.min; }, 0)) : 0; }
function pickFlow() {
  var k = today(), en = energyFor(k), sl = sleepFor(k), bp = merged('bp')[0], su = merged('sugar').filter(function (x) { return x.type === 'fasting'; })[0], hr = new Date().getHours();
  var lastMeal = dayItems(k).reduce(function (a, i) { return Math.max(a, i.t); }, 0);
  if (bp && Date.now() - bp.t < 2 * 86400000 && (bp.sys >= 135 || bp.dia >= 88)) return ['bp', 'BP read ' + bp.sys + '/' + bp.dia];
  if (Date.now() - lastMeal < 90 * 60000 || (su && Date.now() - su.t < 2 * 86400000 && su.val >= 100)) return ['sugar', su && su.val >= 100 ? 'fasting sugar ' + su.val : 'you just ate'];
  if ((en != null && en < 65) || (sl && sl.score < 65) || hr >= 18) return ['calm', sl ? 'sleep score ' + sl.score + (en != null ? ', energy ' + en : '') : 'evening'];
  if (hr >= 10 && hr < 18 && new Date().getDay() % 6) return ['desk', 'work hours'];
  return ['morning', en != null ? 'energy ' + en : 'fresh start'];
}
ROUTES.yoga = function () {
  var p = pickFlow(), f = flowById(p[0]), k = today(), h = head('Yoga', yogaMin(k) + ' of 20 min today');
  h += '<section class="c dark"><div class="kick">PICKED FOR NOW · ' + esc(p[1].toUpperCase()) + '</div><h2 class="w">' + f.name + ' · ' + f.min + ' min</h2><p class="p dim">' + esc(f.for) + '</p><button class="btn mintb mt" data-act="go" data-to="flow/' + f.id + '">' + icon('play', 18) + 'Start with voice guide</button></section>';
  h += '<section class="c">' + f.poses.map(function (x, i) { return '<div class="ps' + (i ? '' : ' first') + '"><span class="pn">' + (i + 1) + '</span><span><b>' + x[0] + '</b><span class="l">' + x[1] + '</span></span><span class="l">' + dur(x[2] / 60) + '</span></div>'; }).join('') + '</section>';
  h += '<h3 class="sech">Other flows</h3>' + FLOWS.filter(function (x) { return x.id !== f.id; }).map(function (x) { return '<button class="res" data-act="go" data-to="flow/' + x.id + '"><span>' + x.name + '<small>' + x.min + ' min · ' + esc(x.for) + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  /* month streak */
  var now = new Date(), y = now.getFullYear(), mo = now.getMonth(), first = new Date(y, mo, 1), n = new Date(y, mo + 1, 0).getDate(), cells = '', sessions = 0, streak = 0;
  for (var i = 0; i < (first.getDay() + 6) % 7; i++) cells += '<span></span>';
  for (var dd = 1; dd <= n; dd++) {
    var dk = dkey(new Date(y, mo, dd)), m = yogaMin(dk), cls = m >= 20 ? 'full' : m > 0 ? 'part' : '';
    if (m) sessions += dayIf(dk).yoga.length;
    cells += '<span class="dt ' + cls + (dk === k ? ' today' : '') + '">' + dd + '</span>';
  }
  for (i = 0; i < 400; i++) { if (yogaMin(addDays(k, -i)) > 0) streak++; else if (i > 0) break; }
  h += '<section class="c"><div class="row sb"><h2>' + MON[mo] + '</h2><span class="sm gtxt">' + (streak ? streak + '-day streak · ' : '') + sessions + ' sessions</span></div><div class="cal"><span class="l">M</span><span class="l">T</span><span class="l">W</span><span class="l">T</span><span class="l">F</span><span class="l">S</span><span class="l">S</span>' + cells + '</div><div class="l mt">Dark = 20 min or more · light = under 20 min</div></section>';
  var rh = DB.health && DB.health.restingHr;
  if (rh) { var yes = [], no = []; Object.keys(rh).forEach(function (d) { (yogaMin(addDays(d, -1)) > 0 ? yes : no).push(rh[d]); }); if (yes.length >= 3 && no.length >= 3) { var a = function (v) { return v.reduce(function (s, x) { return s + x; }, 0) / v.length; }, diff = Math.round(a(yes) - a(no)); h += '<section class="c row sb"><div><div class="l">Resting heart rate the day after yoga</div><b class="m18">' + (diff <= 0 ? '−' : '+') + Math.abs(diff) + ' bpm</b></div><div class="sm gtxt">From your watch</div></section>'; } }
  h += '<button class="btn sec" data-act="logYoga">I did yoga elsewhere</button>';
  return h;
};
ACT.logYoga = function () { sheet('<h2>Log yoga</h2><label class="fld mt">Minutes<input id="yg_m" type="number" inputmode="numeric" value="20"></label><button class="btn mt" data-act="saveYoga">Save</button>'); };
ACT.saveYoga = function () { var m = +document.getElementById('yg_m').value; if (!(m > 0 && m < 300)) return toast('Enter minutes'); day(today()).yoga.push({ t: Date.now(), min: m, flow: 'own' }); save(); sheet(null); rerender(); toast('Logged ' + m + ' min'); };

/* ---------- guided player ---------- */
var PL = null;
ROUTES.flow = function (id) {
  var f = flowById(id);
  if (!PL || PL.id !== f.id) PL = { id: f.id, i: 0, left: f.poses[0][2], run: false, done: 0, t: 0 };
  var p = f.poses[PL.i], nx = f.poses[PL.i + 1], total = f.poses.reduce(function (a, x) { return a + x[2]; }, 0), doneSec = f.poses.slice(0, PL.i).reduce(function (a, x) { return a + x[2]; }, 0) + (p[2] - PL.left);
  var h = head(f.name, 'Pose ' + (PL.i + 1) + ' of ' + f.poses.length);
  h += '<div class="bar thick">' + '<div style="width:' + (doneSec / total * 100).toFixed(1) + '%;background:var(--g)"></div></div>';
  h += '<section class="c ctrtxt player"><div class="l">' + esc(p[1]) + '</div><h1 class="big">' + esc(p[0]) + '</h1><div class="ringc">' + ring((1 - PL.left / p[2]) * 100, 200, 14, 'var(--g)', '<text x="100" y="112" text-anchor="middle" class="rt0">' + Math.floor(PL.left / 60) + ':' + pad(PL.left % 60) + '</text>') + '</div><p class="p">' + esc(p[3]) + '</p></section>';
  h += '<div class="g3"><button class="btn sec" data-act="plPrev" aria-label="Previous pose">Back</button><button class="btn" data-act="plToggle">' + icon(PL.run ? 'pause' : 'play', 18) + (PL.run ? 'Pause' : 'Start') + '</button><button class="btn sec" data-act="plNext">Skip</button></div>';
  if (nx) h += '<div class="l ctrtxt mt">Next: ' + esc(nx[0]) + ' · ' + dur(nx[2] / 60) + '</div>';
  return h;
};
function plSay(t) { native('speak', t); }
function plTick() {
  if (!PL || !PL.run) return;
  var f = flowById(PL.id);
  PL.left--; PL.done++;
  if (PL.left === 10 && f.poses[PL.i + 1]) plSay('Ten seconds. Next, ' + f.poses[PL.i + 1][0]);
  if (PL.left <= 0) {
    if (PL.i + 1 >= f.poses.length) return plFinish();
    PL.i++; PL.left = f.poses[PL.i][2]; plSay(f.poses[PL.i][0] + '. ' + f.poses[PL.i][3]);
  }
  if (cur.name === 'flow') rerender();
}
function plFinish() {
  var mins = Math.max(1, Math.round(PL.done / 60)), f = flowById(PL.id);
  clearInterval(PL.t); PL.run = false; native('keepAwake', false);
  day(today()).yoga.push({ t: Date.now(), min: mins, flow: f.id }); save();
  plSay('Well done. ' + f.name + ' complete.');
  PL = null; toast('Logged ' + mins + ' min of yoga'); go('yoga');
}
ACT.plToggle = function () {
  var f = flowById(PL.id);
  PL.run = !PL.run;
  if (PL.run) { if (PL.left === f.poses[PL.i][2]) plSay(f.poses[PL.i][0] + '. ' + f.poses[PL.i][3]); clearInterval(PL.t); PL.t = setInterval(plTick, 1000); native('keepAwake', true); }
  else { clearInterval(PL.t); native('keepAwake', false); native('stopSpeak'); }
  rerender();
};
ACT.plNext = function () { var f = flowById(PL.id); if (PL.i + 1 >= f.poses.length) return plFinish(); PL.i++; PL.left = f.poses[PL.i][2]; if (PL.run) plSay(f.poses[PL.i][0] + '. ' + f.poses[PL.i][3]); rerender(); };
ACT.plPrev = function () { var f = flowById(PL.id); PL.i = Math.max(0, PL.i - 1); PL.left = f.poses[PL.i][2]; rerender(); };
