# Frontend Implementation Guide - Test Attempt Review

## Current Status
Backend is storing questions correctly. Frontend needs to send `questionsSnapshot` when saving attempts.

---

## 1. SAVE ATTEMPT - MUST SEND QUESTIONS SNAPSHOT

### File: `src/services/testService.js`

```javascript
export const saveTestAttempt = async (attemptData) => {
  const response = await api.post('/api/tests/attempt', {
    testId: attemptData.testId,
    examType: attemptData.examType,
    subject: attemptData.subject,
    score: attemptData.score,
    totalMarks: attemptData.totalMarks,
    correctAnswers: attemptData.correctAnswers,
    wrongAnswers: attemptData.wrongAnswers,
    unanswered: attemptData.unanswered,
    timeTaken: attemptData.timeTaken,
    answers: attemptData.answers,
    
    // ✅ CRITICAL: Send questions snapshot
    questionsSnapshot: attemptData.questions || []
  });
  
  console.log('Attempt saved:', response.data);
  return response.data;
};
```

---

## 2. WHEN COMPLETING A TEST - SEND FULL QUESTIONS

### File: Where you handle test completion (e.g., `TestPage.jsx`)

```javascript
const handleTestComplete = async () => {
  // Calculate results
  const results = calculateResults();
  
  // ✅ Get FULL questions array with all details
  const questionsSnapshot = currentTestQuestions.map(q => ({
    id: q.id || q.questionNumber,
    subject: q.subject,
    question: q.question,  // Can be string or {en, hi} object
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation  // Can be string or {en, hi} object
  }));
  
  console.log('Sending questions snapshot:', questionsSnapshot.length, 'questions');
  
  try {
    await saveTestAttempt({
      testId: test.id,
      examType: test.examType,
      subject: test.subject,
      score: results.score,
      totalMarks: results.totalMarks,
      correctAnswers: results.correct,
      wrongAnswers: results.wrong,
      unanswered: results.unanswered,
      timeTaken: results.timeTaken,
      answers: userAnswers,  // Map of { questionId: answer }
      questions: questionsSnapshot  // ✅ MUST include this
    });
    
    // Navigate to review page
    navigate(`/review/${test.id}`);
  } catch (error) {
    console.error('Failed to save attempt:', error);
  }
};
```

---

## 3. REVIEW SOLUTIONS - USE QUESTIONS FROM ATTEMPT

### File: `src/components/ReviewSolutions.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { getLastAttempt } from '../services/testService';

const ReviewSolutions = ({ testId }) => {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLastAttempt();
  }, [testId]);

  const fetchLastAttempt = async () => {
    try {
      setLoading(true);
      const response = await getLastAttempt(testId);
      
      if (response.data?.lastAttempt) {
        const attempt = response.data.lastAttempt;
        
        // ✅ Backend now returns questions in the attempt
        console.log('Questions from attempt:', attempt.questions?.length || 0);
        
        setAttempt(attempt);
      } else {
        setError('No attempt found');
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
      setError('Failed to load attempt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading review...</div>;
  if (error) return <div>{error}</div>;
  if (!attempt) return <div>No attempt found</div>;

  // ✅ Use questions from attempt
  const questions = attempt.questions || [];
  const answers = attempt.answers || {};

  return (
    <div className="review-solutions">
      <div className="score-summary">
        <h2>{attempt.subject} Test Review</h2>
        <p>Score: {attempt.score}/{attempt.totalMarks}</p>
        <p>Questions: {questions.length}</p>
      </div>

      {questions.map((question, index) => (
        <QuestionReview 
          key={question.id || index}
          question={question}
          userAnswer={answers[question.id]}
          index={index}
        />
      ))}
    </div>
  );
};

// Individual question component
const QuestionReview = ({ question, userAnswer, index }) => {
  // Handle bilingual format
  const getQuestionText = () => {
    if (typeof question.question === 'object' && question.question !== null) {
      return question.question.en || question.question.hi || '';
    }
    return question.question || '';
  };

  const getExplanation = () => {
    if (typeof question.explanation === 'object' && question.explanation !== null) {
      return question.explanation.en || question.explanation.hi || '';
    }
    return question.explanation || '';
  };

  const isCorrect = userAnswer === question.correctAnswer;

  return (
    <div className={`question-card ${isCorrect ? 'correct' : 'incorrect'}`}>
      <h3>Question {index + 1}</h3>
      <span className="subject-badge">{question.subject}</span>
      
      <p className="question-text" dangerouslySetInnerHTML={{ 
        __html: getQuestionText() 
      }} />

      <div className="options-list">
        {question.options.map((option, optIndex) => {
          const isCorrectOption = option === question.correctAnswer;
          const isUserAnswer = option === userAnswer;
          
          return (
            <div 
              key={optIndex}
              className={`option ${
                isCorrectOption ? 'correct-answer' : ''
              } ${isUserAnswer ? 'user-answer' : ''}`}
            >
              <span className="option-letter">{String.fromCharCode(65 + optIndex)}.</span>
              <span className="option-text">{option}</span>
              
              {isUserAnswer && (
                <span className="badge">
                  {isCorrect ? '✓ Your Answer (Correct)' : '✗ Your Answer (Wrong)'}
                </span>
              )}
              {isCorrectOption && !isUserAnswer && (
                <span className="badge correct">✓ Correct Answer</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="explanation-box">
        <h4>Explanation:</h4>
        <p dangerouslySetInnerHTML={{ __html: getExplanation() }} />
      </div>
    </div>
  );
};

export default ReviewSolutions;
```

---

## 4. API SERVICE FUNCTIONS

### File: `src/services/testService.js`

```javascript
import api from './api';

// Get single attempt with questions
export const getAttempt = async (attemptId) => {
  const response = await api.get(`/api/tests/attempt/${attemptId}`);
  return response.data;
};

// Get last attempt for a test with questions
export const getLastAttempt = async (testId) => {
  const response = await api.get(`/api/tests/last-attempt/${testId}`);
  return response.data;
};

// Get last attempts for multiple tests
export const getLastAttempts = async (testIds) => {
  const ids = Array.isArray(testIds) ? testIds.join(',') : testIds;
  const response = await api.get(`/api/tests/last-attempts?testIds=${ids}`);
  return response.data;
};

// Save attempt with questions snapshot
export const saveTestAttempt = async (attemptData) => {
  const response = await api.post('/api/tests/attempt', {
    testId: attemptData.testId,
    examType: attemptData.examType,
    subject: attemptData.subject,
    score: attemptData.score,
    totalMarks: attemptData.totalMarks,
    correctAnswers: attemptData.correctAnswers,
    wrongAnswers: attemptData.wrongAnswers,
    unanswered: attemptData.unanswered,
    timeTaken: attemptData.timeTaken,
    answers: attemptData.answers,
    questionsSnapshot: attemptData.questions || []
  });
  return response.data;
};
```

---

## 5. STYLES FOR REVIEW PAGE

### File: `src/styles/review.css`

```css
.review-solutions {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.score-summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 30px;
}

.score-summary h2 {
  margin: 0 0 10px 0;
}

.score-summary p {
  margin: 5px 0;
  font-size: 18px;
}

.question-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border-left: 5px solid #ddd;
}

.question-card.correct {
  border-left-color: #28a745;
  background: #f8fff8;
}

.question-card.incorrect {
  border-left-color: #dc3545;
  background: #fff8f8;
}

.question-card h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.subject-badge {
  display: inline-block;
  background: #e9ecef;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 15px;
}

.question-text {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #333;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.option {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  background: #f8f9fa;
}

.option.correct-answer {
  background: #d4edda;
  border-color: #28a745;
}

.option.user-answer {
  background: #f8d7da;
  border-color: #dc3545;
}

.option.correct-answer.user-answer {
  background: #d4edda;
  border-color: #28a745;
}

.option-letter {
  font-weight: bold;
  margin-right: 10px;
  min-width: 25px;
}

.option-text {
  flex: 1;
}

.badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
  background: #dc3545;
  color: white;
}

.badge.correct {
  background: #28a745;
}

.explanation-box {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.explanation-box h4 {
  margin: 0 0 10px 0;
  color: #007bff;
}

.explanation-box p {
  margin: 0;
  line-height: 1.6;
}
```

---

## 6. DEBUGGING - CHECK IF QUESTIONS ARE STORED

### Add this to your browser console or component:

```javascript
// After saving attempt, check the response
const response = await saveTestAttempt({...});
console.log('Saved attempt:', response.data.attempt);
console.log('Questions stored:', response.data.attempt.questions?.length || 0);

// When fetching attempt
const response = await getLastAttempt(testId);
console.log('Last attempt:', response.data.lastAttempt);
console.log('Questions returned:', response.data.lastAttempt.questions?.length || 0);
```

---

## 7. BILINGUAL SUPPORT (Optional)

### Language Toggle:

```jsx
const LanguageToggle = ({ currentLang, onChange }) => (
  <div className="language-toggle">
    <button 
      className={currentLang === 'en' ? 'active' : ''}
      onClick={() => onChange('en')}
    >
      English
    </button>
    <button 
      className={currentLang === 'hi' ? 'active' : ''}
      onClick={() => onChange('hi')}
    >
      हिंदी
    </button>
  </div>
);

// In QuestionReview component:
const [lang, setLang] = useState('en');

const getText = (field) => {
  if (typeof field === 'object' && field !== null) {
    return field[lang] || field.en || '';
  }
  return field || '';
};
```

---

## Key Points

1. **ALWAYS send `questionsSnapshot`** when calling `saveTestAttempt`
2. **Use `attempt.questions`** in ReviewSolutions (not separate fetch)
3. **Backend stores questions** - verify with browser console logs
4. **Old attempts** without questions will use fallback (might show wrong subject)

## Quick Checklist

- [ ] Frontend sends `questionsSnapshot` with 25 questions
- [ ] ReviewSolutions uses `attempt.questions`
- [ ] Styles applied for correct/incorrect highlighting
- [ ] Console logs show questions are being stored

**Backend is ready. Just make sure frontend sends the questions!** ✅
