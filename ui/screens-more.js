/* Coach, reports, weight, more, settings, onboarding */
'use strict';
/* ---------- coach ---------- */
ROUTES.coach = function () {
  var k = today(), y = addDays(k, -1), ds = dayScore(y), h = '<h1 class="big">Coach</h1><div class="l">Reads your food, watch, BP, sugar and reports together</div>';
  h += '<section class="c row g14 mt">' + ring(ds.score, 64, 8, ds.score >= 75 ? 'var(--g)' : 'var(--warn)', '<text x="32" y="38" text-anchor="middle" class="rt3">' + ds.score + '</text>') + '<div class="f1"><b class="m16">Yesterday: ' + (ds.score >= 80 ? 'a strong day' : ds.score >= 60 ? 'an average day' : 'a tough day') + '</b><div class="sm l">' + ds.parts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' · ') + '</div></div></section>';
  var ai = DB.coach.date === k && DB.coach.read, R = ai ? DB.coach.read : coachRules(k);
  var block = function (title, cls, list) { if (!list || !list.length) return ''; return '<div class="kick ' + cls + '">' + title + '</div>' + list.map(function (x) { return '<p class="p">' + esc(x) + '</p>'; }).join(''); };
  h += '<section class="c">' + (block('WHAT YOUR BODY IS SAYING', 'purple', R.body) || '<div class="kick purple">WHAT YOUR BODY IS SAYING</div><p class="p">' + (DB.health && DB.health.status === 'ok' ? 'Nothing worrying in your watch data, BP or sugar.' : 'Connect Samsung Health and log BP or sugar to see this.') + '</p>') + '</section>';
  if ((R.right || []).length || (R.wrong || []).length) h += '<section class="c">' + block('EATING AND HABITS: RIGHT', 'gtxt', R.right) + '<div class="mt"></div>' + block('WHAT WENT WRONG', 'warnt', R.wrong) + '</section>';
  var done = (dayIf(k) && dayIf(k).planDone) || {};
  h += '<section class="c"><div class="kick">YOUR PLAN FOR TODAY</div>' + (R.plan || []).map(function (p, i) { return '<button class="todo" data-act="planTick" data-i="' + i + '"><span class="bx' + (done[i] ? ' on' : '') + '">' + (done[i] ? icon('check', 16) : '') + '</span><span' + (done[i] ? ' class="strike"' : '') + '>' + esc(p) + '</span></button>'; }).join('') + '</section>';
  h += '<div class="row sb sm"><span class="l">' + (ai ? 'Written by AI ' + ago(DB.coach.at) : DB.settings.gkey ? 'Quick read from your data' : 'Quick read from your data. Add a Gemini key for a deeper AI read.') + '</span>' + (DB.settings.gkey ? '<button class="lnk" data-act="coachAi">' + (aiDailyRead.busy ? 'Writing…' : ai ? 'Refresh' : 'Get AI read') + '</button>' : '<button class="lnk" data-act="go" data-to="settings">Add key</button>') + '</div>';
  h += '<section class="c"><div class="row sb"><h2>Ask your coach</h2>' + (DB.chat.length ? '<button class="lnk" data-act="chatClear">Clear</button>' : '') + '</div><div class="chat">';
  if (!DB.chat.length) h += '<div class="chips">' + ['Can I have pav bhaji tonight?', 'What should I eat for dinner?', 'Why am I always tired?', 'Plan my meals for tomorrow'].map(function (q) { return '<button class="chip" data-act="chatQuick">' + q + '</button>'; }).join('') + '</div>';
  DB.chat.slice(-20).forEach(function (m) { h += '<div class="bub ' + (m.r === 'u' ? 'me' : 'ai') + '">' + fmt(m.t) + '</div>'; });
  if (CHAT_BUSY) h += '<div class="bub ai"><span class="dots"><i></i><i></i><i></i></span></div>';
  h += '</div><label class="askbox"><input id="ask" placeholder="Ask anything about your health" enterkeyhint="send"><button class="ib g" data-act="chatSend" aria-label="Send">' + icon('send', 20) + '</button></label></section>';
  return h;
};
ROUTES.coach.after = function () { aiDailyRead(false); var i = document.getElementById('ask'); if (i) i.addEventListener('keydown', function (e) { if (e.key === 'Enter') ACT.chatSend(); }); };
function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^[-*] (.+)$/gm, '• $1').replace(/\n/g, '<br>'); }
ACT.coachAi = function () { aiDailyRead(true); rerender(); };
ACT.planTick = function (el) { var d = day(today()); d.planDone = d.planDone || {}; var i = el.getAttribute('data-i'); d.planDone[i] = !d.planDone[i]; save(); rerender(); };
var CHAT_BUSY = false;
ACT.chatQuick = function (el) { document.getElementById('ask').value = el.textContent; ACT.chatSend(); };
ACT.chatClear = function () { DB.chat = []; save(); rerender(); };
ACT.chatSend = function () {
  var i = document.getElementById('ask'), q = i ? i.value.trim() : ''; if (!q || CHAT_BUSY) return;
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  DB.chat.push({ r: 'u', t: q }); CHAT_BUSY = true; save(); rerender();
  var hist = DB.chat.slice(-11, -1).map(function (m) { return { role: m.r === 'u' ? 'user' : 'model', parts: [{ text: m.t }] }; });
  gAsk([{ text: 'MY DATA (latest):\n' + healthContext() + '\n\nNow: ' + new Date().toString().slice(0, 21) + '\nMY QUESTION: ' + q + '\n\nAnswer in under 120 words unless I ask for a plan.' }], { system: COACH_SYS, history: hist, temp: 0.6 })
    .then(function (a) { DB.chat.push({ r: 'a', t: a }); })
    .catch(function (e) { DB.chat.pop(); aiErr(e); })
    .then(function () { CHAT_BUSY = false; save(); if (cur.name === 'coach') rerender(); var app = document.getElementById('app'); app.scrollTop = app.scrollHeight; });
};

/* ---------- reports ---------- */
ROUTES.reports = function () {
  var h = head('Medical reports', DB.reports.length + ' saved');
  h += '<div class="g2"><button class="btn" data-act="addReport" data-src="cam">' + icon('cam', 18) + 'Scan photo</button><button class="btn sec" data-act="addReport" data-src="file">' + icon('doc', 18) + 'Upload PDF</button></div>';
  if (READING) h += '<section class="c ctrtxt"><div class="spin"></div><p class="p">Reading your report… this takes 20–40 seconds.</p></section>';
  if (!DB.reports.length && !READING) h += '<section class="c"><h2>How it works</h2><p class="p">Take a photo of each page of a lab report, or upload the PDF from the lab. AI reads every value, flags what\'s out of range, explains it in plain words and tracks it across reports. Your food suggestions then take it into account.</p></section>';
  var flags = reportFlags();
  if (flags.length) h += '<section class="c"><h2>Needs attention</h2>' + flags.map(function (v) { return valRow(v); }).join('') + '</section>';
  DB.reports.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || b.t - a.t; }).forEach(function (r) {
    var bad = (r.values || []).filter(function (v) { return v.status !== 'normal'; }).length;
    h += '<button class="res" data-act="go" data-to="report/' + r.id + '"><span>' + esc(r.title || 'Lab report') + '<small>' + esc(r.date || '') + ' · ' + (r.values || []).length + ' values' + (bad ? ' · ' + bad + ' need attention' : ' · all normal') + '</small></span>' + icon('chev', 18) + '</button>';
  });
  return h;
};
function valRow(v) { var cls = v.status === 'normal' ? 'ok' : v.status === 'borderline' ? 'warn' : 'bad'; return '<div class="val"><span>' + esc(v.name) + '<small>' + esc(v.plain || (v.range ? 'Range ' + v.range : '')) + '</small></span><b>' + esc(v.value) + ' <small>' + esc(v.unit || '') + '</small></b><span class="tag ' + cls + '">' + esc(v.status) + '</span></div>'; }
ROUTES.report = function (id) {
  var r = DB.reports.filter(function (x) { return x.id === id; })[0]; if (!r) return head('Report') + '<div class="empty-s">Not found.</div>';
  var h = head(r.title || 'Lab report', (r.date || '') + (r.lab ? ' · ' + r.lab : ''));
  if (r.summary) h += '<section class="c dark"><div class="kick">IN PLAIN WORDS</div><p class="p15">' + esc(r.summary) + '</p>' + (r.doctor ? '<p class="p dim">Doctor: ' + esc(r.doctor) + '</p>' : '') + '</section>';
  if (r.foodRules && r.foodRules.length) h += '<section class="c"><div class="kick gtxt">WHAT THIS MEANS FOR YOUR FOOD</div>' + r.foodRules.map(function (x) { return '<p class="p">• ' + esc(x) + '</p>'; }).join('') + '</section>';
  var vals = (r.values || []).slice().sort(function (a, b) { return (a.status === 'normal') - (b.status === 'normal'); });
  h += '<section class="c"><h2>All values</h2>' + vals.map(function (v) {
    var hist = trendOf(v.name); return valRow(v) + (hist.length > 1 ? '<div class="trend">' + spark(hist.map(function (x) { return x.v; }), 330, 40, 'var(--ink)') + '<div class="row sb l">' + hist.map(function (x) { return '<span>' + esc((x.d || '').slice(2, 7)) + ' · ' + x.v + '</span>'; }).join('') + '</div></div>' : '');
  }).join('') + '</section>';
  h += '<div class="l ctrtxt">Read by AI. Not a diagnosis: check anything unusual with your doctor.</div><button class="btn sec mt" data-act="delReport" data-id="' + r.id + '">' + icon('trash', 18) + 'Delete this report</button>';
  return h;
};
function trendOf(name) {
  var n = name.toLowerCase(), out = [];
  DB.reports.forEach(function (r) { (r.values || []).forEach(function (v) { var x = parseFloat(v.value); if (v.name.toLowerCase() === n && !isNaN(x)) out.push({ d: r.date || dkey(new Date(r.t)), v: x }); }); });
  return out.sort(function (a, b) { return a.d.localeCompare(b.d); });
}
var READING = false;
ACT.addReport = function (el) {
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  var cam = el.getAttribute('data-src') === 'cam';
  pickImages(cam ? 'image/*' : 'application/pdf,image/*', !cam, cam).then(function (files) {
    if (!files.length) return;
    if (cam) { REPORT_PAGES = (REPORT_PAGES || []).concat(files); return pagesSheet(); }
    readReport(files);
  });
};
var REPORT_PAGES = null;
function pagesSheet() {
  sheet('<h2>' + REPORT_PAGES.length + ' page' + (REPORT_PAGES.length > 1 ? 's' : '') + ' ready</h2><p class="p">Add a photo of every page, then read them together.</p><div class="g2 mt"><button class="btn sec" data-act="addReport" data-src="cam">+ Another page</button><button class="btn" data-act="readPages">Read report</button></div>');
}
ACT.readPages = function () { var p = REPORT_PAGES; REPORT_PAGES = null; sheet(null); readReport(p); };
function readReport(files) {
  READING = true; go('reports'); rerender();
  Promise.all(files.map(shrink)).then(function (fs) {
    var parts = fs.map(function (f) { return { inline_data: { mime_type: f.mime, data: f.data } }; });
    parts.push({ text: 'This is a medical lab report (Indian lab). Read every test value printed. Return JSON: {"title": short report name like "Full body checkup" or "Lipid profile", "lab": lab name if printed, "date": sample/report date as YYYY-MM-DD, "values": [{"name": standard short test name (e.g. HbA1c, Fasting glucose, Vitamin D, Vitamin B12, LDL cholesterol, HDL cholesterol, Triglycerides, Total cholesterol, TSH, Haemoglobin, Creatinine, Uric acid, SGPT (ALT), SGOT (AST), Platelets), "value": number or text as printed, "unit": unit, "range": reference range as printed, "status": "low"|"high"|"borderline"|"normal" judged against the printed range, "plain": one short sentence on what this result means for the person}], "summary": 3-4 plain sentences on the overall picture, "foodRules": [up to 5 short diet rules for an Indian vegetarian based on these results], "doctor": one line on what to discuss with a doctor, or empty}. Only include values actually printed. Context about the person: ' + healthContext().split('\n')[0] });
    return gAsk(parts, { json: true, temp: 0.1 });
  }).then(function (j) {
    var r = { id: uid(), t: Date.now(), title: j.title, lab: j.lab, date: j.date, values: (j.values || []).map(function (v) { return { name: String(v.name || ''), value: v.value, unit: v.unit || '', range: v.range || '', status: String(v.status || 'normal').toLowerCase(), plain: v.plain || '' }; }), summary: j.summary || '', foodRules: j.foodRules || [], doctor: j.doctor || '' };
    DB.reports.push(r); DB.coach = {}; save(); READING = false; go('report/' + r.id);
  }).catch(function (e) { READING = false; rerender(); aiErr(e); });
}
ACT.delReport = function (el) { var id = el.getAttribute('data-id'); DB.reports = DB.reports.filter(function (r) { return r.id !== id; }); save(); go('reports'); toast('Report deleted'); };

/* ---------- weight ---------- */
/* body composition from the Galaxy Watch (Samsung Health) */
var BODYF = [['fat', 'Body fat', '%', function (v) { return DB.profile.sex === 'f' ? (v < 21 ? 'ok' : v < 33 ? 'warn' : 'bad') : (v < 20 ? 'ok' : v < 25 ? 'warn' : 'bad'); }, true], ['skmMass', 'Skeletal muscle', 'kg', null, false], ['fatMass', 'Fat mass', 'kg', null, true], ['water', 'Body water', 'kg', null, false], ['bmr', 'BMR', 'kcal', null, false], ['ffm', 'Fat-free mass', 'kg', null, false], ['bmi', 'BMI', '', function (v) { return v < 23 ? 'ok' : v < 25 ? 'warn' : 'bad'; }, true]];
function bodyList() { return ((DB.health && DB.health.body) || []).filter(function (b) { return b.fat || b.skmMass || b.bmr; }).sort(function (a, b) { return b.t - a.t; }); }
function bodyCard() {
  var L = bodyList(), last = L[0], prev = L[1], hs = DB.health;
  var foot = '<div class="l mt6">' + (hs && hs.status === 'ok' ? 'Samsung Health read ' + ago(DB.healthAt) + ((hs.errors || []).filter(function (e) { return /weight/.test(e); }).length ? ' · ' + esc(hs.errors.filter(function (e) { return /weight/.test(e); })[0]) : '') : 'Connect Samsung Health to get your watch measurements') + ' · <button class="lnk" data-act="refreshHealth">Read now</button></div>';
  if (!last) return '<section class="c"><h2>Body composition</h2><div class="l">No watch measurement found yet. After measuring on the watch, open Samsung Health once so it syncs, then tap Read now.</div>' + foot + '</section>';
  var h = '<section class="c"><div class="row sb"><h2>Body composition</h2><span class="l">' + niceDate(dkey(new Date(last.t))) + ', ' + hm(last.t) + '</span></div><div class="g2 mt">';
  BODYF.forEach(function (f) {
    var v = last[f[0]]; if (!v) return; var st = f[3] ? f[3](v) : '', d = prev && prev[f[0]] ? v - prev[f[0]] : null;
    h += '<div class="bc"><div class="l">' + f[1] + '</div><b class="' + (st ? st + 't' : '') + '">' + (f[0] === 'bmr' ? n0(v) : n1(v)) + ' <small>' + f[2] + '</small></b>' + (d != null && Math.abs(d) >= 0.1 ? '<small class="' + ((f[4] ? d < 0 : d > 0) ? 'gtxt' : 'warnt') + '">' + (d > 0 ? '+' : '') + (f[0] === 'bmr' ? n0(d) : n1(d)) + ' since last</small>' : '') + '</div>';
  });
  h += '</div>';
  var BT = brain(); if (BT.fat && BT.toLoseFat > 0.3) h += '<div class="tip mt">' + icon('spark', 16) + '<span><b>Your real goal:</b> lose about ' + n1(BT.toLoseFat) + ' kg of fat and keep your ' + n1(BT.ffm) + ' kg of lean mass. That brings body fat to ' + BT.fatTarget + '% at about ' + n1((lastWeight() || DB.profile.weight) - BT.toLoseFat) + ' kg. Your protein target of ' + BT.p + ' g protects the muscle.</span></div>';
  if (last.fat) h += '<div class="l mt6">Healthy body fat for ' + (DB.profile.sex === 'f' ? 'women: 21–32%' : 'men: about 10–20%') + '. Watch readings vary with water and time of day, so measure at the same time, before food.</div>';
  if (L.length > 1) h += '<details><summary class="lnk">All measurements (' + L.length + ')</summary>' + L.slice(0, 20).map(function (b) { return '<div class="rd"><span>' + niceDate(dkey(new Date(b.t))) + ', ' + hm(b.t) + '</span><b>' + (b.fat ? n1(b.fat) + '% fat' : '') + (b.skmMass ? ' · ' + n1(b.skmMass) + ' kg muscle' : '') + '</b></div>'; }).join('') + '</details>';
  return h + foot + '</section>';
}
ROUTES.weight = function () {
  var p = DB.profile, w = merged('weight'), now = w[0] ? w[0].kg : p.weight, start = w.length ? w[w.length - 1].kg : p.weight;
  var h = head('Weight', '', '<button class="btn sm" data-act="logWeight">+ Log</button>');
  var lost = start - now, togo = now - p.goal, pct = start > p.goal ? clamp((start - now) / (start - p.goal) * 100, 0, 100) : 100;
  h += '<section class="c"><div class="g3"><div><div class="l">Now</div><b class="m24">' + n1(now) + '</b><div class="l">kg</div></div><div><div class="l">Goal</div><b class="m24">' + n1(p.goal) + '</b><div class="l">kg</div></div><div><div class="l">' + (lost >= 0 ? 'Lost' : 'Gained') + '</div><b class="m24 ' + (lost >= 0 ? 'gtxt' : 'warnt') + '">' + n1(Math.abs(lost)) + '</b><div class="l">kg' + (w.length > 1 ? ' since ' + niceDate(dkey(new Date(w[w.length - 1].t))).slice(5) : '') + '</div></div></div>' + '<div class="mt">' + bar(pct) + '</div><div class="l mt6">' + Math.round(pct) + '% of the way' + (togo > 0 ? ' · ' + n1(togo) + ' kg to go' : ' · goal reached') + '</div>';
  var h2 = 'BMI ' + n1(now / Math.pow(p.height / 100, 2)); h += '<div class="l mt6">' + h2 + ' (Asian healthy range 18.5–22.9)</div></section>';
  h += bodyCard();
  var pts = w.slice(0, 40).reverse();
  if (pts.length > 1) h += '<section class="c"><div class="l">Trend</div>' + spark(pts.map(function (x) { return x.kg; }), 330, 130, 'var(--ink)', p.goal) + '<div class="row sb l"><span>' + n1(pts[0].kg) + '</span><span>Goal line ' + n1(p.goal) + '</span><span>' + n1(pts[pts.length - 1].kg) + '</span></div></section>';
  var rate = weeklyRate(w);
  if (rate != null) {
    var msg;
    if (rate < -0.05 && togo > 0) { var wk = togo / -rate, eta = new Date(Date.now() + wk * 7 * 86400000); msg = n1(-rate) + ' kg a week · goal around ' + MON[eta.getMonth()] + ' ' + eta.getFullYear(); }
    else if (togo > 0) msg = 'Weight is flat or going up (' + (rate >= 0 ? '+' : '') + n1(rate) + ' kg a week).';
    else msg = 'At goal. Now hold steady.';
    var tip = 'Your budget of ' + n0(baseBudget()) + ' kcal is about ' + n0(bmr() * 1.3 - baseBudget()) + ' below what you burn on a normal day. Staying within it 6 days a week gives about ' + n1((bmr() * 1.3 - baseBudget()) * 6 / 7700) + ' kg a week.';
    h += '<section class="c mintbg"><div class="l2">PACE</div><b class="m16">' + msg + '</b><p>' + tip + '</p></section>';
  } else h += '<section class="c"><div class="l">Log your weight 2–3 times a week, same time (morning, after the toilet, before food). After 2 weeks you\'ll see your pace and goal date here.</div></section>';
  h += '<section class="c"><h2>Recent</h2>' + (w.length ? w.slice(0, 12).map(function (x) { return '<div class="rd"><span>' + niceDate(dkey(new Date(x.t))) + ', ' + hm(x.t) + (x.src ? ' · ' + x.src : '') + '</span><b>' + n1(x.kg) + ' kg' + (x.waist ? ' · ' + x.waist + ' in' : '') + '</b></div>'; }).join('') : '<div class="l">No weight logged yet.</div>') + '</section>';
  return h;
};
function weeklyRate(w) {
  var cut = Date.now() - 56 * 86400000, pts = w.filter(function (x) { return x.t >= cut; });
  if (pts.length < 3 || pts[0].t - pts[pts.length - 1].t < 10 * 86400000) return null;
  var n = pts.length, mx = 0, my = 0; pts.forEach(function (p) { mx += p.t; my += p.kg; }); mx /= n; my /= n;
  var num = 0, den = 0; pts.forEach(function (p) { num += (p.t - mx) * (p.kg - my); den += (p.t - mx) * (p.t - mx); });
  return den ? num / den * 7 * 86400000 : null;
}
ACT.logWeight = function () {
  var last = lastWeight() || DB.profile.weight;
  sheet('<h2>Log weight</h2><div class="g2 mt"><label class="fld">Weight (kg)<input id="wt_k" type="number" inputmode="decimal" step="0.1" value="' + n1(last) + '"></label><label class="fld">Waist (inches, optional)<input id="wt_w" type="number" inputmode="decimal" step="0.5"></label></div><button class="btn mt" data-act="saveWeight">Save</button>');
};
ACT.saveWeight = function () {
  var k = +document.getElementById('wt_k').value, ws = +document.getElementById('wt_w').value;
  if (!(k > 25 && k < 250)) return toast('Enter weight in kg');
  DB.weight.push({ t: Date.now(), kg: k, waist: ws || 0 }); DB.profile.weight = k; save(); sheet(null); rerender(); toast('Saved ' + n1(k) + ' kg');
};

/* ---------- more ---------- */
ROUTES.theme = function () {
  var cur0 = themeOf()[0], h = head('Look and colours', 'Pick a theme for the whole app');
  var sw = function (t) { return '<button class="thb' + (t[0] === cur0 ? ' on' : '') + '" data-act="setTheme" data-v="' + t[0] + '" style="background:' + (t[7] ? t[4] + ';color:' + t[5] + ';border:1px solid ' + t[6] : 'linear-gradient(135deg,' + t[5] + ',' + t[6] + ')') + '"><span>' + t[1] + '<small><br>' + t[2] + '</small></span><i><b style="background:' + t[4] + ';border:1px solid #ccc"></b><b style="background:' + t[5] + '"></b><b style="background:' + t[6] + '"></b></i></button>'; };
  h += '<div class="thm"><h3 class="sech">Soft and light</h3>' + THEMES.filter(function (t) { return t[7]; }).map(sw).join('') + '<h3 class="sech">Bold</h3>' + THEMES.filter(function (t) { return !t[7]; }).map(sw).join('') + '</div>';
  if (0) h += '<div class="thm">' + THEMES.map(function (t) { return '<button class="thb' + (t[0] === cur0 ? ' on' : '') + '" data-act="setTheme" data-v="' + t[0] + '" style="background:linear-gradient(135deg,' + t[5] + ',' + t[6] + ');' + (t[0] === 'classic' ? 'color:#fff' : '') + '"><span>' + t[1] + '<small><br>' + t[2] + '</small></span><i><b style="background:' + t[4] + '"></b><b style="background:' + t[5] + '"></b><b style="background:' + t[6] + '"></b></i></button>'; }).join('') + '</div>';
  h += '<section class="c"><div class="l">PREVIEW</div><div class="row g16 mt"><div>' + ring(68, 92, 10, 'var(--g)', '<text x="46" y="52" text-anchor="middle" class="rt3">68%</text>') + '</div><div class="f1"><b class="m18">Today</b><div class="l">1,240 of 1,800 kcal</div>' + bar(68) + '<div class="chips"><button class="chip dk">Selected</button><button class="chip">Chip</button></div></div></div><button class="btn mt">Primary button</button><button class="btn sec mt">Secondary</button></section>';
  return h;
};
ACT.setTheme = function (el) { DB.settings.theme = el.getAttribute('data-v'); save(); applyTheme(); rerender(); };
TABOF.theme = 'more';
ROUTES.more = function () {
  var h = '<h1 class="big">More</h1>';
  var row = function (to, ic, t, s) { return '<button class="res" data-act="go" data-to="' + to + '"><span class="row g12"><span class="mic">' + icon(ic, 20) + '</span><span>' + t + '<small>' + s + '</small></span></span>' + icon('chev', 18) + '</button>'; };
  h += row('rewards', 'trophy', 'Rewards and badges', (function () { var r = rwStats(); return 'Level ' + (r.lv + 1) + ' · ' + n0(r.pts) + ' points · ' + r.goodCur + '-day streak'; })());
  h += row('reports', 'doc', 'Medical reports', DB.reports.length ? DB.reports.length + ' saved · AI reads them' : 'Scan or upload, AI reads them');
  h += row('weight', 'scale', 'Weight', lastWeight() ? n1(lastWeight()) + ' kg · goal ' + n1(DB.profile.goal) : 'Track towards your goal');
  h += row('yoga', 'yoga', 'Yoga', yogaMin(today()) + ' min today');
  h += row('water', 'drop', 'Water', (waterMl(today()) / 1000).toFixed(2) + ' L today · reminders');
  h += row('meds', 'pill', 'Medicines', meds().length ? meds().length + ' active · ' + (adherence(7).pct == null ? 'no doses yet' : adherence(7).pct + '% taken this week') : 'Doses, reminders, stock');
  h += row('bp', 'bp', 'Blood pressure', merged('bp').length + ' readings');
  h += row('sugar', 'pulse', 'Blood sugar', merged('sugar').length + ' readings');
  h += row('profile', 'edit', 'Me, calorie budget and macros', n0(baseBudget()) + ' kcal a day');
  h += row('theme', 'spark', 'Look and colours', themeOf()[1] + ' theme');
  h += row('settings', 'gear', 'AI, Samsung Health and backup', DB.settings.gkey ? 'Gemini connected' : 'Add your Gemini key');
  return h;
};

/* ---------- profile / budget ---------- */
var PRESETS = [['Balanced', 20, 50, 30], ['High protein', 30, 40, 30], ['Sugar-friendly', 25, 40, 35], ['Low carb', 30, 30, 40]];
ROUTES.profile = function () {
  var p = DB.profile, sb = suggestedBudget(), tg = macroTargets();
  var h = head('Me and my budget');
  h += '<section class="c"><h2>About me</h2><div class="g2 mt">' + fld('Name', 'name', p.name, 'text') + '<label class="fld">Sex<select data-chg="prof" data-k="sex"><option value="m"' + (p.sex === 'm' ? ' selected' : '') + '>Male</option><option value="f"' + (p.sex === 'f' ? ' selected' : '') + '>Female</option></select></label>' +
    fld('Age', 'age', p.age) + fld('Height (cm)', 'height', p.height) + fld('Weight (kg)', 'weight', n1(lastWeight() || p.weight)) + fld('Goal weight (kg)', 'goal', p.goal) + '</div>' +
    '<label class="fld">Lose per week<select data-chg="prof" data-k="pace">' + [[0, 'Stay the same'], [0.25, '¼ kg (easy)'], [0.5, '½ kg (recommended)'], [0.75, '¾ kg (hard)']].map(function (o) { return '<option value="' + o[0] + '"' + (+p.pace === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
    '<label class="fld">Daily life (without workouts)<select data-chg="prof" data-k="activity">' + [[1.2, 'Mostly sitting'], [1.3, 'Office + commute'], [1.45, 'On my feet a lot']].map(function (o) { return '<option value="' + o[0] + '"' + (+p.activity === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></section>';
  if (DB.settings.smart !== false) { var BT = brain(); h += '<section class="c"><h2>Calorie budget</h2><div class="ctr mt"><b class="huge">' + n0(BT.kcal) + '</b><div class="l">smart · from your body, BP and sugar · protein ' + BT.p + ' g</div></div><details><summary class="lnk">How it was worked out</summary>' + BT.why.map(function (w) { return '<p class="p">' + esc(w) + '</p>'; }).join('') + '</details>' + tog('Smart targets (recommended)', 'smart', true) + tog('If I go over, balance it the next day', 'carry', DB.settings.carry) + '</section>'; }
  else h += '<section class="c"><h2>Calorie budget</h2><div class="stepper"><button class="step" data-act="budStep" data-d="-50" aria-label="Lower">−</button><div class="ctr"><b class="huge">' + n0(baseBudget()) + '</b><div class="l">' + (p.budget ? 'set by you · suggested ' + n0(sb) : 'suggested for you') + '</div></div><button class="step" data-act="budStep" data-d="50" aria-label="Higher">+</button></div>' + (p.budget ? '<button class="lnk" data-act="budAuto">Use suggested ' + n0(sb) + '</button>' : '') +
    '<div class="l mt">Calories burned in workouts and walks (from your watch) are added on top each day.</div>' + tog('If I go over, balance it the next day', 'carry', DB.settings.carry) + '</section>';
  if (DB.settings.smart === false) h += '<section class="c">' + tog('Smart targets (recommended)', 'smart', false) + '</section>';
  if (DB.settings.smart !== false) { var MT = macroTargets(); h += '<section class="c"><h2>Daily targets</h2><div class="g3 mt"><div><div class="l">Protein</div><b class="m18">' + MT.p + ' g</b></div><div><div class="l">Carbs</div><b class="m18">' + MT.c + ' g</b></div><div><div class="l">Fat</div><b class="m18">' + MT.f + ' g</b></div><div><div class="l">Fibre</div><b class="m18">' + MT.fi + ' g</b></div><div><div class="l">Sodium</div><b class="m18">≤ ' + n0(MT.na) + '</b></div><div><div class="l">Added sugar</div><b class="m18">≤ ' + MT.su + ' g</b></div></div><button class="lnk" data-act="go" data-to="guide">See your food guide →</button>' + tog('Show vegetarian food only', 'vegOnly', DB.profile.vegOnly) + '</section>'; return h; }
  h += '<section class="c"><h2>Macros</h2><div class="chips">' + PRESETS.map(function (x) { var on = +p.protein === x[1] && +p.carb === x[2] && +p.fat === x[3]; return '<button class="chip' + (on ? ' dk' : '') + '" data-act="preset" data-p="' + x.slice(1).join(',') + '">' + x[0] + '</button>'; }).join('') + '</div>' +
    '<div class="rd"><span>Protein ' + p.protein + '%</span><b>' + tg.p + ' g</b></div><div class="rd"><span>Carbs ' + p.carb + '%</span><b>' + tg.c + ' g</b></div><div class="rd"><span>Fat ' + p.fat + '%</span><b>' + tg.f + ' g</b></div><div class="rd"><span>Fibre</span><b>' + tg.fi + ' g</b></div>' +
    tog('Show vegetarian food only', 'vegOnly', p.vegOnly) + '</section>';
  return h;
};
function fld(label, k, v, type) { return '<label class="fld">' + label + '<input data-chg="prof" data-k="' + k + '" type="' + (type || 'number') + '" inputmode="' + (type === 'text' ? 'text' : 'decimal') + '" value="' + esc(v) + '"></label>'; }
CHG.prof = function (el) {
  var k = el.getAttribute('data-k'), v = el.value;
  if (k === 'name' || k === 'sex') DB.profile[k] = v; else { v = +v; if (!(v > 0) && k !== 'pace') return; DB.profile[k] = v; }
  if (k === 'weight' && Math.abs(v - lastWeight()) > 0.05) DB.weight.push({ t: Date.now(), kg: v });
  save(); rerender();
};
ACT.budStep = function (el) { DB.profile.budget = clamp(baseBudget() + +el.getAttribute('data-d'), 1000, 4000); save(); rerender(); };
ACT.budAuto = function () { DB.profile.budget = 0; save(); rerender(); };
ACT.preset = function (el) { var v = el.getAttribute('data-p').split(','); DB.profile.protein = +v[0]; DB.profile.carb = +v[1]; DB.profile.fat = +v[2]; save(); rerender(); };

/* ---------- settings ---------- */
ROUTES.shdata = function () {
  var h = DB.health, out = head('Samsung Health data', h && h.readAt ? 'Last read ' + ago(h.readAt) + ', ' + hm(h.readAt) : 'Not read yet');
  if (!h) return out + '<div class="empty-s">Nothing read yet. Tap Read now.</div><button class="btn mt" data-act="refreshHealth">Read now</button>';
  var lastT = function (arr) { return arr && arr.length ? arr.reduce(function (a, x) { return Math.max(a, x.t || x.end || 0); }, 0) : 0; };
  var row = function (name, n, t, extra) { return '<div class="rd"><span>' + name + (t ? '<small class="l"> · latest ' + niceDate(dkey(new Date(t))) + ', ' + hm(t) + '</small>' : '') + '</span><b class="' + (n ? '' : 'warnt') + '">' + (n ? n + (extra || '') : 'none') + '</b></div>'; };
  var k = today();
  out += '<section class="c"><div class="rd"><span>Connection</span><b class="' + (h.status === 'ok' ? 'gtxt' : 'warnt') + '">' + esc(h.status) + '</b></div>' +
    row('Steps (days)', Object.keys(h.steps || {}).length, 0, h.steps && h.steps[k] != null ? ' · today ' + n0(h.steps[k]) : '') +
    row('Heart rate readings', h.hrReadings != null ? h.hrReadings : (h.hrRecent || []).length, lastT(h.hrRecent), h.hrRecords ? ' in ' + h.hrRecords + ' records' : '') +
    row('Sleep records', (h.sleep || []).length, lastT((h.sleep || []).map(function (x) { return { t: x.end }; }))) +
    row('Energy score (days)', Object.keys(h.energy || {}).length, 0) +
    row('SpO₂ readings (2 days)', (h.spo2 || []).length, lastT(h.spo2)) +
    row('Blood pressure', (h.bp || []).length, lastT(h.bp)) + row('Blood sugar', (h.glucose || []).length, lastT(h.glucose)) +
    row('Weight', (h.weight || []).length, lastT(h.weight)) + row('Workouts (2 days)', (h.exercise || []).length, lastT((h.exercise || []).map(function (x) { return { t: x.end }; }))) + '</section>';
  if (h.errors && h.errors.length) out += '<section class="c"><h2>Could not read</h2>' + h.errors.map(function (e) { return '<p class="p warnt">' + esc(e) + '</p>'; }).join('') + '<p class="l mt">Usually a permission that was not allowed. Tap Permissions below and allow everything.</p></section>';
  out += '<section class="c"><h2>If something is missing</h2><ol class="ol"><li>Open Samsung Health on the phone and check the reading is there. If it is not there either, the watch has not synced yet: open the Galaxy Wearable app or keep the watch near the phone.</li><li>On the watch: Samsung Health → Settings → Heart rate → <b>Measure continuously</b> (or every 10 min).</li><li>Sleep score and Energy score appear after you wear the watch to bed; Energy score comes in the morning.</li></ol></section>';
  out += '<div class="g2"><button class="btn sec" data-act="connectHealth">Permissions</button><button class="btn" data-act="refreshHealth">Read now</button></div>';
  return out;
};
ROUTES.settings = function () {
  var s = DB.settings, h = head('Settings');
  h += '<section class="c"><h2>AI (Google Gemini)</h2><p class="p">Reads reports and plate photos and powers the coach. Get a free key at aistudio.google.com → Get API key. The Trikaal key works too.</p><label class="fld">Gemini API key<input id="gk" type="password" autocomplete="off" value="' + esc(s.gkey) + '" data-chg="gkey"></label>' +
    '<div class="g2"><button class="btn sec" data-act="testKey">Test key</button>' + (s.gmodel ? '<div class="l ctrtxt">Using ' + esc(s.gmodel) + '</div>' : '') + '</div>' + (s.lastAiErr ? '<div class="note warn mt">Last AI error: ' + esc(s.lastAiErr) + '</div>' : '') + '</section>';
  var hs = DB.health ? DB.health.status : 'not connected';
  h += '<section class="c"><h2>Samsung Health</h2><div class="rd"><span>Status</span><b>' + (hs === 'ok' ? 'Connected · ' + ago(DB.healthAt) : esc(hs.replace(/_/g, ' '))) + '</b></div><div class="g2 mt"><button class="btn sec" data-act="connectHealth">' + (hs === 'ok' ? 'Permissions' : 'Connect') + '</button><button class="btn sec" data-act="refreshHealth">Read now</button></div></section>';
  var hc = DB.hc || {};
  h += '<section class="c"><h2>Health Connect</h2><div class="l">For readings other apps save there, like Omron BP.</div><div class="rd"><span>Status</span><b>' + (hc.on && hc.status === 'ok' ? 'Linked · ' + ago(hc.at) : esc((hc.status || 'not linked').replace(/_/g, ' '))) + '</b></div>' + (hc.status === 'ok' ? '<div class="rd"><span>Readings found</span><b>' + (hc.bp || []).length + ' BP · ' + (hc.sugar || []).length + ' sugar · ' + (hc.weight || []).length + ' weight</b></div>' : '') + '<div class="g2 mt"><button class="btn sec" data-act="hcConnect">' + (hc.status === 'ok' ? 'Permissions' : 'Link') + '</button><button class="btn sec" data-act="hcReadNow">Read now</button></div></section>';
  h += backupCard();
  h += remindCheck(true);
  h += '<section class="c"><h2>Sounds and vibration</h2><div class="l">Chimes and a buzz when you finish a goal, log water, take a medicine, or change breath in pranayama.</div>' +
    '<button class="tog" data-act="tgSound" role="switch" aria-checked="' + (s.sound !== false) + '"><span>Sounds in the app</span><i class="' + (s.sound !== false ? 'on' : '') + '"></i></button>' +
    '<button class="tog" data-act="tgBuzz" role="switch" aria-checked="' + (s.buzz !== false) + '"><span>Vibration</span><i class="' + (s.buzz !== false ? 'on' : '') + '"></i></button>' +
    '<button class="btn sec mt" data-act="tryFeel">' + icon('bell', 18) + 'Play a test chime</button></section>';
  h += '<section class="c"><h2>Backup file by hand</h2><p class="p">Save a copy anywhere, or restore from a file.</p><div class="g2"><button class="btn sec" data-act="backup">Save a copy</button><button class="btn sec" data-act="restore">Restore</button></div></section>';
  h += '<section class="c"><h2>About</h2><p class="p">Arogya ' + APP_VERSION + (native('version') ? ' (build ' + native('version') + ')' : '') + '. Food values from the Indian Nutrient Databank (1,014 recipes) plus standard values for common items. Not a medical device: talk to your doctor about anything worrying.</p></section>';
  return h;
};
CHG.gkey = function (el) { DB.settings.gkey = el.value.trim(); DB.settings.gmodel = ''; DB.settings.gbad = []; save(); };
ACT.testKey = function () {
  var i = document.getElementById('gk'); if (i) { DB.settings.gkey = i.value.trim(); DB.settings.gmodel = ''; save(); }
  if (!DB.settings.gkey) return toast('Paste your key first');
  toast('Checking…');
  withTimeout(gAsk([{ text: 'Reply with the single word OK.' }], { fast: true }), 45000).then(function () { DB.settings.lastAiErr = ''; save(); toast('Key works · ' + DB.settings.gmodel, 3000); rerender(); }).catch(aiErr);
};
ACT.backup = function () { native('saveFile', 'arogya-backup-' + today() + '.json', 'application/json', JSON.stringify(DB)) === null && !AND && toast('Backup works in the phone app'); };
ACT.restore = function () { native('openFile'); };
ACT.tgSound = function () { DB.settings.sound = DB.settings.sound === false; save(); rerender(); if (DB.settings.sound) feel('done'); };
ACT.tgBuzz = function () { DB.settings.buzz = DB.settings.buzz === false; save(); rerender(); if (DB.settings.buzz) native('vibrate', '80'); };
ACT.tryFeel = function () { feel('win'); };

/* ---------- automatic backup to Google Drive ---------- */
function backupCard() {
  var st = {}; try { st = JSON.parse(native('backupStatus') || '{}'); } catch (e) { }
  var h = '<section class="c"><div class="row g12"><span class="mic" style="--sc:#4E8FD0">' + icon('cloud', 20) + '</span><div class="f1"><h2>Automatic backup</h2><div class="l">Once a day — every time you close Arogya and again at night — your data is copied to one file you choose. Pick it in Google Drive and it stays safe even if you lose the phone.</div></div></div>';
  if (!AND) return h + '<div class="note mt">Works in the phone app.</div></section>';
  if (!st.set) h += '<div class="note warn mt">Not set up yet. Tap below, choose <b>Drive</b> in the side menu, pick a folder and tap Save.</div><button class="btn mt" data-act="bkPick">' + icon('cloud', 18) + 'Choose Google Drive file</button>';
  else {
    h += '<div class="rd"><span>Backup file</span><b>' + esc(st.name || 'arogya-backup.json') + '</b></div><div class="rd"><span>Last backup</span><b class="' + (st.last && Date.now() - st.last < 36 * 3600000 ? 'gtxt' : 'warnt') + '">' + (st.last ? ago(st.last) : 'not yet') + '</b></div>';
    if (st.err && st.errAt > st.last) h += '<div class="note warn mt">Last try failed: ' + esc(st.err) + '. If you deleted or moved the file, choose it again.</div>';
    h += '<div class="g2 mt"><button class="btn" data-act="bkNow">Back up now</button><button class="btn sec" data-act="bkPick">Change file</button></div>';
  }
  if (st.local && st.local.length) h += '<div class="l mt">Copies kept on this phone (last 7 days)</div><div class="chips">' + st.local.slice().reverse().map(function (n) { return '<button class="chip" data-act="bkLocal" data-n="' + esc(n) + '">' + esc(n.replace('arogya-', '').replace('.json', '')) + '</button>'; }).join('') + '</div><div class="l">Tap a date to restore that day\'s copy.</div>';
  return h + '</section>';
}
ACT.bkPick = function () { native('backupPick'); };
ACT.bkNow = function () { toast('Backing up…'); save(); setTimeout(function () { native('backupNow'); }, 400); };
ACT.bkLocal = function (el) {
  var n = el.getAttribute('data-n');
  sheet('<h2>Restore ' + esc(n.replace('arogya-', '').replace('.json', '')) + '?</h2><p class="p">Everything after that day\'s backup will be replaced. Today\'s data is saved as a copy first.</p><div class="g2 mt"><button class="btn sec" data-act="closeSheet">Cancel</button><button class="btn" data-act="bkLocalGo" data-n="' + esc(n) + '">Restore</button></div>');
};
ACT.bkLocalGo = function (el) { var t = native('backupLocal', el.getAttribute('data-n')); sheet(null); if (!t) return toast('Could not read that copy'); window.onFileOpened(t); };
window.onBackup = function (r) {
  var m = { ok: 'Backed up to your file', local: 'Saved on the phone — choose a Drive file for a safe copy', error: 'Backup failed — see Settings', 'no data': 'Nothing to back up yet', skip: 'Already backed up today' };
  toast(m[r] || r, 3000); if (r === 'ok') feel('done'); if (cur.name === 'settings') rerender();
};
window.onFileOpened = function (text) {
  try { var d = JSON.parse(text); if (!d.profile || !d.days) throw 0; DB = Object.assign(blank(), d); save(); toast('Restored'); go('home'); render(); } catch (e) { toast('That is not an Arogya backup file'); }
};

/* ---------- onboarding ---------- */
var OB = 0;
ROUTES.onboard = function () {
  var p = DB.profile, h = '<div class="ob"><div class="logo">' + icon('heart', 34) + '</div>';
  if (OB === 0) {
    h += '<h1 class="big">Welcome to Arogya</h1><p class="p">Food, water, vitals from your Galaxy Watch, BP, sugar, reports and yoga, with a coach that reads them all together.</p><p class="p">A few details first, so your calorie budget fits you.</p>';
    h += '<section class="c"><div class="g2">' + fld('Your name', 'name', p.name, 'text') + '<label class="fld">Sex<select data-chg="prof" data-k="sex"><option value="m"' + (p.sex === 'm' ? ' selected' : '') + '>Male</option><option value="f"' + (p.sex === 'f' ? ' selected' : '') + '>Female</option></select></label>' + fld('Age', 'age', p.age) + fld('Height (cm)', 'height', p.height) + fld('Weight (kg)', 'weight', p.weight) + fld('Goal weight (kg)', 'goal', p.goal) + '</div></section>';
    h += '<button class="btn big" data-act="obNext">Next</button>';
  } else {
    h += '<h1 class="big">Your daily budget</h1><section class="c ctrtxt"><b class="huge">' + n0(suggestedBudget()) + '</b><div class="l">kcal a day, to lose about ½ kg a week</div><p class="p">Calories you burn walking and in workouts are added on top, straight from your watch. You can change this any time in More.</p></section>';
    h += '<button class="btn big" data-act="obDone">Start</button>';
  }
  return h + '</div>';
};
ACT.obNext = function () { if (!DB.profile.name) return toast('Tell me your name'); OB = 1; DB.weight.push({ t: Date.now(), kg: DB.profile.weight }); save(); rerender(); };
ACT.obDone = function () { DB.profile.onboarded = true; save(); go('home'); if (AND) setTimeout(function () { native('healthConnect'); }, 600); };

/* ---------- boot ---------- */
function boot() {
  load(); applyTheme(); cur = parseHash();
  if (!location.hash) history.replaceState(null, '', '#home');
  takeMedAdds();
  try { var adds = JSON.parse(native('takeWaterAdds') || '[]'); adds.forEach(function (a) { day(dkey(new Date(a.t))).water.push({ t: a.t, ml: a.ml }); }); if (adds.length) save(); } catch (e) { }
  render(); syncNative(); refreshHealth(true);
  setInterval(function () { if (document.visibilityState === 'visible') { refreshHealth(false); if (cur.name === 'home') rerender(); } }, 300000);
}
document.addEventListener('DOMContentLoaded', boot);
ROUTES.weight.after = function () { if (Date.now() - (DB.healthAt || 0) > 60000) refreshHealth(true); };
