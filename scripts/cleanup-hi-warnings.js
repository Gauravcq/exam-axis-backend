const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');

const WARN_SIG = 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS';

function isDevanagari(str = '') {
  return /[\u0900-\u097F]/.test(str);
}

function isNumericLike(text = '') {
  if (!text || typeof text !== 'string') return false;
  const s = text.trim();
  if (!s) return false;
  // digits, ratio colon, decimals, commas, percent, minus/plus, space, ₹, parentheses, slash
  return /^[0-9\s:.,/%\-+₹()]+$/.test(s);
}

function isLetterSeries(text = '') {
  const s = (text || '').trim();
  if (!s) return false;
  if (/^[A-Za-z]{1,6}$/.test(s)) return true;                     // A, AB, PQRS
  if (/^[A-Za-z](\s*,\s*[A-Za-z])+$/i.test(s)) return true;       // A, B, C, D
  if (/^[A-Za-z](\s+[A-Za-z])+$/i.test(s)) return true;           // A B C D
  return false;
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

function run() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  let fixed = 0;
  let warnings = 0;
  let numericsRepaired = 0;
  let lettersRepaired = 0;
  let fallbackFilled = 0;

  for (const [testId, arr] of Object.entries(data)) {
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i];
      const subject = inferSubject(testId, q);

      // Question warning cleanup
      if (q?.question?.hi && typeof q.question.hi === 'string' && q.question.hi.includes(WARN_SIG)) {
        q.question.hi = '';
        fixed++; warnings++;
      }
      // Explanation warning cleanup
      if (q?.explanation?.hi && typeof q.explanation.hi === 'string' && q.explanation.hi.includes(WARN_SIG)) {
        q.explanation.hi = '';
        fixed++; warnings++;
      }
      // Correct answer warning cleanup + numeric/letters fix
      if (q?.correctAnswer) {
        const caEn = q.correctAnswer.en || (typeof q.correctAnswer === 'string' ? q.correctAnswer : '');
        if (typeof q.correctAnswer === 'object') {
          const caHi = q.correctAnswer.hi || '';
          if (caHi && caHi.includes(WARN_SIG)) {
            q.correctAnswer.hi = '';
            fixed++; warnings++;
          }
          if (caEn) {
            if (isNumericLike(caEn)) {
              if (q.correctAnswer.hi !== caEn) {
                q.correctAnswer.hi = caEn;
                numericsRepaired++;
              }
            } else if (subject === 'reasoning' && isLetterSeries(caEn)) {
              if (q.correctAnswer.hi !== caEn) {
                q.correctAnswer.hi = caEn;
                lettersRepaired++;
              }
            }
          }
        }
      }
      // Options warning cleanup + numeric/letters fix
      if (Array.isArray(q.options)) {
        for (let k = 0; k < q.options.length; k++) {
          const opt = q.options[k];
          if (typeof opt === 'object') {
            const oEn = opt.en || '';
            const oHi = opt.hi || '';
            if (oHi && oHi.includes(WARN_SIG)) {
              opt.hi = '';
              fixed++; warnings++;
            }
            if (oEn) {
              if (isNumericLike(oEn)) {
                if (opt.hi !== oEn) {
                  opt.hi = oEn;
                  numericsRepaired++;
                }
              } else if (subject === 'reasoning' && isLetterSeries(oEn)) {
                if (opt.hi !== oEn) {
                  opt.hi = oEn;
                  lettersRepaired++;
                }
              }
              // Fallback: if hi still empty/missing and non-English subject, copy en
              if (subject !== 'english' && (!opt.hi || !opt.hi.trim())) {
                opt.hi = oEn;
                fallbackFilled++;
              }
            }
          }
        }
      }

      // Fallback fills for non-English subjects to avoid blanks
      if (subject !== 'english') {
        // Question
        const qEn = q?.question?.en || (typeof q.question === 'string' ? q.question : '');
        if (qEn) {
          if (typeof q.question === 'string') {
            // leave as-is (legacy), no hi field available
          } else if (!q.question.hi || !q.question.hi.trim()) {
            q.question.hi = qEn;
            fallbackFilled++;
          }
        }
        // Explanation
        const eEn = q?.explanation?.en || (typeof q.explanation === 'string' ? q.explanation : '');
        if (eEn) {
          if (typeof q.explanation === 'object') {
            if (!q.explanation.hi || !q.explanation.hi.trim()) {
              q.explanation.hi = eEn;
              fallbackFilled++;
            }
          }
        }
        // Correct Answer
        if (q?.correctAnswer) {
          const caEn = q.correctAnswer.en || (typeof q.correctAnswer === 'string' ? q.correctAnswer : '');
          if (typeof q.correctAnswer === 'object' && caEn) {
            if (!q.correctAnswer.hi || !q.correctAnswer.hi.trim()) {
              q.correctAnswer.hi = caEn;
              fallbackFilled++;
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(JSON.stringify({
    fixed_entries: fixed,
    warnings_removed: warnings,
    numeric_hi_restored: numericsRepaired,
    reasoning_letters_restored: lettersRepaired,
    fallback_filled: fallbackFilled
  }, null, 2));
}

run();
