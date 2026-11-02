/* Builds dist/index.html: one self-contained file (styles, food data, app). */
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const js = ['ui/foods.js', 'ui/core.js', 'ui/feel.js', 'ui/calc.js', 'ui/screens-food.js', 'ui/screens-home.js', 'ui/figure.js', 'ui/yoga.js', 'ui/breath.js','ui/meds.js', 'ui/plan.js', 'ui/trends.js', 'ui/sleep.js', 'ui/psched.js', 'ui/brain.js', 'ui/rewards.js', 'ui/ai.js', 'ui/screens-more.js']
  .map((f) => '/* ' + f + ' */\n' + R(f)).join('\n;\n');
const fonts = [400, 500, 600, 700].map((w) => '@font-face{font-family:Outfit;font-weight:' + w + ';font-display:swap;src:url(data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'ui/fonts/outfit-latin-' + w + '-normal.woff2')).toString('base64') + ') format("woff2")}').join('\n');
let html = R('ui/index.tpl.html').replace('/*CSS*/', () => fonts + '\n' + R('ui/style.css') + '\n' + R('ui/theme.css') + '\n' + R('ui/glass.css')).replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
