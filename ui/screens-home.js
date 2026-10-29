/* Home dashboard, water, vitals, BP and sugar */
'use strict';
function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function liveChip() {
  var h = DB.health;
  if (!AND) return '<span class="live off">Phone data off in browser</span>';
  if (!h || h.status !== 'ok') return '<button class="live off" data-act="connectHealth">Connect watch data</button>';
  return '<button class="live" data-act="refreshHealth"><i></i>Watch · ' + ago(DB.healthAt) + '</button>';
}
ROUTES.home = function () {
  var k = today(), b = budgetFor(k), t = dayTotals(k), tg = macroTargets(), left = b.total - t.kcal, pct = t.kcal / b.total * 100;
  var name = DB.profile.name ? ', ' + esc(DB.profile.name.split(' ')[0]) : '';
  var h = '<header class="row sb"><div><div class="l">' + DOWL[new Date().getDay()] + ', ' + new Date().getDate() + ' ' + MON[new Date().getMonth()] + '</div><h1 class="big">' + greet() + name + '</h1></div>' + liveChip() + '</header>';
  h += '<section class="c"><div class="row g16"><div class="ringbox" data-act="go" data-to="food">' + ring(pct, 132, 12, left < 0 ? 'var(--bad)' : 'var(--g)', '<text x="66" y="64" text-anchor="middle" class="rt1">' + n0(Math.abs(left)) + '</text><text x="66" y="84" text-anchor="middle" class="rt2">kcal ' + (left < 0 ? 'over' : 'left') + '</text>') + '</div>' +
    '<div class="col g10 f1"><div><div class="l">Budget</div><b class="m16">' + n0(b.base) + '</b></div>' + (b.earned ? '<div><div class="l">+ Burned by activity</div><b class="m16 gtxt">+' + n0(b.earned) + '</b></div>' : '') + (b.carry ? '<div><div class="l">− Balancing yesterday</div><b class="m16 warnt">−' + n0(b.carry) + '</b></div>' : '') + '<div><div class="l">− Eaten</div><b class="m16">' + n0(t.kcal) + '</b></div></div></div>' +
    '<div class="g2 mt">' + macroRow('Protein', t.p, tg.p, 'g') + macroRow('Carbs', t.c, tg.c, 'g') + macroRow('Fat', t.f, tg.f, 'g') + macroRow('Fibre', t.fi, tg.fi, 'g') + '</div></section>';
  var cr = coachRules(k), tip = nowTip(cr, t, tg, b);
  h += '<section class="c dark" data-act="go" data-to="coach"><div class="kick">' + icon('spark', 16) + 'COACH · RIGHT NOW</div><p class="p15">' + esc(tip) + '</p><span class="lnk mint">See today\'s full read →</span></section>';
  var st = stepsFor(k), sl = sleepFor(k), en = energyFor(k), hr = latestHr(), hd = hrDay(k);
  h += '<div class="g2">';
  h += tile('Steps', st != null ? n0(st) : '—', st != null ? bar(st / 100) + '<div class="l mt6">of 10,000' + (DB.health && DB.health.distance && DB.health.distance[k] ? ' · ' + n1(DB.health.distance[k] / 1000) + ' km' : '') + '</div>' : '<div class="l">Connect watch</div>', 'vitals');
  h += tile('Sleep score', sl ? sl.score + ' <small>/100</small>' : '—', sl ? '<div class="l mt6">' + dur(sl.asleep) + ' · deep ' + Math.round(sl.m.deep / sl.staged * 100) + '%</div>' : '<div class="l">No sleep data yet</div>', 'vitals');
  h += tile('Energy score', en != null ? en : '—', '<div class="l mt6">' + (en == null ? 'No score yet today' : en >= 80 ? 'Good · go for it' : en >= 60 ? 'Fair · go easy after 4 pm' : 'Low · rest more today') + '</div>', 'vitals');
  h += tile('Heart rate', hr ? hr.bpm + ' <small>bpm</small>' : hd ? hd.avg + ' <small>avg</small>' : '—', hr ? '<div class="l mt6">' + hm(hr.t) + (hd ? ' · ' + hd.min + '–' + hd.max + ' today' : '') + '</div>' : '<div class="l">No reading yet</div>', 'vitals');
  h += '</div>';
  h += waterCard(true);
  var bp = merged('bp')[0], su = merged('sugar')[0];
  h += '<div class="g2">';
  h += bp ? tile('BP · ' + (Date.now() - bp.t < 86400000 ? hm(bp.t) : ago(bp.t)), bp.sys + '/' + bp.dia, '<div class="st ' + bpLabel(bp.sys, bp.dia)[1] + '">' + bpLabel(bp.sys, bp.dia)[0] + '</div>', 'bp') : tile('Blood pressure', '—', '<button class="lnk" data-act="logBp">+ Log BP</button>');
  h += su ? tile((su.type === 'fasting' ? 'Fasting' : su.type === 'pp' ? 'After meal' : 'Random') + ' sugar', su.val + ' <small>mg/dL</small>', '<div class="st ' + sugarLabel(su.val, su.type)[1] + '">' + sugarLabel(su.val, su.type)[0] + '</div>', 'sugar') : tile('Blood sugar', '—', '<button class="lnk" data-act="logSugar">+ Log sugar</button>');
  h += '</div>';
  var w = merged('weight'), wk = w[0], wprev = w.filter(function (x) { return wk && x.t < wk.t - 6 * 86400000; })[0];
  var ym = yogaMin(k);
  h += '<section class="c row sb"><div data-act="go" data-to="weight"><div class="l">Weight</div><b class="m22">' + (wk ? n1(wk.kg) + ' kg' : '—') + '</b><div class="sm gtxt">' + (wk && wprev ? (wk.kg <= wprev.kg ? '−' : '+') + n1(Math.abs(wk.kg - wprev.kg)) + ' kg this week · ' : '') + 'goal ' + n1(DB.profile.goal) + '</div></div>' +
    '<div class="r" data-act="go" data-to="yoga"><div class="l">Yoga today</div><b class="m22">' + ym + ' / ' + yogaGoal() + ' min</b><div class="sm gtxt">' + (ym >= yogaGoal() ? 'Done today' : 'Start your routine') + '</div></div></section>';
  return h;
};
function tile(label, val, extra, to) { return '<section class="c tile"' + (to ? ' data-act="go" data-to="' + to + '"' : '') + '><div class="l">' + label + '</div><b class="m24">' + val + '</b>' + (extra || '') + '</section>'; }
function nowTip(cr, t, tg, b) {
  var hr = new Date().getHours(), left = b.total - t.kcal;
  if (!dayItems(today()).length && hr >= 10) return 'Nothing logged today yet. Log breakfast now so I can plan the rest of your day.';
  if (left < 0) return 'You\'re ' + n0(-left) + ' kcal over today. Keep dinner to dal + sabzi without roti or rice, and walk 20 minutes after it.';
  if (hr >= 15 && t.p < tg.p * 0.6) return 'Protein is at ' + Math.round(t.p / tg.p * 100) + '% with dinner left. Make dinner moong dal chilla ×2 with curd: about 400 kcal and +25 g protein.';
  if (waterMl(today()) < waterPace() - DB.settings.water.glass) return 'You\'re ' + Math.round((waterPace() - waterMl(today())) / DB.settings.water.glass) + ' glasses behind on water. Have one now.';
  return cr.body[0] || cr.plan[0] || 'All on track. Keep going.';
}

/* ---------- water ---------- */
function waterCard(compact) {
  var k = today(), w = DB.settings.water, ml = waterMl(k), pct = clamp(ml / w.goal * 100, 0, 100), behind = waterPace() - ml;
  var fill = 66 - pct * 0.58;
  var glass = '<svg width="54" height="70" viewBox="0 0 54 70" aria-hidden="true"><defs><clipPath id="gc"><path d="M5 5h44l-5 60H10z"/></clipPath></defs><path d="M4 4h46l-5 62H9z" fill="var(--wbg)" stroke="var(--w)" stroke-width="2"/><rect x="0" y="' + fill.toFixed(1) + '" width="54" height="70" fill="var(--w)" opacity=".8" clip-path="url(#gc)"/></svg>';
  var h = '<section class="c row g14"' + (compact ? ' data-act="go" data-to="water"' : '') + '>' + glass + '<div class="f1"><div class="l">Water</div><b class="m20">' + (ml / 1000).toFixed(2).replace(/0$/, '') + ' L <small>of ' + (w.goal / 1000) + ' L</small></b><div class="sm wtxt">' + (ml >= w.goal ? 'Goal reached' : behind >= w.glass ? Math.round(behind / w.glass) + ' glass' + (behind >= 2 * w.glass ? 'es' : '') + ' behind pace' : 'On pace') + '</div></div>' +
    '<div class="col g6"><button class="chip wbtn" data-act="water" data-ml="' + w.glass + '">+' + w.glass + ' ml</button><button class="chip wbtn2" data-act="water" data-ml="500">+500 ml</button></div></section>';
  return h;
}
ACT.water = function (el, e) { if (e) e.stopPropagation(); var ml = +el.getAttribute('data-ml'); day(today()).water.push({ t: Date.now(), ml: ml }); save(); rerender(); var w = DB.settings.water, now = waterMl(today()); toast(now >= w.goal && now - ml < w.goal ? 'Water goal reached!' : '+' + ml + ' ml'); };
ROUTES.water = function () {
  var w = DB.settings.water, k = today(), d = day(k), h = head('Water', 'Goal ' + (w.goal / 1000) + ' L a day');
  h += waterCard(false);
  h += '<div class="g3"><button class="btn sec" data-act="water" data-ml="150">+150</button><button class="btn sec" data-act="water" data-ml="750">+750</button><button class="btn sec" data-act="waterUndo">Undo</button></div>';
  var mx = w.goal, bars = '', streak = 0, still = true;
  for (var i = 6; i >= 0; i--) { var dk = addDays(k, -i), v = waterMl(dk); mx = Math.max(mx, v); }
  for (i = 6; i >= 0; i--) { dk = addDays(k, -i); v = waterMl(dk); bars += '<div class="wb"><div class="wbf' + (v >= w.goal ? ' ok' : '') + '" style="height:' + Math.round(v / mx * 100) + '%"></div><span>' + DOW[fromKey(dk).getDay()][0] + '</span></div>'; }
  for (i = 1; i < 60 && still; i++) { if (waterMl(addDays(k, -i)) >= w.goal) streak++; else still = false; }
  h += '<section class="c"><div class="row sb"><h2>Last 7 days</h2><span class="sm gtxt">' + (streak ? streak + '-day streak' : '') + '</span></div><div class="wbars" style="--gl:' + (100 - w.goal / mx * 100) + '%">' + bars + '</div></section>';
  h += '<section class="c"><h2>Today</h2>' + (d.water.length ? d.water.slice().reverse().map(function (x) { return '<div class="rd"><span>' + hm(x.t) + '</span><b>' + x.ml + ' ml</b></div>'; }).join('') : '<div class="l">No water logged yet.</div>') + '</section>';
  h += '<section class="c"><h2>Reminders</h2>' +
    tog('Remind me', 'wRemind', w.remind) + tog('Only when I\'m behind', 'wBehind', w.onlyBehind) +
    '<div class="g2 mt"><label class="fld">Daily goal (ml)<input type="number" inputmode="numeric" data-chg="wGoal" value="' + w.goal + '"></label><label class="fld">Glass size (ml)<input type="number" inputmode="numeric" data-chg="wGlass" value="' + w.glass + '"></label>' +
    '<label class="fld">From<input type="time" data-chg="wFrom" value="' + w.from + '"></label><label class="fld">Until<input type="time" data-chg="wTo" value="' + w.to + '"></label></div>' +
    '<label class="fld">Check every<select data-chg="wEvery">' + [30, 45, 60, 90, 120].map(function (m) { return '<option value="' + m + '"' + (+w.every === m ? ' selected' : '') + '>' + (m < 60 ? m + ' min' : m / 60 + ' h') + '</option>'; }).join('') + '</select></label>' +
    '<div class="l mt">Reminders come with +' + w.glass + ' ml and +500 ml buttons, so you can log from the notification or your watch.</div></section>';
  return h;
};
function tog(label, key, on) { return '<button class="tog" data-act="tog" data-k="' + key + '" role="switch" aria-checked="' + !!on + '"><span>' + label + '</span><i class="' + (on ? 'on' : '') + '"></i></button>'; }
var TOGS = { wRemind: function () { DB.settings.water.remind = !DB.settings.water.remind; if (DB.settings.water.remind) native('askNotify'); }, wBehind: function () { DB.settings.water.onlyBehind = !DB.settings.water.onlyBehind; }, vegOnly: function () { DB.profile.vegOnly = !DB.profile.vegOnly; }, carry: function () { DB.settings.carry = !DB.settings.carry; } };
ACT.tog = function (el) { var f = TOGS[el.getAttribute('data-k')]; if (f) { f(); save(); rerender(); } };
CHG.wGoal = function (el) { DB.settings.water.goal = clamp(+el.value || 2500, 500, 6000); save(); };
CHG.wGlass = function (el) { DB.settings.water.glass = clamp(+el.value || 250, 50, 1000); save(); };
CHG.wFrom = function (el) { DB.settings.water.from = el.value || '08:00'; save(); };
CHG.wTo = function (el) { DB.settings.water.to = el.value || '22:00'; save(); };
CHG.wEvery = function (el) { DB.settings.water.every = +el.value; save(); };
ACT.waterUndo = function () { var d = day(today()); if (!d.water.length) return; var x = d.water.pop(); save(); rerender(); toast('Removed ' + x.ml + ' ml'); };

/* ---------- vitals ---------- */
ROUTES.vitals = function () {
  var k = today(), hd = DB.health, h = '<div class="row sb"><h1 class="big">Vitals</h1>' + liveChip() + '</div>';
  if (!hd || hd.status !== 'ok') h += connectCard();
  var sl = sleepFor(k);
  if (sl) {
    var m = sl.m, s = sl.staged, pc = function (x) { return Math.round(x / s * 100); };
    h += '<section class="c"><div class="row sb"><div><div class="l">Last night · ' + hm(sl.start) + ' – ' + hm(sl.end) + '</div><b class="m30">' + sl.score + ' <small>sleep score' + (sl.scoreSrc === 'Arogya' ? '*' : '') + '</small></b></div><div class="r"><b class="m20">' + dur(sl.asleep) + '</b><div class="l">goal 7 h 30 m</div></div></div>' +
      hypno(sl) +
      stage('Awake', pc(m.awake), m.awake, '#E4577A') + stage('REM', pc(m.rem), m.rem, '#9C8BE0') + stage('Light', pc(m.light), m.light, '#6B4FBF') + stage('Deep', pc(m.deep), m.deep, '#2E1F7A');
    var note = [];
    if (pc(m.deep) < 13) note.push('Deep sleep ' + pc(m.deep) + '% is under the usual 13–23%.');
    if (pc(m.awake) > 12) note.push('Awake time is high.');
    var sp = spo2Night(k); if (sp && sp.lowCount) note.push('Oxygen dipped under 90% in ' + sp.lowCount + ' of ' + sp.n + ' readings.');
    if (note.length) h += '<div class="purplebg">' + esc(note.join(' ')) + '</div>';
    if (sl.scoreSrc === 'Arogya') h += '<div class="l mt">*Samsung gave no score for this night, so Arogya worked it out from your sleep stages.</div>';
    h += '</section>';
  } else if (hd && hd.status === 'ok') h += '<section class="c"><h2>Sleep</h2><div class="l">No sleep recorded for last night. Wear the watch to bed with sleep tracking on.</div></section>';
  var en = energyFor(k), sp2 = spo2Night(k), rr = hd && hd.resp ? hd.resp[k] : null;
  h += '<div class="g3">' + mini('Energy', en != null ? en : '—', en != null ? (en >= 80 ? 'Good' : en >= 60 ? 'Fair' : 'Low') : 'no score yet') + mini('SpO₂ sleep', sp2 ? sp2.avg + '%' : '—', sp2 ? 'low ' + sp2.min + '%' : 'avg') + mini('Resting HR', hd && hd.restingHr && hd.restingHr[k] ? Math.round(hd.restingHr[k]) : '—', 'bpm') + '</div>';
  if (hd && hd.hr) {
    var days = [], lo = 999, hi = 0, sum = 0, n = 0;
    for (var i = -6; i <= 0; i++) { var dk = addDays(k, i), x = hd.hr[dk]; days.push([dk, x]); if (x) { lo = Math.min(lo, x.min); hi = Math.max(hi, x.max); sum += x.avg; n++; } }
    if (n) {
      var svg = '<svg width="100%" height="90" viewBox="0 0 330 90" preserveAspectRatio="none" aria-hidden="true">', sc = function (v) { return (84 - (v - 40) / 160 * 80).toFixed(1); };
      days.forEach(function (d, j) { if (!d[1]) return; var x = 20 + j * 48; svg += '<line x1="' + x + '" x2="' + x + '" y1="' + sc(d[1].max) + '" y2="' + sc(d[1].min) + '" stroke="var(--bad)" stroke-width="10" stroke-linecap="round"/>'; });
      svg += '</svg>';
      h += '<section class="c"><div class="l">Heart rate · last 7 days</div><b class="m22">' + lo + '–' + hi + ' <small>bpm · avg ' + Math.round(sum / n) + '</small></b>' + svg + '<div class="row sb l">' + days.map(function (d) { return '<span>' + fromKey(d[0]).getDate() + '</span>'; }).join('') + '</div></section>';
    }
  }
  var st = stepsFor(k);
  if (st != null) {
    var ex = (hd.exercise || []).filter(function (e) { return dkey(new Date(e.start)) === k; });
    h += '<section class="c"><div class="row sb"><div><div class="l">Activity today</div><b class="m22">' + n0(st) + ' <small>steps</small></b></div><div class="r"><b class="m20">' + n0(earnedKcal(k)) + '</b><div class="l">active kcal</div></div></div>' + bar(st / 100) + ex.map(function (e) { return '<div class="rd"><span>' + esc(e.title || 'Workout') + ' · ' + hm(e.start) + '</span><b>' + dur((e.end - e.start) / 60000) + '</b></div>'; }).join('') + '</section>';
  }
  h += bpCard(false) + sugarCard(false);
  return h;
};
function connectCard() {
  if (!AND) return '<section class="c"><h2>Watch data</h2><div class="l">Open Arogya on your phone to see steps, sleep and heart rate from your Galaxy Watch.</div></section>';
  var s = DB.health ? DB.health.status : '', msg = 'Arogya reads steps, sleep, sleep score, energy score, heart rate, oxygen, BP, sugar and weight straight from Samsung Health. You choose what to share.', btn = 'Connect Samsung Health';
  if (s === 'not_installed') { msg = 'Samsung Health is not installed on this phone. Install it from Play Store or Galaxy Store, then come back.'; btn = 'Install Samsung Health'; }
  else if (s === 'old_version') { msg = 'Samsung Health needs an update (6.30.2 or newer). Update it, then come back.'; btn = 'Update Samsung Health'; }
  else if (s === 'disabled') msg = 'Samsung Health is turned off on this phone. Turn it on in phone Settings → Apps.';
  else if (s === 'not_initialized') msg = 'Open Samsung Health once and finish its setup, then come back.';
  else if (s === 'dev_mode') msg = 'Samsung Health is blocking Arogya because developer mode is off. Do the one-time step below, then tap Connect.';
  else if (s === 'error') msg = 'Could not read Samsung Health: ' + (DB.health.msg || 'unknown error') + '.';
  return '<section class="c"><h2>Connect your watch data</h2><p class="p">' + esc(msg) + '</p><button class="btn mt" data-act="connectHealth">' + btn + '</button>' +
    '<details class="mt"><summary class="lnk">One-time step: Samsung developer mode</summary><ol class="ol"><li>Open <b>Samsung Health</b> → ⋮ → <b>Settings</b> → <b>About Samsung Health</b>.</li><li>Tap the <b>version number</b> 10 times quickly.</li><li>Tap <b>Developer mode (Samsung Health Data SDK)</b>, agree, and turn on <b>Developer Mode for Data Read</b>.</li><li>Come back here and tap Connect.</li></ol></details></section>';
}
function hypno(sl) {
  var Y = { awake: 6, rem: 22, light: 38, deep: 54 }, C = { awake: '#E4577A', rem: '#9C8BE0', light: '#6B4FBF', deep: '#2E1F7A' }, span = sl.end - sl.start, out = '';
  if (!sl.stages.length) return '';
  sl.stages.forEach(function (g) { var t = STG[g.type] || 'light', x = (g.s - sl.start) / span * 330, w = Math.max(1, (g.e - g.s) / span * 330); out += '<rect x="' + x.toFixed(1) + '" y="' + Y[t] + '" width="' + w.toFixed(1) + '" height="12" rx="2" fill="' + C[t] + '"/>'; });
  return '<svg class="mt" width="100%" height="70" viewBox="0 0 330 70" preserveAspectRatio="none" role="img" aria-label="Sleep stages through the night">' + out + '</svg><div class="row sb l"><span>' + hm(sl.start) + '</span><span>' + hm(sl.end) + '</span></div>';
}
function stage(n, pct, min, col) { return '<div class="stg"><span>' + n + ' ' + pct + '%</span><div class="trk"><div style="width:' + pct + '%;background:' + col + '"></div></div><span class="r">' + dur(min) + '</span></div>'; }
function mini(l, v, s) { return '<section class="c mini"><div class="l">' + l + '</div><b class="m22">' + v + '</b><div class="l">' + s + '</div></section>'; }

function bpCard(full) {
  var all = merged('bp'), last = all[0], h = '<section class="c"><div class="row sb"><div><div class="l">Blood pressure</div><b class="m24">' + (last ? last.sys + '/' + last.dia + (last.pulse ? ' <small>· pulse ' + last.pulse + '</small>' : '') : '—') + '</b>' + (last ? '<div class="st ' + bpLabel(last.sys, last.dia)[1] + '">' + bpLabel(last.sys, last.dia)[0] + '</div>' : '') + '</div><button class="btn sm dk" data-act="logBp">+ Log BP</button></div>';
  var pts = all.slice(0, 14).reverse();
  if (pts.length > 1) h += spark(pts.map(function (x) { return x.sys; }), 330, 60, 'var(--ink)', 130);
  all.slice(0, full ? 50 : 3).forEach(function (x) { h += '<div class="rd"><span>' + niceDate(dkey(new Date(x.t))) + ', ' + hm(x.t) + (x.src ? ' · ' + x.src : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span><b>' + x.sys + '/' + x.dia + '</b></div>'; });
  if (!full && all.length > 3) h += '<button class="lnk" data-act="go" data-to="bp">See all ' + all.length + ' readings</button>';
  return h + '</section>';
}
function sugarCard(full) {
  var all = merged('sugar'), last = all[0], TY = { fasting: 'fasting', pp: '2 h after meal', random: 'random' };
  var h = '<section class="c"><div class="row sb"><div><div class="l">Blood sugar</div><b class="m24">' + (last ? last.val + ' <small>mg/dL ' + TY[last.type] + '</small>' : '—') + '</b>' + (last ? '<div class="st ' + sugarLabel(last.val, last.type)[1] + '">' + sugarLabel(last.val, last.type)[0] + '</div>' : '') + '</div><button class="btn sm dk" data-act="logSugar">+ Log sugar</button></div>';
  var f = all.filter(function (x) { return x.type === 'fasting'; }).slice(0, 14).reverse();
  if (f.length > 1) h += '<div class="l mt">Fasting trend</div>' + spark(f.map(function (x) { return x.val; }), 330, 60, 'var(--ink)', 100);
  all.slice(0, full ? 50 : 3).forEach(function (x) { h += '<div class="rd"><span>' + niceDate(dkey(new Date(x.t))) + ' · ' + TY[x.type] + (x.src ? ' · ' + x.src : '') + '</span><b class="' + (sugarLabel(x.val, x.type)[1] === 'ok' ? '' : 'warnt') + '">' + x.val + '</b></div>'; });
  if (f.length >= 3) { var avg = Math.round(f.slice(-7).reduce(function (a, x) { return a + x.val; }, 0) / Math.min(7, f.length)); h += '<div class="rd"><span>Average fasting, last ' + Math.min(7, f.length) + '</span><b>' + avg + '</b></div>'; }
  if (!full && all.length > 3) h += '<button class="lnk" data-act="go" data-to="sugar">See all ' + all.length + ' readings</button>';
  return h + '</section>';
}
ROUTES.bp = function () { return head('Blood pressure') + bpCard(true); };
ROUTES.sugar = function () { return head('Blood sugar') + sugarCard(true); };
ACT.logBp = function (el, e) {
  if (e) e.stopPropagation();
  sheet('<h2>Log blood pressure</h2><div class="g3 mt"><label class="fld">Upper (sys)<input id="bp_s" type="number" inputmode="numeric" placeholder="120"></label><label class="fld">Lower (dia)<input id="bp_d" type="number" inputmode="numeric" placeholder="80"></label><label class="fld">Pulse<input id="bp_p" type="number" inputmode="numeric" placeholder="72"></label></div>' +
    '<div class="chips">' + ['Morning', 'After walk', 'Evening', 'Stressed', 'After medicine'].map(function (n) { return '<button class="chip" data-act="pickNote">' + n + '</button>'; }).join('') + '</div><input id="bp_n" type="hidden" value="">' +
    '<button class="btn mt" data-act="saveBp">Save</button>');
  setTimeout(function () { var i = document.getElementById('bp_s'); if (i) i.focus(); }, 80);
};
ACT.pickNote = function (el) { [].forEach.call(el.parentNode.children, function (c) { c.classList.remove('on'); }); el.classList.add('on'); var n = document.getElementById('bp_n') || document.getElementById('su_n'); if (n) n.value = el.textContent; };
ACT.saveBp = function () {
  var s = +document.getElementById('bp_s').value, d = +document.getElementById('bp_d').value, p = +document.getElementById('bp_p').value;
  if (!(s > 60 && s < 260 && d > 30 && d < 160)) return toast('Enter both numbers, like 120 and 80');
  DB.bp.push({ t: Date.now(), sys: s, dia: d, pulse: p || 0, note: document.getElementById('bp_n').value }); save(); sheet(null); rerender();
  var l = bpLabel(s, d); toast('Saved · ' + l[0]);
  native('writeBp', s, d, p || 0);
};
ACT.logSugar = function (el, e) {
  if (e) e.stopPropagation();
  var hr = new Date().getHours(), def = hr < 10 ? 'fasting' : 'pp';
  sheet('<h2>Log blood sugar</h2><label class="fld mt">Reading (mg/dL)<input id="su_v" type="number" inputmode="numeric" placeholder="100"></label><div class="chips" id="su_t">' +
    [['fasting', 'Fasting'], ['pp', '2 h after meal'], ['random', 'Random']].map(function (x) { return '<button class="chip' + (x[0] === def ? ' on' : '') + '" data-act="pickSu" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><button class="btn mt" data-act="saveSugar">Save</button>');
  SU_T = def; setTimeout(function () { var i = document.getElementById('su_v'); if (i) i.focus(); }, 80);
};
var SU_T = 'fasting';
ACT.pickSu = function (el) { SU_T = el.getAttribute('data-t'); [].forEach.call(el.parentNode.children, function (c) { c.classList.toggle('on', c === el); }); };
ACT.saveSugar = function () {
  var v = +document.getElementById('su_v').value; if (!(v > 20 && v < 600)) return toast('Enter the reading, like 100');
  DB.sugar.push({ t: Date.now(), val: v, type: SU_T }); save(); sheet(null); rerender(); toast('Saved · ' + sugarLabel(v, SU_T)[0]);
};

/* ---------- health connect glue ---------- */
ACT.connectHealth = function () {
  var s = DB.health ? DB.health.status : '';
  if (s === 'not_installed' || s === 'old_version') return native('openStore', 'com.sec.android.app.shealth');
  native('healthConnect');
};
ACT.refreshHealth = function () { toast('Reading Samsung Health…'); refreshHealth(true); };
function refreshHealth(force) {
  if (!AND || !AND.healthRead) return;
  if (!force && Date.now() - DB.healthAt < 120000) return;
  native('healthRead', 8);
}
window.onHealth = function (json) {
  try { var h = JSON.parse(json); } catch (e) { return; }
  if (h.status !== 'ok' && DB.health && DB.health.status === 'ok' && h.status === 'error') { toast('Samsung Health: ' + (h.msg || 'read failed')); return; }
  DB.health = h;
  if (h.status === 'ok') DB.healthAt = Date.now();
  save(); if (['home', 'vitals', 'coach', 'food', 'yoga'].indexOf(cur.name) >= 0) rerender();
};
window.onHealthPerm = function (ok) { if (ok) { toast('Connected. Reading your data…'); refreshHealth(true); } else toast('No permission given. You can try again any time.'); };
window.onResume = function () {
  try { var adds = JSON.parse(native('takeWaterAdds') || '[]'); adds.forEach(function (a) { day(dkey(new Date(a.t))).water.push({ t: a.t, ml: a.ml }); }); if (adds.length) save(); } catch (e) { }
  if (SEL !== today() && cur.name !== 'food') SEL = today();
  refreshHealth(false); rerender();
};
