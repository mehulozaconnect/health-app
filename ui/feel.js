/* Feel: short sounds (made in the app, no files) and phone vibration for moments that matter */
'use strict';
var AC = null;
function actx() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
function tone(freq, start, dur, vol, type) {
  var c = actx(); if (!c) return; var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
var SOUNDS = {
  tick: function () { tone(880, 0, 0.12, 0.08); },
  tickl: function () { tone(587, 0, 0.14, 0.07); },
  drop: function () { tone(660, 0, 0.18, 0.12); tone(990, 0.06, 0.2, 0.08); },
  bell: function () { tone(528, 0, 1.2, 0.12); tone(1056, 0, 0.8, 0.04); },
  done: function () { tone(523, 0, 0.18, 0.14); tone(659, 0.12, 0.18, 0.14); tone(784, 0.24, 0.35, 0.16); },
  win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.3, 0.15, 'triangle'); }); tone(1319, 0.5, 0.6, 0.12, 'triangle'); },
  warn: function () { tone(330, 0, 0.25, 0.14, 'triangle'); tone(262, 0.18, 0.3, 0.12, 'triangle'); }
};
var BUZZ = { tick: '25', tickl: '15', drop: '30', bell: '60', done: '60,80,60', win: '80,60,80,60,200', warn: '200' };
function feel(kind) {
  if (DB.settings.sound !== false && SOUNDS[kind]) try { SOUNDS[kind](); } catch (e) { }
  if (DB.settings.buzz !== false && BUZZ[kind]) native('vibrate', BUZZ[kind]);
}
/* first touch unlocks audio on Android */
document.addEventListener('touchstart', function () { actx(); }, { once: true, passive: true });
