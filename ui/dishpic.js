/* Dish photos: your own (from a screenshot or camera) first, otherwise a free photo from Wikipedia, cached.
   Own foods from a screenshot of another app: Gemini reads the values and the dish photo. Everything lives in DB, so the daily backup carries it. */
'use strict';
function pics() { DB.pics = DB.pics || {}; DB.picUrl = DB.picUrl || {}; return DB; }
function picKey(n) { return String(n || '').trim(); }
/* <img> when we have a photo, otherwise a soft initial that fills itself in once a photo is found */
function dishPic(name, size, cls) {
  pics(); var k = picKey(name), own = DB.pics[k], url = DB.picUrl[k], s = size || 44;
  var st = 'width:' + s + 'px;height:' + s + 'px';
  if (own || url) return '<img class="dpic ' + (cls || '') + '" style="' + st + '" src="' + esc(own || url) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  var ch = k.replace(/^[^A-Za-z]+/, '').charAt(0).toUpperCase() || '•';
  return '<span class="dpic ph ' + (cls || '') + '" style="' + st + ';font-size:' + Math.round(s * 0.42) + 'px" data-pic="' + esc(k) + '">' + ch + '</span>';
}
/* look up photos for the placeholders on screen, a few at a time */
var PICQ = { busy: 0, tried: {} };
function picFill() {
  if (!DB.settings || DB.settings.dishPics === false) return;
  var els = [].slice.call(document.querySelectorAll('[data-pic]')), want = [];
  els.forEach(function (el) { var n = el.getAttribute('data-pic'), u = (DB.picUrl || {})[n]; if (u === '' && Date.now() - ((DB.picMiss || {})[n] || 0) < 14 * 86400000) return; if (!PICQ.tried[n] && want.indexOf(n) < 0) want.push(n); });
  want.slice(0, 12).forEach(function (n) { PICQ.tried[n] = 1; picFind(n).then(function (url) { pics(); DB.picUrl[n] = url || ''; if (!url) { DB.picMiss = DB.picMiss || {}; DB.picMiss[n] = Date.now(); } save(); if (url) document.querySelectorAll('[data-pic="' + n.replace(/"/g, '\\"') + '"]').forEach(function (el) { var im = document.createElement('img'); im.className = el.className.replace(/\bph\b/, ''); im.style.cssText = el.style.cssText.replace(/font-size:[^;]+;?/, ''); im.src = url; im.alt = ''; el.replaceWith(im); }); }); });
}
var WIKI = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=320&redirects=1&action=query';
function wikiGet(q) { return http('GET', WIKI + q, { 'Api-User-Agent': 'Arogya/1.0 (personal health app)' }).then(function (r) { var d = JSON.parse(r.text || '{}'); var p = (d.query && d.query.pages) || {}; return Object.keys(p).map(function (k) { return p[k]; }).sort(function (a, b) { return (a.index || 0) - (b.index || 0); }); }); }
var PICSTOP = /^(with|and|the|of|in|home|style|plain|cooked|fried|dry|fresh|raw|boiled|roasted|homemade|indian|food|dish|recipe|sabzi|curry)$/i;
function picFind(name) {
  var main = name.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+-\s+.*$/, '').replace(/[,/].*$/, '').trim(), alias = (name.match(/\(([^)]+)\)/) || [])[1] || '';
  var words = (main + ' ' + alias).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 2 && !PICSTOP.test(w); });
  var good = function (t) { t = (t || '').toLowerCase(); return words.some(function (w) { return t.indexOf(w) >= 0; }); };
  var thumb = function (L) { var p = L.filter(function (x) { return x.thumbnail && x.thumbnail.source && !/\.svg/i.test(x.thumbnail.source) && good(x.title); })[0]; return p ? p.thumbnail.source : null; };
  return wikiGet('&titles=' + encodeURIComponent([main, alias].filter(Boolean).join('|'))).then(thumb).then(function (u) {
    return u || wikiGet('&generator=search&gsrlimit=4&gsrsearch=' + encodeURIComponent(main + ' Indian food')).then(thumb);
  }).catch(function () { delete PICQ.tried[name]; return null; });
}
var _render0 = render;
render = function () { _render0(); setTimeout(picFill, 60); };

/* ---------- make an image small enough to keep inside the backup ---------- */
function cropTo(img, box, max) {
  return new Promise(function (ok) {
    var im = new Image(); im.onload = function () {
      var x = 0, y = 0, w = im.width, h = im.height;
      if (box && box.length === 4) { y = box[0] / 1000 * im.height; x = box[1] / 1000 * im.width; h = (box[2] - box[0]) / 1000 * im.height; w = (box[3] - box[1]) / 1000 * im.width; }
      var side = Math.min(w, h), cx = x + w / 2, cy = y + h / 2; x = Math.max(0, cx - side / 2); y = Math.max(0, cy - side / 2);
      var c = document.createElement('canvas'), s = Math.min(max || 240, side); c.width = c.height = s;
      c.getContext('2d').drawImage(im, x, y, side, side, 0, 0, s, s); ok(c.toDataURL('image/jpeg', 0.78));
    }; im.onerror = function () { ok(null); }; im.src = 'data:' + img.mime + ';base64,' + img.data;
  });
}

/* ---------- change a dish's photo ---------- */
ACT.picChange = function (el) {
  var n = el.getAttribute('data-n'); pics();
  sheet('<h2>Photo for ' + esc(n.replace(/\s*\(.*\)$/, '')) + '</h2><div class="ctrtxt mt">' + dishPic(n, 140) + '</div>' +
    '<div class="g2 mt"><button class="btn" data-act="picPick" data-n="' + esc(n) + '" data-c="1">' + icon('cam', 18) + 'Take photo</button><button class="btn sec" data-act="picPick" data-n="' + esc(n) + '">' + icon('plus', 18) + 'From gallery</button></div>' +
    (DB.pics[n] || DB.picUrl[n] ? '<button class="lnk mt" data-act="picDel" data-n="' + esc(n) + '">' + (DB.pics[n] ? 'Remove my photo' : 'Wrong photo? Remove it') + '</button>' : ''));
};
ACT.picPick = function (el) {
  var n = el.getAttribute('data-n');
  pickImages('image/*', false, !!el.getAttribute('data-c')).then(function (imgs) { if (!imgs.length) return; return cropTo(imgs[0], null, 240).then(function (d) { if (!d) return toast('Could not read that photo'); pics(); DB.pics[n] = d; save(); sheet(null); rerender(); toast('Photo saved'); }); });
};
ACT.picDel = function (el) { var n = el.getAttribute('data-n'); pics(); if (DB.pics[n]) delete DB.pics[n]; else { DB.picUrl[n] = ''; DB.picMiss = DB.picMiss || {}; DB.picMiss[n] = Date.now() + 3650 * 86400000; } save(); sheet(null); rerender(); };

/* ---------- own food from a screenshot of another app ---------- */
var SHOT = null;
ACT.shotFood = function () {
  if (!DB.settings.gkey) return aiErr(new Error('NOKEY'));
  pickImages('image/*', true).then(function (imgs) {
    if (!imgs.length) return; imgs = imgs.slice(0, 3);
    sheet('<h2>Reading your screenshot</h2><div class="ctrtxt"><div class="spin"></div><p class="p">Gemini is reading the dish, its values and the photo. About 15 seconds.</p></div>');
    Promise.all(imgs.map(shrink)).then(function (sm) {
      var parts = sm.map(function (i) { return { inline_data: { mime_type: i.mime, data: i.data } }; });
      parts.push({ text: 'These are screenshots of one food from another nutrition app (for example HealthifyMe). Read exactly what the screen says; do not guess values that are shown. Return JSON: {"name": the dish name as shown (add the English name in brackets if the shown name is Hindi only), "serving_name": the serving or unit shown, like "katori" or "piece" or "plate" or "glass" (lowercase, one or two words), "serving_qty": the quantity shown for it (number, often 1), "serving_grams": weight in grams (or ml for drinks) of that quantity if the screen says it, else your best estimate, "liquid": true if it is a drink, "kcal": calories for that quantity, "protein": g, "carb": g, "fat": g, "fibre": g or null, "sugar": g or null, "sodium": mg or null, "veg": "veg"|"egg"|"nonveg", "units": [other household measures shown on the screen, each {"name", "grams"}], "photo": [ymin, xmin, ymax, xmax] of the dish photo in the FIRST image on a 0-1000 scale, or null if there is no food photo, "unsure": one short line on anything you could not read, or ""}. If the screenshots do not show a food with nutrition values, return {"error": "reason"}.' });
      return gQuick(parts, { json: true, temp: 0 }, 45000, 3).then(function (j) {
        if (j.error) throw new Error(j.error);
        var q = +j.serving_qty || 1, f = 1 / q;
        SHOT = { img: sm[0], name: String(j.name || '').trim(), u: String(j.serving_name || 'serving').toLowerCase().replace(/[:|]/g, '').trim() || 'serving', g: Math.round((+j.serving_grams || 100) * f), liquid: !!j.liquid,
          k: Math.round((+j.kcal || 0) * f), p: n1((+j.protein || 0) * f), c: n1((+j.carb || 0) * f), f: n1((+j.fat || 0) * f), fi: j.fibre == null ? null : n1(+j.fibre * f), su: j.sugar == null ? null : n1(+j.sugar * f), na: j.sodium == null ? null : Math.round(+j.sodium * f),
          veg: j.veg === 'nonveg' ? 0 : j.veg === 'egg' ? 2 : 1, units: (j.units || []).filter(function (u) { return u && u.name && +u.grams > 0 && +u.grams < 2000; }), unsure: j.unsure || '', pic: null };
        return cropTo(sm[0], j.photo, 240).then(function (d) { SHOT.pic = j.photo ? d : null; shotSheet(); });
      });
    }).catch(function (e) { sheet(null); aiErr(e); });
  });
};
function shotSheet() {
  var S = SHOT, fl = function (id, lab, v, num) { return '<label class="fld">' + lab + '<input id="' + id + '"' + (num ? ' type="number" inputmode="decimal"' : '') + ' value="' + esc(v == null ? '' : v) + '"></label>'; };
  sheet('<h2>Check and save</h2><div class="row g12 mt6">' + (S.pic ? '<img class="dpic" style="width:72px;height:72px" src="' + S.pic + '" alt="">' : '<span class="dpic ph" style="width:72px;height:72px;font-size:28px">' + esc((S.name || '?').charAt(0)) + '</span>') + '<div class="f1 l">' + (S.pic ? 'Photo taken from your screenshot.' : 'No dish photo in the screenshot. Arogya will look for one, or add your own later.') + (S.unsure ? '<br><span class="warnt">' + esc(S.unsure) + '</span>' : '') + '</div></div>' +
    fl('sh_n', 'Name', S.name) + '<div class="g2">' + fl('sh_u', 'Serving', S.u) + fl('sh_g', 'Serving ' + (S.liquid ? 'ml' : 'grams'), S.g, 1) + fl('sh_k', 'Calories', S.k, 1) + fl('sh_p', 'Protein g', S.p, 1) + fl('sh_c', 'Carbs g', S.c, 1) + fl('sh_f', 'Fat g', S.f, 1) + fl('sh_fi', 'Fibre g', S.fi, 1) + fl('sh_na', 'Sodium mg', S.na, 1) + '</div>' +
    '<div class="l mt6">Values for 1 ' + esc(S.u) + ', as the screenshot shows. Change anything that looks wrong.</div><button class="btn mt" data-act="shotSave">Save to my foods</button>');
}
ACT.shotSave = function () {
  var v = function (id) { var x = document.getElementById(id); return x && x.value !== '' ? +x.value : null; }, n = (document.getElementById('sh_n').value || '').trim(), g = v('sh_g') || 100, f = 100 / g, S = SHOT;
  if (!n || !v('sh_k')) return toast('Name and calories are needed');
  var u = (document.getElementById('sh_u').value.trim() || 'serving').toLowerCase().replace(/[:|]/g, ''), r1 = function (x) { return Math.round((x || 0) * f * 10) / 10; };
  var units = [u + ':' + Math.round(g)].concat(S.units.map(function (x) { return String(x.name).toLowerCase().replace(/[:|]/g, '') + ':' + Math.round(+x.grams); }).filter(function (x) { return x.split(':')[0] !== u; })).concat(['tablespoon:15']);
  DB.custom = DB.custom.filter(function (r) { return r[0] !== n; });
  DB.custom.push([n, Math.round(v('sh_k') * f), r1(v('sh_p')), r1(v('sh_c')), r1(v('sh_f')), r1(v('sh_fi')), S.veg, units.join('|'), r1(S.su), Math.round((v('sh_na') || 0) * f), 0, 0, 'Mine', 'From your screenshot']);
  pics(); if (S.pic) DB.pics[n] = S.pic;
  SHOT = null; save(); sheet(null); feel('done'); toast('Saved ' + n + ' to your foods');
  if (cur.name === 'add') { SQ = n; DISH = { q: 1, u: u, ex: {} }; go('dish/' + (cur.arg || mealFor()) + '/' + encodeURIComponent(n)); } else rerender();
};

/* ---------- my foods list ---------- */
ROUTES.myfoods = function () {
  var L = DB.custom.slice().reverse(), h = head('My foods', L.length + ' saved · in every backup');
  h += '<div class="g2"><button class="btn" data-act="shotFood">' + icon('cam', 18) + 'From a screenshot</button><button class="btn sec" data-act="customFood">' + icon('plus', 18) + 'Type values</button></div>';
  if (!L.length) h += '<section class="c"><p class="p">Take a screenshot of a dish in another app, like HealthifyMe, and add it here. Arogya reads the name, calories, protein, carbs, fat and the dish photo, and keeps it as your own food.</p></section>';
  else h += '<section class="c">' + L.map(function (r) { var u = unitsOf(r)[0]; return '<button class="res pic" data-act="myFoodOpen" data-n="' + esc(r[0]) + '">' + dishPic(r[0], 46) + '<span class="f1">' + esc(r[0]) + '<small>1 ' + esc(unitLabel(u[0], r[0])) + ' · ' + n0(r[1] * u[1] / 100) + ' kcal · ' + n1(r[2] * u[1] / 100) + ' g protein · ' + (r[12] === 'AI' ? 'AI estimate' : r[13] === 'From your screenshot' ? 'from screenshot' : 'your values') + '</small></span></button>'; }).join('') + '</section>';
  var hid = Object.keys(DB.hidden || {});
  if (hid.length) h += '<section class="c"><h2>Hidden dishes</h2>' + hid.map(function (n) { return '<div class="rd"><span>' + esc(n) + '</span><button class="lnk" data-act="foodUnhide" data-n="' + esc(n) + '">Show again</button></div>'; }).join('') + '</section>';
  h += '<p class="l">Tap a food to edit or delete it. Your own foods, their photos and your portion sizes are part of your data, so the daily backup copies them with everything else.</p>';
  return h;
};
TABOF.myfoods = 'food'; HERO['My foods'] = ['food', '#E58A3A'];

/* ---------- edit or delete any food ---------- */
function isOwn(n) { return FX[n] == null && DB.custom.some(function (r) { return r[0] === n; }); }
var FED = null;
ACT.foodEdit = function (el) {
  var n = el.getAttribute('data-n'), r = food(n); if (!r) return;
  var us = unitsOf(r), u = us.filter(function (x) { return x[0] === DISH.u; })[0] || us[0]; if (u[0] === 'grams') u = ['serving', 100];
  var f = u[1] / 100, own = isOwn(n); FED = { n: n, base: r, own: own };
  var fl = function (id, lab, v) { return '<label class="fld">' + lab + '<input id="' + id + '" type="number" inputmode="decimal" value="' + (v == null ? '' : v) + '"></label>'; };
  sheet('<h2>Edit ' + esc(n.replace(/\s*\(.*\)$/, '')) + '</h2><div class="l">' + (own ? 'Your own food. Change anything.' : 'Your changes are saved as your home version. The standard values stay, and you can go back to them.') + '</div>' +
    (own ? '<label class="fld">Name<input id="fe_n" value="' + esc(n) + '"></label>' : '') +
    '<div class="g2"><label class="fld">Serving<input id="fe_u" value="' + esc(u[0]) + '"></label>' + fl('fe_g', 'Serving ' + gu(n), Math.round(u[1])) +
    fl('fe_k', 'Calories', Math.round(r[1] * f)) + fl('fe_p', 'Protein g', n1(r[2] * f)) + fl('fe_c', 'Carbs g', n1(r[3] * f)) + fl('fe_f', 'Fat g', n1(r[4] * f)) + fl('fe_fi', 'Fibre g', n1((r[5] || 0) * f)) + fl('fe_na', 'Sodium mg', Math.round((r[9] || 0) * f)) + '</div>' +
    '<div class="l mt6">Values for 1 serving.</div><button class="btn mt" data-act="foodEditSave">Save</button>');
};
ACT.foodEditSave = function () {
  var v = function (id) { var x = document.getElementById(id); return x && x.value !== '' ? +x.value : 0; }, E = FED, b = E.base, g = v('fe_g') || 100, f = 100 / g;
  if (!v('fe_k')) return toast('Enter calories');
  var nn = E.own ? (document.getElementById('fe_n').value.trim() || E.n) : E.n;
  if (nn !== E.n && food(nn)) return toast('A food with that name already exists');
  var u = (document.getElementById('fe_u').value.trim() || 'serving').toLowerCase().replace(/[:|]/g, '');
  var units = [u + ':' + Math.round(g)].concat(String(b[7] || '').split('|').filter(function (x) { return x && x.split(':')[0] !== u; })).join('|');
  var r1 = function (x) { return Math.round(x * f * 10) / 10; };
  var row = [nn, Math.round(v('fe_k') * f), r1(v('fe_p')), r1(v('fe_c')), r1(v('fe_f')), r1(v('fe_fi')), b[6], units, b[8] || 0, Math.round(v('fe_na') * f), b[10] || 0, b[11] || 0, 'Mine', E.own ? b[13] || '' : 'edited by you'];
  if (b[14]) row[14] = b[14];
  DB.custom = DB.custom.filter(function (r) { return r[0] !== E.n; }); DB.custom.push(row);
  if (nn !== E.n) { pics(); if (DB.pics[E.n]) { DB.pics[nn] = DB.pics[E.n]; delete DB.pics[E.n]; } if (DB.usual[E.n]) { DB.usual[nn] = DB.usual[E.n]; delete DB.usual[E.n]; } }
  DISH.u = u; DISH.q = 1; FED = null; save(); sheet(null); feel('done'); toast('Saved');
  if (nn !== E.n && cur.name === 'dish') { var a = String(cur.arg || '').split('/'); go('dish/' + a[0] + '/' + encodeURIComponent(nn)); } else rerender();
};
ACT.foodDel = function (el) {
  var n = el.getAttribute('data-n'), own = isOwn(n), shadow = !own && DB.custom.some(function (r) { return r[0] === n; }), s = '<h2>' + (own ? 'Delete ' : 'Remove ') + esc(n.replace(/\s*\(.*\)$/, '')) + '?</h2>';
  if (own) s += '<p class="p">It\'s removed from your foods. Days you already logged it keep their calories.</p><button class="btn mt" style="background:var(--bad)" data-act="foodDelGo" data-n="' + esc(n) + '" data-m="del">Delete</button>';
  else {
    if (shadow) s += '<button class="btn sec mt" data-act="foodDelGo" data-n="' + esc(n) + '" data-m="reset">Go back to the standard values</button>';
    s += '<p class="p mt">This is one of Arogya\'s built-in dishes. You can hide it so it no longer shows in search. Bring it back any time from More → My foods.</p><button class="btn mt" style="background:var(--bad)" data-act="foodDelGo" data-n="' + esc(n) + '" data-m="hide">Hide from search</button>';
  }
  sheet(s + '<button class="btn sec mt" data-act="closeSheet">Cancel</button>');
};
ACT.foodDelGo = function (el) {
  var n = el.getAttribute('data-n'), m = el.getAttribute('data-m'); pics();
  if (m === 'reset') { DB.custom = DB.custom.filter(function (r) { return r[0] !== n; }); DISH.u = ''; save(); sheet(null); rerender(); toast('Back to standard values'); return; }
  DB.custom = DB.custom.filter(function (r) { return r[0] !== n; });
  if (m === 'del') { delete DB.pics[n]; } else { DB.hidden = DB.hidden || {}; DB.hidden[n] = Date.now(); }
  delete DB.usual[n]; save(); sheet(null); feel('tick'); toast(m === 'del' ? 'Deleted' : 'Hidden from search');
  if (cur.name === 'dish') history.back(); else rerender();
};
ACT.foodUnhide = function (el) { var n = el.getAttribute('data-n'); if (DB.hidden) delete DB.hidden[n]; save(); rerender(); toast(n.replace(/\s*\(.*\)$/, '') + ' is back in search'); };
ACT.myFoodOpen = function (el) {
  var n = el.getAttribute('data-n');
  sheet('<div class="row g12">' + dishPic(n, 56) + '<h2 style="margin:0">' + esc(n) + '</h2></div><div class="g2 mt"><button class="btn" data-act="foodEdit" data-n="' + esc(n) + '">' + icon('edit', 18) + 'Edit</button><button class="btn sec" data-act="foodDel" data-n="' + esc(n) + '">Delete</button></div><button class="btn sec mt" data-act="picChange" data-n="' + esc(n) + '">' + icon('cam', 18) + 'Change photo</button>');
};
