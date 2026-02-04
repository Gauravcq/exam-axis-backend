const fs = require('fs');
const { Test } = require('../src/models');
const { sequelize } = require('../src/config/database');

// Read current questions.json
const questionsData = JSON.parse(fs.readFileSync('C:/Users/Administrator/Desktop/exam-axis-backend/src/data/questions.json', 'utf8'));
const combinedTest = questionsData['ssc_cgl_fullmock_12_sep_s1'];

// First 5 maths questions (you provided these)
const mathsQuestions = [
  {
    "id": 1, "subject": "maths",
    "question": {"en": "Arrange the fractions 5/9, 2/3, 3/5 and 4/7 in ascending order.", "hi": "भिन्नों को आरोही क्रम में व्यवस्थित करें 5/9, 2/3, 3/5 और 4/7"},
    "options": ["5/9, 4/7, 3/5, 2/3", "2/3, 5/9, 4/7, 3/5", "4/7, 3/5, 2/3, 5/9", "3/5, 5/9, 2/3, 4/7"],
    "correctAnswer": "5/9, 4/7, 3/5, 2/3",
    "explanation": {"en": "Convert fractions to decimals: 5/9=0.555, 4/7=0.571, 3/5=0.600, 2/3=0.666. Ascending: 5/9<4/7<3/5<2/3", "hi": "भिन्नों को दशमलव में बदलें: 5/9=0.555, 4/7=0.571, 3/5=0.600, 2/3=0.666. आरोही: 5/9<4/7<3/5<2/3"}
  },
  {
    "id": 2, "subject": "maths",
    "question": {"en": "Simplify: (2½ + 3.6) - 1.9", "hi": "सरल करें: (2½ + 3.6) - 1.9"},
    "options": ["4.2", "5.2", "6.2", "7.2"], "correctAnswer": "4.2",
    "explanation": {"en": "2½ = 2.5. (2.5+3.6)-1.9 = 6.1-1.9 = 4.2", "hi": "2½ = 2.5. (2.5+3.6)-1.9 = 6.1-1.9 = 4.2"}
  },
  {
    "id": 3, "subject": "maths",
    "question": {"en": "Evaluate: 7¼ - [5/6 ÷ {1/3 - (1/2 × (3/4 - 1/4))}]", "hi": "7¼ - [5/6 ÷ {1/3 - (1/2 × (3/4 - 1/4))}] का मूल्यांकन करें।"},
    "options": ["-3¼", "3¼", "-2¾", "2¾"], "correctAnswer": "-2¾",
    "explanation": {"en": "BODMAS: (3/4-1/4)=1/2, 1/2×1/2=1/4, 1/3-1/4=1/12, 5/6÷1/12=10, 7¼-10=-2¾", "hi": "BODMAS: (3/4-1/4)=1/2, 1/2×1/2=1/4, 1/3-1/4=1/12, 5/6÷1/12=10, 7¼-10=-2¾"}
  },
  {
    "id": 4, "subject": "maths",
    "question": {"en": "From 200 software engineers: Python&Java=50, Python only=70, Java only=60, neither=20. Find ratio Python:Java", "hi": "200 सॉफ्टवेयर इंजीनियर: पायथन&जावा=50, केवल पायथन=70, केवल जावा=60, न तो न तो=20। पायथन:जावा अनुपात ज्ञात करें"},
    "options": ["11:12", "12:11", "7:6", "6:7"], "correctAnswer": "12:11",
    "explanation": {"en": "Python proficient = 50+70=120, Java proficient = 50+60=110, Ratio = 120:110 = 12:11", "hi": "पायथन कुशल = 50+70=120, जावा कुशल = 50+60=110, अनुपात = 120:110 = 12:11"}
  },
  {
    "id": 5, "subject": "maths",
    "question": {"en": "Arvind invests ₹80,000. After 4 months, Bhavin joins with ₹1,20,000. After 8 months, Chandan joins with ₹1,60,000. Total profit ₹1,05,000. Find Chandan's share.", "hi": "अरविंद ₹80,000 निवेश करता है। 4 महीने बाद भाविन ₹1,20,000 के साथ शामिल होता है। 8 महीने बाद चंदन ₹1,60,000 के साथ शामिल होता है। कुल लाभ ₹1,05,000। चंदन का हिस्सा ज्ञात करें।"},
    "options": ["₹26,500", "₹26,000", "₹26,200", "₹26,250"], "correctAnswer": "₹26,250",
    "explanation": {"en": "Investment×Time: Arvind=9,60,000, Bhavin=9,60,000, Chandan=6,40,000. Ratio=3:3:2. Chandan=(2/8)×1,05,000=₹26,250", "hi": "निवेश×समय: अरविंद=9,60,000, भाविन=9,60,000, चंदन=6,40,000. अनुपात=3:3:2. चंदन=(2/8)×1,05,000=₹26,250"}
  }
];

// Replace first 5 maths questions
let mathsIndex = 0;
for (let i = 0; i < combinedTest.length; i++) {
  if (combinedTest[i].subject === 'maths' && mathsIndex < mathsQuestions.length) {
    combinedTest[i] = mathsQuestions[mathsIndex];
    mathsIndex++;
  }
}

// Update JSON
questionsData['ssc_cgl_fullmock_12_sep_s1'] = combinedTest;
fs.writeFileSync('C:/Users/Administrator/Desktop/exam-axis-backend/src/data/questions.json', JSON.stringify(questionsData, null, 2));

console.log('✅ First 5 maths questions updated with bilingual format!');
console.log('📝 Updated questions:', mathsQuestions.length);
console.log('🆔 Test ID: ssc_cgl_fullmock_12_sep_s1');

// Update database
(async () => {
  try {
    await sequelize.authenticate();
    const test = await Test.findOne({ where: { testId: 'ssc_cgl_fullmock_12_sep_s1' } });
    if (test) {
      await test.update({ questions: combinedTest });
      console.log('✅ Database updated!');
    }
    await sequelize.close();
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
})();
