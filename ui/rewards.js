/* Rewards: daily wins, points, levels, streaks, badges and a little celebration when you hit a goal */
'use strict';
var LEVELS = [[0, 'Seed'], [150, 'Sprout'], [400, 'Sapling'], [800, 'Young tree'], [1400, 'Tree'], [2200, 'Strong tree'], [3300, 'Neem'], [4700, 'Peepal'], [6500, 'Banyan'], [9000, 'Himalaya']];
/* each daily goal: id, label, icon, colour, test(k) → { ok, now, of, unit } (of = null when it's yes/no) */
var GOALS = [
  ['food', 'Ate within budget', 'food', '#E58A3A', function (k) {
    var b = budgetFor(k), t = dayTotals(k), n = dayItems(k).length;
    return { ok: n >= 2 && t.kcal >= b.total * 0.7 && t.kcal <= b.total * 1.05, now: Math.round(t.kcal), of: Math.round(b.total), unit: 'kcal', show: n > 0 || k === today() };
  }],
  ['protein', 'Protein target', 'bolt', '#C2629A', function (k) { var t = dayTotals(k), g = macroTargets().p; return { ok: t.p >= g * 0.9, now: Math.round(t.p), of: Math.round(g), unit: 'g', show: dayItems(k).length > 0 || k === today() }; }],
  ['water', 'Water goal', 'drop', '#4E8FD0', function (k) { var g = DB.settings.water.goal, m = waterMl(k); return { ok: m >= g, now: m, of: g, unit: 'ml', show: true }; }],
  ['move', 'Moved enough', 'steps', '#3E9C86', function (k) {
    var s = stepsFor(k) || 0, ex = ((dayIf(k) || {}).yoga || []).filter(function (y) { return y.kind && y.kind !== 'yoga'; }).reduce(function (a, y) { return a + (y.min || 0); }, 0);
    return { ok: s >= stepGoal() || ex >= 30, now: s, of: stepGoal(), unit: 'steps', show: true, extra: ex ? Math.round(ex) + ' min exercise' : '' };
  }],
  ['yoga', 'Yoga or pranayama', 'yoga', '#4E9B6B', function (k) { var m = yogaMin(k); return { ok: m >= yogaGoal(), now: m, of: yogaGoal(), unit: 'min', show: true }; }],
  ['meds', 'All medicines taken', 'pill', '#8B6CC9', function (k) {
    if (!(DB.meds || []).length) return { show: false };
    var ds = dosesFor(k).filter(function (d) { return !d.m.added || k >= d.m.added; }); if (!ds.length) return { show: false };
    var tk = ds.filter(function (d) { return d.st === 'taken'; }).length; return { ok: tk === ds.length, now: tk, of: ds.length, unit: 'doses', show: true };
  }],
  ['sleep', 'Slept 7 hours', 'moon', '#5A5FC2', function (k) { var s = sleepFor(k); return { ok: !!s && s.asleep >= 420, now: s ? Math.round(s.asleep / 60 * 10) / 10 : 0, of: 7, unit: 'h', show: true }; }]
];
function stepGoal() { return +DB.settings.stepGoal || 8000; }
var RWC = {};
function winsFor(k) {
  var key = k + '|' + MV; if (RWC[key]) return RWC[key];
  var g = GOALS.map(function (x) { var r; try { r = x[4](k); } catch (e) { r = { show: false }; } r.id = x[0]; r.label = x[1]; r.icon = x[2]; r.col = x[3]; return r; }).filter(function (r) { return r.show; });
  var done = g.filter(function (r) { return r.ok; }).length, pts = done * 10 + (g.length && done === g.length ? 30 : done >= Math.ceil(g.length * 0.7) ? 10 : 0);
  return (RWC[key] = { k: k, goals: g, done: done, total: g.length, pts: pts, good: g.length && done >= Math.ceil(g.length * 0.7), perfect: g.length && done === g.length });
}
/* all history, cached until the data changes */
var RWS = null;
function rwStats() {
  if (RWS && RWS.v === MV && RWS.d === today()) return RWS;
  var keys = {}; Object.keys(DB.days || {}).forEach(function (k) { keys[k] = 1; }); Object.keys(DB.sleepLog || {}).forEach(function (k) { keys[k] = 1; }); Object.keys(DB.medLog || {}).forEach(function (k) { keys[k] = 1; });
  if (DB.health && DB.health.steps) Object.keys(DB.health.steps).forEach(function (k) { keys[k] = 1; });
  var tk = today(), first = Object.keys(keys).filter(function (k) { return k <= tk; }).sort()[0] || tk, from = addDays(tk, -364); if (first < from) first = from;
  var s = { v: MV, d: tk, pts: 0, days: 0, good: 0, perfect: 0, cnt: {}, best: {}, cur: {}, goodBest: 0, goodCur: 0, prana: 0, steps10k: 0, hist: {} };
  var run = {}, goodRun = 0;
  for (var k = first; k <= tk; k = addDays(k, 1)) {
    var w = winsFor(k); s.hist[k] = w; s.pts += w.pts; if (w.done) s.days++;
    if (w.good) { s.good++; goodRun++; } else if (k !== tk) goodRun = 0;
    if (w.perfect) s.perfect++;
    s.goodBest = Math.max(s.goodBest, goodRun);
    GOALS.forEach(function (x) {
      var r = w.goals.filter(function (g) { return g.id === x[0]; })[0], id = x[0];
      if (r && r.ok) { s.cnt[id] = (s.cnt[id] || 0) + 1; run[id] = (run[id] || 0) + 1; } else if (k !== tk) run[id] = 0;
      s.best[id] = Math.max(s.best[id] || 0, run[id] || 0);
    });
    if ((stepsFor(k) || 0) >= 10000) s.steps10k++;
    s.prana += ((dayIf(k) || {}).yoga || []).filter(function (y) { return y.prana; }).length;
  }
  s.cur = run; s.goodCur = goodRun;
  var lv = 0; for (var i = 0; i < LEVELS.length; i++) if (s.pts >= LEVELS[i][0]) lv = i;
  s.lv = lv; s.lvName = LEVELS[lv][1]; s.lvFrom = LEVELS[lv][0]; s.lvTo = LEVELS[lv + 1] ? LEVELS[lv + 1][0] : null;
  var wl = 0, ws = merged('weight'); if (ws.length >= 2) wl = Math.max(0, ws[ws.length - 1].kg - ws[0].kg);
  s.lost = wl;
  RWS = s; return s;
}
/* badges: id, name, icon, colour, what it takes, progress(stats) → [now, of] */
var BADGES = [
  ['first', 'First win', 'spark', '#D9A21B', 'Hit any goal for a day', function (s) { return [s.days, 1]; }],
  ['good3', 'On a roll', 'bolt', '#E58A3A', '3 good days in a row', function (s) { return [s.goodBest, 3]; }],
  ['good7', 'One good week', 'star', '#E58A3A', '7 good days in a row', function (s) { return [s.goodBest, 7]; }],
  ['good30', 'Habit made', 'trophy', '#C9773A', '30 good days in a row', function (s) { return [s.goodBest, 30]; }],
  ['perfect', 'Perfect day', 'trophy', '#D9A21B', 'Every goal done in one day', function (s) { return [s.perfect, 1]; }],
  ['perfect10', 'Ten perfect days', 'crown', '#D9A21B', '10 perfect days', function (s) { return [s.perfect, 10]; }],
  ['budget7', 'Portion master', 'food', '#E58A3A', 'Within budget 7 days in a row', function (s) { return [s.best.food || 0, 7]; }],
  ['protein10', 'Protein pro', 'bolt', '#C2629A', 'Protein target on 10 days', function (s) { return [s.cnt.protein || 0, 10]; }],
  ['water7', 'Well watered', 'drop', '#4E8FD0', 'Water goal 7 days in a row', function (s) { return [s.best.water || 0, 7]; }],
  ['water30', 'River', 'drop', '#3D7DBF', 'Water goal on 30 days', function (s) { return [s.cnt.water || 0, 30]; }],
  ['steps10k', '10,000 steps', 'steps', '#3E9C86', 'Walk 10,000 steps in a day', function (s) { return [s.steps10k, 1]; }],
  ['move7', 'Always moving', 'steps', '#3E9C86', 'Moved enough 7 days in a row', function (s) { return [s.best.move || 0, 7]; }],
  ['yoga7', 'Yogi week', 'yoga', '#4E9B6B', 'Practice 7 days in a row', function (s) { return [s.best.yoga || 0, 7]; }],
  ['prana25', 'Breath keeper', 'yoga', '#4E9B6B', '25 pranayama sessions', function (s) { return [s.prana, 25]; }],
  ['meds30', 'Never missed', 'pill', '#8B6CC9', 'All medicines taken on 30 days', function (s) { return [s.cnt.meds || 0, 30]; }],
  ['sleep7', 'Well rested', 'moon', '#5A5FC2', '7 nights of 7 hours in a row', function (s) { return [s.best.sleep || 0, 7]; }],
  ['kg2', 'Two kilos lighter', 'scale', '#3E9C86', 'Lose 2 kg from your first weigh-in', function (s) { return [Math.floor(s.lost * 10) / 10, 2]; }],
  ['kg5', 'Five kilos lighter', 'scale', '#2F8572', 'Lose 5 kg from your first weigh-in', function (s) { return [Math.floor(s.lost * 10) / 10, 5]; }],
  ['lv5', 'Strong tree', 'crown', '#D9A21B', 'Reach level 6', function (s) { return [s.lv + 1, 6]; }]
];
function badgeOn(b, s) { var p = b[5](s); return p[0] >= p[1]; }

/* ---------- celebrations ---------- */
function rwCheck() {
  if (!DB.profile.onboarded) return;
  var k = today(), w = winsFor(k), s = rwStats(), first = !DB.rw;
  DB.rw = DB.rw || { seen: {}, badges: {} }; var seen = DB.rw.seen[k] = DB.rw.seen[k] || [], changed = first;
  var fresh = w.goals.filter(function (g) { return g.ok && seen.indexOf(g.id) < 0; });
  var nb = BADGES.filter(function (b) { return !DB.rw.badges[b[0]] && badgeOn(b, s); });
  fresh.forEach(function (g) { seen.push(g.id); changed = true; });
  nb.forEach(function (b) { DB.rw.badges[b[0]] = k; changed = true; });
  if (w.perfect && seen.indexOf('_all') < 0) { seen.push('_all'); changed = true; if (!first) { setTimeout(function () { confetti(160); feel('win'); toast('Perfect day! Every goal done · +' + w.pts + ' points', 4000); }, 300); fresh = []; } }
  if (!first && fresh.length) { confetti(60); feel('done'); toast(fresh.map(function (g) { return g.label; }).join(' · ') + ' — done! +' + fresh.length * 10, 3000); }
  if (!first && nb.length) setTimeout(function () { confetti(120); feel('win'); sheet(badgeSheet(nb[0])); }, fresh.length ? 1800 : 400);
  Object.keys(DB.rw.seen).forEach(function (d) { if (d < addDays(k, -40)) delete DB.rw.seen[d]; });
  if (changed) rwSave();
}
var rwSave = save;
save = function () { rwSave(); clearTimeout(save.rt); save.rt = setTimeout(rwCheck, 400); };
function badgeSheet(b) {
  return '<div class="bdgsheet"><div class="bdgbig" style="--bc:' + b[3] + '">' + icon(b[2], 44) + '</div><div class="kick2 ctr">NEW BADGE</div><h2 class="m24 ctr">' + esc(b[1]) + '</h2><p class="p ctr">' + esc(b[4]) + '. Keep going!</p><button class="btn mt" data-act="go" data-to="rewards">See all badges</button><button class="btn sec mt" data-act="closeSheet">Nice</button></div>';
}
function confetti(n) {
  var cv = document.createElement('canvas'), W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.className = 'confetti'; document.body.appendChild(cv);
  var x = cv.getContext('2d'); x.scale(dpr, dpr);
  var cs = getComputedStyle(document.documentElement), cols = ['--g', '--g3', '--warn', '--w', '--pur', '--bad'].map(function (v) { return cs.getPropertyValue(v).trim() || '#4E8B76'; }).concat(['#F5C542']);
  var P = []; for (var i = 0; i < n; i++) P.push({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 10 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] });
  var t0 = performance.now();
  (function fr(t) {
    var e = t - t0; x.clearRect(0, 0, W, H);
    P.forEach(function (p) { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.globalAlpha = Math.max(0, 1 - e / 2200); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); });
    if (e < 2200) requestAnimationFrame(fr); else cv.remove();
  })(t0);
}

/* ---------- home card ---------- */
function winsCard() {
  var k = today(), w = winsFor(k), s = rwStats(), y = winsFor(addDays(k, -1)), hr = new Date().getHours();
  var pct = w.total ? w.done / w.total * 100 : 0, lvp = s.lvTo ? (s.pts - s.lvFrom) / (s.lvTo - s.lvFrom) * 100 : 100;
  var h = '<section class="c wins" data-act="go" data-to="rewards"><div class="row g16"><div class="ringbox">' + ring(pct, 84, 9, 'var(--g)', '<text x="42" y="47" text-anchor="middle" class="rt1 s20">' + w.done + '/' + w.total + '</text>') + '</div>' +
    '<div class="f1"><div class="kick2">' + icon('trophy', 15) + 'TODAY\'S WINS</div><b class="m20">' + (w.perfect ? 'Perfect day!' : w.done ? w.done + ' done · ' + (w.total - w.done) + ' to go' : 'Let\'s win today') + '</b>' +
    '<div class="row sb mt6 sm"><span class="lvchip">Lv ' + (s.lv + 1) + ' · ' + s.lvName + '</span><span class="mute">' + n0(s.pts) + (s.lvTo ? ' / ' + n0(s.lvTo) : '') + ' pts</span></div>' + bar(lvp) + '</div></div>';
  h += '<div class="gdots">' + w.goals.map(function (g) { return '<span class="gdot' + (g.ok ? ' on' : '') + '" style="--gc:' + g.col + '" title="' + esc(g.label) + '">' + icon(g.ok ? 'check' : g.icon, 16) + '</span>'; }).join('') + '</div>';
  var streak = s.goodCur;
  var line = hr < 12 && y.total ? 'Yesterday you won <b>' + y.done + ' of ' + y.total + '</b> · +' + y.pts + ' pts. ' + (y.done < y.total ? 'Today, beat it.' : 'Do it again!') : streak >= 2 ? icon('flame', 15) + ' <b>' + streak + '-day</b> good-day streak. Don\'t break it!' : nextWin(w);
  if (line) h += '<div class="winline">' + line + '</div>';
  return h + '</section>';
}
function nextWin(w) {
  var g = w.goals.filter(function (x) { return !x.ok && x.of; }).sort(function (a, b) { return b.now / b.of - a.now / a.of; })[0];
  if (!g) return '';
  var left = g.of - g.now;
  return 'Closest win: <b>' + esc(g.label.toLowerCase()) + '</b>' + (left > 0 && g.id !== 'food' ? ' — ' + n0(left) + ' ' + g.unit + ' to go' : '') + '.';
}

/* ---------- rewards screen ---------- */
ROUTES.rewards = function () {
  var k = today(), w = winsFor(k), s = rwStats(), h = head('Rewards', 'Points, streaks and badges');
  var lvp = s.lvTo ? (s.pts - s.lvFrom) / (s.lvTo - s.lvFrom) * 100 : 100;
  h += '<section class="c lvhero"><div class="row sb"><div><div class="kick2">LEVEL ' + (s.lv + 1) + '</div><b class="m30">' + s.lvName + '</b><div class="l">' + n0(s.pts) + ' points' + (s.lvTo ? ' · ' + n0(s.lvTo - s.pts) + ' to ' + LEVELS[s.lv + 1][1] : ' · top level') + '</div></div><span class="lvbadge">' + icon('crown', 34) + '</span></div>' + bar(lvp) +
    '<div class="g3 mt"><div><div class="l">Good-day streak</div><b class="m20">' + s.goodCur + ' <small>days</small></b></div><div><div class="l">Best streak</div><b class="m20">' + s.goodBest + '</b></div><div><div class="l">Perfect days</div><b class="m20">' + s.perfect + '</b></div></div></section>';
  h += '<section class="c"><h2>Today · ' + w.done + ' of ' + w.total + ' · +' + w.pts + ' pts</h2>' + w.goals.map(function (g) {
    var p = g.of ? clamp(g.now / g.of * 100, 0, 100) : g.ok ? 100 : 0;
    return '<div class="goalrow' + (g.ok ? ' on' : '') + '" style="--gc:' + g.col + '"><span class="gdot' + (g.ok ? ' on' : '') + '">' + icon(g.ok ? 'check' : g.icon, 16) + '</span><div class="f1"><div class="row sb"><b>' + esc(g.label) + '</b><span class="sm mute">' + (g.of ? n0(g.now) + ' / ' + n0(g.of) + ' ' + g.unit : '') + '</span></div><div class="gbar"><i style="width:' + p + '%"></i></div>' + (g.extra ? '<div class="sm mute">' + esc(g.extra) + '</div>' : '') + '</div><span class="sm ' + (g.ok ? 'gtxt' : 'mute') + '">' + (g.ok ? '+10' : '') + '</span></div>';
  }).join('') + '<div class="l mt">10 points a goal. +10 bonus for a good day (70% of goals), +30 for a perfect day.</div></section>';
  /* 5-week calendar */
  var cal = '', start = addDays(k, -34);
  for (var i = 0; i < 35; i++) { var dk = addDays(start, i), dw = s.hist[dk], lvl = !dw || !dw.total ? 0 : dw.perfect ? 4 : dw.good ? 3 : dw.done >= 2 ? 2 : dw.done ? 1 : 0; cal += '<i class="hm' + lvl + (dk === k ? ' td' : '') + '" title="' + dk + '"></i>'; }
  h += '<section class="c"><h2>Last 5 weeks</h2><div class="heat">' + cal + '</div><div class="row sm mute mt6 g8"><span>Less</span><i class="hm1 key"></i><i class="hm2 key"></i><i class="hm3 key"></i><i class="hm4 key"></i><span>Perfect</span></div></section>';
  /* streaks */
  h += '<section class="c"><h2>Habit streaks</h2><div class="g2 mt">' + GOALS.filter(function (x) { return x[0] !== 'meds' || (DB.meds || []).length; }).map(function (x) {
    var c = s.cur[x[0]] || 0; return '<div class="stk" style="--gc:' + x[3] + '"><span class="gdot on">' + icon(x[2], 15) + '</span><div><b>' + c + ' <small>day' + (c === 1 ? '' : 's') + '</small></b><div class="sm mute">' + esc(x[1]) + ' · best ' + (s.best[x[0]] || 0) + '</div></div></div>';
  }).join('') + '</div></section>';
  /* badges */
  var got = BADGES.filter(function (b) { return badgeOn(b, s); }).length;
  h += '<h3 class="sech">Badges · ' + got + ' of ' + BADGES.length + '</h3><div class="bdgs">' + BADGES.map(function (b) {
    var p = b[5](s), on = p[0] >= p[1];
    return '<div class="bdg' + (on ? ' on' : '') + '" style="--bc:' + b[3] + '"><span class="bdgi">' + icon(b[2], 26) + '</span><b>' + esc(b[1]) + '</b><small>' + (on ? (DB.rw && DB.rw.badges[b[0]] ? niceDate(DB.rw.badges[b[0]]) : 'Earned') : esc(b[4])) + '</small>' + (on ? '' : '<div class="gbar"><i style="width:' + clamp(p[0] / p[1] * 100, 0, 100) + '%"></i></div>') + '</div>';
  }).join('') + '</div>';
  h += '<section class="c"><h2>Goals</h2><div class="g2"><label class="fld">Daily steps<input type="number" inputmode="numeric" value="' + stepGoal() + '" data-chg="stepGoal"></label><label class="fld">Yoga minutes<input type="number" inputmode="numeric" value="' + yogaGoal() + '" data-chg="yogaGoalR"></label></div><div class="l mt">Calorie, protein and water goals come from your profile and smart targets.</div></section>';
  return h;
};
CHG.stepGoal = function (el) { DB.settings.stepGoal = clamp(+el.value || 8000, 1000, 40000); save(); };
CHG.yogaGoalR = function (el) { DB.settings.yogaGoal = clamp(+el.value || 20, 5, 180); save(); };
TABOF.rewards = 'home';
