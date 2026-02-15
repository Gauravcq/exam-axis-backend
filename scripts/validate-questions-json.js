const fs = require('fs');
const path = require('path');

try {
  const file = path.join(__dirname, '..', 'src', 'data', 'questions.json');
  const txt = fs.readFileSync(file, 'utf8');
  JSON.parse(txt);
  console.log('OK: questions.json is valid JSON');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
}

