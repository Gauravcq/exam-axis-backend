const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/data/questions.json', 'utf8');

// Fix the problematic passage by removing line breaks
const lines = content.split('\n');
let fixedLines = [];
let inPassage = false;
let passageText = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're at the problematic passage
    if (line.includes('Read the following passage and answer the questions based on the passage')) {
        inPassage = true;
        passageText = line.trim();
        continue;
    }
    
    if (inPassage) {
        // If line ends the passage, add it and reset
        if (line.includes('</b>"')) {
            passageText += ' ' + line.trim();
            fixedLines.push(passageText);
            inPassage = false;
            passageText = '';
        } else {
            // Continue building the passage text
            passageText += ' ' + line.trim();
        }
    } else {
        fixedLines.push(line);
    }
}

// Write the fixed content back
fs.writeFileSync('src/data/questions.json', fixedLines.join('\n'));
console.log('✅ Fixed JSON syntax error in passage');
