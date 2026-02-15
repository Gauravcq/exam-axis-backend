const fs = require('fs');
const path = require('path');
const https = require('https');

const FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');
const CACHE_FILE = path.join(__dirname, '.translate-cache-hi.json');

const LIBRE_URL = process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.com/translate';
const APPLY = process.argv.includes('--apply');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit=')); // e.g., --limit=100
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;

function isDevanagari(str = '') {
  return /[\u0900-\u097F]/.test(str);
}

function needsTranslation(en, hi) {
  if (!en || typeof en !== 'string') return false;
  if (!hi || typeof hi !== 'string') return true;
  const enTrim = en.trim();
  const hiTrim = hi.trim();
  if (!hiTrim) return true;
  if (hiTrim === enTrim) return true;
  if (!isDevanagari(hiTrim) && isDevanagari(enTrim) === false) return true;
  return false;
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + (u.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          resolve(json);
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${raw.slice(0,200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function translateENtoHI(text, cache) {
  const key = text.trim();
  if (cache[key]) return cache[key];
  const res = await postJson(LIBRE_URL, { q: text, source: 'en', target: 'hi', format: 'text' });
  const translated = (res && (res.translatedText || res.translated_text)) ? (res.translatedText || res.translated_text) : '';
  if (!translated) throw new Error('Empty translation');
  cache[key] = translated;
  return translated;
}

function inferSubject(testId, q) {
  const s = (q?.subject || '').toString().toLowerCase();
  if (/(english|eng|verbal)/.test(s)) return 'english';
  if (/(reason|reas|logic|lr)/.test(s)) return 'reasoning';
  if (/(gk|general\s*awareness|ga)/.test(s)) return 'gk';
  if (/(math|quant)/.test(s)) return 'maths';
  const t = (testId || '').toString().toLowerCase();
  if (/(english|eng|verbal)/.test(t)) return 'english';
  if (/(reason|reas|\\-r|part\\-d)/.test(t)) return 'reasoning';
  if (/(gk|general\\-?awareness|part\\-c)/.test(t)) return 'gk';
  if (/(math|quant|part\\-a)/.test(t)) return 'maths';
  return 'maths';
}

async function run() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (_) {}

  let toProcess = 0;
  let translatedCount = 0;
  let scanned = 0;

  const tests = Object.keys(data);
  for (const testId of tests) {
    const list = data[testId];
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      const subject = inferSubject(testId, q);
      if (subject === 'english') continue;
      scanned++;
      if (scanned > LIMIT) break;

      // Question
      const qEn = q?.question?.en || '';
      const qHi = q?.question?.hi || '';
      if (needsTranslation(qEn, qHi)) {
        toProcess++;
        if (APPLY) {
          const t = await translateENtoHI(qEn, cache);
          if (!q.question || typeof q.question !== 'object') q.question = { en: qEn, hi: t };
          else q.question.hi = t;
          translatedCount++;
        }
      }

      // Explanation
      const eEn = q?.explanation?.en || '';
      const eHi = q?.explanation?.hi || '';
      if (eEn && needsTranslation(eEn, eHi)) {
        toProcess++;
        if (APPLY) {
          const t = await translateENtoHI(eEn, cache);
          if (!q.explanation || typeof q.explanation !== 'object') q.explanation = { en: eEn, hi: t };
          else q.explanation.hi = t;
          translatedCount++;
        }
      }

      // Options
      if (Array.isArray(q.options)) {
        for (let k = 0; k < q.options.length; k++) {
          const opt = q.options[k];
          const oEn = opt?.en || (typeof opt === 'string' ? opt : '');
          const oHi = opt?.hi || '';
          if (!oEn || /^[0-9₹.,\\/%\\-\\s]+$/.test(oEn)) continue; // numbers/symbols don't need translation
          if (needsTranslation(oEn, oHi)) {
            toProcess++;
            if (APPLY) {
              const t = await translateENtoHI(oEn, cache);
              if (typeof opt === 'object') q.options[k].hi = t;
              else q.options[k] = { en: oEn, hi: t };
              translatedCount++;
            }
          }
        }
      }
    }
  }

  if (APPLY) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`Applied translations. Changed entries: ${translatedCount}. Scanned: ${scanned}.`);
  } else {
    console.log(`DRY RUN: Items needing translation: ${toProcess}. Scanned: ${scanned}. Use --apply to write changes.`);
  }
}

run().catch(err => {
  console.error('Translation error:', err.message);
  process.exit(1);
});

