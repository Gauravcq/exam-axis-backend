// scripts/update-maths-questions.js

const fs = require('fs');

// Read current questions.json
const questionsData = JSON.parse(fs.readFileSync('src/data/questions.json', 'utf8'));

// Get the combined test
const combinedTest = questionsData['ssc_cgl_fullmock_12_sep_s1'];

if (!combinedTest) {
  console.log('❌ Combined test not found');
  process.exit(1);
}

// New maths questions (bilingual format)
const newMathsQuestions = [
  {
    "id": 1,
    "subject": "maths",
    "question": {
      "en": "Arrange the fractions 5/9, 2/3, 3/5 and 4/7 in ascending order.",
      "hi": "भिन्नों को आरोही क्रम में व्यवस्थित करें 5/9, 2/3, 3/5 और 4/7"
    },
    "options": [
      "5/9, 4/7, 3/5, 2/3",
      "2/3, 5/9, 4/7, 3/5",
      "4/7, 3/5, 2/3, 5/9",
      "3/5, 5/9, 2/3, 4/7"
    ],
    "correctAnswer": "5/9, 4/7, 3/5, 2/3",
    "explanation": {
      "en": "Convert fractions to decimals:\n• 5/9 = 0.555...\n• 4/7 = 0.571...\n• 3/5 = 0.600\n• 2/3 = 0.666...\n\nAscending order (smallest to largest):\n5/9 < 4/7 < 3/5 < 2/3\n\nAnswer: 5/9, 4/7, 3/5, 2/3",
      "hi": "भिन्नों को दशमलव में बदलें:\n• 5/9 = 0.555...\n• 4/7 = 0.571...\n• 3/5 = 0.600\n• 2/3 = 0.666...\n\nआरोही क्रम (सबसे छोटे से सबसे बड़े):\n5/9 < 4/7 < 3/5 < 2/3\n\nउत्तर: 5/9, 4/7, 3/5, 2/3"
    }
  },
  {
    "id": 2,
    "subject": "maths",
    "question": {
      "en": "Simplify: (2½ + 3.6) - 1.9",
      "hi": "सरल करें: (2½ + 3.6) - 1.9"
    },
    "options": [
      "4.2",
      "5.2",
      "6.2",
      "7.2"
    ],
    "correctAnswer": "4.2",
    "explanation": {
      "en": "Step-by-step solution:\n• Convert 2½ to decimal = 2.5\n• (2.5 + 3.6) - 1.9\n• = 6.1 - 1.9\n• = 4.2",
      "hi": "चरण-दर-चरण हल:\n• 2½ को दशमलव में बदलें = 2.5\n• (2.5 + 3.6) - 1.9\n• = 6.1 - 1.9\n• = 4.2"
    }
  },
  {
    "id": 3,
    "subject": "maths",
    "question": {
      "en": "Evaluate: 7¼ - [5/6 ÷ {1/3 - (1/2 × (3/4 - 1/4))}]",
      "hi": "7¼ - [5/6 ÷ {1/3 - (1/2 × (3/4 - 1/4))}] का मूल्यांकन करें।"
    },
    "options": [
      "-3¼",
      "3¼",
      "-2¾",
      "2¾"
    ],
    "correctAnswer": "-2¾",
    "explanation": {
      "en": "Solve using BODMAS (innermost bracket first):\n\nStep 1: (3/4 - 1/4) = 2/4 = 1/2\n\nStep 2: 1/2 × 1/2 = 1/4\n\nStep 3: 1/3 - 1/4 = (4-3)/12 = 1/12\n\nStep 4: 5/6 ÷ 1/12 = 5/6 × 12 = 10\n\nStep 5: 7¼ - 10 = 7.25 - 10 = -2.75 = -2¾",
      "hi": "BODMAS का उपयोग करके हल करें (सबसे अंदरूनी कोष्ठक पहले):\n\nचरण 1: (3/4 - 1/4) = 2/4 = 1/2\n\nचरण 2: 1/2 × 1/2 = 1/4\n\nचरण 3: 1/3 - 1/4 = (4-3)/12 = 1/12\n\nचरण 4: 5/6 ÷ 1/12 = 5/6 × 12 = 10\n\nचरण 5: 7¼ - 10 = 7.25 - 10 = -2.75 = -2¾"
    }
  },
  {
    "id": 4,
    "subject": "maths",
    "question": {
      "en": "From a sample of 200 software engineers, determine the ratio of those proficient in Python to those proficient in Java using the given information:\nProficient in Python and Java: 50\nProficient in Python only: 70\nProficient in Java only: 60\nProficient in neither language: 20",
      "hi": "200 सॉफ्टवेयर इंजीनियरों के नमूने से, दी गई जानकारी का उपयोग करके पायथन में कुशल लोगों और जावा में कुशल लोगों का अनुपात निर्धारित करें:\nपायथन और जावा में कुशल: 50\nकेवल पायथन में कुशल: 70\nकेवल जावा में कुशल: 60\nकिसी भी भाषा में कुशल नहीं: 20"
    },
    "options": [
      "11:12",
      "12:11",
      "7:6",
      "6:7"
    ],
    "correctAnswer": "12:11",
    "explanation": {
      "en": "Python proficient:\n= Python & Java + Python only\n= 50 + 70 = 120\n\nJava proficient:\n= Python & Java + Java only\n= 50 + 60 = 110\n\nRatio = 120 : 110 = 12 : 11",
      "hi": "पायथन में कुशल:\n= पायथन और जावा + केवल पायथन\n= 50 + 70 = 120\n\nजावा में कुशल:\n= पायथन और जावा + केवल जावा\n= 50 + 60 = 110\n\nअनुपात = 120 : 110 = 12 : 11"
    }
  },
  {
    "id": 5,
    "subject": "maths",
    "question": {
      "en": "Arvind started a business by investing ₹80,000. After 4 months, Bhavin joined with ₹1,20,000. At the end of 8 months from the start, Chandan joined with ₹1,60,000. If the total profit is ₹1,05,000 at the end of the year, find the share of Chandan.",
      "hi": "अरविंद ने ₹80,000 निवेश करके एक व्यवसाय शुरू किया। 4 महीने बाद, भाविन ₹1,20,000 के साथ शामिल हो गया। शुरुआत से 8 महीने के अंत में, चंदन ₹1,60,000 के साथ शामिल हो गया। यदि वर्ष के अंत में कुल लाभ ₹1,05,000 है, तो चंदन का हिस्सा ज्ञात कीजिए।"
    },
    "options": [
      "₹26,500",
      "₹26,000",
      "₹26,200",
      "₹26,250"
    ],
    "correctAnswer": "₹26,250",
    "explanation": {
      "en": "Investment × Time:\n• Arvind: ₹80,000 × 12 months = 9,60,000\n• Bhavin: ₹1,20,000 × 8 months = 9,60,000\n• Chandan: ₹1,60,000 × 4 months = 6,40,000\n\nRatio = 960000 : 960000 : 640000 = 3 : 3 : 2\n\nChandan share:\n= (2/8) × ₹1,05,000\n= ₹26,250",
      "hi": "निवेश × समय:\n• अरविंद: ₹80,000 × 12 महीने = 9,60,000\n• भाविन: ₹1,20,000 × 8 महीने = 9,60,000\n• चंदन: ₹1,60,000 × 4 महीने = 6,40,000\n\nअनुपात = 960000 : 960000 : 640000 = 3 : 3 : 2\n\nचंदन का हिस्सा:\n= (2/8) × ₹1,05,000\n= ₹26,250"
    }
  }
];

// Replace the first 5 maths questions (IDs 1-25 are maths)
let mathsIndex = 0;
for (let i = 0; i < combinedTest.length; i++) {
  if (combinedTest[i].subject === 'maths' && mathsIndex < newMathsQuestions.length) {
    combinedTest[i] = newMathsQuestions[mathsIndex];
    mathsIndex++;
  }
}

// Update the questions.json
questionsData['ssc_cgl_fullmock_12_sep_s1'] = combinedTest;

// Write back to file
fs.writeFileSync('src/data/questions.json', JSON.stringify(questionsData, null, 2));

console.log('✅ Maths questions updated successfully!');
console.log('📝 Updated', newMathsQuestions.length, 'maths questions with bilingual format');
console.log('🆔 Test ID: ssc_cgl_fullmock_12_sep_s1');
