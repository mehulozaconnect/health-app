/* Exercise tab: yoga & pranayama with real photos, a natural voice and a player that keeps going with the
   screen locked (native foreground service). Schedules (Dincharya) with reminders and a weekly thumbs grid.
   Gym, band, calisthenics and aerobics come next; for now they log to Activity. */
'use strict';
IC.dumb = '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>';
IC.next = '<path d="M6 5l9 7-9 7zM18 5v14"/>';
IC.prev = '<path d="M18 5l-9 7 9 7zM6 5v14"/>';
IC.stop = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
IC.mic = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';
NAV.splice(2, 0, ['ex', 'Exercise', 'dumb']);
['ex', 'exy', 'exa', 'excat', 'exsport', 'exvoice', 'breath', 'psched', 'breathlog'].forEach(function (k) { TABOF[k] = 'ex'; });
HERO['Exercise'] = ['dumb', '#7A5AF8']; HERO['Yoga & pranayama'] = ['yoga', '#4E9B6B']; HERO['Voice'] = ['mic', '#7A5AF8']; HERO['Walk, run & sports'] = ['steps', '#2F7FD8'];
ROUTES.breaths = function () { return ROUTES.exy(); };

function exImg(n) { return 'img/' + n + '.jpg'; }
var PIMG = { anulom: 'anulom1', sheetali: 'sheetali', udgeeth: 'udgeeth', ujjayi: 'ujjayi', bahya: 'bahya', bhramari: 'bhramari', meditative: 'meditative', surya: 'anulom2', chandra: 'anulom1', box: 'meditative', kapal: 'kapal', bhastrika: 'bhastrika' };
/* the hand photo follows the open nostril: left open = right thumb closes the right side */
function pImg(k, nos) { if (nos === 'left') return 'anulom1'; if (nos === 'right') return 'anulom2'; return PIMG[k] || 'meditative'; }
/* spoken at the start of each pranayama */
var PINTRO = {
  anulom: 'Sit tall and relaxed. Your right thumb closes the right nostril, your ring finger closes the left.',
  sheetali: 'Roll your tongue like a tube. Breathe in through it, then close the mouth and breathe out through the nose.',
  udgeeth: 'Breathe in deeply. On the out breath, chant a long Om, keeping the m longer than the o.',
  ujjayi: 'Breathe through the nose, with the throat slightly closed, making a soft ocean sound.',
  bahya: 'Breathe out fully, then hold the breath out, chin down and belly pulled in and up.',
  bhramari: 'Close your ears with your thumbs and rest your fingers over your eyes. Hum like a bee as you breathe out.',
  meditative: 'In through the nose, hold gently, then a long breath out through the mouth.',
  surya: 'Breathe in only through the right nostril, and out only through the left.',
  chandra: 'Breathe in only through the left nostril, and out only through the right.',
  box: 'Equal counts. Breathe in, hold, breathe out, hold.',
  kapal: 'Short, sharp breaths out through the nose by snapping the belly in. The breath in happens by itself.',
  bhastrika: 'Deep, strong breaths in and out through the nose, at an even pace.'
};
/* sample yoga: [name, plain name, hold seconds, photo, how, both sides?, caution] */
var ASANA = {
  tada: ['Tadasana', 'Palm tree stretch', 30, 'tada', 'Stand tall with feet together. Raise both arms overhead and join the palms. Stretch up through the whole body.', 0, ''],
  vriksha: ['Vrikshasana', 'Tree pose', 30, 'vriksha', 'Stand on one leg. Place the other foot on the inner thigh or calf, never on the knee. Join the palms overhead.', 1, 'Stand near a wall if balance is shaky.'],
  kona: ['Konasana', 'Standing side bend', 20, 'kona', 'Feet wide apart. Raise one arm up, slide the other hand down the leg and bend to the side. Look up at the raised hand.', 1, ''],
  vajra: ['Vajrasana', 'Thunderbolt pose', 60, 'vajra', 'Kneel and sit back on your heels, knees together, spine tall, hands resting on the thighs.', 0, 'Skip with knee pain.'],
  bhujanga: ['Bhujangasana', 'Cobra pose', 20, 'bhujanga', 'Lie on your stomach with palms under the shoulders. Breathe in and lift the chest, elbows soft, hips on the floor.', 0, 'Go gently with back pain; skip in pregnancy.'],
  shava: ['Shavasana', 'Deep relaxation', 120, 'shava', 'Lie on your back, arms a little away from the body, palms up. Close your eyes and let every part of the body go soft.', 0, '']
};
var ASANA_ORDER = ['tada', 'vriksha', 'kona', 'vajra', 'bhujanga', 'shava'];
function asHold(k) { return ((DB.asana || {})[k] || {}).hold || ASANA[k][2]; }
function asSec(k) { var a = ASANA[k]; return 8 + asHold(k) * (a[5] ? 2 : 1) + (a[5] ? 4 : 0) + 4; }

/* one list for schedules: 'anulom' is a pranayama, 'a:tada' a yoga pose */
function exIsA(k) { return k.slice(0, 2) === 'a:'; }
function exName(k) { return exIsA(k) ? (ASANA[k.slice(2)] || ['?'])[0] : (PRANA[k] || ['?'])[0]; }
function exPhoto(k) { return exIsA(k) ? ASANA[k.slice(2)][3] : PIMG[k]; }
function exSec(k) { if (exIsA(k)) return ASANA[k.slice(2)] ? asSec(k.slice(2)) : 0; return PRANA[k] ? pTotal(k, pcfg(k)) + 8 : 0; }
pschedSec = function (s) { return s.items.reduce(function (a, k) { return a + exSec(k); }, 0) + 6; };
function exValid(k) { return exIsA(k) ? !!ASANA[k.slice(2)] : !!PRANA[k]; }

/* ---------- the script the player speaks ---------- */
function vKey(say) { var t = (DB.settings.gvoice || 'Kore') + '|' + say, h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return 'v' + (h >>> 0).toString(36); }
function introSec(t) { return Math.max(6, Math.round(t.split(' ').length * 0.42 + 2.5)); }
var PHT = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out', hold2: 'Hold out', fast: 'Go', rest: 'Rest' };
function pSay(k, g, last) {
  var s = '';
  if (g.ph === 'in') s = k === 'sheetali' ? 'Breathe in through the tongue' : k === 'ujjayi' ? 'Breathe in slowly, with a soft ocean sound' : g.nos ? 'Breathe in through the ' + g.nos + ' nostril' : 'Breathe in';
  if (g.ph === 'hold') s = 'Hold';
  if (g.ph === 'out') s = k === 'udgeeth' ? 'Chant Om' : k === 'bhramari' ? 'Hum like a bee' : k === 'meditative' ? 'Breathe out through the mouth' : k === 'sheetali' ? 'Breathe out through the nose' : k === 'ujjayi' ? 'Breathe out slowly, with the ocean sound' : g.nos ? 'Breathe out through the ' + g.nos + ' nostril' : 'Breathe out';
  if (g.ph === 'hold2') s = k === 'bahya' ? 'Hold the breath out. Chin down, belly in' : 'Hold out';
  if (g.ph === 'fast') s = k === 'kapal' ? 'Begin. Short sharp breaths out' : 'Begin. Deep strong breaths';
  if (g.ph === 'rest') s = 'Stop. Relax and breathe normally';
  return (last ? 'Last round. ' : '') + s;
}
function pHint(k, g) {
  if (g.nos && (k === 'anulom' || k === 'surya' || k === 'chandra')) return g.nos === 'left' ? 'Right thumb closes the right nostril' : 'Ring finger closes the left nostril';
  if (g.ph === 'fast') return g.n + ' breaths at ' + g.bpm + ' a minute';
  if (g.ph === 'rest') return 'Breathe normally';
  return PRANA[k][1];
}
function pranaSteps(k) {
  var p = PRANA[k], c = pcfg(k), ph = phases(k, c), out = [], img = pImg(k, null), seenRound = 0;
  var lab = c.fast ? null : pshow(k).map(function (f) { return [f === 'r3' && pshow(k).indexOf('r1') >= 0 ? 'Hold out' : PLAB[f][0] + PLAB[f].slice(1).toLowerCase(), c.r[+f[1]], ['in', 'hold', 'out', 'hold2'][+f[1]]]; });
  var intro = p[0] + '. ' + PINTRO[k];
  out.push({ ph: 'intro', sec: introSec(intro), say: intro, title: p[0], sub: 'Get ready · ' + p[1], hint: PINTRO[k], img: img, item: k });
  ph.forEach(function (g) {
    var first = g.round !== seenRound; seenRound = g.round;
    var last = first && c.rounds > 2 && g.round === c.rounds && g.ph !== 'rest';
    if (g.nos) img = pImg(k, g.nos); /* holds keep the last hand position */
    out.push({ ph: g.ph, sec: g.sec, say: pSay(k, g, last), title: PHT[g.ph] + (g.nos ? ', ' + g.nos + ' nostril' : ''), sub: 'Round ' + g.round + ' of ' + c.rounds, hint: pHint(k, g), img: img, item: k, cnt: lab, round: g.round, rounds: c.rounds });
  });
  return out;
}
function asanaSteps(k) {
  var a = ASANA[k], hold = asHold(k), out = [], it = 'a:' + k, intro = a[0] + '. ' + a[4];
  out.push({ ph: 'intro', sec: introSec(intro), say: intro, title: a[0], sub: 'Get into position · ' + a[1], hint: a[4], img: a[3], item: it });
  (a[5] ? ['Right side. ', 'Now the other side. '] : ['']).forEach(function (side, si) {
    if (si) out.push({ ph: 'rest', sec: 4, say: 'Slowly release, and change sides', title: 'Change sides', sub: a[0], hint: 'Come back to the centre', img: a[3], item: it });
    var h1 = hold >= 30 ? Math.round(hold / 2) : hold;
    out.push({ ph: 'hold', sec: h1, say: side + 'Hold the pose. Breathe slowly', title: 'Hold' + (a[5] ? (si ? ', other side' : ', first side') : ''), sub: a[0] + ' · ' + hold + ' sec', hint: a[1], img: a[3], item: it });
    if (hold >= 30) out.push({ ph: 'hold', sec: hold - h1, say: 'Halfway. Stay steady', title: 'Stay steady', sub: a[0] + ' · ' + hold + ' sec', hint: a[1], img: a[3], item: it });
  });
  out.push({ ph: 'rest', sec: 4, say: 'Slowly release', title: 'Release', sub: a[0], hint: 'Come out of the pose gently', img: a[3], item: it });
  return out;
}
function buildSteps(items) {
  var out = [];
  items.filter(exValid).forEach(function (k, i, all) {
    var st = exIsA(k) ? asanaSteps(k.slice(2)) : pranaSteps(k);
    st.forEach(function (s) { s.n = i + 1; s.of = all.length; });
    out = out.concat(st);
  });
  var lastImg = out.length ? out[out.length - 1].img : 'meditative';
  out.push({ ph: 'end', sec: 6, say: 'Well done. Sit quietly for a moment and feel the calm.', title: 'Well done', sub: 'Session complete', hint: 'Saved to Activity', img: lastImg, item: '' });
  out.forEach(function (s) { s.clip = vKey(s.say); });
  return out;
}

/* ---------- player: native service on the phone, a simple timer in the browser ---------- */
var XS = null, XT = 0;
function xsSave() { try { localStorage.setItem('arogya-xs', JSON.stringify(XS)); } catch (e) { } }
function xsLoad() { try { return JSON.parse(localStorage.getItem('arogya-xs') || 'null'); } catch (e) { return null; } }
function exStart(items, tag, name) {
  items = items.filter(exValid); if (!items.length) return toast('Nothing to play');
  var steps = buildSteps(items), voice = DB.settings.exVoice !== false;
  XS = { tag: tag, name: name, items: items, steps: steps, nat: false, t0: Date.now(), i: 0, at: Date.now(), paused: 0, done: 0 };
  native('askNotify');
  if (AND && AND.sessionStart) {
    var lean = steps.map(function (s) { return { say: s.say, clip: s.clip, sec: s.sec, title: s.title, sub: s.sub, item: s.item, ph: s.ph }; });
    XS.nat = !!native('sessionStart', JSON.stringify({ steps: lean, tag: tag, name: name, voice: voice }));
  }
  if (!XS.nat) xsSpeak(0);
  xsSave(); feel('tick'); go('exrun');
}
/* where the player is: {i, ms, paused, run} */
function xsState() {
  if (!XS) return { run: false };
  if (XS.nat) { try { var s = JSON.parse(native('sessionState') || '{}'); if (s.tag === XS.tag || s.run) return s; } catch (e) { } return { run: false }; }
  if (XS.done) return { run: false };
  var now = XS.paused || Date.now(), ms = now - XS.at;
  while (XS.i < XS.steps.length && ms >= XS.steps[XS.i].sec * 1000) {
    xsAdd(XS.steps[XS.i], XS.steps[XS.i].sec); ms -= XS.steps[XS.i].sec * 1000; XS.at += XS.steps[XS.i].sec * 1000; XS.i++;
    if (XS.i >= XS.steps.length) { xsFinish(true); return { run: false }; }
    xsSpeak(XS.i);
  }
  return { run: true, i: XS.i, ms: ms, paused: !!XS.paused };
}
function xsAdd(s, sec) { if (!s.item) return; XS.sec = XS.sec || {}; XS.sec[s.item] = (XS.sec[s.item] || 0) + sec; }
function xsSpeak(i) { var s = XS.steps[i]; if (!s) return; if (DB.settings.exVoice !== false) plSay(s.say); feel(s.ph === 'in' ? 'tick' : s.ph === 'end' ? 'done' : 'tickl'); }
function xsFinish(done) {
  if (!XS || XS.done) return; XS.done = 1;
  if (!done) { var s = XS.steps[XS.i]; if (s) xsAdd(s, ((XS.paused || Date.now()) - XS.at) / 1000); }
  exLogResults([{ tag: XS.tag, name: XS.name, start: XS.t0, end: Date.now(), done: done, items: XS.sec || {} }]);
}
ACT.xsCtl = function (el) {
  var a = el.getAttribute('data-a'); if (!XS) return;
  if (XS.nat) { native('sessionCtl', a); setTimeout(xsPaint, 150); if (a === 'stop') setTimeout(exTake, 600); return; }
  var st = xsState(); if (!st.run) return;
  if (a === 'pause') { if (XS.paused) { XS.at += Date.now() - XS.paused; XS.paused = 0; xsSpeak(XS.i); } else XS.paused = Date.now(); }
  if (a === 'skip' || a === 'back') { if (a === 'skip') xsAdd(XS.steps[XS.i], st.ms / 1000); var j = XS.i + (a === 'skip' ? 1 : -1); if (j >= XS.steps.length) return xsFinish(true); XS.i = Math.max(0, j); XS.at = Date.now(); XS.paused = 0; xsSpeak(XS.i); }
  if (a === 'stop') xsFinish(false);
  xsPaint();
};
/* results from the phone's player (also picked up when the app comes back) */
function exTake() { try { var r = JSON.parse(native('sessionTake') || '[]'); if (r.length) exLogResults(r); } catch (e) { } }
window.onSessionEnd = function () { setTimeout(exTake, 200); };
var _onRes = window.onResume;
window.onResume = function () { exTake(); if (_onRes) _onRes(); };
function exLogResults(list) {
  var lines = [], kc = 0;
  list.forEach(function (r) {
    var end = r.end || Date.now(), k = dkey(new Date(end)), d = day(k), yogaSec = 0, yogaNames = [];
    Object.keys(r.items || {}).forEach(function (it) {
      var sec = Math.round(r.items[it]); if (sec < 20) return;
      if (exIsA(it)) { yogaSec += sec; yogaNames.push(ASANA[it.slice(2)][0]); return; }
      if (!PRANA[it]) return;
      var rec = { t: end, min: Math.round(sec / 6) / 10, sec: sec, kind: 'yoga', act: 'prana', prana: it, name: PRANA[it][0], src: 'guided' };
      d.yoga.push(rec); kc += sessionKcal(rec); lines.push(PRANA[it][0] + ' · ' + mmss(sec));
    });
    if (yogaSec >= 20) { var y = { t: end, min: Math.round(yogaSec / 6) / 10, sec: yogaSec, kind: 'yoga', act: 'yoga', int: 'easy', name: 'Yoga · ' + yogaNames.join(', '), src: 'guided' }; d.yoga.push(y); kc += sessionKcal(y); lines.push('Yoga · ' + mmss(yogaSec)); }
    if (r.done && r.tag && pschedById(r.tag)) { DB.pschedLog = DB.pschedLog || {}; (DB.pschedLog[k] = DB.pschedLog[k] || {})[r.tag] = end; }
  });
  if (XS && list.some(function (r) { return r.tag === XS.tag; })) { XS.done = 1; XS.summary = { lines: lines, kc: kc, done: list[list.length - 1].done }; }
  try { localStorage.removeItem('arogya-xs'); } catch (e) { }
  save();
  if (lines.length) { feel('done'); toast('Saved to Activity · ' + kc + ' kcal', 2600); }
  if (cur.name === 'exrun') rerender();
}

/* ---------- live screen ---------- */
ROUTES.exrun = function () {
  if (!XS) { XS = xsLoad(); if (XS) XS.nat = !!(AND && AND.sessionState); }
  if (!XS) return head('Session') + '<div class="empty-s">Nothing is playing. Start one from the Exercise tab.</div><button class="btn mt" data-act="go" data-to="ex">Go to Exercise</button>';
  if (XS.done) {
    var S = XS.summary || { lines: [], kc: 0 };
    return '<div class="xr-hero sm" style="background-image:url(' + exImg(XS.steps[XS.steps.length - 1].img) + ')"><div class="xr-top"><button class="xr-b" data-act="go" data-to="ex">' + icon('back', 20) + ' ' + esc(XS.name) + '</button></div></div>' +
      '<section class="c xr-done"><div class="m22"><b>' + (S.done ? 'Well done' : 'Stopped early') + '</b></div>' + (S.lines.length ? '<div class="l mt6">Saved to Activity</div>' + S.lines.map(function (l) { return '<div class="rd"><span>' + esc(l) + '</span></div>'; }).join('') + '<div class="rd"><span>Calories burned</span><b>' + S.kc + ' kcal</b></div>' : '<p class="p">Too short to save.</p>') + '</section>' +
      '<button class="btn big" data-act="xsClose">Done</button>';
  }
  var s = XS.steps[0];
  return '<div class="xr-hero" id="xrimg" style="background-image:url(' + exImg(s.img) + ')"><div class="xr-top"><button class="xr-b" data-act="xsLeave">' + icon('back', 20) + ' <span id="xrname">' + esc(s.title) + '</span></button><span class="xr-n" id="xrn"></span></div>' +
    '<div class="xr-card"><div class="xr-ring" id="xrring"></div><div class="f1"><b id="xrt">' + esc(s.title) + '</b><small id="xrh">' + esc(s.hint || '') + '</small></div></div></div>' +
    '<div class="pg xr-body"><div class="xr-cnt" id="xrcnt"></div><div class="row sb l"><span id="xrsub"></span><span id="xrleft"></span></div>' +
    '<div class="xr-ctl"><button class="xr-c" data-act="xsCtl" data-a="back" aria-label="Previous step">' + icon('prev', 20) + '</button><button class="xr-c big" data-act="xsCtl" data-a="pause" id="xrpp" aria-label="Pause">' + icon('pause', 30) + '</button><button class="xr-c" data-act="xsCtl" data-a="skip" aria-label="Next step">' + icon('next', 20) + '</button></div>' +
    '<button class="lnk ctr" data-act="xsCtl" data-a="stop">Stop and save</button>' +
    '<div class="l ctr mt6">' + (XS.nat ? 'Keeps going with the screen locked · ' : '') + 'Voice: ' + (DB.settings.exVoice === false ? 'off' : exVoiceLabel()) + '</div></div>';
};
ROUTES.exrun.after = function () { clearInterval(XT); if (XS && !XS.done) { xsPaint(); XT = setInterval(function () { if (cur.name !== 'exrun') return clearInterval(XT); xsPaint(); }, 200); } };
TABOF.exrun = '';
function xsPaint() {
  if (!XS || XS.done) return;
  var st = xsState();
  if (!st.run) { if (XS.nat && !XS.done) { exTake(); if (!XS.done) { XS.done = 1; XS.summary = XS.summary || { lines: [], kc: 0, done: false }; rerender(); } } else if (XS.done) rerender(); return; }
  var s = XS.steps[st.i] || XS.steps[0], g = function (id) { return document.getElementById(id); };
  if (!g('xrt')) return;
  var left = Math.max(0, s.sec - st.ms / 1000), rest = XS.steps.slice(st.i + 1).reduce(function (a, x) { return a + x.sec; }, 0) + left;
  var im = 'url("' + exImg(s.img) + '")'; if (g('xrimg').getAttribute('data-im') !== s.img) { g('xrimg').style.backgroundImage = im; g('xrimg').setAttribute('data-im', s.img); }
  g('xrname').textContent = exName(s.item || XS.items[0]) || XS.name;
  g('xrn').textContent = s.of > 1 ? s.n + ' of ' + s.of : '';
  g('xrt').textContent = s.title; g('xrh').textContent = s.hint || '';
  var pct = s.sec ? (st.ms / 1000) / s.sec : 1;
  g('xrring').innerHTML = ring(pct * 100, 64, 6, 'var(--g)', '<text x="32" y="38" text-anchor="middle" class="rt3">' + (s.ph === 'fast' ? '' : Math.ceil(left)) + '</text>');
  g('xrsub').textContent = s.sub || ''; g('xrleft').textContent = mmss(rest) + ' left';
  g('xrcnt').innerHTML = s.cnt ? s.cnt.map(function (c) { return '<div class="' + (c[2] === s.ph ? 'on' : '') + '"><span>' + c[0] + '</span><b>' + c[1] + '</b></div>'; }).join('') : '';
  g('xrpp').innerHTML = icon(st.paused ? 'play' : 'pause', 30); g('xrpp').setAttribute('aria-label', st.paused ? 'Resume' : 'Pause');
  g('xrimg').className = 'xr-hero ph-' + s.ph + (st.paused ? ' paused' : '');
}
ACT.xsLeave = function () { go('ex'); };
ACT.xsClose = function () { XS = null; go('ex'); };

/* ---------- Exercise hub ---------- */
var EXCATS = [['yoga', 'Yoga & pranayama', 'anulom1', 'exy'], ['gym', 'Gym', 'squat', 'excat/gym'], ['band', 'Resistance band', 'bandrow', 'excat/band'],
  ['cali', 'Calisthenics', 'pushup', 'excat/cali'], ['aero', 'Aerobics', 'jacks', 'excat/aero'], ['sport', 'Walk, run & sports', 'walk', 'exsport']];
function weekThumbs(test) {
  var k0 = today(), d0 = fromKey(k0), mon = addDays(k0, -((d0.getDay() + 6) % 7)), h = '';
  for (var i = 0; i < 7; i++) { var k = addDays(mon, i), fut = k > k0, ok = !fut && test(k); h += '<div class="thd"><i class="' + (ok ? 'ok' : fut ? 'fut' : '') + '">' + (ok ? '👍' : fut ? '?' : '') + '</i><small>' + 'MTWTFSS'[i] + '</small></div>'; }
  return '<div class="thw">' + h + '</div>';
}
function exSchedCard(s) {
  return '<section class="c"><div class="row sb" data-act="go" data-to="psched/' + s.id + '"><div class="f1"><b class="m18">' + esc(s.name) + '</b><div class="l">' + s.items.length + ' ' + (s.items.some(exIsA) ? 'items' : 'pranayama') + ' · ' + Math.round(pschedSec(s) / 60) + ' min' + (s.remind ? ' · ' + icon('bell', 12) + ' ' + t12(s.time) : '') + '</div></div>' + icon('chev', 18) + '</div>' +
    '<button class="btn mt" data-act="psStart" data-id="' + s.id + '">' + icon('play', 18) + 'Start</button><div class="l mt">This week</div>' + weekThumbs(function (k) { return pschedDone(s.id, k); }) + '</section>';
}
ROUTES.ex = function () {
  var k = today(), acts = dayActs(k), min = Math.round(acts.reduce(function (a, y) { return a + (y.min || 0); }, 0)), kc = acts.reduce(function (a, y) { return a + (y.kcal != null ? y.kcal : sessionKcal(y)); }, 0);
  var h = '<header class="xh"><h1>Exercise</h1><div class="l">' + fromKey(k).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + min + ' min today · ' + Math.round(kc) + ' kcal</div></header>';
  if (XS && !XS.done) h += '<button class="tip" data-act="go" data-to="exrun">' + icon('play', 16) + '<span><b>' + esc(XS.name) + '</b> is playing · tap to open</span></button>';
  var list = pscheds();
  h += list.length ? list.map(exSchedCard).join('') : '<button class="empty-s" data-act="psNew">Make your daily schedule (Dincharya): pick pranayama and yoga in your order, set a reminder, and run them all with one Start.</button>';
  if (list.length) h += '<button class="lnk" data-act="psNew">+ New schedule</button>';
  h += '<div class="xgrid">' + EXCATS.map(function (c) { return '<button class="xt" data-act="go" data-to="' + c[3] + '"><span class="xti" style="background-image:url(' + exImg(c[2]) + ')"></span><b>' + c[1] + '</b></button>'; }).join('') + '</div>';
  h += '<button class="res" data-act="go" data-to="exvoice"><span class="actic">' + icon('mic', 18) + '</span><span class="f1">Voice<small>' + (DB.settings.exVoice === false ? 'Off' : exVoiceLabel()) + '</small></span>' + icon('chev', 18) + '</button>';
  h += '<button class="res" data-act="go" data-to="yoga"><span class="actic">' + icon('steps', 18) + '</span><span class="f1">Activity log<small>Everything you did, with calories</small></span>' + icon('chev', 18) + '</button>';
  return h;
};
ACT.psNew = function () { var s = { id: 'ps' + uid(), name: (DB.profile.name ? DB.profile.name.split(' ')[0] + ' ' : '') + 'daily pranayama', items: ['anulom', 'bhramari'], time: '07:15', remind: true }; pscheds().push(s); save(); native('askNotify'); go('psched/' + s.id); };
ACT.psStart = function (el) { var s = pschedById(el.getAttribute('data-id')); if (!s || !s.items.length) return toast('Add something first'); exStart(s.items, s.id, s.name); };
/* reminder "Start now" opens this */
ROUTES.psgo = function (id) { var s = pschedById(id); setTimeout(function () { if (s && s.items.length && !(XS && !XS.done)) exStart(s.items, s.id, s.name); else go(s ? 'psched/' + id : 'ex'); }, 50); return ''; };

/* ---------- Yoga & pranayama ---------- */
var EXY = 'prana';
function pranaDone(k, dk) { return ((dayIf(dk) || {}).yoga || []).some(function (y) { return y.prana === k; }); }
ROUTES.exy = function () {
  var h = head('Yoga & pranayama', 'Real photos, voice guidance, keeps going when the screen is locked');
  h += '<div class="xseg">' + [['prana', 'Pranayama'], ['yoga', 'Yoga'], ['prog', 'My progress']].map(function (t) { return '<button class="' + (EXY === t[0] ? 'on' : '') + '" data-act="exyTab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (EXY === 'prana') {
    var av = {}, rec = {}; try { var P = makePlan(); P.rec.forEach(function (r) { if (r.p.t === 'p') rec[r.p.k] = 1; }); P.avoid.forEach(function (a) { if (a.p.t === 'p') av[a.p.k] = 1; }); } catch (e) { }
    h += PRANA_ORDER.map(function (k) { var p = PRANA[k]; return '<button class="xrow' + (av[k] ? ' dim2' : '') + '" data-act="go" data-to="breath/' + k + '"><span class="xph" style="background-image:url(' + exImg(PIMG[k]) + ')"></span><span class="f1"><b>' + p[0] + '</b><small>' + esc(p[1]) + ' · ' + mmss(pTotal(k, pcfg(k))) + '</small>' + (av[k] ? '<em class="badge off">Careful with BP</em>' : rec[k] ? '<em class="badge">For you</em>' : '') + '</span>' + icon('chev', 18) + '</button>'; }).join('');
  } else if (EXY === 'yoga') {
    var tot = ASANA_ORDER.reduce(function (a, k) { return a + asSec(k); }, 0);
    h += '<section class="c"><b class="m18">Gentle yoga flow</b><div class="l">' + ASANA_ORDER.length + ' poses · ' + Math.round(tot / 60) + ' min · voice tells you when to hold and release</div><button class="btn mt" data-act="exFlow">' + icon('play', 18) + 'Start flow</button></section>';
    h += ASANA_ORDER.map(function (k) { var a = ASANA[k]; return '<button class="xrow" data-act="go" data-to="exa/' + k + '"><span class="xph" style="background-image:url(' + exImg(a[3]) + ')"></span><span class="f1"><b>' + a[0] + '</b><small>' + esc(a[1]) + ' · hold ' + asHold(k) + ' s' + (a[5] ? ' each side' : '') + '</small></span>' + icon('chev', 18) + '</button>'; }).join('');
  } else {
    var ks = PRANA_ORDER.filter(function (k) { for (var i = 0; i < 28; i++) if (pranaDone(k, addDays(today(), -i))) return true; return pscheds().some(function (s) { return s.items.indexOf(k) >= 0; }); });
    h += '<section class="c"><h2>This week</h2>' + (ks.length ? ks.map(function (k) { return '<div class="thrw"><span>' + PRANA[k][0] + '</span>' + weekThumbs(function (dk) { return pranaDone(k, dk); }) + '</div>'; }).join('') : '<p class="l">Do a pranayama and it shows here.</p>') + '</section>';
    h += '<button class="lnk" data-act="go" data-to="breathlog">Full pranayama history →</button>';
  }
  return h;
};
ACT.exyTab = function (el) { EXY = el.getAttribute('data-t'); rerender(); };
ACT.exFlow = function () { exStart(ASANA_ORDER.map(function (k) { return 'a:' + k; }), 'flow', 'Gentle yoga flow'); };

/* pranayama page: photo, your counts, how to, Start */
ROUTES.breath = function (k) {
  var p = PRANA[k]; if (!p) return head('Pranayama') + '<div class="empty-s">Not found.</div>';
  if (!BP || BP.k !== k) BP = { k: k, run: false, el: 0, t: 0, i: 0, done: 0, last: 0 };
  var c = pcfg(k), tot = pTotal(k, c);
  var h = '<div class="xr-hero sm" style="background-image:url(' + exImg(PIMG[k]) + ')"><div class="xr-top"><button class="xr-b" data-act="back">' + icon('back', 20) + ' ' + esc(p[0]) + '</button></div><div class="xr-cap"><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + ' · ' + mmss(tot) + '</span></div></div><div class="pg xr-body">';
  if (c.fast) {
    h += '<section class="c strip"><div class="sgrid s4">' + ['BREATHS/MIN', 'PER ROUND', 'REST (S)', 'ROUNDS'].map(function (l) { return '<span class="l">' + l + '</span>'; }).join('') +
      ['f0', 'f1', 'f2', 'rounds'].map(function (key, j) { return cell(key, key === 'rounds' ? c.rounds : c.fast[j]); }).join('') + '</div></section>';
  } else {
    var sh = pshow(k), labs = sh.map(function (f) { return f === 'r3' && sh.indexOf('r1') >= 0 ? 'HOLD OUT' : PLAB[f]; });
    h += '<section class="c strip"><div class="sgrid" style="grid-template-columns:28px repeat(' + sh.length + ',minmax(0,1fr)) 28px 64px"><span></span>' + labs.map(function (l) { return '<span class="l">' + l + '</span>'; }).join('') + '<span></span><span class="l">ROUNDS</span>' +
      '<button class="sarr" data-act="bLevel" data-d="-1" aria-label="Shorter">‹</button>' + sh.map(function (f, i) { return cell(f, c.r[+f[1]], i < sh.length - 1); }).join('') + '<button class="sarr" data-act="bLevel" data-d="1" aria-label="Longer">›</button>' + cell('rounds', c.rounds) + '</div></section>';
  }
  try { h += planNote(k) || ''; } catch (e) { }
  h += '<button class="btn big" data-act="exOne" data-k="' + k + '">' + icon('play', 20) + 'Start · ' + mmss(tot) + '</button>';
  h += '<section class="c"><h2>How to do it</h2><p class="p">' + esc(p[8]) + '</p>' + (p[9] ? '<div class="note warn mt">' + esc(p[9]) + '</div>' : '') + '</section>';
  h += '<section class="c"><h2>My progress</h2>' + weekThumbs(function (dk) { return pranaDone(k, dk); }) + '</section>';
  h += '<button class="btn sec" data-act="exAddTo" data-k="' + k + '">' + icon('plus', 18) + 'Add to a schedule</button></div>';
  return h;
};
ROUTES.breath.after = null;
ACT.exOne = function (el) { var k = el.getAttribute('data-k'); exStart([k], 'one-' + k, exName(k)); };
ACT.exAddTo = function (el) {
  var k = el.getAttribute('data-k'), L = pscheds();
  if (!L.length) { ACT.psNew(); var s = pscheds()[pscheds().length - 1]; s.items = [k]; save(); return; }
  sheet('<h2>Add ' + esc(exName(k)) + ' to</h2>' + L.map(function (s) { return '<button class="res" data-act="exAddGo" data-id="' + s.id + '" data-k="' + k + '"><span class="f1">' + esc(s.name) + '<small>' + s.items.length + ' items</small></span>' + icon('plus', 18) + '</button>'; }).join(''));
};
ACT.exAddGo = function (el) { var s = pschedById(el.getAttribute('data-id')); s.items.push(el.getAttribute('data-k')); save(); sheet(null); toast('Added to ' + s.name); };

/* yoga pose page */
ROUTES.exa = function (k) {
  var a = ASANA[k]; if (!a) return head('Yoga') + '<div class="empty-s">Not found.</div>';
  var h = '<div class="xr-hero sm" style="background-image:url(' + exImg(a[3]) + ')"><div class="xr-top"><button class="xr-b" data-act="back">' + icon('back', 20) + ' ' + esc(a[0]) + '</button></div><div class="xr-cap"><b>' + esc(a[0]) + '</b><span>' + esc(a[1]) + '</span></div></div><div class="pg xr-body">';
  h += '<section class="c"><div class="row sb"><div><div class="l">Hold' + (a[5] ? ' (each side)' : '') + '</div><b class="m22">' + asHold(k) + ' sec</b></div><div class="row g10"><button class="ib sm" data-act="exHold" data-k="' + k + '" data-d="-10" aria-label="Shorter">−</button><button class="ib sm" data-act="exHold" data-k="' + k + '" data-d="10" aria-label="Longer">+</button></div></div></section>';
  h += '<button class="btn big" data-act="exOne" data-k="a:' + k + '">' + icon('play', 20) + 'Start · ' + mmss(asSec(k)) + '</button>';
  h += '<section class="c"><h2>How to do it</h2><p class="p">' + esc(a[4]) + '</p>' + (a[6] ? '<div class="note warn mt">' + esc(a[6]) + '</div>' : '') + '</section>';
  h += '<button class="btn sec" data-act="exAddTo" data-k="a:' + k + '">' + icon('plus', 18) + 'Add to a schedule</button></div>';
  return h;
};
ACT.exHold = function (el) { var k = el.getAttribute('data-k'); DB.asana = DB.asana || {}; DB.asana[k] = { hold: clamp(asHold(k) + +el.getAttribute('data-d'), 10, 300) }; save(); rerender(); };

/* schedule editor: pranayama and yoga, in your order */
ROUTES.psched = function (id) {
  var s = pschedById(id); if (!s) return head('Schedule') + '<div class="empty-s">Not found.</div>';
  var h = head('My schedule', 'Dincharya');
  h += '<section class="c"><label class="fld">Name<input data-chg="psName" data-id="' + id + '" value="' + esc(s.name) + '"></label></section>';
  h += '<section class="c"><div class="row sb"><h2>In this order</h2><span class="l">' + mmss(pschedSec(s)) + '</span></div>' +
    (s.items.length ? s.items.map(function (k, i) {
      var sub; if (exIsA(k)) sub = 'Yoga · hold ' + asHold(k.slice(2)) + ' s'; else { var c = pcfg(k); sub = c.fast ? c.rounds + ' rounds × ' + c.fast[1] : pshow(k).map(function (f) { return c.r[+f[1]]; }).join(' : ') + ' × ' + c.rounds; }
      return '<div class="psrow"><span class="xph sm" style="background-image:url(' + exImg(exPhoto(k)) + ')"></span><button class="psm" data-act="go" data-to="' + (exIsA(k) ? 'exa/' + k.slice(2) : 'breath/' + k) + '"><b>' + esc(exName(k)) + '</b><small>' + sub + ' · ' + mmss(exSec(k)) + '</small></button><button class="ib sm" data-act="psMove" data-id="' + id + '" data-i="' + i + '" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button class="ib sm" data-act="psMove" data-id="' + id + '" data-i="' + i + '" data-d="1" aria-label="Move down"' + (i < s.items.length - 1 ? '' : ' disabled') + '>↓</button><button class="ib sm" data-act="psDel" data-id="' + id + '" data-i="' + i + '" aria-label="Remove">✕</button></div>';
    }).join('') : '<div class="l mt6">Add what you do.</div>') +
    '<button class="btn sec mt" data-act="psAdd" data-id="' + id + '">' + icon('plus', 18) + 'Add</button></section>';
  h += '<section class="c"><h2>Daily reminder</h2><div class="row g10 mt"><label class="fld f1">Time<input type="time" data-chg="psTime" data-id="' + id + '" value="' + s.time + '"></label></div>' + '<button class="tog" data-act="psRemind" data-id="' + id + '" role="switch" aria-checked="' + !!s.remind + '"><span>Remind me every day, with Start</span><i class="' + (s.remind ? 'on' : '') + '"></i></button></section>';
  var k0 = today(), wk = 0, mo = 0, streak = 0, still = true;
  for (var i = 0; i < 30; i++) { var dk = addDays(k0, -i), d = pschedDone(id, dk); if (d) { mo++; if (i < 7) wk++; } if (still) { if (d) streak++; else if (i > 0) still = false; } }
  h += '<section class="c"><h2>My progress</h2>' + weekThumbs(function (dk) { return pschedDone(id, dk); }) + '<div class="g3 mt"><div><div class="l">Last 7 days</div><b class="m18">' + wk + ' / 7</b></div><div><div class="l">30 days</div><b class="m18">' + mo + '</b></div><div><div class="l">Streak</div><b class="m18">' + streak + ' d</b></div></div></section>';
  h += '<button class="btn big" data-act="psStart" data-id="' + id + '">' + icon('play', 20) + 'Start</button><button class="lnk" data-act="psRemove" data-id="' + id + '">Delete this schedule</button>';
  return h;
};
CHG.psTime = function (el) { pschedById(el.getAttribute('data-id')).time = el.value || '07:15'; save(); syncMeds(); };
ACT.psRemind = function (el) { var s = pschedById(el.getAttribute('data-id')); s.remind = !s.remind; save(); syncMeds(); if (s.remind) native('askNotify'); rerender(); };
ACT.psAdd = function (el) {
  var id = el.getAttribute('data-id');
  sheet('<h2>Add pranayama</h2><div class="chips">' + PRANA_ORDER.map(function (k) { return '<button class="chip" data-act="psPick" data-id="' + id + '" data-k="' + k + '">' + PRANA[k][0] + '</button>'; }).join('') + '</div>' +
    '<h2 class="mt">Add yoga</h2><div class="chips">' + ASANA_ORDER.map(function (k) { return '<button class="chip" data-act="psPick" data-id="' + id + '" data-k="a:' + k + '">' + ASANA[k][0] + '</button>'; }).join('') + '</div>');
};
ACT.psRemove = function (el) { var id = el.getAttribute('data-id'); DB.psched = pscheds().filter(function (s) { return s.id !== id; }); save(); syncMeds(); go('ex'); };

/* ---------- other categories (guided workouts next; log for now) ---------- */
var EXSOON = { gym: ['Gym', 'squat', 'gym', 'Sets × reps × weight for each machine and free weight, a rest timer that speaks, and what you lifted last time.'],
  band: ['Resistance band', 'bandrow', 'gym', 'Band rows, presses, curls and leg work with sets, reps and a spoken rest timer.'],
  cali: ['Calisthenics', 'pushup', 'gym', 'Push-ups, squats, planks and lunges with reps or timed holds, guided by voice.'],
  aero: ['Aerobics', 'jacks', 'other', 'Timed rounds of jumping jacks, high knees, step-ups and more, with voice counting work and rest.'] };
ROUTES.excat = function (id) {
  var c = EXSOON[id]; if (!c) return ROUTES.ex();
  return '<div class="xr-hero sm" style="background-image:url(' + exImg(c[1]) + ')"><div class="xr-top"><button class="xr-b" data-act="back">' + icon('back', 20) + ' ' + c[0] + '</button></div><div class="xr-cap"><b>' + c[0] + '</b><span>Guided workouts are next</span></div></div><div class="pg xr-body">' +
    '<section class="c"><h2>Coming in the next update</h2><p class="p">' + c[3] + '</p></section>' +
    '<button class="btn big" data-act="exLog" data-a="' + (id === 'aero' ? 'dance' : 'gym') + '" data-n="' + c[0] + '">' + icon('plus', 20) + 'Log a ' + c[0].toLowerCase() + ' session</button></div>';
};
var SPORTS = [['walk', 'Walk', ''], ['brisk', 'Brisk walk', ''], ['run', 'Running', ''], ['cycle', 'Cycling', ''], ['swim', 'Swimming', ''], ['sport', 'Cricket', 'Cricket'], ['sport', 'Badminton', 'Badminton'], ['sport', 'Football', 'Football'], ['sport', 'Tennis', 'Tennis'], ['sport', 'Table tennis', 'Table tennis'], ['dance', 'Dance', ''], ['stairs', 'Stairs', '']];
ROUTES.exsport = function () {
  var h = '<div class="xr-hero sm" style="background-image:url(' + exImg('walk') + ')"><div class="xr-top"><button class="xr-b" data-act="back">' + icon('back', 20) + ' Walk, run & sports</button></div><div class="xr-cap"><b>Walk, run & sports</b><span>Watch workouts come in by themselves</span></div></div><div class="pg xr-body">';
  h += '<section class="c"><h2>Log what you did</h2><div class="chips mt">' + SPORTS.map(function (s) { return '<button class="chip" data-act="exLog" data-a="' + s[0] + '" data-n="' + s[2] + '">' + s[1] + '</button>'; }).join('') + '</div></section>';
  var w = []; for (var i = 0; i < 7; i++) { var k = addDays(today(), -i); try { watchSessions(k).forEach(function (s) { w.push(s); }); } catch (e) { } }
  h += '<section class="c"><h2>From your watch · last 7 days</h2>' + (w.length ? w.slice(0, 12).map(function (s) { return '<div class="rd"><span>' + esc(s.name) + ' · ' + new Date(s.t).toLocaleDateString('en-IN', { weekday: 'short' }) + ' ' + hm(s.start || s.t) + '</span><b>' + Math.round(s.min) + ' min</b></div>'; }).join('') : '<p class="l">Nothing yet. Workouts recorded on your Galaxy Watch or Samsung Health show here and in Activity.</p>') + '</section></div>';
  return h;
};
ACT.exLog = function (el) { ACT.logAct(el); var n = el.getAttribute('data-n'); if (n && LA) { LA.name = n; actSheet(); } };

/* ---------- voice: Gemini natural voice (recorded once), else the best phone voice ---------- */
var GVOICES = [['Kore', 'Calm, female'], ['Aoede', 'Soft, female'], ['Charon', 'Warm, male'], ['Iapetus', 'Clear, male']];
var VSAMPLE = 'Breathe in through the left nostril';
function exPhrases() {
  var seen = {}, out = [];
  var add = function (st) { st.forEach(function (s) { if (s.say && !seen[s.say]) { seen[s.say] = 1; out.push(s.say); } }); };
  PRANA_ORDER.forEach(function (k) { add(buildSteps([k])); });
  pscheds().forEach(function (s) { add(buildSteps(s.items)); });
  add(buildSteps(ASANA_ORDER.map(function (k) { return 'a:' + k; })));
  return out;
}
function clipHave() { try { var a = JSON.parse(native('clipList') || '[]'), m = {}; a.forEach(function (k) { m[k] = 1; }); return m; } catch (e) { return {}; } }
function exVoiceLabel() { var have = clipHave(), ph = exPhrases(), n = ph.filter(function (t) { return have[vKey(t)]; }).length; return n >= ph.length * 0.9 ? 'natural (' + (DB.settings.gvoice || 'Kore') + ')' : n ? 'natural, ' + n + ' of ' + ph.length + ' recorded' : 'phone voice'; }
var VREC = null;
ROUTES.exvoice = function () {
  var on = DB.settings.exVoice !== false, have = clipHave(), ph = exPhrases(), n = ph.filter(function (t) { return have[vKey(t)]; }).length, gv = DB.settings.gvoice || 'Kore';
  var h = head('Voice', 'What you hear during a session');
  h += '<section class="c"><button class="tog" data-act="exVoiceTog" role="switch" aria-checked="' + on + '"><span>Speak the steps</span><i class="' + (on ? 'on' : '') + '"></i></button><div class="l mt6">Off: a soft beep marks each step instead.</div></section>';
  h += '<section class="c"><h2>Natural voice</h2><p class="p">Gemini records each instruction once in a human voice. After that it plays offline, even with the screen locked.</p>' +
    '<div class="chips mt">' + GVOICES.map(function (v) { return '<button class="chip' + (gv === v[0] ? ' dk' : '') + '" data-act="exGv" data-v="' + v[0] + '">' + v[0] + ' · ' + v[1] + '</button>'; }).join('') + '</div>' +
    '<div class="l mt">' + n + ' of ' + ph.length + ' phrases recorded in ' + gv + '</div>' + bar(n / Math.max(1, ph.length) * 100) +
    (VREC ? '<div class="note mt">' + esc(VREC.msg) + '</div>' : '') +
    (!DB.settings.gkey ? '<div class="note warn mt">Add your Gemini key in Settings first.</div><button class="btn sec mt" data-act="go" data-to="settings">Open Settings</button>' :
      '<div class="row g10 mt"><button class="btn sec f1" data-act="exGvTry">' + icon('play', 18) + 'Hear sample</button><button class="btn f1" data-act="exGvRec"' + (VREC && VREC.busy ? ' disabled' : '') + '>' + icon('mic', 18) + (n >= ph.length ? 'Re-check' : n ? 'Record the rest' : 'Record all') + '</button></div>') +
    (n ? '<button class="lnk" data-act="exGvClear">Delete recorded voice</button>' : '') + '</section>';
  var vs = []; try { vs = JSON.parse(native('ttsVoices') || '[]'); } catch (e) { }
  var pref = {}; try { pref = JSON.parse(native('voicePref') || '{}'); } catch (e) { }
  vs.sort(function (a, b) { return (b.loc === 'IN') - (a.loc === 'IN') || (a.net - b.net) || b.q - a.q; });
  h += '<section class="c"><h2>Phone voice</h2><p class="p">Used for anything not recorded yet. Pick the one that sounds most natural to you.</p>' +
    (vs.length ? '<div class="chips mt">' + ['', 0].slice(0, 1).map(function () { return '<button class="chip' + (!pref.voice ? ' dk' : '') + '" data-act="exTts" data-n="">Default</button>'; }).join('') + vs.slice(0, 16).map(function (v, i) { return '<button class="chip' + (pref.voice === v.name ? ' dk' : '') + '" data-act="exTts" data-n="' + esc(v.name) + '">' + (v.loc === 'IN' ? 'Indian' : v.loc === 'GB' ? 'British' : v.loc === 'US' ? 'American' : v.loc || 'English') + ' ' + (i + 1) + (v.q >= 400 ? ' · HD' : '') + (v.net ? ' · online' : '') + '</button>'; }).join('') + '</div>' : '<p class="l mt6">Phone voices show here in the app.</p>') +
    '<div class="l mt">Speed</div><div class="chips">' + [[0.8, 'Slow'], [0.9, 'Calm'], [1, 'Normal']].map(function (r) { return '<button class="chip' + (Math.abs((pref.rate || 0.9) - r[0]) < 0.01 ? ' dk' : '') + '" data-act="exRate" data-r="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</div></section>';
  return h;
};
ACT.exVoiceTog = function () { DB.settings.exVoice = DB.settings.exVoice === false; save(); rerender(); };
ACT.exGv = function (el) { DB.settings.gvoice = el.getAttribute('data-v'); save(); VREC = null; rerender(); };
ACT.exTts = function (el) { var p = {}; try { p = JSON.parse(native('voicePref') || '{}'); } catch (e) { } native('ttsUse', el.getAttribute('data-n'), p.rate || 0.9, VSAMPLE); setTimeout(rerender, 100); };
ACT.exRate = function (el) { var p = {}; try { p = JSON.parse(native('voicePref') || '{}'); } catch (e) { } native('ttsUse', p.voice || '', +el.getAttribute('data-r'), VSAMPLE); setTimeout(rerender, 100); };
ACT.exGvClear = function () { native('clipClear'); toast('Recorded voice deleted'); rerender(); };
var TTSM = null;
function ttsModel() {
  if (TTSM) return Promise.resolve(TTSM);
  return http('GET', GBASE + 'models?pageSize=200', { 'x-goog-api-key': DB.settings.gkey }).then(function (r) {
    var d = JSON.parse(r.text || '{}'); if (r.status !== 200) throw new Error((d.error && d.error.message) || 'HTTP ' + r.status);
    var l = (d.models || []).map(function (m) { return m.name.replace(/^models\//, ''); }).filter(function (n) { return /tts/.test(n) && (DB.settings.gbadTts || []).indexOf(n) < 0; });
    l.sort(function (a, b) { return (/flash/.test(b) - /flash/.test(a)) || (gVer(b) - gVer(a)); });
    if (!l.length) throw new Error('NOTTS'); TTSM = l; return l;
  });
}
/* one phrase → PCM from Gemini → WAV on the phone */
function gSpeak(text, mi) {
  mi = mi || 0;
  return ttsModel().then(function (L) {
    var m = L[mi]; if (!m) throw new Error('NOTTS');
    var body = { contents: [{ parts: [{ text: 'Say this slowly and calmly, in a warm, gentle voice, like a yoga teacher guiding a breathing practice, with a light Indian English accent: ' + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: DB.settings.gvoice || 'Kore' } } } } };
    return http('POST', GBASE + 'models/' + m + ':generateContent', { 'content-type': 'application/json', 'x-goog-api-key': DB.settings.gkey }, JSON.stringify(body)).then(function (r) {
      if (r.status === 404 || (r.status === 429 && /limit:\s*0\b/.test(r.text)) || r.status === 400) { if (L[mi + 1]) return gSpeak(text, mi + 1); throw new Error(r.status === 429 ? 'NOFREE' : 'HTTP ' + r.status); }
      if (r.status === 429) { var w = (r.text.match(/retryDelay"\s*:\s*"(\d+)/) || [])[1]; var e = new Error('WAIT'); e.wait = Math.min(70, +(w || 30)) * 1000; e.day = /per day|PerDay/i.test(r.text); throw e; }
      if (r.status !== 200) throw new Error('HTTP ' + r.status);
      var d = JSON.parse(r.text), p = ((((d.candidates || [])[0] || {}).content || {}).parts || []).filter(function (x) { return x.inlineData || x.inline_data; })[0];
      if (!p) throw new Error('No audio');
      var id = p.inlineData || p.inline_data, rate = +((id.mimeType || id.mime_type || '').match(/rate=(\d+)/) || [0, 24000])[1];
      if (!native('clipSave', vKey(text), id.data, rate)) throw new Error('Could not save');
      return true;
    });
  });
}
ACT.exGvTry = function () {
  var k = vKey(VSAMPLE);
  if (native('clipPlay', k)) return;
  VREC = { busy: true, msg: 'Recording a sample…' }; rerender();
  gSpeak(VSAMPLE).then(function () { VREC = null; native('clipPlay', k); rerender(); }).catch(vErr);
};
function vErr(e) {
  var m = e.message;
  VREC = { busy: false, msg: m === 'NOFREE' ? 'Your Gemini plan does not include speech. The phone voice will be used.' : m === 'NOTTS' ? 'No Gemini speech model is available on your key. The phone voice will be used.' : e.day ? 'Today\'s Gemini speech limit is used up. Tap Record the rest tomorrow; until then the phone voice fills the gaps.' : 'Could not record: ' + m };
  if (cur.name === 'exvoice') rerender();
}
ACT.exGvRec = function () {
  if (!(AND && AND.clipSave)) return toast('Recording works in the app on your phone');
  var have = clipHave(), todo = exPhrases().filter(function (t) { return !have[vKey(t)]; }), done = 0;
  if (!todo.length) { VREC = { busy: false, msg: 'Everything is recorded.' }; return rerender(); }
  VREC = { busy: true, msg: 'Recording 0 of ' + todo.length + '… you can leave this screen.' }; rerender();
  (function next() {
    if (!todo.length) { VREC = { busy: false, msg: 'Done. ' + done + ' phrases recorded.' }; feel('done'); if (cur.name === 'exvoice') rerender(); return; }
    var t = todo[0];
    gSpeak(t).then(function () { todo.shift(); done++; VREC.msg = 'Recording ' + done + ' of ' + (done + todo.length) + '… you can leave this screen.'; if (cur.name === 'exvoice') rerender(); setTimeout(next, 700); })
      .catch(function (e) { if (e.message === 'WAIT' && !e.day) { VREC.msg = 'Gemini asked to slow down. Continuing in ' + Math.round(e.wait / 1000) + ' s… (' + done + ' done)'; if (cur.name === 'exvoice') rerender(); setTimeout(next, e.wait); } else vErr(e); });
  })();
};
