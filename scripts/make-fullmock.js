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

  // ========== CLI ARGUMENTS ==========
  // Usage examples:
  // node scripts/make-fullmock.js --math ssc_cgl_13_sep_s1 --reasoning ssc_cgl_reasoning_13_sep_s1 --english ssc_cgl_eng_13_sep_s1 --gk ssc_cgl_gk_13_sep_s1 --out ssc_cgl_fullmock_13_sep_s1
  // node scripts/make-fullmock.js --math ssc_cgl_13_sep_s1 --reasoning ssc_cgl_reasoning_13_sep_s1 --english ssc_cgl_eng_13_sep_s1 --gk ssc_cgl_gk_13_sep_s1 --outBase ssc_cgl_fullmock_13_sep_s --shifts 3
  const argv = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].replace(/^--/, '');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      args[key] = val;
      if (val !== true) i++;
    }
  }

  // Source section IDs (editable or via CLI)
  const mathsId = args.math || 'ssc_cgl_maths_16_sep_s3';
  const reasoningId = args.reasoning || 'ssc_cgl_reasoning_16_sep_s3';
  const englishId = args.english || 'ssc_cgl_eng_16_sep_s3';
  const gkId = args.gk || 'ssc_cgl_gk_16_sep_s3';

  // Output test ID (single full mock of 100 questions)
  const OUTPUT_ID = args.out || 'ssc_cgl_fullmock_16_sep_s3';
  const OUT_BASE = args.outBase || null;
  const SHIFTS = parseInt(args.shifts || '0', 10) || 0;
  const REMOVE_KEY = args.remove || null;
  const KEEP_ONLY = args.keepOnly ? String(args.keepOnly).split(',').map(s => s.trim()).filter(Boolean) : null;
  const DELETE_PATTERN = args.deletePattern || null;

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

  // Prune fullmock keys
  if (KEEP_ONLY || DELETE_PATTERN) {
    const keepSet = new Set(KEEP_ONLY || []);
    let removed = 0;
    for (const key of Object.keys(data)) {
      const isFullmock = key.startsWith('ssc_cgl_fullmock_');
      if (!isFullmock) continue;
      if (KEEP_ONLY && !keepSet.has(key)) {
        delete data[key];
        removed++;
        continue;
      }
      if (DELETE_PATTERN && key.includes(DELETE_PATTERN)) {
        // Do not delete if also in KEEP_ONLY
        if (!KEEP_ONLY || !keepSet.has(key)) {
          delete data[key];
          removed++;
        }
      }
    }
    writeJson(filePath, data);
    console.log(`Pruned ${removed} fullmock key(s).`);
    // If prune-only request (no generation flags), exit
    if (!args.out && !args.outBase) return;
  }

  // Remove a generated test key if requested
  if (REMOVE_KEY) {
    if (data.hasOwnProperty(REMOVE_KEY)) {
      delete data[REMOVE_KEY];
      writeJson(filePath, data);
      console.log(`Removed key ${REMOVE_KEY} from questions.json`);
    } else {
      console.log(`Key ${REMOVE_KEY} not found; no changes made.`);
    }
    return;
  }

  // Helper to stamp subjects and ids in UI tab order: A: maths, B: english, C: gk, D: reasoning
  function buildWithSubjects(start) {
    const sectionsOrdered = [
      { arr: maths, subject: 'maths' },
      { arr: english, subject: 'english' },
      { arr: gk, subject: 'gk' },
      { arr: reasoning, subject: 'reasoning' }
    ];
    const combined = uniqueFill(sectionsOrdered.map(s => s.arr), 100, start, 25);
    // Stamp subject field by chunk
    const result = [];
    let idCounter = 1;
    // First 25: maths, next 25: english, next 25: gk, last 25: reasoning
    const chunks = [
      { subject: 'maths', start: 0, count: 25 },
      { subject: 'english', start: 25, count: 25 },
      { subject: 'gk', start: 50, count: 25 },
      { subject: 'reasoning', start: 75, count: 25 }
    ];
    chunks.forEach(({ subject, start, count }) => {
      for (let i = 0; i < count; i++) {
        const q = combined[start + i];
        // Clone and tag
        const tagged = { ...q, subject, id: idCounter++ };
        result.push(tagged);
      }
    });
    return result;
  }

  // If multiple shifts requested (e.g., --outBase name --shifts 3), generate s1..sN
  if (OUT_BASE && SHIFTS > 0) {
    for (let s = 1; s <= SHIFTS; s++) {
      const offset = (s - 1) * 25; // s1:0, s2:25, s3:50
      const outId = `${OUT_BASE}s${s}`;
      const arr = buildWithSubjects(offset);
      data[outId] = arr;
      console.log(`Created/updated ${outId} with ${arr.length} unique questions.`);
    }
    writeJson(filePath, data);
    return;
  }

  // Single output path
  const combined = buildWithSubjects(0);
  data[OUTPUT_ID] = combined;

  writeJson(filePath, data);
  console.log(`Created/updated ${OUTPUT_ID} with ${combined.length} unique questions (with subject tags).`);
}

main();
