/* My pranayama schedules (Dincharya): your own list in your order, each with your counts, a daily reminder, one Start for all */
'use strict';
function pscheds() { return DB.psched || (DB.psched = []); }
function pschedById(id) { return pscheds().filter(function (s) { return s.id === id; })[0]; }
function pschedSec(s) { return s.items.reduce(function (a, k) { return a + (PRANA[k] ? pTotal(k, pcfg(k)) : 0); }, 0) + Math.max(0, s.items.length - 1) * 10; }
function pschedDone(id, k) { return !!(((DB.pschedLog || {})[k] || {})[id]); }
function pschedCards() {
  var list = pscheds(), h = '<div class="row sb"><h3 class="sech">My schedules</h3><button class="lnk" data-act="psNew">+ Create</button></div>';
  if (!list.length) return h + '<button class="empty-s" data-act="psNew">Make your own daily schedule: pick pranayamas in your order with your counts, set a reminder, and run them all with one Start.</button>';
  return h + list.map(function (s) {
    return '<section class="c"><div class="row sb" data-act="go" data-to="psched/' + s.id + '"><div><b class="m18">' + esc(s.name) + '</b><div class="l">' + s.items.length + ' pranayama · ' + mmss(pschedSec(s)) + (s.remind ? ' · ' + icon('bell', 12) + ' ' + t12(s.time) : '') + (pschedDone(s.id, today()) ? ' · <span class="gtxt">done today</span>' : '') + '</div></div>' + icon('chev', 18) + '</div><button class="btn mt" data-act="psStart" data-id="' + s.id + '">' + icon('play', 18) + 'Start</button></section>';
  }).join('');
}
ACT.psNew = function () { var s = { id: 'ps' + uid(), name: (DB.profile.name ? DB.profile.name.split(' ')[0] + ' ' : '') + 'daily pranayama', items: ['anulom', 'bhramari'], time: '07:15', remind: true }; pscheds().push(s); save(); go('psched/' + s.id); };
ROUTES.psched = function (id) {
  var s = pschedById(id); if (!s) return head('Schedule') + '<div class="empty-s">Not found.</div>';
  var h = head('My schedule', 'Dincharya');
  h += '<section class="c"><label class="fld">Name<input data-chg="psName" data-id="' + id + '" value="' + esc(s.name) + '"></label></section>';
  h += '<section class="c"><div class="row sb"><h2>Pranayama · in this order</h2><span class="l">' + mmss(pschedSec(s)) + '</span></div>' +
    (s.items.length ? s.items.map(function (k, i) { var c = pcfg(k), p = PRANA[k]; return '<div class="psrow"><button class="psm" data-act="go" data-to="breath/' + k + '"><b>' + esc(p[0]) + '</b><small>' + (c.fast ? c.rounds + ' rounds × ' + c.fast[1] : pshow(k).map(function (f) { return c.r[+f[1]]; }).join(' : ') + ' × ' + c.rounds) + ' · ' + mmss(pTotal(k, c)) + ' · tap to change counts</small></button><button class="ib sm" data-act="psMove" data-id="' + id + '" data-i="' + i + '" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled') + '>↑</button><button class="ib sm" data-act="psMove" data-id="' + id + '" data-i="' + i + '" data-d="1" aria-label="Move down"' + (i < s.items.length - 1 ? '' : ' disabled') + '>↓</button><button class="ib sm" data-act="psDel" data-id="' + id + '" data-i="' + i + '" aria-label="Remove">✕</button></div>'; }).join('') : '<div class="l mt6">Add the pranayamas you do.</div>') +
    '<button class="btn sec mt" data-act="psAdd" data-id="' + id + '">' + icon('plus', 18) + 'Add pranayama</button></section>';
  h += '<section class="c"><h2>Daily reminder</h2><div class="row g10 mt"><label class="fld f1">Time<input type="time" data-chg="psTime" data-id="' + id + '" value="' + s.time + '"></label></div>' + '<button class="tog" data-act="psRemind" data-id="' + id + '" role="switch" aria-checked="' + !!s.remind + '"><span>Remind me every day</span><i class="' + (s.remind ? 'on' : '') + '"></i></button></section>';
  /* progress */
  var k0 = today(), wk = 0, mo = 0, streak = 0, still = true, cells = '';
  for (var i = 0; i < 30; i++) { var dk = addDays(k0, -i), d = pschedDone(id, dk); if (d) { mo++; if (i < 7) wk++; } if (still) { if (d) streak++; else if (i > 0) still = false; } }
  for (i = 6; i >= 0; i--) { dk = addDays(k0, -i); cells += '<div class="wd"><i style="background:' + (pschedDone(id, dk) ? 'var(--g)' : 'var(--track)') + '"></i><small>' + 'SMTWTFS'[fromKey(dk).getDay()] + '</small></div>'; }
  h += '<section class="c"><h2>My progress</h2><div class="wk mt">' + cells + '</div><div class="g3 mt"><div><div class="l">This week</div><b class="m18">' + wk + ' / 7</b></div><div><div class="l">30 days</div><b class="m18">' + mo + '</b></div><div><div class="l">Streak</div><b class="m18">' + streak + ' d</b></div></div></section>';
  h += '<button class="btn big" data-act="psStart" data-id="' + id + '">' + icon('play', 20) + 'Start</button><button class="lnk" data-act="psRemove" data-id="' + id + '">Delete this schedule</button>';
  return h;
};
TABOF.psched = 'more';
CHG.psName = function (el) { pschedById(el.getAttribute('data-id')).name = el.value.trim() || 'My pranayama'; save(); };
CHG.psTime = function (el) { pschedById(el.getAttribute('data-id')).time = el.value || '07:15'; save(); };
ACT.psRemind = function (el) { var s = pschedById(el.getAttribute('data-id')); s.remind = !s.remind; save(); if (s.remind) native('askNotify'); rerender(); };
ACT.psMove = function (el) { var s = pschedById(el.getAttribute('data-id')), i = +el.getAttribute('data-i'), j = i + +el.getAttribute('data-d'); if (j < 0 || j >= s.items.length) return; var t = s.items[i]; s.items[i] = s.items[j]; s.items[j] = t; save(); rerender(); };
ACT.psDel = function (el) { var s = pschedById(el.getAttribute('data-id')); s.items.splice(+el.getAttribute('data-i'), 1); save(); rerender(); };
ACT.psAdd = function (el) { var id = el.getAttribute('data-id'); sheet('<h2>Add pranayama</h2><div class="chips">' + PRANA_ORDER.map(function (k) { return '<button class="chip" data-act="psPick" data-id="' + id + '" data-k="' + k + '">' + PRANA[k][0] + '</button>'; }).join('') + '</div>'); };
ACT.psPick = function (el) { pschedById(el.getAttribute('data-id')).items.push(el.getAttribute('data-k')); save(); sheet(null); rerender(); };
ACT.psRemove = function (el) { var id = el.getAttribute('data-id'); DB.psched = pscheds().filter(function (s) { return s.id !== id; }); save(); go('breaths'); };

/* run the whole schedule: each pranayama starts by itself after the previous one is saved */
var PSRUN = null;
ACT.psStart = function (el) { var s = pschedById(el.getAttribute('data-id')); if (!s || !s.items.length) return toast('Add a pranayama first'); PSRUN = { id: s.id, i: 0 }; BP = null; go('breath/' + s.items[0]); setTimeout(psAuto, 900); };
function psAuto() { if (cur.name === 'breath' && BP && !BP.run) ACT.bToggle(); }
function psBanner(k) {
  if (!PSRUN) return ''; var s = pschedById(PSRUN.id); if (!s || s.items[PSRUN.i] !== k) return '';
  var nx = s.items[PSRUN.i + 1];
  return '<div class="tip">' + icon('play', 16) + '<span><b>' + esc(s.name) + '</b> · ' + (PSRUN.i + 1) + ' of ' + s.items.length + (nx ? ' · next: ' + esc(PRANA[nx][0]) : ' · last one') + '</span></div>';
}
/* called after a pranayama is saved */
function psNext(k) {
  if (!PSRUN) return; var s = pschedById(PSRUN.id); if (!s || s.items[PSRUN.i] !== k) return;
  PSRUN.i++;
  if (PSRUN.i >= s.items.length) { DB.pschedLog = DB.pschedLog || {}; (DB.pschedLog[today()] = DB.pschedLog[today()] || {})[s.id] = Date.now(); save(); PSRUN = null; toast('Schedule complete · well done', 3000); plSay('Schedule complete. Well done.'); setTimeout(function () { go('psched/' + s.id); }, 1200); return; }
  var nk = s.items[PSRUN.i]; toast('Next: ' + PRANA[nk][0] + ' in 5 seconds', 3000); plSay('Next, ' + PRANA[nk][0]);
  setTimeout(function () { if (!PSRUN) return; BP = null; go('breath/' + nk); setTimeout(psAuto, 900); }, 5000);
}
