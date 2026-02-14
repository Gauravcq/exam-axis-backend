# FRONTEND CHANGES FOR TEST ATTEMPT REVIEW

## Overview
Backend now stores full questions snapshot with each attempt. Frontend needs to be updated to:
1. Send questions snapshot when saving attempts
2. Display stored questions when reviewing solutions

---

## 1. UPDATE: Save Attempt Function

### File: `src/services/testService.js` or wherever you call save attempt API

```javascript
// BEFORE: Old save attempt
export const saveTestAttempt = async (attemptData) => {
  const response = await api.post('/api/tests/attempt', {
    testId: attemptData.testId,
    answers: attemptData.answers,
    score: attemptData.score,
    // ... other fields
  });
  return response.data;
};

// AFTER: New save attempt with questions snapshot
export const saveTestAttempt = async (attemptData) => {
  const response = await api.post('/api/tests/attempt', {
    testId: attemptData.testId,
    answers: attemptData.answers,
    score: attemptData.score,
    totalMarks: attemptData.totalMarks,
    correctAnswers: attemptData.correctAnswers,
    wrongAnswers: attemptData.wrongAnswers,
    unanswered: attemptData.unanswered,
    timeTaken: attemptData.timeTaken,
    examType: attemptData.examType,
    subject: attemptData.subject,
    // ✅ NEW: Send questions snapshot
    questionsSnapshot: attemptData.questions || []
  });
  return response.data;
};
```

---

## 2. UPDATE: Review Solutions Component

### File: `src/components/ReviewSolutions.jsx` or wherever you show review

```jsx
import React, { useState, useEffect } from 'react';
import { getLastAttempt } from '../services/testService';

const ReviewSolutions = ({ testId }) => {
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLastAttempt();
  }, [testId]);

  const fetchLastAttempt = async () => {
    try {
      setLoading(true);
      const response = await getLastAttempt(testId);
      
      // ✅ NEW: Backend now returns questions in the attempt payload
      if (response.data?.lastAttempt) {
        setAttempt(response.data.lastAttempt);
      }
    } catch (error) {
      console.error('Error fetching attempt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!attempt) return <div>No attempt found</div>;

  // ✅ NEW: Use questions from attempt instead of fetching separately
  const questions = attempt.questions || [];
  const answers = attempt.answers || {};

  return (
    <div className="review-solutions">
      <h2>Review Solutions - {attempt.subject}</h2>
      <div className="score-summary">
        Score: {attempt.score}/{attempt.totalMarks}
      </div>

      {/* ✅ Map through questions from attempt */}
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

// Individual question review component
const QuestionReview = ({ question, userAnswer, index }) => {
  // Handle bilingual question format
  const questionText = typeof question.question === 'object' 
    ? question.question.en  // or question.question.hi for Hindi
    : question.question;

  const explanation = typeof question.explanation === 'object'
    ? question.explanation.en
    : question.explanation;

  const isCorrect = userAnswer === question.correctAnswer;

  return (
    <div className={`question-card ${isCorrect ? 'correct' : 'incorrect'}`}>
      <h3>Question {index + 1}</h3>
      <p className="subject-tag">{question.subject}</p>
      
      <div className="question-text" dangerouslySetInnerHTML={{ 
        __html: questionText 
      }} />

      <div className="options">
        {question.options.map((option, optIndex) => (
          <div 
            key={optIndex}
            className={`option ${
              option === question.correctAnswer ? 'correct' : ''
            } ${option === userAnswer ? 'user-answer' : ''}`}
          >
            {option}
            {option === userAnswer && <span> (Your Answer)</span>}
            {option === question.correctAnswer && <span> ✓ Correct</span>}
          </div>
        ))}
      </div>

      <div className="explanation">
        <h4>Explanation:</h4>
        <p dangerouslySetInnerHTML={{ __html: explanation }} />
      </div>
    </div>
  );
};

export default ReviewSolutions;
```

---

## 3. UPDATE: API Service Functions

### File: `src/services/testService.js`

```javascript
import api from './api';

// ✅ Get single attempt with questions
export const getAttempt = async (attemptId) => {
  const response = await api.get(`/api/tests/attempt/${attemptId}`);
  // Returns: { attempt: { ...questions included } }
  return response.data;
};

// ✅ Get last attempt for a test with questions
export const getLastAttempt = async (testId) => {
  const response = await api.get(`/api/tests/last-attempt/${testId}`);
  // Returns: { lastAttempt: { ...questions included } }
  return response.data;
};

// ✅ Get last attempts for multiple tests
export const getLastAttempts = async (testIds) => {
  const ids = Array.isArray(testIds) ? testIds.join(',') : testIds;
  const response = await api.get(`/api/tests/last-attempts?testIds=${ids}`);
  // Returns: { lastAttempts: { testId1: { ...questions }, testId2: { ...questions } } }
  return response.data;
};

// ✅ Save attempt with questions snapshot
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
  return response.data;
};
```

---

## 4. UPDATE: Test Completion Handler

### File: Wherever you handle test completion (e.g., `TestPage.jsx`)

```jsx
const handleTestComplete = async () => {
  // Calculate results
  const results = calculateResults();
  
  // ✅ Get questions from current test state
  const questionsSnapshot = testQuestions.map(q => ({
    id: q.id,
    subject: q.subject,
    question: q.question,  // Can be string or {en, hi} object
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation  // Can be string or {en, hi} object
  }));
  
  try {
    // Save attempt with questions snapshot
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
      answers: userAnswers,  // Map of questionId -> answer
      questions: questionsSnapshot  // ✅ NEW: Send questions
    });
    
    // Redirect to review page
    navigate(`/review/${test.id}`);
  } catch (error) {
    console.error('Failed to save attempt:', error);
  }
};
```

---

## 5. UPDATE: Previous Attempts List

### File: `src/components/PreviousAttempts.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { getLastAttempts } from '../services/testService';

const PreviousAttempts = ({ testIds }) => {
  const [attempts, setAttempts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, [testIds]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await getLastAttempts(testIds);
      
      // ✅ NEW: Each attempt now includes questions
      if (response.data?.lastAttempts) {
        setAttempts(response.data.lastAttempts);
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="previous-attempts">
      {Object.entries(attempts).map(([testId, attempt]) => (
        <div key={testId} className="attempt-card">
          <h3>{attempt.subject} Test</h3>
          <p>Score: {attempt.score}/{attempt.totalMarks}</p>
          <p>Date: {new Date(attempt.submittedAt).toLocaleDateString()}</p>
          
          {/* ✅ Show question count from stored questions */}
          <p>Questions: {attempt.questions?.length || 0}</p>
          
          <button 
            onClick={() => navigate(`/review/${testId}`)}
            className="review-btn"
          >
            Review Solutions
          </button>
        </div>
      ))}
    </div>
  );
};

export default PreviousAttempts;
```

---

## 6. STYLING FOR REVIEW PAGE

### File: `src/styles/review.css`

```css
.review-solutions {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.question-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.question-card.correct {
  border-left: 4px solid #28a745;
}

.question-card.incorrect {
  border-left: 4px solid #dc3545;
}

.subject-tag {
  display: inline-block;
  background: #e9ecef;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.option {
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.option.correct {
  background: #d4edda;
  border-color: #28a745;
}

.option.user-answer {
  background: #f8d7da;
  border-color: #dc3545;
}

.option.correct.user-answer {
  background: #d4edda;
  border-color: #28a745;
}

.explanation {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.score-summary {
  text-align: center;
  font-size: 24px;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
}
```

---

## 7. BILINGUAL SUPPORT (Optional)

### Language Toggle Component

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

// Usage in QuestionReview
const QuestionReview = ({ question, userAnswer, index }) => {
  const [lang, setLang] = useState('en');
  
  const getText = (field) => {
    if (typeof field === 'object' && field !== null) {
      return field[lang] || field.en || '';
    }
    return field || '';
  };
  
  return (
    <div className="question-card">
      <LanguageToggle currentLang={lang} onChange={setLang} />
      
      <h3>Question {index + 1}</h3>
      <p className="question-text">{getText(question.question)}</p>
      
      {/* ... rest of component */}
      
      <div className="explanation">
        <h4>Explanation:</h4>
        <p>{getText(question.explanation)}</p>
      </div>
    </div>
  );
};
```

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `testService.js` | Add `questionsSnapshot` to save attempt, update getters to use returned questions |
| `ReviewSolutions.jsx` | Use `attempt.questions` instead of fetching separately |
| `TestPage.jsx` | Send questions when completing test |
| `PreviousAttempts.jsx` | Display attempts with question count |
| CSS | Add styles for correct/incorrect highlighting |

## API Endpoints Available

- `POST /api/tests/attempt` - Save attempt (send questionsSnapshot)
- `GET /api/tests/attempt/:id` - Get single attempt with questions
- `GET /api/tests/last-attempt/:testId` - Get last attempt for test with questions
- `GET /api/tests/last-attempts?testIds=a,b,c` - Get multiple attempts with questions

---

**Your "Review Solutions" will now show the correct questions matching each test attempt!** 🎯
