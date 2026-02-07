const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/data/questions.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = data['ssc_cgl_fullmock_12_sep_s1'] || [];
let count = 0;
for (let i = 0; i < list.length; i++) {
  const q = list[i];
  if (!q || String(q.subject).toLowerCase() === 'english') continue;
  if (!Array.isArray(q.options)) continue;
  for (const opt of q.options) {
    if (opt && typeof opt === 'object' && 'en' in opt && 'hi' in opt) {
      if (opt.hi === opt.en) {
        count++;
      }
    }
  }
  const ca = q.correctAnswer;
  if (ca && typeof ca === 'object' && 'en' in ca && 'hi' in ca && ca.hi === ca.en) {
    count++;
  }
}
console.log('Duplicates (hi == en) in non-English subjects:', count);
