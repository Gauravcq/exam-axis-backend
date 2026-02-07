const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/data/questions.json');

function parseBilingual(text) {
  if (typeof text !== 'string') return null;
  if (text.includes('|')) {
    const parts = text.split('|').map(s => s.trim());
    return { en: parts[0], hi: parts[1] ?? parts[0] };
  }
  if (text.includes(' / ')) {
    const parts = text.split(' / ').map(s => s.trim());
    return { en: parts[0], hi: parts[1] ?? parts[0] };
  }
  return { en: text.trim(), hi: text.trim() };
}

function toOptionObject(opt) {
  if (opt && typeof opt === 'object' && 'en' in opt && 'hi' in opt) return opt;
  return parseBilingual(opt);
}

function findCorrectAnswerFromOptions(options, correctAnswer) {
  if (correctAnswer && typeof correctAnswer === 'object' && 'en' in correctAnswer && 'hi' in correctAnswer) {
    return correctAnswer;
  }
  const caParsed = parseBilingual(correctAnswer);
  if (caParsed) {
    for (const o of options) {
      if (!o) continue;
      if (o.en === caParsed.en || o.hi === caParsed.hi) {
        return { en: o.en, hi: o.hi };
      }
    }
    return caParsed;
  }
  return { en: String(correctAnswer), hi: String(correctAnswer) };
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = data['ssc_cgl_fullmock_12_sep_s1'];
if (!Array.isArray(list)) {
  console.error('FAIL: Test not found ssc_cgl_fullmock_12_sep_s1');
  process.exit(1);
}

for (let i = 50; i < list.length; i++) {
  const q = list[i];
  if (!q) continue;
  if (Array.isArray(q.options)) {
    q.options = q.options.map(toOptionObject).filter(Boolean);
  }
  q.correctAnswer = findCorrectAnswerFromOptions(q.options || [], q.correctAnswer);
}

for (let i = 0; i < Math.min(50, list.length); i++) {
  const q = list[i];
  if (!q) continue;
  if (String(q.subject).toLowerCase() === 'english') continue;
  if (Array.isArray(q.options)) {
    q.options = q.options.map(toOptionObject).filter(Boolean);
  }
  q.correctAnswer = findCorrectAnswerFromOptions(q.options || [], q.correctAnswer);
}

data['ssc_cgl_fullmock_12_sep_s1'] = list;
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('OK: Converted options and correctAnswer to bilingual objects for questions 51–100');
