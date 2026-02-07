const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/data/questions.json');
try {
  const txt = fs.readFileSync(file, 'utf8');
  JSON.parse(txt);
  console.log('OK');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
