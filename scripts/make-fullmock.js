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

function signatureOf(q) {
  const qText = (q?.question?.en ?? q?.question ?? '').toString().trim();
  const opts = (q?.options ?? []).map(o => (o?.en ?? o ?? '').toString().trim()).join('|');
  const corr = (q?.correctAnswer?.en ?? q?.correctAnswer ?? '').toString().trim();
  return `${qText}::${opts}::${corr}`;
}

function uniqueFill(sections, targetCount = 100, perSectionStart = 0, perSectionTake = 25) {
  // Build initial pool: first perSectionTake from each section starting at perSectionStart
  const pool = [];
  const dedupe = new Set();

  const slice = (arr, start, count) => {
    const out = [];
    const n = arr.length;
    if (!n) return out;
    for (let i = 0; i < count; i++) out.push(arr[(start + i) % n]);
    return out;
  };

  sections.forEach(arr => {
    slice(arr, perSectionStart, perSectionTake).forEach(q => {
      const sig = signatureOf(q);
      if (!dedupe.has(sig)) {
        dedupe.add(sig);
        pool.push(q);
      }
    });
  });

  // If not enough unique, iterate round‑robin through sections to fill up to targetCount
  if (pool.length < targetCount) {
    let i = perSectionStart + perSectionTake;
    while (pool.length < targetCount) {
      for (const arr of sections) {
        if (!arr.length) continue;
        const q = arr[i % arr.length];
        const sig = signatureOf(q);
        if (!dedupe.has(sig)) {
          dedupe.add(sig);
          pool.push(q);
          if (pool.length >= targetCount) break;
        }
      }
      i++;
      // Safety to avoid infinite loop if all questions are identical across sets
      if (i - perSectionStart > 1000) break;
    }
  }
  return pool.slice(0, targetCount);
}

function main() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'questions.json');
  const data = readJson(filePath);

  // Source section IDs (edit these as needed)
  const mathsId = 'ssc_cgl_13_sep_s3';
  const reasoningId = 'ssc_cgl_reasoning_13_sep_s3';
  const englishId = 'ssc_cgl_eng_13_sep_s3';
  const gkId = 'ssc_cgl_gk_13_sep_s3';

  // Output test ID (single full mock of 100 questions)
  const OUTPUT_ID = 'ssc_cgl_fullmock_13_sep_s3';

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

  // Build a single 100‑question full mock with de‑duplication
  const combined = uniqueFill([maths, reasoning, english, gk], 100, 0, 25);
  data[OUTPUT_ID] = combined;

  writeJson(filePath, data);
  console.log(`Created/updated ${OUTPUT_ID} with ${combined.length} unique questions.`);
}

main();
