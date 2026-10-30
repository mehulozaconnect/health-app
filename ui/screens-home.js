/* Home dashboard, water, vitals, BP and sugar */
'use strict';
function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function liveChip() {
  var h = DB.health;
  if (!AND) return '<span class="live off">Phone data off in browser</span>';
  if (!h || h.status !== 'ok') return '<button class="live off" data-act="connectHealth">Connect watch data</button>';
  var hr = latestHr(), old = hr && Date.now() - hr.t > 25 * 60000;
  return '<button class="live' + (old ? ' stale' : '') + '" data-act="' + (old ? 'syncWatch' : 'refreshHealth') + '"><i></i>' + (hr ? 'Watch data · ' + hm(hr.t) : 'Watch · ' + ago(DB.healthAt)) + '</button>';
}
ROUTES.home = function () {
  var k = today(), b = budgetFor(k), t = dayTotals(k), tg = macroTargets(), left = b.total - t.kcal, pct = t.kcal / b.total * 100;
  var name = DB.profile.name ? ', ' + esc(DB.profile.name.split(' ')[0]) : '';
  var h = '<header class="row sb"><div><div class="l">' + DOWL[new Date().getDay()] + ', ' + new Date().getDate() + ' ' + MON[new Date().getMonth()] + '</div><h1 class="big">' + greet() + name + '</h1></div>' + liveChip() + '</header>';
  /* quick add */
  var qa = [['food', 'Food', 'qFood'], ['drop', 'Water', 'qWater'], ['yoga', 'Exercise', 'logYoga'], ['bp', 'BP', 'logBp'], ['pulse', 'Sugar', 'logSugar'], ['moon', 'Sleep', 'logSleep']];
  if ((DB.meds || []).length) qa.push(['pill', 'Medicine', 'qMeds']);
  qa.push(['scale', 'Weight', 'qWeight']);
  h += '<div class="qa">' + qa.map(function (q) { return '<button class="qab" data-act="' + q[2] + '"><span>' + icon(q[0], 22) + '</span>' + q[1] + '</button>'; }).join('') + '</div>';
  /* calories */
  h += '<section class="c" data-act="go" data-to="food"><div class="row g16"><div class="ringbox">' + ring(pct, 116, 11, left < 0 ? 'var(--bad)' : 'var(--g)', '<text x="58" y="58" text-anchor="middle" class="rt1">' + n0(Math.abs(left)) + '</text><text x="58" y="77" text-anchor="middle" class="rt2">kcal ' + (left < 0 ? 'over' : 'left') + '</text>') + '</div>' +
    '<div class="f1 kc"><div class="rd"><span>Budget</span><b>' + n0(b.base) + '</b></div>' + (b.earned ? '<div class="rd"><span>+ Exercise</span><b class="gtxt">+' + n0(b.earned) + '</b></div>' : '') + (b.carry ? '<div class="rd"><span>− Yesterday</span><b class="warnt">−' + n0(b.carry) + '</b></div>' : '') + '<div class="rd"><span>− Eaten</span><b>' + n0(t.kcal) + '</b></div></div></div>' +
    '<div class="g4 mt">' + [['Protein', t.p, tg.p], ['Carbs', t.c, tg.c], ['Fat', t.f, tg.f], ['Fibre', t.fi, tg.fi]].map(function (x) { return '<div class="mm"><div class="l">' + x[0] + '</div><b>' + n0(x[1]) + '<small>/' + n0(x[2]) + 'g</small></b>' + bar(x[1] / x[2] * 100) + '</div>'; }).join('') + '</div></section>';
  var cr = coachRules(k), tip = nowTip(cr, t, tg, b);
  h += '<section class="c dark" data-act="go" data-to="coach"><div class="kick">' + icon('spark', 16) + 'COACH</div><p class="p15">' + esc(tip) + '</p></section>';
  /* body today, with averages */
  var avg7 = function (m) { var v = []; for (var i = 0; i < 7; i++) { var x = TM[m].day(addDays(k, -i)); if (x != null) v.push(x); } return v.length >= 2 ? (TM[m].two ? [dayAvg(v.map(function (y) { return y[0]; })), dayAvg(v.map(function (y) { return y[1]; }))] : dayAvg(v)) : null; };
  var st = stepsFor(k), sl = sleepFor(k), en = energyFor(k), hr = latestHr(), hd = hrDay(k), bp = merged('bp')[0], su = merged('sugar').filter(function (x) { return x.type === 'fasting'; })[0], w = merged('weight')[0];
  var T2 = function (to, label, val, sub) { return '<button class="vt" data-act="go" data-to="' + to + '"><span class="l">' + label + '</span><b>' + val + '</b><small>' + sub + '</small></button>'; };
  var a;
  h += '<h3 class="sech">Your body today</h3><div class="vgrid">';
  a = avg7('steps'); h += T2('trend/steps', 'Steps', st ? n0(st) : '—', a ? '7-day avg ' + n0(a) : st ? 'of 10,000' : 'Wear the watch');
  a = avg7('sleep'); h += T2('sleep', 'Sleep', sl ? dur(sl.asleep) : '—', a ? '7-day avg ' + dur(a) : sl ? 'score ' + sl.score : '<span class="lnk" data-act="logSleep">+ Log sleep</span>');
  a = avg7('energy'); h += T2('trend/energy', 'Energy', en != null ? en : '—', a ? '7-day avg ' + Math.round(a) : 'from the watch');
  a = avg7('rhr'); h += T2('vitals', 'Heart rate', hr ? hr.bpm + ' <small>bpm</small>' : hd ? hd.avg + ' <small>avg</small>' : '—', a ? 'resting avg ' + Math.round(a) : hr ? 'at ' + hm(hr.t) : 'no reading');
  var bp30 = merged('bp').filter(function (x) { return x.t > Date.now() - 30 * 86400000; });
  h += T2('bp', 'Blood pressure', bp ? bp.sys + '/' + bp.dia : '—', bp30.length >= 2 ? '30-day avg ' + Math.round(dayAvg(bp30.map(function (x) { return x.sys; }))) + '/' + Math.round(dayAvg(bp30.map(function (x) { return x.dia; }))) : bp ? '<span class="' + bpLabel(bp.sys, bp.dia)[1] + 't">' + bpLabel(bp.sys, bp.dia)[0] + ' · ' + ago(bp.t) + '</span>' : 'tap to log');
  var su30 = merged('sugar').filter(function (x) { return x.type === 'fasting' && x.t > Date.now() - 30 * 86400000; });
  h += T2('sugar', 'Fasting sugar', su ? su.val + ' <small>mg/dL</small>' : '—', su30.length >= 2 ? '30-day avg ' + Math.round(dayAvg(su30.map(function (x) { return x.val; }))) : su ? ago(su.t) : 'tap to log');
  h += '</div>';
  h += staleNote() ? '<div class="ctrtxt">' + staleNote() + '</div>' : '';
  h += waterCard(true);
  h += medsCard();
  /* yoga today */
  var ym = yogaMin(k);
  h += '<section class="c row sb" data-act="go" data-to="yoga"><div><div class="l">Yoga & pranayama</div><b class="m20">' + ym + ' / ' + yogaGoal() + ' min</b><div class="sm gtxt">' + (ym >= yogaGoal() ? 'Done today' : 'Today\'s practice is ready') + '</div></div><span class="mic">' + icon('play', 20) + '</span></section>';
  var wp = merged('weight').filter(function (x) { return w && x.t < w.t - 6 * 86400000; })[0];
  h += '<section class="c row sb" data-act="go" data-to="weight"><div><div class="l">Weight</div><b class="m20">' + (w ? n1(w.kg) + ' kg' : '—') + '</b><div class="sm gtxt">' + (w && wp ? (w.kg <= wp.kg ? '−' : '+') + n1(Math.abs(w.kg - wp.kg)) + ' kg this week · ' : '') + 'goal ' + n1(DB.profile.goal) + ' kg</div></div>' + icon('chev', 18) + '</section>';
  return h;
};
ACT.qFood = function () { go('add/' + mealFor()); };
ACT.qWater = function () { var g = DB.settings.water.glass; ACT.water({ getAttribute: function () { return g; } }); };
ACT.qMeds = function () { go('meds'); };
ACT.qWeight = function () { go('weight'); };
function tileT(label, val, extra) { return tile(label, val, extra, 'vitals'); }
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
  h += trendBlock('water', { title: 'Water history' + (streak ? ' · ' + streak + '-day streak' : '') });
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
  h += nightCard(k) + '<button class="lnk" data-act="go" data-to="sleep">Sleep history and averages →</button>';
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
  h += bpCard(false) + sugarCard(false) + (meds().length ? medsCard() : '<section class="c row sb" data-act="go" data-to="meds"><div><div class="l">Medicines</div><b class="m16">Track doses, reminders and stock</b></div>' + icon('chev', 18) + '</section>');
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
ROUTES.bp = function () {
  var all = merged('bp'), h = head('Blood pressure') + '<button class="btn" data-act="logBp">' + icon('plus', 18) + 'Log BP</button>' + hcCard('BP');
  var span = function (d, f) { var r = all.filter(function (x) { return x.t > Date.now() - d * 86400000 && (!f || f(x)); }); return r.length ? Math.round(dayAvg(r.map(function (x) { return x.sys; }))) + '/' + Math.round(dayAvg(r.map(function (x) { return x.dia; }))) + '<small> · ' + r.length + '</small>' : '—'; };
  var am = function (x) { return new Date(x.t).getHours() < 12; };
  h += '<section class="c"><h2>Your averages</h2><div class="g3 mt"><div><div class="l">7 days</div><b class="m18">' + span(7) + '</b></div><div><div class="l">30 days</div><b class="m18">' + span(30) + '</b></div><div><div class="l">90 days</div><b class="m18">' + span(90) + '</b></div></div>' +
    '<div class="g2 mt"><div><div class="l">Mornings · 30 days</div><b class="m18">' + span(30, am) + '</b></div><div><div class="l">Evenings · 30 days</div><b class="m18">' + span(30, function (x) { return !am(x); }) + '</b></div></div><div class="l mt6">Small number = readings. Under 130/85 is the target for most adults.</div></section>';
  return h + trendBlock('bp', { title: 'Trend' }) + bpCard(true);
};
ROUTES.sugar = function () {
  var all = merged('sugar'), h = head('Blood sugar') + '<button class="btn" data-act="logSugar">' + icon('plus', 18) + 'Log sugar</button>' + hcCard('sugar');
  var span = function (d, f) { var r = all.filter(function (x) { return x.t > Date.now() - d * 86400000 && f(x); }); return r.length ? Math.round(dayAvg(r.map(function (x) { return x.val; }))) + '<small> · ' + r.length + '</small>' : '—'; };
  var fa = function (x) { return x.type === 'fasting'; }, pp = function (x) { return x.type !== 'fasting'; };
  h += '<section class="c"><h2>Your averages</h2><div class="tbl mt"><span class="l"></span><span class="l r">Fasting</span><span class="l r">After meals</span>' + [[7, '7 days'], [30, '30 days'], [90, '90 days']].map(function (p) { return '<span>' + p[1] + '</span><b class="r">' + span(p[0], fa) + '</b><b class="r">' + span(p[0], pp) + '</b>'; }).join('') + '</div><div class="l mt6">Targets: fasting under 100, 2 hours after a meal under 140 mg/dL.</div></section>';
  return h + trendBlock('sugar', { title: 'Fasting trend' }) + trendBlock('sugarpp', { title: 'After-meal trend' }) + sugarCard(true);
};
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
/* the watch hands readings to Samsung Health on the phone in batches; opening Samsung Health pulls them in now */
var SYNCING = false;
function staleNote() {
  var hr = latestHr(); if (!AND || !hr || Date.now() - hr.t < 25 * 60000) return '';
  return '<button class="lnk" data-act="syncWatch">Watch last sent data at ' + hm(hr.t) + ' · Sync now</button>';
}
ACT.syncWatch = function () {
  if (native('openApp', 'com.sec.android.app.shealth')) { SYNCING = true; toast('Opening Samsung Health. Pull down there to sync, then come back.', 4000); }
  else { toast('Reading Samsung Health…'); refreshHealth(true); }
};
ACT.refreshHealth = function () { toast('Reading Samsung Health…'); refreshHealth(true); };
function refreshHealth(force) {
  hcRefresh(force);
  if (!AND || !AND.healthRead) return;
  if (!force && Date.now() - DB.healthAt < 120000) return;
  native('healthRead', 8);
}
/* ---------- Health Connect: BP / sugar / weight from Omron and other apps ---------- */
function hcRefresh(force) {
  if (!AND || !AND.hcRead || !DB.hc || !DB.hc.on) return;
  if (!force && Date.now() - (DB.hc.at || 0) < 120000) return;
  native('hcRead', 180);
}
window.onHC = function (json) {
  try { var r = JSON.parse(json); } catch (e) { return; }
  DB.hc = DB.hc || {}; DB.hc.status = r.status; DB.hc.msg = r.msg || '';
  if (r.status === 'ok') { var before = (DB.hc.bp || []).length; DB.hc.bp = r.bp || []; DB.hc.sugar = r.sugar || []; DB.hc.weight = r.weight || []; DB.hc.at = Date.now(); DB.hc.on = true; if (HCWAIT) { toast('Health Connect: ' + DB.hc.bp.length + ' BP, ' + DB.hc.sugar.length + ' sugar, ' + DB.hc.weight.length + ' weight readings', 3500); HCWAIT = false; } }
  else if (HCWAIT) { HCWAIT = false; toast(r.status === 'no_permission' ? 'Health Connect: allow Arogya to read BP, sugar and weight' : r.status === 'not_installed' ? 'Health Connect is not installed' : 'Health Connect: ' + (r.msg || r.status), 3500); }
  save(); if (['home', 'vitals', 'bp', 'sugar', 'weight', 'settings', 'trend'].indexOf(cur.name) >= 0) rerender();
};
var HCWAIT = false;
window.onHCPerm = function () { DB.hc = DB.hc || {}; DB.hc.on = true; HCWAIT = true; save(); native('hcRead', 180); };
ACT.hcConnect = function () { if (!AND) return toast('Works in the phone app'); DB.hc = DB.hc || {}; DB.hc.on = true; save(); native('hcConnect'); };
ACT.hcReadNow = function () { HCWAIT = true; toast('Reading Health Connect…'); native('hcRead', 180); };
function hcCard(kind) {
  if (!AND || !AND.hcStatus) return '';
  var hc = DB.hc || {};
  if (hc.on && hc.status === 'ok') return '<div class="l ctrtxt">' + icon('check', 12) + ' Health Connect (Omron) linked · read ' + ago(hc.at) + ' · <button class="lnk" data-act="hcReadNow">Read now</button></div>';
  return '<section class="c row g14"><span class="mic">' + icon('bp', 20) + '</span><div class="f1"><b>Get ' + (kind || 'BP') + ' from Omron automatically</b><div class="l">Omron Connect saves readings to Health Connect. Link it once and every reading shows here.</div>' + (hc.status && hc.status !== 'ok' ? '<div class="l warnt">' + esc(hc.status === 'no_permission' ? 'Permission not given yet' : hc.status === 'not_installed' ? 'Health Connect app not found' : hc.msg || hc.status) + '</div>' : '') + '<button class="btn sm mt6" data-act="hcConnect">Link Health Connect</button></div></section>';
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
  takeMedAdds();
  try { var adds = JSON.parse(native('takeWaterAdds') || '[]'); adds.forEach(function (a) { day(dkey(new Date(a.t))).water.push({ t: a.t, ml: a.ml }); }); if (adds.length) save(); } catch (e) { }
  if (SEL !== today() && cur.name !== 'food') SEL = today();
  refreshHealth(SYNCING); SYNCING = false; rerender();
};
