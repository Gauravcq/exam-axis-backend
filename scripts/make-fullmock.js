const fs = require('fs');
const path = require('path');

function readJson(p) {
  const s = fs.readFileSync(p, 'utf8');
  return JSON.parse(s);
}

function writeJson(p, obj) {
  const s = JSON.stringify(obj, null, 2);
  fs.writeFileSync(p, s, 'utf8');
}

function sliceRange(arr, start, count) {
  const out = [];
  const n = arr.length;
  if (n === 0) return out;
  for (let i = 0; i < count; i++) {
    out.push(arr[(start + i) % n]);
  }
  return out;
}

function buildFullMock(sections, rangeStart) {
  const chunk = 25;
  const parts = sections.map(a => sliceRange(a, rangeStart, chunk));
  return [].concat(parts[0], parts[1], parts[2], parts[3]);
}

function main() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'questions.json');
  const data = readJson(filePath);

  const mathsId = 'ssc_cgl_12_sep_s3';
  const reasoningId = 'ssc_cgl_12_sep_s3-r';
  const englishId = 'ssc_cgl_eng_12_sep_s3';
  const gkId = 'ssc_cgl_gk_12_sep_s3';

  const maths = data[mathsId] || [];
  const reasoning = data[reasoningId] || [];
  const english = data[englishId] || [];
  const gk = data[gkId] || [];

  if (!maths.length || !reasoning.length || !english.length || !gk.length) {
    console.error('Source sections missing or empty:', {
      maths: maths.length, reasoning: reasoning.length, english: english.length, gk: gk.length
    });
    process.exit(1);
  }

  const s2 = buildFullMock([maths, reasoning, english, gk], 0);
  const s3 = buildFullMock([maths, reasoning, english, gk], 25);

  data['ssc_cgl_fullmock_12_sep_s2'] = s2.slice(0, 100);
  data['ssc_cgl_fullmock_12_sep_s3'] = s3.slice(0, 100);

  writeJson(filePath, data);
  console.log('Created ssc_cgl_fullmock_12_sep_s2 and ssc_cgl_fullmock_12_sep_s3 with 100 questions each.');
}

main();
