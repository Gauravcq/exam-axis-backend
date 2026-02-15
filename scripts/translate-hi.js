const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');
const CACHE_FILE = path.join(__dirname, '.translate-cache-hi.json');
const PROGRESS_FILE = path.join(__dirname, '.translate-progress.json');

// Configuration
const APPLY = process.argv.includes('--apply');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : Infinity;
const OFFSET_ARG = process.argv.find(a => a.startsWith('--offset='));
const OFFSET = OFFSET_ARG ? parseInt(OFFSET_ARG.split('=')[1]) : 0;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 10;
const DELAY_MS = parseInt(process.env.DELAY_MS) || 100;
const TEST_FILTER = process.env.TEST_FILTER || ''; // regex string to filter testIds
const SUBJECTS = (process.env.SUBJECTS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean); // e.g., "maths,reasoning"

// Translation providers
const PROVIDERS = {
  mymemory: {
    url: 'https://api.mymemory.translated.net/get',
    rateLimit: 1000, // per hour
    delay: 200
  },
  libretranslate: {
    url: process.env.LIBRETRANSLATE_URL || 'https://translate.argosopentech.com/translate',
    rateLimit: 100,
    delay: 500
  },
  lingva: {
    url: 'https://lingva.ml/api/v1/en/hi/',
    rateLimit: 500,
    delay: 300
  }
};

// Helper functions
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

function isLetterSeries(text = '') {
  const s = (text || '').trim();
  if (!s) return false;
  // Single block of 1–6 letters (e.g., A, AB, PQRS)
  if (/^[A-Za-z]{1,6}$/.test(s)) return true;
  // Comma-separated single letters (e.g., A, B, C, D)
  if (/^[A-Za-z](\s*,\s*[A-Za-z])+$/i.test(s)) return true;
  // Space-separated single letters (e.g., A B C D)
  if (/^[A-Za-z](\s+[A-Za-z])+$/i.test(s)) return true;
  return false;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load or initialize progress tracker
function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (_) {
    return { 
      lastTestId: null, 
      lastIndex: 0, 
      totalProcessed: 0,
      failedItems: [],
      providerStats: {}
    };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// HTTP/HTTPS request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const protocol = u.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(options.raw ? data : JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Translation with multiple providers
async function translateWithProvider(text, provider, cache) {
  const cacheKey = `${provider}:${text.trim()}`;
  if (cache[cacheKey]) return cache[cacheKey];

  try {
    let translated = '';
    
    switch(provider) {
      case 'mymemory':
        const mmUrl = `${PROVIDERS.mymemory.url}?q=${encodeURIComponent(text)}&langpair=en|hi`;
        const mmRes = await makeRequest(mmUrl);
        translated = mmRes?.responseData?.translatedText || '';
        break;
        
      case 'libretranslate':
        const ltBody = JSON.stringify({
          q: text,
          source: 'en',
          target: 'hi',
          format: 'text'
        });
        const ltRes = await makeRequest(PROVIDERS.libretranslate.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(ltBody)
          },
          body: ltBody
        });
        translated = ltRes?.translatedText || '';
        break;
        
      case 'lingva':
        const lvUrl = PROVIDERS.lingva.url + encodeURIComponent(text);
        const lvRes = await makeRequest(lvUrl);
        translated = lvRes?.translation || '';
        break;
    }

    if (translated && translated.trim()) {
      if (/MYMEMORY WARNING/i.test(translated) || /translated\.net\/doc\/usagelimits/i.test(translated)) {
        return '';
      }
      cache[cacheKey] = translated;
      return translated;
    }
  } catch (e) {
    console.error(`Provider ${provider} failed:`, e.message);
  }
  
  return '';
}

// Main translation function with fallback
async function translateENtoHI(text, cache, stats) {
  // Try providers in order
  const providers = ['mymemory', 'libretranslate', 'lingva'];
  
  for (const provider of providers) {
    const result = await translateWithProvider(text, provider, cache);
    if (result) {
      stats[provider] = (stats[provider] || 0) + 1;
      await wait(PROVIDERS[provider].delay);
      return result;
    }
  }
  
  return '';
}

// Subject inference
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

// Process in batches
async function processBatch(items, cache, stats) {
  const results = [];
  
  for (const item of items) {
    const { type, text, path } = item;
    if (!text || !needsTranslation(text, '')) {
      results.push(null);
      continue;
    }
    
    const translated = await translateENtoHI(text, cache, stats);
    results.push(translated);
  }
  
  return results;
}

// Main function
async function run() {
  console.log('Starting translation process...');
  console.log(`Configuration: OFFSET=${OFFSET}, LIMIT=${LIMIT}, BATCH_SIZE=${BATCH_SIZE}`);
  
  // Load data
  const raw = fs.readFileSync(FILE, 'utf8');
  const data = JSON.parse(raw);
  
  // Load cache and progress
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (_) {}
  
  const progress = loadProgress();
  
  let toProcess = 0;
  let translatedCount = 0;
  let scanned = 0;
  let skipped = 0;
  const failedItems = [];
  const stats = progress.providerStats || {};

  // Collect all items to translate
  const translationQueue = [];
  const tests = Object.keys(data);
  
  for (const testId of tests) {
    if (TEST_FILTER) {
      try {
        const re = new RegExp(TEST_FILTER, 'i');
        if (!re.test(testId)) continue;
      } catch (_) {
        // if invalid regex, ignore filter
      }
    }
    const list = data[testId];
    if (!Array.isArray(list)) continue;
    
    for (let i = 0; i < list.length; i++) {
      scanned++;
      
      // Skip if before offset
      if (scanned <= OFFSET) {
        skipped++;
        continue;
      }
      
      // Stop if limit reached
      if (scanned > OFFSET + LIMIT) break;
      
      const q = list[i];
      const subject = inferSubject(testId, q);
      
      // Skip English subjects
      if (subject === 'english') continue;
      // Subject include filter
      if (SUBJECTS.length && !SUBJECTS.includes(subject)) continue;
      
      // Queue question
      const qEn = q?.question?.en || (typeof q.question === 'string' ? q.question : '');
      const qHi = q?.question?.hi || '';
      if (qEn && needsTranslation(qEn, qHi)) {
        translationQueue.push({
          testId,
          index: i,
          type: 'question',
          text: qEn,
          path: ['question']
        });
      }
      
      // Queue explanation
      const eEn = q?.explanation?.en || (typeof q.explanation === 'string' ? q.explanation : '');
      const eHi = q?.explanation?.hi || '';
      if (eEn && needsTranslation(eEn, eHi)) {
        translationQueue.push({
          testId,
          index: i,
          type: 'explanation',
          text: eEn,
          path: ['explanation']
        });
      }
      
      // Queue correctAnswer
      const caEn = q?.correctAnswer?.en || (typeof q.correctAnswer === 'string' ? q.correctAnswer : '');
      const caHi = q?.correctAnswer?.hi || '';
      // Skip numeric/symbol-only answers
      if (caEn && !/^[0-9₹.,\/%\-\s]+$/.test(caEn) && !(subject === 'reasoning' && isLetterSeries(caEn)) && needsTranslation(caEn, caHi)) {
        translationQueue.push({
          testId,
          index: i,
          type: 'correctAnswer',
          text: caEn,
          path: ['correctAnswer']
        });
      }
      
      // Queue options
      if (Array.isArray(q.options)) {
        for (let k = 0; k < q.options.length; k++) {
          const opt = q.options[k];
          const oEn = opt?.en || (typeof opt === 'string' ? opt : '');
          const oHi = opt?.hi || '';
          
          // Skip numeric/symbol-only options
          if (!oEn || /^[0-9₹.,\/%\-\s]+$/.test(oEn)) continue;
          // Skip reasoning alphabet letter series (A, B, C, D or ABCD)
          if (subject === 'reasoning' && isLetterSeries(oEn)) continue;
          
          if (needsTranslation(oEn, oHi)) {
            translationQueue.push({
              testId,
              index: i,
              type: 'option',
              text: oEn,
              path: ['options', k],
              optionIndex: k
            });
          }
        }
      }
    }
    
    if (scanned > OFFSET + LIMIT) break;
  }
  
  toProcess = translationQueue.length;
  console.log(`Found ${toProcess} items to translate (skipped ${skipped})`);
  
  if (!APPLY) {
    console.log('DRY RUN mode - no changes will be made');
    console.log('Use --apply to actually translate and save');
    return;
  }
  
  // Process translations in batches
  console.log('Starting translation...');
  const startTime = Date.now();
  
  for (let i = 0; i < translationQueue.length; i += BATCH_SIZE) {
    const batch = translationQueue.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(translationQueue.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNum}/${totalBatches}...`);
    
    for (const item of batch) {
      try {
        const translated = await translateENtoHI(item.text, cache, stats);
        
        // Update data structure regardless; fallback to English if translation not available
          // Update data structure
          const q = data[item.testId][item.index];
          
          if (item.type === 'question') {
            if (typeof q.question === 'string') {
              q.question = { en: item.text, hi: translated || item.text };
            } else {
              q.question = q.question || {};
              q.question.hi = translated || item.text;
            }
            translatedCount++;
          } else if (item.type === 'explanation') {
            if (typeof q.explanation === 'string') {
              q.explanation = { en: item.text, hi: translated || item.text };
            } else {
              q.explanation = q.explanation || {};
              q.explanation.hi = translated || item.text;
            }
            translatedCount++;
            } else if (item.type === 'correctAnswer') {
              if (typeof q.correctAnswer === 'string') {
                q.correctAnswer = { en: item.text, hi: translated || item.text };
              } else {
                q.correctAnswer = q.correctAnswer || {};
                q.correctAnswer.hi = translated || item.text;
              }
              translatedCount++;
          } else if (item.type === 'option') {
            const opt = q.options[item.optionIndex];
            if (typeof opt === 'string') {
              q.options[item.optionIndex] = { en: item.text, hi: translated || item.text };
            } else {
              q.options[item.optionIndex].hi = translated || item.text;
            }
            translatedCount++;
          }
          
          // Show progress
          if (translatedCount % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = translatedCount / elapsed;
            console.log(`Progress: ${translatedCount}/${toProcess} (${Math.round(rate)} items/sec)`);
          }
      } catch (e) {
        console.error('Translation error:', e.message);
        failedItems.push(item);
      }
    }
    
    // Save progress periodically
    if (i % 100 === 0) {
      fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
      saveProgress({
        lastTestId: batch[batch.length - 1].testId,
        lastIndex: batch[batch.length - 1].index,
        totalProcessed: translatedCount,
        failedItems,
        providerStats: stats
      });
    }
    
    // Rate limiting delay between batches
    await wait(DELAY_MS);
  }
  
  // Final save
  // Enforce reasoning letter-series integrity (do not translate letters)
  for (const testId of Object.keys(data)) {
    const list = data[testId];
    if (!Array.isArray(list)) continue;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      const subject = inferSubject(testId, q);
      if (subject !== 'reasoning') continue;
      // Options
      if (Array.isArray(q.options)) {
        for (let k = 0; k < q.options.length; k++) {
          const opt = q.options[k];
          const oEn = opt?.en || (typeof opt === 'string' ? opt : '');
          if (isLetterSeries(oEn)) {
            if (typeof opt === 'object') {
              q.options[k].hi = oEn;
            }
          }
        }
      }
      // Correct Answer
      const caEn = q?.correctAnswer?.en || (typeof q.correctAnswer === 'string' ? q.correctAnswer : '');
      if (isLetterSeries(caEn) && q?.correctAnswer && typeof q.correctAnswer === 'object') {
        q.correctAnswer.hi = caEn;
      }
    }
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  
  // Save final progress
  saveProgress({
    lastTestId: 'completed',
    lastIndex: translationQueue.length,
    totalProcessed: translatedCount,
    failedItems,
    providerStats: stats
  });
  
  // Summary
  const elapsed = (Date.now() - startTime) / 1000;
  console.log('\n=== Translation Complete ===');
  console.log(`Total translated: ${translatedCount}/${toProcess}`);
  console.log(`Failed: ${failedItems.length}`);
  console.log(`Time taken: ${Math.round(elapsed)} seconds`);
  console.log(`Average rate: ${Math.round(translatedCount / elapsed)} items/sec`);
  console.log('\nProvider usage:', stats);
  
  if (failedItems.length > 0) {
    console.log('\nFailed items saved in progress file for retry');
  }
}

// Error handling
process.on('SIGINT', () => {
  console.log('\nProcess interrupted. Progress saved.');
  process.exit(0);
});

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
