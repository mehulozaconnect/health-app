/* Arogya core: state, storage, native bridge, helpers, router */
'use strict';
var AND = window.Android || null;
var APP_VERSION = '1.0';

/* ---------- dates ---------- */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(k, n) { var d = fromKey(k); d.setDate(d.getDate() + n); return dkey(d); }
function today() { return dkey(new Date()); }
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function niceDate(k) { var d = fromKey(k); return DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function hm(t) { var d = new Date(t), h = d.getHours(), m = d.getMinutes(); return (h % 12 || 12) + ':' + pad(m) + (h < 12 ? ' am' : ' pm'); }
function dur(min) { min = Math.round(min); var h = Math.floor(min / 60), m = min % 60; return h ? h + ' h ' + pad(m) + ' m' : m + ' m'; }
function ago(t) { var s = (Date.now() - t) / 1000; if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; }

/* ---------- formatting ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function n0(x) { return Math.round(x || 0).toLocaleString('en-IN'); }
function n1(x) { x = Math.round((x || 0) * 10) / 10; return (x % 1 ? x.toFixed(1) : String(x)); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function frac(q) { var m = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1.25: '1¼', 1.5: '1½', 1.75: '1¾', 2.5: '2½', 3.5: '3½' }; return m[q] || n1(q); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ---------- state ---------- */
var MEALS = [['breakfast', 'Breakfast', 0.25, '08:30'], ['lunch', 'Lunch', 0.35, '13:30'], ['evening', 'Evening snack', 0.12, '17:30'], ['dinner', 'Dinner', 0.28, '20:30']];
function blank() {
  return {
    v: 1,
    profile: { name: '', sex: 'm', age: 40, height: 170, weight: 75, goal: 70, pace: 0.5, activity: 1.3, budget: 0, protein: 20, carb: 50, fat: 30, fibre: 30, vegOnly: true, onboarded: false },
    settings: { gkey: '', gmodel: '', gmodels: [], water: { goal: 2500, glass: 250, remind: true, from: '08:00', to: '22:00', every: 60, onlyBehind: true }, carry: true },
    days: {},
    bp: [], sugar: [], weight: [], reports: [],
    chat: [], coach: {},
    recent: [], usual: {}, custom: [],
    health: null, healthAt: 0
  };
}
var DB = blank();
function load() {
  var raw = null;
  try { raw = AND && AND.loadState ? AND.loadState() : null; } catch (e) { }
  if (!raw) try { raw = localStorage.getItem('arogya'); } catch (e) { }
  if (raw) try { var d = JSON.parse(raw), b = blank(); DB = Object.assign(b, d); DB.profile = Object.assign(b.profile, d.profile || {}); DB.settings = Object.assign(b.settings, d.settings || {}); DB.settings.water = Object.assign(blank().settings.water, (d.settings || {}).water || {}); } catch (e) { }
}
var saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(function () {
    var s = JSON.stringify(DB);
    try { if (AND && AND.saveState) AND.saveState(s); } catch (e) { }
    try { localStorage.setItem('arogya', s); } catch (e) { }
    syncNative();
  }, 120);
}
function day(k) {
  k = k || today();
  var d = DB.days[k];
  if (!d) d = DB.days[k] = { meals: { breakfast: [], lunch: [], evening: [], dinner: [] }, water: [], yoga: [], over: 0 };
  return d;
}
function dayIf(k) { return DB.days[k] || null; }

/* ---------- native bridge ---------- */
var HTTP = {}, httpN = 0;
window.__httpCb = function (id, st, tx) { var f = HTTP[id]; delete HTTP[id]; if (f) f(st, tx); };
function http(method, url, headers, body) {
  return new Promise(function (res, rej) {
    if (AND && AND.http) { var id = 'h' + (++httpN); HTTP[id] = function (st, tx) { if (st === 0) rej(new Error(tx || 'Network error')); else res({ status: st, text: tx }); }; AND.http(id, method, url, JSON.stringify(headers || {}), body || ''); return; }
    fetch(url, { method: method, headers: headers, body: body || undefined }).then(function (r) { return r.text().then(function (t) { res({ status: r.status, text: t }); }); }).catch(rej);
  });
}
function native(fn) { try { if (AND && AND[fn]) return AND[fn].apply(AND, [].slice.call(arguments, 1)); } catch (e) { console.log('native ' + fn + ' failed', e); } return null; }
function syncNative() {
  var w = DB.settings.water, t = today(), wl = day(t).water;
  native('setWater', JSON.stringify({ date: t, ml: waterMl(t), lastLog: wl.length ? wl[wl.length - 1].t : 0, goal: w.goal, glass: w.glass, remind: !!w.remind, from: w.from, to: w.to, every: +w.every, onlyBehind: !!w.onlyBehind }));
}

/* ---------- toast / sheet ---------- */
function toast(msg, ms) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast on';
  clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = 'toast'; }, ms || 2200);
}
function sheet(html) {
  var s = document.getElementById('sheet');
  if (!html) { s.className = 'sheetwrap'; s.innerHTML = ''; return; }
  s.innerHTML = '<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
  s.className = 'sheetwrap on';
}

/* ---------- icons (stroke) ---------- */
var IC = {
  home: '<path d="M3 11l9-7 9 7v9H3z"/>', food: '<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', spark: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  doc: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>', back: '<path d="M15 5l-7 7 7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/>', scale: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>',
  yoga: '<circle cx="12" cy="5" r="2"/><path d="M12 7v6M6 10l6 3 6-3M8 21l4-8 4 8"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  send: '<path d="M4 12l16-8-6 16-2-6z"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', check: '<path d="M5 12l5 5 9-10"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>', moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', steps: '<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM16 9c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 15h4M14 21h4"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M8 4v16M16 4v16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', bp: '<path d="M4 12h3l2-4 3 8 2-4h6"/><rect x="2" y="4" width="20" height="16" rx="4"/>'
};
function icon(n, s) { s = s || 22; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

/* ---------- router ---------- */
var ROUTES = {}, ACT = {}, INP = {}, CHG = {};
var cur = { name: 'home', arg: '' };
function go(hash) { if (location.hash === '#' + hash) { cur = parseHash(); sheet(null); render(); } else location.hash = hash; }
function parseHash() { var h = (location.hash || '#home').slice(1).split('/'); return { name: h[0] || 'home', arg: decodeURIComponent(h.slice(1).join('/')) }; }
var NAV = [['home', 'Home', 'home'], ['food', 'Food', 'food'], ['vitals', 'Vitals', 'pulse'], ['coach', 'Coach', 'spark'], ['more', 'More', 'gear']];
var TABOF = { home: 'home', food: 'food', add: 'food', vitals: 'vitals', bp: 'vitals', sugar: 'vitals', coach: 'coach', more: 'more', reports: 'more', report: 'more', weight: 'more', yoga: 'more', water: 'home', settings: 'more', profile: 'more', flow: 'more' };
function render() {
  if (!DB.profile.onboarded && cur.name !== 'onboard') { cur = { name: 'onboard', arg: '' }; }
  var f = ROUTES[cur.name] || ROUTES.home;
  var app = document.getElementById('app');
  var y = app.scrollTop;
  var body = f(cur.arg);
  var tab = TABOF[cur.name];
  app.innerHTML = '<main class="pg">' + body + '</main>';
  var nav = document.getElementById('nav');
  nav.style.display = tab ? '' : 'none';
  nav.innerHTML = NAV.map(function (n) { return '<a href="#' + n[0] + '" class="ni' + (tab === n[0] ? ' on' : '') + '">' + icon(n[2]) + n[1] + '</a>'; }).join('');
  if (render.keep) app.scrollTop = y; else app.scrollTop = 0;
  render.keep = false;
  if (ROUTES[cur.name] && ROUTES[cur.name].after) ROUTES[cur.name].after(cur.arg);
}
function rerender() { render.keep = true; render(); }
window.addEventListener('hashchange', function () { cur = parseHash(); sheet(null); render(); });
window.arogyaBack = function () {
  if (document.getElementById('sheet').className.indexOf('on') >= 0) { sheet(null); return 'true'; }
  if (cur.name !== 'home' && cur.name !== 'onboard') { history.back(); return 'true'; }
  return 'false';
};

/* ---------- event delegation ---------- */
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var a = el.getAttribute('data-act');
  if (ACT[a]) { e.preventDefault(); ACT[a](el, e); }
});
document.addEventListener('input', function (e) { var a = e.target.getAttribute('data-inp'); if (a && INP[a]) INP[a](e.target, e); });
document.addEventListener('change', function (e) { var a = e.target.getAttribute('data-chg'); if (a && CHG[a]) CHG[a](e.target, e); });
ACT.closeSheet = function () { sheet(null); };
ACT.back = function () { if (history.length > 1) history.back(); else go('home'); };
ACT.go = function (el) { go(el.getAttribute('data-to')); };

/* ---------- small UI parts ---------- */
function head(title, sub, right) {
  return '<header class="hd"><button class="ib" data-act="back" aria-label="Back">' + icon('back') + '</button><div class="hdt"><h1>' + esc(title) + '</h1>' + (sub ? '<div class="l">' + esc(sub) + '</div>' : '') + '</div>' + (right || '') + '</header>';
}
function bar(pct, color) { return '<div class="bar"><div style="width:' + clamp(pct, 0, 100) + '%;background:' + (color || 'var(--g)') + '"></div></div>'; }
function ring(pct, size, stroke, color, inner) {
  var r = (size - stroke) / 2, c = 2 * Math.PI * r, v = clamp(pct, 0, 100) / 100 * c;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--track)" stroke-width="' + stroke + '"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + v.toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' + (inner || '') + '</svg>';
}
function spark(vals, w, h, color, ref) {
  vals = vals.filter(function (v) { return v != null && !isNaN(v); });
  if (vals.length < 2) return '';
  var lo = Math.min.apply(null, vals.concat(ref != null ? [ref] : [])), hi = Math.max.apply(null, vals.concat(ref != null ? [ref] : []));
  if (hi === lo) { hi += 1; lo -= 1; }
  var y = function (v) { return (h - 6 - (v - lo) / (hi - lo) * (h - 12)).toFixed(1); };
  var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * (w - 8) + 4).toFixed(1) + ',' + y(v); }).join(' ');
  var last = pts.split(' ').pop().split(',');
  return '<svg width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' + (ref != null ? '<line x1="0" x2="' + w + '" y1="' + y(ref) + '" y2="' + y(ref) + '" stroke="var(--warn)" stroke-dasharray="4 4" stroke-width="1"/>' : '') + '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="' + color + '"/></svg>';
}
