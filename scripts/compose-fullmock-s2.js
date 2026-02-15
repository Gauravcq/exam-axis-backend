const fs = require('fs');
const path = require('path');

try {
  const file = path.join(__dirname, '..', 'src', 'data', 'questions.json');
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  const MATHS_ID = 'ssc_cgl_12_sep_s2';
  const REASONING_ID = 'ssc_cgl_12_sep_s2-r';
  const ENGLISH_ID = 'ssc_cgl_eng_12_sep_s2';
  const GK_ID = 'ssc_cgl_gk_12_sep_s2';
  const TARGET_ID = 'ssc_cgl_fullmock_12_sep_s2';

  const maths = data[MATHS_ID] || [];
  const english = data[ENGLISH_ID] || [];
  const gk = data[GK_ID] || [];
  const reasoning = data[REASONING_ID] || [];

  if (!Array.isArray(maths) || !Array.isArray(english) || !Array.isArray(gk) || !Array.isArray(reasoning)) {
    throw new Error('One or more source arrays are missing or not arrays');
  }

  console.log('Found questions:');
  console.log(`  Maths: ${maths.length}`);
  console.log(`  English: ${english.length}`);
  console.log(`  GK: ${gk.length}`);
  console.log(`  Reasoning: ${reasoning.length}`);

  // Order and subject exactly like existing fullmock builder: maths, english, gk, reasoning
  const combined = [
    ...maths.map((q, i) => ({ ...q, subject: 'maths', id: i + 1 })),
    ...english.map((q, i) => ({ ...q, subject: 'english', id: maths.length + i + 1 })),
    ...gk.map((q, i) => ({ ...q, subject: 'gk', id: maths.length + english.length + i + 1 })),
    ...reasoning.map((q, i) => ({ ...q, subject: 'reasoning', id: maths.length + english.length + gk.length + i + 1 }))
  ];

  console.log(`Total combined: ${combined.length}`);

  data[TARGET_ID] = combined;
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

  console.log('✅ Wrote combined test to questions.json');
  console.log(`🆔 Test ID: ${TARGET_ID}`);
} catch (err) {
  console.error('❌ Error composing full mock:', err.message);
  process.exit(1);
}

