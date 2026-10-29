/* Builds dist/index.html: one self-contained file (styles, food data, app). */
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const js = ['ui/foods.js', 'ui/core.js', 'ui/calc.js', 'ui/screens-food.js', 'ui/screens-home.js', 'ui/figure.js', 'ui/yoga.js', 'ui/breath.js','ui/meds.js', 'ui/plan.js', 'ui/ai.js', 'ui/screens-more.js']
  .map((f) => '/* ' + f + ' */\n' + R(f)).join('\n;\n');
let html = R('ui/index.tpl.html').replace('/*CSS*/', () => R('ui/style.css') + '\n' + R('ui/theme.css')).replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
