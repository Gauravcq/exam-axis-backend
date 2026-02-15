const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');

function isDevanagari(str = '') {
  return /[\u0900-\u097F]/.test(str);
}

function isNumericLike(text = '') {
  if (!text || typeof text !== 'string') return false;
  const s = text.trim();
  if (!s) return false;
  return /^[0-9\s:.,/%\-+₹()]+$/.test(s);
}

function inferSubject(testId, q) {
  const s = (q?.subject || '').toString().toLowerCase();
  if (/(english|eng|verbal)/.test(s)) return 'english';
  if (/(reason|reas|logic|lr)/.test(s)) return 'reasoning';
  if (/(gk|general\s*awareness|ga)/.test(s)) return 'gk';
  if (/(math|quant)/.test(s)) return 'maths';
  const t = (testId || '').toString().toLowerCase();
  if (/(english|eng|verbal)/.test(t)) return 'english';
  if (/(reason|reas|\-r|part\-d)/.test(t)) return 'reasoning';
  if (/(gk|general\-?awareness|part\-c)/.test(t)) return 'gk';
  if (/(math|quant|part\-a)/.test(t)) return 'maths';
  return 'maths';
}

function shouldProcessTest(testId) {
  const t = (testId || '').toLowerCase();
  // Only dates 12_sep to 15_sep inclusive
  const inRange = /_(12_sep|13_sep|14_sep|15_sep)_/.test(t) || /15_sep/.test(t);
  if (!inRange) return false;
  // Explicitly include ssc_cgl_12_sep_s1 and ssc_cgl_maths_15_sep_s3 by above pattern
  return t.startsWith('ssc_cgl_');
}

function needsFix(en, hi) {
  if (!en || typeof en !== 'string') return false;
  if (!hi || typeof hi !== 'string') return true;
  const enTrim = en.trim();
  const hiTrim = hi.trim();
  if (!hiTrim) return true;
  if (hiTrim === enTrim) return true;
  if (!isDevanagari(hiTrim)) return true;
  return false;
}

function run() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  let updated = 0;
  let scanned = 0;

  for (const [testId, arr] of Object.entries(data)) {
    if (!Array.isArray(arr)) continue;
    if (!shouldProcessTest(testId)) continue;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      const subject = inferSubject(testId, q);
      if (subject !== 'maths') continue; // only maths
      scanned++;
      // Question
      const qEn = q?.question?.en || (typeof q.question === 'string' ? q.question : '');
      if (typeof q.question === 'object' && needsFix(qEn, q.question.hi || '')) {
        q.question.hi = qEn;
        updated++;
      }
      // Explanation
      if (q?.explanation && typeof q.explanation === 'object') {
        const eEn = q.explanation.en || '';
        if (needsFix(eEn, q.explanation.hi || '')) {
          q.explanation.hi = eEn;
          updated++;
        }
      }
      // Correct Answer
      if (q?.correctAnswer && typeof q.correctAnswer === 'object') {
        const caEn = q.correctAnswer.en || '';
        if (needsFix(caEn, q.correctAnswer.hi || '')) {
          q.correctAnswer.hi = caEn;
          updated++;
        }
      }
      // Options
      if (Array.isArray(q.options)) {
        for (let k = 0; k < q.options.length; k++) {
          const opt = q.options[k];
          if (typeof opt === 'object') {
            const oEn = opt.en || '';
            // Keep numbers/ratios as-is
            if (isNumericLike(oEn)) {
              if (opt.hi !== oEn) {
                opt.hi = oEn;
                updated++;
              }
            } else {
              if (needsFix(oEn, opt.hi || '')) {
                opt.hi = oEn; // fallback to English if Hindi missing/English-only
                updated++;
              }
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(JSON.stringify({ scanned, updated }, null, 2));
}

run();

