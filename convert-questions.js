const fs = require('fs');
const path = require('path');

// Your exact frontend path
const frontendPath = 'C:/Users/Administrator/Desktop/mock test website/js/questions-db.js';

console.log('📂 Reading from:', frontendPath);

try {
    // Check if file exists
    if (!fs.existsSync(frontendPath)) {
        throw new Error('File not found! Check if the path is correct.');
    }

    // Read the file
    const fileContent = fs.readFileSync(frontendPath, 'utf8');
    console.log('✅ File loaded successfully');

    // Extract the object (find everything between first { and last })
    const startIndex = fileContent.indexOf('{');
    const endIndex = fileContent.lastIndexOf('}') + 1;
    
    if (startIndex === -1 || endIndex === 0) {
        throw new Error('Could not find object in file');
    }

    const objectString = fileContent.substring(startIndex, endIndex);
    console.log('📊 Parsing questions...');

    // Parse the object
    const QUESTIONS_DB = eval('(' + objectString + ')');

    // Validate
    const testCount = Object.keys(QUESTIONS_DB).length;
    console.log(`✅ Found ${testCount} tests`);

    // Create data directory
    const dataDir = path.join(__dirname, 'src', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save as JSON
    const outputPath = path.join(dataDir, 'questions.json');
    fs.writeFileSync(outputPath, JSON.stringify(QUESTIONS_DB, null, 2), 'utf8');

    // Count total questions
    let totalQuestions = 0;
    Object.values(QUESTIONS_DB).forEach(questions => {
        totalQuestions += questions.length;
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SUCCESS! Conversion Complete!');
    console.log('='.repeat(50));
    console.log(`📁 JSON saved to: src/data/questions.json`);
    console.log(`📊 Total tests: ${testCount}`);
    console.log(`❓ Total questions: ${totalQuestions}`);
    console.log('='.repeat(50));

} catch (error) {
    console.error('❌ ERROR:', error.message);
}