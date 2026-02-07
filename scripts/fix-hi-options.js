const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/data/questions.json');

function translateOption(en) {
  if (!en || typeof en !== 'string') return null;
  const s = en.trim();
  let m;
  if ((m = s.match(/^Profit of ₹\s*([\d,]+)$/i))) {
    return `₹${m[1]} का लाभ`;
  }
  if ((m = s.match(/^Loss of ₹\s*([\d,]+)$/i))) {
    return `₹${m[1]} का नुकसान`;
  }
  if ((m = s.match(/^(\d+)\s*% profit$/i))) {
    return `${m[1]}% लाभ`;
  }
  if ((m = s.match(/^(\d+)\s*% loss$/i))) {
    return `${m[1]}% हानि`;
  }
  // Single letters common in reasoning
  if (s === 'H') return 'एच';
  if (s === 'U') return 'यू';
  if (s === 'B') return 'बी';
  if (s === 'F') return 'एफ';
  // City/state names: keep same
  // Numeric or ratio strings: keep same
  return s;
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const list = data['ssc_cgl_fullmock_12_sep_s1'];
if (!Array.isArray(list)) {
  console.error('FAIL: Test not found ssc_cgl_fullmock_12_sep_s1');
  process.exit(1);
}

let changed = 0;
for (const q of list) {
  if (!q || String(q.subject).toLowerCase() === 'english') continue;
  if (!Array.isArray(q.options)) continue;
  q.options = q.options.map(opt => {
    if (opt && typeof opt === 'object' && 'en' in opt && 'hi' in opt) {
      if (opt.hi === opt.en) {
        const t = translateOption(opt.en);
        if (t && t !== opt.hi) {
          changed++;
          return { en: opt.en, hi: t };
        }
      }
      return opt;
    }
    return opt;
  });
  if (q.correctAnswer && typeof q.correctAnswer === 'object' && 'en' in q.correctAnswer && 'hi' in q.correctAnswer) {
    if (q.correctAnswer.hi === q.correctAnswer.en) {
      // Prefer the option's Hindi if available
      const matched = q.options.find(o => o && o.en === q.correctAnswer.en);
      const newHi = matched ? matched.hi : translateOption(q.correctAnswer.en);
      if (newHi && newHi !== q.correctAnswer.hi) {
        q.correctAnswer = { en: q.correctAnswer.en, hi: newHi };
        changed++;
      }
    }
  }
}

data['ssc_cgl_fullmock_12_sep_s1'] = list;
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log(`OK: Fixed ${changed} duplicated hi options in Maths/GK/Reasoning`);
