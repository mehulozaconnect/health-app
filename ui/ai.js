/* Gemini: model pick, calls, context for the coach */
'use strict';
var GBASE = 'https://generativelanguage.googleapis.com/v1beta/';
function gVer(n) { var m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; }
function gRank(n) {
  var s = gVer(n) * 100;
  if (/-flash(?!-lite)/.test(n)) s += 50; else if (/-pro/.test(n)) s += 20; else if (/lite/.test(n)) s += 5; else s -= 1000;
  if (/exp|preview/.test(n)) s -= 150; if (/-\d{2}-\d{2}|\d{3,}$/.test(n)) s -= 10; if ((DB.settings.gbad || []).indexOf(n) >= 0) s -= 5000;
  return s;
}
function gModel() {
  if (DB.settings.gmodel) return Promise.resolve(DB.settings.gmodel);
  return http('GET', GBASE + 'models?pageSize=200', { 'x-goog-api-key': DB.settings.gkey }).then(function (r) {
    var d = JSON.parse(r.text || '{}');
    if (r.status !== 200) throw new Error((d.error && d.error.message) || 'HTTP ' + r.status);
    var list = (d.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace(/^models\//, ''); })
      .filter(function (n) { return /^gemini-/.test(n) && !/image|tts|audio|live|embed|computer|robotics|learnlm|aqa|gemma|nano|banana/.test(n); });
    list.sort(function (a, b) { return gRank(b) - gRank(a); });
    DB.settings.gmodels = list; DB.settings.gmodel = list[0] || 'gemini-2.5-flash'; save();
    return DB.settings.gmodel;
  });
}
/* parts: [{text}|{inline_data:{mime_type,data}}]; json: ask for JSON back */
function gAsk(parts, opt) {
  opt = opt || {};
  if (!DB.settings.gkey) return Promise.reject(new Error('NOKEY'));
  return gModel().then(function (model) {
    var body = { contents: (opt.history || []).concat([{ role: 'user', parts: parts }]), generationConfig: { temperature: opt.temp == null ? 0.4 : opt.temp } };
    if (opt.system) body.systemInstruction = { parts: [{ text: opt.system }] };
    if (opt.json) body.generationConfig.responseMimeType = 'application/json';
    if (opt.fast && !opt.noThink) body.generationConfig.thinkingConfig = /gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: opt.thinkLow ? 'low' : 'minimal' };
    return http('POST', GBASE + 'models/' + encodeURIComponent(model) + ':generateContent', { 'content-type': 'application/json', 'x-goog-api-key': DB.settings.gkey }, JSON.stringify(body)).then(function (r) {
      var d; try { d = JSON.parse(r.text); } catch (e) { throw new Error('Unexpected reply (' + r.status + ')'); }
      if (r.status === 404 || (r.status === 429 && !opt.retried)) {
        if (r.status === 429) DB.settings.gbad = (DB.settings.gbad || []).concat([model]);
        DB.settings.gmodel = ''; save(); opt.retried = true; return gAsk(parts, opt);
      }
      if (r.status === 400 && opt.fast && !opt.noThink && /think/i.test(r.text)) { if (!opt.thinkLow) opt.thinkLow = true; else opt.noThink = true; return gAsk(parts, opt); }
      if (r.status >= 500 && !opt.retried5) { DB.settings.gbad = (DB.settings.gbad || []).concat([model]); DB.settings.gmodel = ''; save(); opt.retried5 = true; return gAsk(parts, opt); }
      if (r.status !== 200) throw new Error((d.error && d.error.message) || 'HTTP ' + r.status);
      var c = d.candidates && d.candidates[0], txt = c && c.content && c.content.parts ? c.content.parts.filter(function (p) { return p.text && !p.thought; }).map(function (p) { return p.text; }).join('') : '';
      if (!txt) throw new Error('Empty answer' + (c && c.finishReason ? ' (' + c.finishReason + ')' : ''));
      if (opt.json) { txt = txt.replace(/^```(json)?\s*|\s*```$/g, ''); return JSON.parse(txt); }
      return txt;
    });
  });
}
/* quick answers: each model gets `each` ms; a slow or busy model is set aside and the next best one is tried */
function gQuick(parts, opt, each, tries) {
  each = each || 25000; tries = tries || 3;
  var used = DB.settings.gmodel;
  return withTimeout(gAsk(parts, opt), each).catch(function (e) {
    if (e.message !== 'TIMEOUT' || tries <= 1) throw e;
    var m = DB.settings.gmodel || used; if (m) DB.settings.gbad = (DB.settings.gbad || []).concat([m]);
    DB.settings.gmodel = ''; save();
    return gQuick(parts, Object.assign({}, opt), each, tries - 1);
  });
}
function withTimeout(pr, ms) {
  return Promise.race([pr, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('TIMEOUT')); }, ms); })]);
}
function aiErr(e) {
  DB.settings.lastAiErr = (e && e.message) || String(e); save();
  if (e.message === 'TIMEOUT') { sheet('<h2>Gemini didn\'t answer</h2><p class="p">Google didn\'t reply in time' + (DB.settings.gmodel ? ' (' + esc(DB.settings.gmodel) + ')' : '') + '. Check your internet, then More → AI, Samsung Health and backup → <b>Test key</b>.</p><p class="l">You don\'t need AI to log food: type the parts, like <b>samosa pav</b> or <b>dal rice</b>, and Arogya builds the dish from its own list.</p><button class="btn mt" data-act="go" data-to="settings">Open AI settings</button>'); return; }
  if (e.message === 'NOKEY') { sheet('<h2>Add your Gemini key</h2><p class="p">AI features (reading reports, plate photos and the coach chat) use Google Gemini with your own key. It\'s free for personal use.</p><p class="p">Get one at aistudio.google.com → Get API key, then paste it in More → AI settings. You can use the same key as Trikaal.</p><button class="btn mt" data-act="go" data-to="settings">Open AI settings</button>'); return; }
  sheet('<h2>AI problem</h2><p class="p">' + esc(e.message) + '</p><p class="l">If it mentions the key, paste the key again in More → AI, Samsung Health and backup and tap Test key.</p><button class="btn mt" data-act="closeSheet">OK</button>');
}

/* compact picture of the person for every AI call */
function healthContext() {
  var p = DB.profile, k = today(), L = [];
  L.push('Person: ' + (p.name || 'user') + ', ' + (p.sex === 'f' ? 'female' : 'male') + ', ' + p.age + ' y, ' + p.height + ' cm, ' + n1(lastWeight() || p.weight) + ' kg, goal ' + p.goal + ' kg. Indian, ' + (p.vegOnly ? 'vegetarian (no egg, no meat)' : 'eats all foods') + '. Lives in Mumbai, office job.');
  var tg = macroTargets(); L.push('Daily calorie budget ' + baseBudget() + ' kcal (+ active calories from watch). Targets: protein ' + tg.p + ' g, carbs ' + tg.c + ' g, fat ' + tg.f + ' g, fibre ' + tg.fi + ' g. Water goal ' + DB.settings.water.goal + ' ml.');
  for (var i = 6; i >= 0; i--) {
    var dk = addDays(k, -i), t = dayTotals(dk), it = dayItems(dk), b = budgetFor(dk), sl = sleepFor(dk), st = stepsFor(dk), en = energyFor(dk), parts = [dk + (i === 0 ? ' (today, so far)' : '')];
    if (it.length) parts.push('ate ' + n0(t.kcal) + '/' + n0(b.total) + ' kcal, P' + n0(t.p) + ' C' + n0(t.c) + ' F' + n0(t.f) + ' fibre' + n0(t.fi) + '; ' + MEALS.map(function (m) { var x = dayIf(dk).meals[m[0]] || []; return x.length ? m[1] + ': ' + x.map(function (q) { return q.n.replace(/\s*\(.*\)$/, '') + ' ' + frac(q.q) + ' ' + q.u + ' @' + hm(q.t); }).join(', ') : ''; }).filter(Boolean).join('; '));
    else parts.push('no food logged');
    parts.push('water ' + waterMl(dk) + ' ml');
    if (st != null) parts.push('steps ' + st + ', active ' + earnedKcal(dk) + ' kcal');
    if (sl) parts.push('sleep ' + dur(sl.asleep) + ' (deep ' + Math.round(sl.m.deep / sl.staged * 100) + '%, REM ' + Math.round(sl.m.rem / sl.staged * 100) + '%, awake ' + Math.round(sl.m.awake / sl.staged * 100) + '%), score ' + sl.score);
    if (en != null) parts.push('energy score ' + en);
    var hd = hrDay(dk); if (hd) parts.push('HR ' + hd.min + '-' + hd.max + ' avg ' + hd.avg);
    var sp = spo2Night(dk); if (sp) parts.push('SpO2 sleep avg ' + sp.avg + '% min ' + sp.min + '%');
    if (yogaMin(dk)) parts.push('yoga ' + yogaMin(dk) + ' min');
    L.push(parts.join(' | '));
  }
  var bp = merged('bp').slice(0, 5); if (bp.length) L.push('BP readings: ' + bp.map(function (x) { return x.sys + '/' + x.dia + ' (' + dkey(new Date(x.t)) + ')'; }).join(', '));
  var su = merged('sugar').slice(0, 6); if (su.length) L.push('Sugar readings: ' + su.map(function (x) { return x.val + ' ' + x.type + ' (' + dkey(new Date(x.t)) + ')'; }).join(', '));
  var w = merged('weight').slice(0, 6); if (w.length) L.push('Weight: ' + w.map(function (x) { return n1(x.kg) + ' (' + dkey(new Date(x.t)) + ')'; }).join(', '));
  if (typeof meds === 'function' && meds().length) { L.push('Medicines: ' + meds().map(function (m) { var a = adherence(7, m.id); return medLabel(m) + ' (' + mcls(m.cls)[1] + '), ' + medQty(m) + ' at ' + (m.times || []).join(', ') + ' ' + m.food + ' food, since ' + (m.start || '?') + (a.pct != null ? ', took ' + a.taken + '/' + a.due + ' doses last 7 days' : ''); }).join('; ')); var mi = medInsights(); if (mi.length) L.push('Medicine patterns noticed: ' + mi.map(function (x) { return x.text; }).join(' ')); }
  if (typeof makePlan === 'function') { var PL1 = makePlan(); L.push('Yoga/pranayama plan from the app: ' + PL1.rec.map(function (r) { return practName(r.p) + ' (' + r.dose.txt + ')'; }).join('; ') + (PL1.avoid.length ? '. Avoid for now: ' + PL1.avoid.map(function (a) { return practName(a.p) + ' — ' + a.why; }).join('; ') : '')); }
  DB.reports.slice(-3).forEach(function (r) { L.push('Lab report ' + (r.date || '') + ' ' + (r.title || '') + ': ' + (r.values || []).filter(function (v) { return v.status !== 'normal'; }).map(function (v) { return v.name + ' ' + v.value + ' ' + (v.unit || '') + ' ' + v.status; }).join(', ') + (r.summary ? '. ' + r.summary : '')); });
  return L.join('\n');
}
var COACH_SYS = 'You are Arogya, a warm, practical holistic health coach for an Indian user. You see their food diary, Galaxy Watch data, BP, sugar, weight and lab reports. Be specific: name Indian dishes and portions (katori, roti count), timings and numbers from their data. Short sentences, plain English, no jargon. Never diagnose; when something needs a doctor, say so plainly. Never invent data you were not given.';

/* ---------- coach daily read via AI ---------- */
function aiDailyRead(force) {
  var k = today();
  if (!DB.settings.gkey) return;
  if (!force && DB.coach.date === k && DB.coach.read) return;
  if (aiDailyRead.busy) return; aiDailyRead.busy = true;
  gAsk([{ text: healthContext() + '\n\nWrite today\'s read. Return JSON {"score_note": one line on yesterday, "body": [up to 3 points on what the body/vitals are saying], "right": [up to 3 things they did right], "wrong": [up to 3 things that went wrong in food/habits], "plan": [3-5 concrete actions for today with Indian foods and times]}. Each point is one or two short sentences.' }], { json: true, system: COACH_SYS })
    .then(function (j) { DB.coach = { date: k, read: j, at: Date.now() }; save(); if (cur.name === 'coach') rerender(); })
    .catch(function (e) { if (force) aiErr(e); })
    .then(function () { aiDailyRead.busy = false; });
}

/* ---------- photo of a plate ---------- */
function pickImages(accept, multiple, capture) {
  return new Promise(function (res) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; if (multiple) inp.multiple = true; if (capture) inp.setAttribute('capture', 'environment');
    inp.onchange = function () {
      var files = [].slice.call(inp.files || []); if (!files.length) return res([]);
      Promise.all(files.map(function (f) { return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok({ mime: f.type || 'image/jpeg', data: String(r.result).split(',')[1], name: f.name, size: f.size }); }; r.readAsDataURL(f); }); })).then(res);
    };
    inp.click();
  });
}
function shrink(img) {
  if (!/^image\//.test(img.mime) || img.size < 900000) return Promise.resolve(img);
  return new Promise(function (ok) {
    var im = new Image(); im.onload = function () {
      var s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * s; c.height = im.height * s;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok({ mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1], name: img.name });
    }; im.onerror = function () { ok(img); }; im.src = 'data:' + img.mime + ';base64,' + img.data;
  });
}
var PHOTO = null;
ACT.photoMeal = function () {
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  pickImages('image/*', false, true).then(function (imgs) {
    if (!imgs.length) return;
    sheet('<h2>Reading your plate…</h2><div class="spin"></div><p class="l ctrtxt">Finding each dish and its portion.</p>');
    return shrink(imgs[0]).then(function (img) {
      return gAsk([{ inline_data: { mime_type: img.mime, data: img.data } }, { text: 'Identify every Indian food item on this plate/table and estimate the portion eaten by one person. Return JSON {"items":[{"name": common name of the dish in English with Hindi name in brackets, "qty": number, "unit": one of katori|piece|plate|glass|cup|tablespoon|grams, "grams": estimated grams}]}. Rotis/puris/idlis are pieces; dal, sabzi, rice, curd are katori.' }], { json: true });
    }).then(function (j) {
      var m = mealFor();
      PHOTO = { m: m, items: (j.items || []).map(function (x) {
        var hits = searchFoods(String(x.name).replace(/[()]/g, ' '), 3);
        if (!hits.length) hits = searchFoods(String(x.name).split(/[\s(]/)[0], 3);
        var r = hits[0]; if (!r) return null;
        var us = unitsOf(r), u = us.filter(function (y) { return y[0] === x.unit; })[0];
        var g = u && u[0] !== 'grams' ? u[1] * (+x.qty || 1) : (+x.grams || 100);
        return u && u[0] !== 'grams' ? itemOf(r, +x.qty || 1, u[0], g) : itemOf(r, Math.round(g), 'grams', g);
      }).filter(Boolean) };
      photoSheet();
    });
  }).catch(function (e) { sheet(null); aiErr(e); });
};
function photoSheet() {
  if (!PHOTO.items.length) return sheet('<h2>Couldn\'t recognise the food</h2><p class="p">Try a clearer photo from above, or search the dish by name.</p><button class="btn" data-act="closeSheet">OK</button>');
  var s = sumItems(PHOTO.items);
  sheet('<h2>Found on your plate</h2><div class="l">Check the portions, then add to ' + mealName(PHOTO.m) + '</div>' + PHOTO.items.map(function (it, i) { return '<div class="it"><span>' + esc(it.n) + '<small>' + frac(it.q) + ' ' + esc(it.u) + ' · ' + n0(iv(it, 'k')) + ' kcal</small></span><button class="ib" data-act="photoDel" data-i="' + i + '" aria-label="Remove">' + icon('x', 18) + '</button></div>'; }).join('') +
    '<div class="chips mt">' + MEALS.map(function (x) { return '<button class="chip' + (x[0] === PHOTO.m ? ' on' : '') + '" data-act="photoMeal2" data-m="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<button class="btn mt" data-act="photoAdd">Add all · ' + n0(s.kcal) + ' kcal</button>');
}
ACT.photoDel = function (el) { PHOTO.items.splice(+el.getAttribute('data-i'), 1); photoSheet(); };
ACT.photoMeal2 = function (el) { PHOTO.m = el.getAttribute('data-m'); photoSheet(); };
ACT.photoAdd = function () { SEL = today(); PHOTO.items.forEach(function (it) { pushItem(SEL, PHOTO.m, it); }); save(); sheet(null); toast('Added ' + PHOTO.items.length + ' items'); go('food'); rerender(); };
