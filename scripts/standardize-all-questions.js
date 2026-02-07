const fs = require('fs');
const { Test } = require('../src/models');
const { sequelize } = require('../src/config/database');

// Read current questions.json
const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));
const combinedTest = questionsData['ssc_cgl_fullmock_12_sep_s1'];

// Convert questions 51-100 to bilingual format
for (let i = 50; i < combinedTest.length; i++) {
  const question = combinedTest[i];
  
  if (question.question && typeof question.question === 'string') {
    // Convert to bilingual format
    const questionText = question.question;
    
    // Simple heuristic to determine subject and create bilingual
    let subject = question.subject || 'unknown';
    let enText = questionText;
    let hiText = questionText; // For now, same text for both
    
    // Create bilingual object
    question.question = {
      "en": enText,
      "hi": hiText
    };
  }
  
  // Convert explanation to bilingual if it's a string
  if (question.explanation && typeof question.explanation === 'string') {
    const explanationText = question.explanation;
    question.explanation = {
      "en": explanationText,
      "hi": explanationText
    };
  }
}

// Update the questions.json
questionsData['ssc_cgl_fullmock_12_sep_s1'] = combinedTest;
fs.writeFileSync('src/data/questions.json', JSON.stringify(questionsData, null, 2));

console.log('✅ Standardized all questions to bilingual format!');
console.log('📝 Processed questions from 51 to', combinedTest.length - 1);

// Update database
(async () => {
  try {
    await sequelize.authenticate();
    const test = await Test.findOne({ where: { testId: 'ssc_cgl_fullmock_12_sep_s1' } });
    if (test) {
      await test.update({ questions: combinedTest });
      console.log('✅ Database updated with standardized format!');
    }
    await sequelize.close();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
})();
