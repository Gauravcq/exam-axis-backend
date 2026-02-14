// src/components/ReviewSolutions.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLastAttempt, getAttempt } from '../services/testService';
import './ReviewSolutions.css';

const ReviewSolutions = ({ attemptId: propAttemptId }) => {
  const { testId: paramTestId, attemptId: paramAttemptId } = useParams();
  const navigate = useNavigate();
  
  const attemptId = propAttemptId || paramAttemptId;
  const testId = paramTestId;
  
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect', 'unattempted'

  useEffect(() => {
    fetchAttempt();
  }, [testId, attemptId]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (attemptId) {
        // Fetch specific attempt by ID
        console.log('Fetching attempt by ID:', attemptId);
        response = await getAttempt(attemptId);
        if (response?.attempt) {
          setAttempt(response.attempt);
        }
      } else if (testId) {
        // Fetch last attempt for test
        console.log('Fetching last attempt for test:', testId);
        response = await getLastAttempt(testId);
        if (response?.lastAttempt) {
          setAttempt(response.lastAttempt);
        } else {
          setError('No attempt found for this test');
        }
      } else {
        setError('No testId or attemptId provided');
      }
    } catch (err) {
      console.error('Error fetching attempt:', err);
      setError('Failed to load attempt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionStatus = (question, answers) => {
    const userAnswer = answers[question.id];
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
      return 'unattempted';
    }
    return userAnswer === question.correctAnswer ? 'correct' : 'incorrect';
  };

  const filteredQuestions = () => {
    if (!attempt) return [];
    if (filter === 'all') return attempt.questions || [];
    
    return (attempt.questions || []).filter(q => {
      const status = getQuestionStatus(q, attempt.answers || {});
      return status === filter;
    });
  };

  const stats = () => {
    if (!attempt) return { total: 0, correct: 0, incorrect: 0, unattempted: 0 };
    
    const questions = attempt.questions || [];
    const answers = attempt.answers || {};
    
    let correct = 0, incorrect = 0, unattempted = 0;
    
    questions.forEach(q => {
      const status = getQuestionStatus(q, answers);
      if (status === 'correct') correct++;
      else if (status === 'incorrect') incorrect++;
      else unattempted++;
    });
    
    return { total: questions.length, correct, incorrect, unattempted };
  };

  if (loading) {
    return (
      <div className="review-loading">
        <div className="spinner"></div>
        <p>Loading review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-error">
        <p>{error}</p>
        <button onClick={fetchAttempt} className="retry-btn">Retry</button>
        <button onClick={() => navigate('/tests')} className="back-btn">Back to Tests</button>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="review-empty">
        <p>No attempt found</p>
        <button onClick={() => navigate('/tests')} className="back-btn">Back to Tests</button>
      </div>
    );
  }

  const { total, correct, incorrect, unattempted } = stats();
  const questions = filteredQuestions();
  const percentage = attempt.totalMarks > 0 
    ? Math.round((attempt.score / attempt.totalMarks) * 100) 
    : 0;

  return (
    <div className="review-solutions">
      {/* Score Summary */}
      <div className="score-summary">
        <h2>{attempt.subject || 'Test'} Review</h2>
        <div className="score-main">
          <span className="score-value">{attempt.score}</span>
          <span className="score-total">/{attempt.totalMarks}</span>
          <span className="score-percent">({percentage}%)</span>
        </div>
        <div className="score-stats">
          <span className="stat correct">{correct} Correct</span>
          <span className="stat incorrect">{incorrect} Wrong</span>
          <span className="stat unattempted">{unattempted} Unattempted</span>
          <span className="stat">Time: {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({total})
        </button>
        <button 
          className={filter === 'correct' ? 'active' : ''}
          onClick={() => setFilter('correct')}
        >
          Correct ({correct})
        </button>
        <button 
          className={filter === 'incorrect' ? 'active' : ''}
          onClick={() => setFilter('incorrect')}
        >
          Incorrect ({incorrect})
        </button>
        <button 
          className={filter === 'unattempted' ? 'active' : ''}
          onClick={() => setFilter('unattempted')}
        >
          Unattempted ({unattempted})
        </button>
      </div>

      {/* Questions List */}
      <div className="questions-list">
        {questions.length === 0 ? (
          <p className="no-questions">No questions match this filter</p>
        ) : (
          questions.map((question, index) => (
            <QuestionReview 
              key={question.id || index}
              question={question}
              userAnswer={attempt.answers?.[question.id]}
              index={index + 1}
              total={questions.length}
            />
          ))
        )}
      </div>

      {/* Back Button */}
      <div className="review-actions">
        <button onClick={() => navigate('/tests')} className="back-btn">
          Back to Tests
        </button>
        <button onClick={() => navigate(`/test/${testId}`)} className="retake-btn">
          Retake Test
        </button>
      </div>
    </div>
  );
};

// Individual Question Component
const QuestionReview = ({ question, userAnswer, index, total }) => {
  // Handle bilingual text
  const getText = (field) => {
    if (!field) return '';
    if (typeof field === 'object' && field !== null) {
      return field.en || field.hi || JSON.stringify(field);
    }
    return field;
  };

  const isUnattempted = userAnswer === undefined || userAnswer === null || userAnswer === '';
  const isCorrect = userAnswer === question.correctAnswer;
  const isIncorrect = !isUnattempted && !isCorrect;

  const statusClass = isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'unattempted';

  return (
    <div className={`question-card ${statusClass}`}>
      <div className="question-header">
        <span className="question-number">Q{index} of {total}</span>
        <span className="subject-badge">{question.subject}</span>
        <span className={`status-badge ${statusClass}`}>
          {isCorrect ? '✓ Correct' : isIncorrect ? '✗ Wrong' : '○ Unattempted'}
        </span>
      </div>

      <div 
        className="question-text"
        dangerouslySetInnerHTML={{ __html: getText(question.question) }}
      />

      <div className="options-list">
        {question.options.map((option, optIndex) => {
          const isCorrectOption = option === question.correctAnswer;
          const isUserAnswer = option === userAnswer;
          const letter = String.fromCharCode(65 + optIndex);

          return (
            <div 
              key={optIndex}
              className={`option ${
                isCorrectOption ? 'correct-answer' : ''
              } ${isUserAnswer ? 'user-selected' : ''}`}
            >
              <span className="option-letter">{letter}.</span>
              <span className="option-text">{option}</span>
              
              {isCorrectOption && (
                <span className="badge correct-badge">✓ Correct</span>
              )}
              {isUserAnswer && !isCorrectOption && (
                <span className="badge wrong-badge">✗ Your Answer</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="explanation-box">
        <h4>Explanation</h4>
        <div 
          className="explanation-text"
          dangerouslySetInnerHTML={{ __html: getText(question.explanation) }}
        />
      </div>
    </div>
  );
};

export default ReviewSolutions;
