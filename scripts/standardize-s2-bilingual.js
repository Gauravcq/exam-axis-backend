const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');

function toBilingualText(field, subject) {
  if (subject === 'english') return field; // do not force bilingual for English section
  if (field == null) return { en: '', hi: '' };
  if (typeof field === 'object') {
    const en = field.en ?? field.EN ?? field.En ?? '';
    const hi = field.hi ?? field.HI ?? field.Hi ?? en;
    return { en, hi };
  }
  // string -> duplicate into en/hi
  return { en: String(field), hi: String(field) };
}

function toBilingualOptions(options, subject) {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    if (subject === 'english') return opt; // keep as-is for English
    if (opt && typeof opt === 'object') {
      const en = opt.en ?? opt.EN ?? opt.En ?? '';
      const hi = opt.hi ?? opt.HI ?? opt.Hi ?? en;
      return { en, hi };
    }
    const en = String(opt ?? '');
    return { en, hi: en };
  });
}

function inferSubject(testId, q) {
  const s = (q?.subject || '').toString().toLowerCase().trim();
  if (s) {
    if (/(english|eng|verbal)/.test(s)) return 'english';
    if (/(reason|reas|logic|lr)/.test(s)) return 'reasoning';
    if (/(gk|general\s*awareness|ga)/.test(s)) return 'gk';
    if (/(math|quant)/.test(s)) return 'maths';
  }
  const t = (testId || '').toString().toLowerCase();
  if (/(english|eng|verbal)/.test(t)) return 'english';
  if (/(reason|reas|\\-r|part\\-d)/.test(t)) return 'reasoning';
  if (/(gk|general\\-?awareness|part\\-c)/.test(t)) return 'gk';
  if (/(math|quant|part\\-a)/.test(t)) return 'maths';
  return 'maths';
}

function shouldBilingualize(subject) {
  return subject !== 'english';
}

function normalizeCorrectAnswer(q, subject) {
  if (!('correctAnswer' in q)) return;
  if (!shouldBilingualize(subject)) return;

  const opts = Array.isArray(q.options) ? q.options : [];

  const letterToIndex = (val) => {
    if (typeof val !== 'string') return -1;
    const m = val.trim().toUpperCase();
    if (['A','B','C','D'].includes(m)) return m.charCodeAt(0) - 65;
    return -1;
  };

  if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
    const en = q.correctAnswer.en ?? '';
    const hi = q.correctAnswer.hi ?? (opts.find(o => o.en === en)?.hi || en);
    q.correctAnswer = { en, hi };
    return;
  }

  // handle letters A-D
  const idx = letterToIndex(q.correctAnswer);
  if (idx >= 0 && opts[idx]) {
    q.correctAnswer = { en: opts[idx].en || '', hi: opts[idx].hi || opts[idx].en || '' };
    return;
  }

  // fallback: treat as text
  const en = String(q.correctAnswer ?? '');
  const hi = opts.find(o => o.en === en)?.hi || en;
  q.correctAnswer = { en, hi };
}

function run() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);

  let changed = 0;
  const testIds = Object.keys(data || {});

  for (const testId of testIds) {
    const list = data[testId];
    if (!Array.isArray(list) || list.length === 0) continue;

    for (let i = 0; i < list.length; i++) {
      const q = list[i] || {};
      const subject = inferSubject(testId, q);
      const bilingualize = shouldBilingualize(subject);

      const oldQ = q.question;
      const oldE = q.explanation;
      const oldOpts = q.options;

      if (bilingualize) {
        q.question = toBilingualText(q.question, subject);
        if ('explanation' in q) q.explanation = toBilingualText(q.explanation, subject);
        q.options = toBilingualOptions(q.options || [], subject);
        normalizeCorrectAnswer(q, subject);
      }

      if (oldQ !== q.question || oldE !== q.explanation || oldOpts !== q.options) changed++;
      list[i] = q;
    }

    data[testId] = list;
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`OK: Standardized bilingual format for ALL tests (non-English subjects). Questions updated: ${changed}`);
}

try {
  run();
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}
