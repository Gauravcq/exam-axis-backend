// scripts/list-test-ids.js

const fs = require('fs');

function listTestIds() {
  try {
    console.log('📚 Available Test IDs in questions.json');
    console.log('=======================================\n');

    // Read questions.json
    const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));
    
    // Display test IDs and question counts
    Object.entries(questionsData).forEach(([testId, questions]) => {
      console.log(`🆔 ${testId}`);
      console.log(`   📊 Questions: ${questions.length}`);
      
      // Try to identify subject from first few questions
      if (questions.length > 0) {
        const firstQuestion = questions[0];
        let sampleQuestion = 'No question text';
        
        if (typeof firstQuestion.question === 'string') {
          sampleQuestion = firstQuestion.question;
        } else if (firstQuestion.question && firstQuestion.question.en) {
          sampleQuestion = firstQuestion.question.en;
        } else if (firstQuestion.question && firstQuestion.question.hi) {
          sampleQuestion = firstQuestion.question.hi;
        }
        
        const preview = sampleQuestion.length > 80 ? sampleQuestion.substring(0, 80) + '...' : sampleQuestion;
        console.log(`   📝 Sample: ${preview}`);
        
        // Try to guess subject
        const questionText = sampleQuestion.toLowerCase();
        let likelySubject = 'Unknown';
        if (questionText.includes('math') || questionText.includes('calculate') || questionText.includes('percentage') || questionText.includes('fraction') || questionText.includes('<img')) {
          likelySubject = 'Maths';
        } else if (questionText.includes('grammar') || questionText.includes('synonym') || questionText.includes('antonym') || questionText.includes('english')) {
          likelySubject = 'English';
        } else if (questionText.includes('india') || questionText.includes('history') || questionText.includes('geography') || questionText.includes('president') || questionText.includes('argon')) {
          likelySubject = 'GK/Science';
        } else if (questionText.includes('reasoning') || questionText.includes('logic') || questionText.includes('pattern') || questionText.includes('series')) {
          likelySubject = 'Reasoning';
        }
        console.log(`   📚 Likely Subject: ${likelySubject}`);
      }
      console.log('');
    });

    console.log(`\n📈 Total Tests: ${Object.keys(questionsData).length}`);
    
    const totalQuestions = Object.values(questionsData).reduce((sum, questions) => sum + questions.length, 0);
    console.log(`📊 Total Questions: ${totalQuestions}`);

  } catch (error) {
    console.error('❌ Error reading questions.json:', error.message);
  }
}

if (require.main === module) {
  listTestIds();
}

module.exports = { listTestIds };
