// scripts/combine-test-ids.js

require('dotenv').config();
const { sequelize } = require('../src/config/database');
const { Test, User } = require('../src/models');
const fs = require('fs');

async function combineTestsByIds() {
  try {
    console.log('🔄 Test ID Combiner');
    console.log('===================\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Read the questions.json file
    const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));
    console.log(`📚 Loaded questions.json`);

    // Get test IDs from user
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const mathsTestId = await askQuestion(rl, 'Enter Maths Test ID: ');
    const englishTestId = await askQuestion(rl, 'Enter English Test ID: ');
    const gkTestId = await askQuestion(rl, 'Enter GK Test ID: ');
    const reasoningTestId = await askQuestion(rl, 'Enter Reasoning Test ID: ');
    
    const newTestName = await askQuestion(rl, 'Enter new combined test name: ');
    const newTestId = await askQuestion(rl, 'Enter new test ID (or press Enter for auto): ');
    const duration = await askQuestion(rl, 'Enter duration in minutes (60): ');

    rl.close();

    // Find questions for each subject
    const mathsQuestions = questionsData[mathsTestId.trim()] || [];
    const englishQuestions = questionsData[englishTestId.trim()] || [];
    const gkQuestions = questionsData[gkTestId.trim()] || [];
    const reasoningQuestions = questionsData[reasoningTestId.trim()] || [];

    console.log('\n📊 Found questions:');
    console.log(`   Maths: ${mathsQuestions.length} questions`);
    console.log(`   English: ${englishQuestions.length} questions`);
    console.log(`   GK: ${gkQuestions.length} questions`);
    console.log(`   Reasoning: ${reasoningQuestions.length} questions`);

    // Combine and add subject field
    const combinedQuestions = [
      ...mathsQuestions.map((q, index) => ({ 
        ...q, 
        subject: 'maths',
        id: index + 1 
      })),
      ...englishQuestions.map((q, index) => ({ 
        ...q, 
        subject: 'english',
        id: mathsQuestions.length + index + 1 
      })),
      ...gkQuestions.map((q, index) => ({ 
        ...q, 
        subject: 'gk',
        id: mathsQuestions.length + englishQuestions.length + index + 1 
      })),
      ...reasoningQuestions.map((q, index) => ({ 
        ...q, 
        subject: 'reasoning',
        id: mathsQuestions.length + englishQuestions.length + gkQuestions.length + index + 1 
      }))
    ];

    console.log(`\n🎯 Total combined questions: ${combinedQuestions.length}`);

    // Create test data
    const finalTestId = newTestId.trim() || `cgl_full_mock_${Date.now()}`;
    const testData = {
      testId: finalTestId,
      title: newTestName,
      description: `Combined mock test with ${combinedQuestions.length} questions (Maths: ${mathsQuestions.length}, English: ${englishQuestions.length}, GK: ${gkQuestions.length}, Reasoning: ${reasoningQuestions.length})`,
      examType: 'CGL',
      subject: 'Combined',
      totalQuestions: combinedQuestions.length,
      totalMarks: combinedQuestions.length * 2,
      duration: parseInt(duration) || 60,
      difficulty: 'medium',
      questions: combinedQuestions,
      isActive: true,
      isLocked: false,
      isNew: true,
      order: 1,
      createdBy: 1 // Admin user
    };

    // Save to database
    const test = await Test.create(testData);
    console.log(`\n✅ Combined test created successfully!`);
    console.log(`🆔 Test ID: ${test.testId}`);
    console.log(`📝 Test Name: ${test.title}`);
    console.log(`📊 Questions: ${test.totalQuestions}`);
    console.log(`⏱️ Duration: ${test.duration} minutes`);

    // Also save to JSON file for backup
    const jsonFileName = `combined_test_${finalTestId}.json`;
    fs.writeFileSync(`scripts/combined-tests/${jsonFileName}`, JSON.stringify(testData, null, 2));
    console.log(`💾 Backup saved to: scripts/combined-tests/${jsonFileName}`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Command line version
async function combineFromArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: node combine-test-ids.js <mathsTestId> <englishTestId> <gkTestId> <reasoningTestId> [testName] [testId] [duration]');
    console.log('Example: node combine-test-ids.js ssc_cgl_12_sep_s1 ssc_cgl_12_sep_s2 ssc_cgl_12_sep_s3 ssc_cgl_12_sep_s4 "Combined Test" NEW 60');
    return;
  }

  const [mathsTestId, englishTestId, gkTestId, reasoningTestId, testName = "Combined Mock Test", testId = "", duration = "60"] = args;

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Read questions.json
    const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));
    console.log(`📚 Loaded questions.json`);

    // Find questions for each subject
    const mathsQuestions = questionsData[mathsTestId] || [];
    const englishQuestions = questionsData[englishTestId] || [];
    const gkQuestions = questionsData[gkTestId] || [];
    const reasoningQuestions = questionsData[reasoningTestId] || [];

    console.log('\n📊 Found questions:');
    console.log(`   Maths: ${mathsQuestions.length}`);
    console.log(`   English: ${englishQuestions.length}`);
    console.log(`   GK: ${gkQuestions.length}`);
    console.log(`   Reasoning: ${reasoningQuestions.length}`);

    // Combine and add subject field
    const combinedQuestions = [
      ...mathsQuestions.map((q, index) => ({ ...q, subject: 'maths', id: index + 1 })),
      ...englishQuestions.map((q, index) => ({ ...q, subject: 'english', id: mathsQuestions.length + index + 1 })),
      ...gkQuestions.map((q, index) => ({ ...q, subject: 'gk', id: mathsQuestions.length + englishQuestions.length + index + 1 })),
      ...reasoningQuestions.map((q, index) => ({ ...q, subject: 'reasoning', id: mathsQuestions.length + englishQuestions.length + gkQuestions.length + index + 1 }))
    ];

    const finalTestId = testId || `cgl_full_mock_${Date.now()}`;
    const testData = {
      testId: finalTestId,
      title: testName,
      description: `Combined mock test with ${combinedQuestions.length} questions from 4 subjects`,
      examType: 'CGL',
      subject: 'Combined',
      totalQuestions: combinedQuestions.length,
      totalMarks: combinedQuestions.length * 2,
      duration: parseInt(duration),
      difficulty: 'medium',
      questions: combinedQuestions,
      isActive: true,
      isLocked: false,
      isNew: true,
      order: 1,
      createdBy: 1
    };

    // Create test in database
    const test = await Test.create(testData);
    console.log(`\n🎉 SUCCESS!`);
    console.log(`🆔 Test ID: ${test.testId}`);
    console.log(`📝 Name: ${test.title}`);
    console.log(`📊 Questions: ${test.totalQuestions}`);
    console.log(`⏱️ Duration: ${test.duration} min`);
    console.log(`🎯 Total Marks: ${test.totalMarks}`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run based on how it's called
if (process.argv.length > 2) {
  combineFromArgs();
} else {
  combineTestsByIds();
}
