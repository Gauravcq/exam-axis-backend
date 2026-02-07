const fs = require('fs');

// Read current questions.json
const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));
const combinedTest = questionsData['ssc_cgl_fullmock_12_sep_s1'];

// Fix syntax issues in questions after question 50
for (let i = 50; i < combinedTest.length; i++) {
  const question = combinedTest[i];
  
  // Fix question field with <br> tags
  if (question.question && typeof question.question === 'object') {
    if (question.question.en && question.question.en.includes('<br>')) {
      question.question.en = question.question.en.replace(/<br>/g, '\\n');
    }
    if (question.question.hi && question.question.hi.includes('<br>')) {
      question.question.hi = question.question.hi.replace(/<br>/g, '\\n');
    }
  }
  
  // Fix explanation field with <br> tags
  if (question.explanation && typeof question.explanation === 'object') {
    if (question.explanation.en && question.explanation.en.includes('<br>')) {
      question.explanation.en = question.explanation.en.replace(/<br>/g, '\\n');
    }
    if (question.explanation.hi && question.explanation.hi.includes('<br>')) {
      question.explanation.hi = question.explanation.hi.replace(/<br>/g, '\\n');
    }
  }
}

// Update the questions.json
questionsData['ssc_cgl_fullmock_12_sep_s1'] = combinedTest;
fs.writeFileSync('src/data/questions.json', JSON.stringify(questionsData, null, 2));

console.log('✅ Fixed JSON syntax issues!');
console.log('📝 Processed questions from 50 to', combinedTest.length - 1);
