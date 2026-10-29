/* Sleep: last night in detail (like Samsung Health), your own sleep log when the watch is off, week/month averages */
'use strict';
/* manual nights are saved by wake-up date: DB.sleepLog[k] = { start, end, q (1–5), note } */
function manualSleep(k) {
  var s = (DB.sleepLog || {})[k]; if (!s) return null;
  var asleep = Math.max(0, (s.end - s.start) / 60000 - (s.awake || 0)), q = s.q || 3;
  var score = clamp(Math.round(ownSleepScore(asleep, 0.15, 0.2, 0.05) * (0.7 + q * 0.06)), 0, 100);
  return { start: s.start, end: s.end, total: (s.end - s.start) / 60000, asleep: asleep, m: { awake: s.awake || 0, rem: 0, light: 0, deep: 0 }, staged: asleep || 1, score: score, scoreSrc: 'You', stages: [], manual: true, q: q, note: s.note || '' };
}
var SLQ = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Great'];
var SL = null;
ACT.logSleep = function (el) {
  var k = (el && el.getAttribute && el.getAttribute('data-k')) || today(), s = (DB.sleepLog || {})[k], prev = addDays(k, -1);
  var bed = s ? new Date(s.start) : null, wake = s ? new Date(s.end) : null;
  SL = { k: k, bed: bed ? pad(bed.getHours()) + ':' + pad(bed.getMinutes()) : '23:30', wake: wake ? pad(wake.getHours()) + ':' + pad(wake.getMinutes()) : '06:30', q: s ? s.q : 3, awake: s ? s.awake || 0 : 0 };
  sheet('<h2>Log sleep</h2><div class="l">For the night ending ' + niceDate(k) + '. Use this when you didn\'t wear the watch.</div>' +
    '<div class="g2 mt"><label class="fld">Went to sleep<input type="time" id="slb" value="' + SL.bed + '"></label><label class="fld">Woke up<input type="time" id="slw" value="' + SL.wake + '"></label></div>' +
    '<div class="l mt">Awake in the night</div><div class="chips">' + [0, 10, 20, 30, 60].map(function (m) { return '<button class="chip' + (SL.awake === m ? ' dk' : '') + '" data-act="slAw" data-m="' + m + '">' + (m ? m + ' min' : 'None') + '</button>'; }).join('') + '</div>' +
    '<div class="l mt">How did you sleep?</div><div class="chips">' + [1, 2, 3, 4, 5].map(function (q) { return '<button class="chip' + (SL.q === q ? ' dk' : '') + '" data-act="slQ" data-q="' + q + '">' + SLQ[q] + '</button>'; }).join('') + '</div>' +
    '<div class="g2 mt"><button class="btn sec" data-act="closeSheet">Cancel</button><button class="btn" data-act="slSave">Save</button></div>' + (s ? '<button class="lnk" data-act="slDel">Delete this entry</button>' : ''));
};
ACT.slAw = function (el) { SL.awake = +el.getAttribute('data-m'); document.querySelectorAll('[data-act=slAw]').forEach(function (b) { b.className = 'chip' + (+b.getAttribute('data-m') === SL.awake ? ' dk' : ''); }); };
ACT.slQ = function (el) { SL.q = +el.getAttribute('data-q'); document.querySelectorAll('[data-act=slQ]').forEach(function (b) { b.className = 'chip' + (+b.getAttribute('data-q') === SL.q ? ' dk' : ''); }); };
ACT.slSave = function () {
  var b = document.getElementById('slb').value.split(':').map(Number), w = document.getElementById('slw').value.split(':').map(Number);
  var end = fromKey(SL.k); end.setHours(w[0], w[1], 0, 0);
  var start = fromKey(SL.k); start.setHours(b[0], b[1], 0, 0); if (start >= end) start.setDate(start.getDate() - 1);
  if ((end - start) / 3600000 > 16) return toast('That is more than 16 hours. Check the times.');
  DB.sleepLog = DB.sleepLog || {}; DB.sleepLog[SL.k] = { start: start.getTime(), end: end.getTime(), q: SL.q, awake: SL.awake };
  save(); sheet(null); rerender(); toast('Sleep saved · ' + dur((end - start) / 60000 - SL.awake));
};
ACT.slDel = function () { delete DB.sleepLog[SL.k]; save(); sheet(null); rerender(); };

/* one night in detail */
function nightCard(k, big) {
  var sl = sleepFor(k);
  if (!sl) return '<section class="c"><h2>Sleep · ' + niceDate(k) + '</h2><div class="l">No sleep recorded for this night.</div><button class="btn sec mt" data-act="logSleep" data-k="' + k + '">' + icon('moon', 18) + 'Log sleep myself</button></section>';
  var m = sl.m, s = sl.staged, pc = function (x) { return Math.round(x / s * 100); }, eff = Math.round(sl.asleep / sl.total * 100);
  var h = '<section class="c"><div class="row sb"><div><div class="l">' + niceDate(k) + ' · ' + hm(sl.start) + ' – ' + hm(sl.end) + '</div><b class="m30">' + dur(sl.asleep) + '</b><div class="l">asleep' + (sl.manual ? ' · logged by you' : '') + '</div></div><div class="r"><b class="m30">' + sl.score + '</b><div class="l">sleep score</div></div></div>';
  if (!sl.manual) {
    h += hypno(sl) + stage('Awake', pc(m.awake), m.awake, '#E4577A') + stage('REM', pc(m.rem), m.rem, '#9C8BE0') + stage('Light', pc(m.light), m.light, '#6B4FBF') + stage('Deep', pc(m.deep), m.deep, '#2E1F7A');
    var sp = spo2Night(k);
    h += '<div class="g3 mt"><div><div class="l">Time in bed</div><b>' + dur(sl.total) + '</b></div><div><div class="l">Efficiency</div><b>' + eff + '%</b></div><div><div class="l">Blood oxygen</div><b>' + (sp ? sp.avg + '%' : '—') + '</b></div></div>';
    var note = []; if (pc(m.deep) < 13) note.push('Deep sleep ' + pc(m.deep) + '% is under the usual 13–23%.'); if (pc(m.rem) < 18) note.push('REM ' + pc(m.rem) + '% is a little low (usual 20–25%).'); if (pc(m.awake) > 12) note.push('A lot of time awake.');
    if (note.length) h += '<div class="purplebg">' + esc(note.join(' ')) + '</div>';
  } else h += '<div class="rd"><span>How you slept</span><b>' + SLQ[sl.q] + '</b></div><div class="rd"><span>Awake in the night</span><b>' + (m.awake ? dur(m.awake) : 'none') + '</b></div><button class="lnk" data-act="logSleep" data-k="' + k + '">Edit</button>';
  return h + '</section>';
}
ROUTES.sleep = function (k) {
  k = k || today();
  var h = head('Sleep', 'Night by night, with averages');
  var days = []; for (var i = 0; i < 7; i++) days.push(addDays(today(), -i));
  h += '<div class="days">' + days.slice().reverse().map(function (dk) { var s = sleepFor(dk); return '<button class="day' + (dk === k ? ' on' : '') + '" data-act="go" data-to="sleep/' + dk + '">' + DOW[fromKey(dk).getDay()].slice(0, 3) + '<b>' + fromKey(dk).getDate() + '</b><i style="background:' + (s ? (s.asleep >= 420 ? 'var(--g)' : 'var(--warn)') : 'transparent') + '"></i></button>'; }).join('') + '</div>';
  h += nightCard(k, true);
  if (sleepFor(k)) h += '<button class="lnk" data-act="logSleep" data-k="' + k + '">+ Log or correct sleep myself</button>';
  h += trendBlock('sleep', { title: 'Average sleep' });
  var b = []; for (i = 0; i < 30; i++) { var s = sleepFor(addDays(today(), -i)); if (s) b.push(s); }
  if (b.length >= 3) {
    var bed = dayAvg(b.map(function (x) { var mm = minOfDay(x.start); return mm < 720 ? mm + 1440 : mm; })), wk = dayAvg(b.map(function (x) { return minOfDay(x.end); }));
    h += '<section class="c"><h2>Your rhythm · last 30 days</h2><div class="g3 mt"><div><div class="l">Usual bedtime</div><b>' + hmMin(bed) + '</b></div><div><div class="l">Usual wake</div><b>' + hmMin(wk) + '</b></div><div><div class="l">Avg score</div><b>' + Math.round(dayAvg(b.map(function (x) { return x.score; }))) + '</b></div></div></section>';
  }
  h += trendBlock('sleepscore', { title: 'Sleep score' });
  return h;
};
TABOF.sleep = 'vitals';
