/* Pranayama illustrations: a seated person drawn for each practice — hand on the nose, fingers at the ears,
   rolled tongue, chin lock, belly pump — with breath arrows and sound waves that follow the pacer. */
'use strict';
var PART = {
  anulom: { hands: 'nose', note: 'Right thumb closes the right nostril, ring finger the left. Switch sides each breath.' },
  surya: { hands: 'nose', side: 'right', note: 'Breathe in through the right nostril, out through the left.' },
  chandra: { hands: 'nose', side: 'left', note: 'Breathe in through the left nostril, out through the right.' },
  sheetali: { mouth: 'tongue', note: 'Roll the tongue into a tube, sip air in through it, breathe out through the nose.' },
  udgeeth: { mouth: 'om', waves: 1, note: 'Breathe in deep, chant a long Om on the way out.' },
  bhramari: { hands: 'ears', waves: 1, note: 'Index fingers press the ear flaps. Hum like a bee as you breathe out.' },
  ujjayi: { throat: 1, note: 'Tighten the throat a little so the breath sounds like the sea.' },
  bahya: { bahya: 1, note: 'Breathe all the way out, chin to chest, pull the belly in and up, hold.' },
  bhastrika: { chest: 1, note: 'Fill the chest fully, then breathe out fully, with force, through the nose.' },
  kapal: { belly: 1, note: 'Short, sharp pushes out through the nose by snapping the belly in.' },
  meditative: { note: 'Sit tall, hands in gyan mudra, breathe slow and even.' },
  box: { note: 'In, hold, out, hold, each for the same count.' }
};
function pranaArt(k) {
  var P = PART[k] || PART.meditative, sk = '#E7AE86', skd = '#C98B63', hair = '#2A2033', pants = '#3A2E63';
  var s = '<svg class="part" viewBox="0 0 240 230" width="100%" role="img" aria-label="How to sit for ' + esc((PRANA[k] || [k])[0]) + '"><defs>' +
    '<linearGradient id="pk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CFF"/><stop offset="1" stop-color="#FF6FA8"/></linearGradient>' +
    '<radialGradient id="pg"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="fgl"><stop offset="0" stop-color="#7CE7FF" stop-opacity=".75"/><stop offset="1" stop-color="#7CE7FF" stop-opacity="0"/></radialGradient>' +
    '<marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2E8BFF"/></marker>' +
    '<marker id="ahp" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#FF3D8B"/></marker></defs>';
  /* halo and mat */
  s += '<circle cx="120" cy="105" r="100" fill="url(#pg)"/><ellipse cx="120" cy="208" rx="104" ry="13" fill="#fff" opacity=".7"/><ellipse cx="120" cy="208" rx="86" ry="8" fill="#FFD6C4" opacity=".7"/>';
  /* crossed legs (sukhasana) */
  s += '<g stroke-linecap="round"><line x1="44" y1="194" x2="150" y2="180" stroke="' + pants + '" stroke-width="30"/><line x1="196" y1="194" x2="92" y2="182" stroke="#4A3C78" stroke-width="30"/></g>' +
    '<ellipse cx="150" cy="189" rx="13" ry="7" fill="' + sk + '"/><ellipse cx="90" cy="191" rx="13" ry="7" fill="' + skd + '"/>';
  /* body (chest expands with the breath) */
  var lean = P.bahya ? 6 : 0;
  s += '<circle id="fbreath" data-r="34" cx="120" cy="120" r="22" fill="url(#fgl)"/>';
  s += '<g id="pchest" style="transform-origin:120px 170px">' +
    '<path d="M78,' + (88 + lean) + ' Q120,' + (74 + lean) + ' 162,' + (88 + lean) + ' L174,172 Q120,186 66,172 Z" fill="url(#pk)"/>' +
    '<path d="M120,' + (80 + lean) + ' L120,120" stroke="rgba(255,255,255,.45)" stroke-width="2"/>' +
    (P.bahya || P.belly ? '<path d="M98,150 Q120,' + (P.bahya ? 140 : 144) + ' 142,150" stroke="rgba(255,255,255,.7)" stroke-width="2.5" fill="none"/>' : '') + '</g>';
  /* arms */
  var arm = function (sh, el, hd, front) { return '<path d="M' + sh + ' L' + el + '" stroke="url(#pk)" stroke-width="15" stroke-linecap="round"/><path d="M' + el + ' L' + hd + '" stroke="' + (front ? sk : skd) + '" stroke-width="12" stroke-linecap="round"/>'; };
  var gyan = function (x, y, d) { return '<circle cx="' + x + '" cy="' + y + '" r="8" fill="' + sk + '"/><circle cx="' + (x + d * 6) + '" cy="' + (y - 5) + '" r="3.2" fill="none" stroke="' + skd + '" stroke-width="2"/>'; };
  var head = '', hy = 46 + lean * 1.6;
  if (P.hands === 'nose') {
    s += arm('160,96', '178,140', '190,170', 0) + gyan(192, 172, -1);
    s += '<path d="M80,96 L74,132" stroke="url(#pk)" stroke-width="15" stroke-linecap="round"/><path d="M74,132 L104,' + (hy + 18) + '" stroke="' + sk + '" stroke-width="12" stroke-linecap="round"/>';
  } else if (P.hands === 'ears') {
    s += '<path d="M80,96 L56,92" stroke="url(#pk)" stroke-width="15" stroke-linecap="round"/><path d="M56,92 L92,' + (hy + 2) + '" stroke="' + sk + '" stroke-width="12" stroke-linecap="round"/>';
    s += '<path d="M160,96 L184,92" stroke="url(#pk)" stroke-width="15" stroke-linecap="round"/><path d="M184,92 L148,' + (hy + 2) + '" stroke="' + sk + '" stroke-width="12" stroke-linecap="round"/>';
  } else if (P.bahya) {
    s += arm('80,' + (96 + lean), '64,136', '50,172', 1) + arm('160,' + (96 + lean), '176,136', '190,172', 1) + '<circle cx="50" cy="174" r="8" fill="' + sk + '"/><circle cx="190" cy="174" r="8" fill="' + sk + '"/>';
  } else {
    s += arm('80,96', '62,140', '50,170', 0) + arm('160,96', '178,140', '190,170', 0) + gyan(48, 172, 1) + gyan(192, 172, -1);
  }
  /* neck and head */
  head += '<rect x="111" y="' + (hy + 16) + '" width="18" height="' + (22 - lean) + '" rx="6" fill="' + skd + '"/>';
  if (P.throat) head += '<circle class="pthroat" cx="120" cy="' + (hy + 28) + '" r="9" fill="none" stroke="#2E8BFF" stroke-width="2.5"/><circle cx="120" cy="' + (hy + 28) + '" r="4" fill="#7CE7FF"/>';
  head += '<ellipse cx="96" cy="' + (hy + 2) + '" rx="5" ry="7" fill="' + skd + '"/><ellipse cx="144" cy="' + (hy + 2) + '" rx="5" ry="7" fill="' + skd + '"/>';
  head += '<circle cx="120" cy="' + hy + '" r="25" fill="' + sk + '"/>';
  head += '<path d="M95,' + (hy + 2) + ' Q93,' + (hy - 30) + ' 120,' + (hy - 28) + ' Q148,' + (hy - 30) + ' 145,' + (hy + 2) + ' Q141,' + (hy - 14) + ' 120,' + (hy - 15) + ' Q100,' + (hy - 14) + ' 95,' + (hy + 2) + 'Z" fill="' + hair + '"/><circle cx="120" cy="' + (hy - 27) + '" r="7" fill="' + hair + '"/>';
  var ey = hy + (P.bahya ? 4 : 1);
  head += '<path d="M106,' + ey + ' q5,4 10,0 M124,' + ey + ' q5,4 10,0" stroke="#5A3A2A" stroke-width="2" fill="none" stroke-linecap="round"/>';
  head += '<path d="M120,' + (hy + 3) + ' l-2,8 h4" stroke="' + skd + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  var my = hy + 15;
  if (P.mouth === 'tongue') head += '<ellipse cx="120" cy="' + my + '" rx="6" ry="4" fill="#7A2E3A"/><rect x="115" y="' + (my - 1) + '" width="10" height="13" rx="5" fill="#F07C8E"/><path d="M120,' + my + ' v11" stroke="#C94B60" stroke-width="1.6"/>';
  else if (P.mouth === 'om') head += '<ellipse cx="120" cy="' + (my + 1) + '" rx="4.5" ry="5.5" fill="#7A2E3A"/>';
  else head += '<path d="M114,' + my + ' q6,' + (P.belly || P.chest ? 1 : 4) + ' 12,0" stroke="#9A4B45" stroke-width="2" fill="none" stroke-linecap="round"/>';
  head += '<circle cx="106" cy="' + (hy + 9) + '" r="3.5" fill="#F29B8F" opacity=".45"/><circle cx="134" cy="' + (hy + 9) + '" r="3.5" fill="#F29B8F" opacity=".45"/>';
  s += head;
  /* hands that sit over the face */
  if (P.hands === 'nose') {
    s += '<g class="phand"><ellipse cx="107" cy="' + (hy + 25) + '" rx="7.5" ry="9" fill="' + sk + '"/>' +
      '<path d="M104,' + (hy + 27) + ' q4,3 8,0" stroke="' + skd + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path class="pthumb" d="M104,' + (hy + 20) + ' Q108,' + (hy + 13) + ' 115,' + (hy + 11) + '" stroke="' + sk + '" stroke-width="5.5" stroke-linecap="round" fill="none"/>' +
      '<path class="pring" d="M111,' + (hy + 19) + ' Q119,' + (hy + 4) + ' 125,' + (hy + 11) + '" stroke="' + sk + '" stroke-width="5" stroke-linecap="round" fill="none"/></g>';
  }
  if (P.hands === 'ears') s += '<circle cx="93" cy="' + (hy + 2) + '" r="7" fill="' + sk + '"/><circle cx="147" cy="' + (hy + 2) + '" r="7" fill="' + sk + '"/><path d="M93,' + (hy - 3) + ' l4,4 M147,' + (hy - 3) + ' l-4,4" stroke="' + skd + '" stroke-width="2.5" stroke-linecap="round"/>';
  /* airflow: shown for the phase the pacer is in */
  var nl = 'M92,' + (hy + 30) + ' Q104,' + (hy + 26) + ' 114,' + (hy + 15), nr = 'M148,' + (hy + 30) + ' Q136,' + (hy + 26) + ' 126,' + (hy + 15);
  var nlo = 'M114,' + (hy + 15) + ' Q104,' + (hy + 26) + ' 92,' + (hy + 30), nro = 'M126,' + (hy + 15) + ' Q136,' + (hy + 26) + ' 148,' + (hy + 30);
  var fl = function (cls, d, out) { return '<path class="pflow ' + cls + '" d="' + d + '" stroke="' + (out ? '#FF3D8B' : '#2E8BFF') + '" stroke-width="2" fill="none" stroke-dasharray="3 3" marker-end="url(#' + (out ? 'ahp' : 'ah') + ')"/>'; };
  if (P.mouth === 'tongue') s += fl('fin', 'M146,' + (my + 30) + ' Q124,' + (my + 30) + ' 121,' + (my + 15), 0) + fl('fout pr', nlo, 1) + fl('fout pl', nro, 1);
  else s += fl('fin pr', nl, 0) + fl('fin pl', nr, 0) + fl('fout pr', nlo, 1) + fl('fout pl', nro, 1);
  if (P.waves) s += '<g class="pwaves" fill="none" stroke="#8B5CFF" stroke-width="2.4" stroke-linecap="round"><path d="M62,' + (hy - 12) + ' q-8,12 0,24"/><path d="M52,' + (hy - 20) + ' q-12,20 0,40"/><path d="M178,' + (hy - 12) + ' q8,12 0,24"/><path d="M188,' + (hy - 20) + ' q12,20 0,40"/></g>';
  if (P.belly) s += '<g class="pbelly"><path d="M44,150 L66,152" stroke="#FF3D8B" stroke-width="3" marker-end="url(#ahp)"/><path d="M196,150 L174,152" stroke="#FF3D8B" stroke-width="3" marker-end="url(#ahp)"/></g>';
  if (P.bahya) s += '<g><path d="M48,148 L64,150" stroke="#FF3D8B" stroke-width="3" marker-end="url(#ahp)"/><path d="M192,148 L176,150" stroke="#FF3D8B" stroke-width="3" marker-end="url(#ahp)"/></g>';
  if (P.chest) s += '<g class="pchestar"><path d="M70,110 L50,104" stroke="#2E8BFF" stroke-width="3" marker-end="url(#ah)"/><path d="M170,110 L190,104" stroke="#2E8BFF" stroke-width="3" marker-end="url(#ah)"/></g>';
  return s + '</svg>';
}
function pranaStartCls(k) { var P = PART[k] || {}; return P.hands === 'nose' ? ' open-' + (P.side || 'left') : ''; }
function pranaNote(k) { return (PART[k] || PART.meditative).note; }
