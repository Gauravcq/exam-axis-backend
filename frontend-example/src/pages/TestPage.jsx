// src/pages/TestPage.jsx - Example of how to send questions when completing a test
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saveTestAttempt } from '../services/testService';
import { getQuestions } from '../services/questionService'; // Your existing service

const TestPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch test and questions on mount
  useEffect(() => {
    fetchTestData();
  }, [testId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTaken(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      // Fetch test metadata and questions
      const response = await getQuestions(testId);
      
      if (response?.questions) {
        // Add IDs to questions if they don't have them
        const questionsWithIds = response.questions.map((q, index) => ({
          ...q,
          id: q.id !== undefined ? q.id : index, // Ensure each question has an ID
          questionNumber: q.questionNumber || index + 1
        }));
        
        setQuestions(questionsWithIds);
        setTest({
          testId,
          title: response.testId,
          totalQuestions: questionsWithIds.length,
          examType: 'CGL',
          subject: response.subject || 'General'
        });
      }
    } catch (err) {
      console.error('Error fetching test:', err);
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (option) => {
    const currentQuestion = questions[currentQuestionIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  // Navigate to next/previous question
  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Calculate results
  const calculateResults = () => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        unattempted++;
      } else if (userAnswer === q.correctAnswer) {
        correct++;
      } else {
        incorrect++;
      }
    });
    
    // Assuming 2 marks per correct, -0.5 per wrong
    const score = (correct * 2) - (incorrect * 0.5);
    const totalMarks = questions.length * 2;
    
    return {
      score,
      totalMarks,
      correct,
      incorrect,
      unattempted,
      timeTaken
    };
  };

  // ✅ CRITICAL: Submit test with questions snapshot
  const handleSubmitTest = async () => {
    try {
      setSubmitting(true);
      
      // Calculate final results
      const results = calculateResults();
      
      // ✅ PREPARE FULL QUESTIONS SNAPSHOT
      // This is what gets stored with the attempt for accurate review
      const questionsSnapshot = questions.map(q => ({
        id: q.id,
        subject: q.subject || test?.subject || 'General',
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }));
      
      console.log('Submitting test with:', {
        testId,
        questionsCount: questionsSnapshot.length,
        answersCount: Object.keys(answers).length,
        score: results.score,
        timeTaken: results.timeTaken
      });
      
      // ✅ SEND ATTEMPT WITH QUESTIONS SNAPSHOT
      await saveTestAttempt({
        testId: testId,
        examType: test?.examType || 'CGL',
        subject: test?.subject || 'General',
        score: results.score,
        totalMarks: results.totalMarks,
        correctAnswers: results.correct,
        wrongAnswers: results.incorrect,
        unanswered: results.unattempted,
        timeTaken: results.timeTaken,
        answers: answers,
        questions: questionsSnapshot  // ✅ CRITICAL: Send full questions array
      });
      
      console.log('Test submitted successfully!');
      
      // Navigate to review page
      navigate(`/review/${testId}`);
      
    } catch (error) {
      console.error('Failed to submit test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle early submission confirmation
  const confirmSubmit = () => {
    const attempted = Object.keys(answers).length;
    const total = questions.length;
    
    if (attempted < total) {
      const confirm = window.confirm(
        `You have answered ${attempted} out of ${total} questions.\n` +
        `Are you sure you want to submit?`
      );
      if (confirm) {
        handleSubmitTest();
      }
    } else {
      handleSubmitTest();
    }
  };

  if (loading) return <div>Loading test...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!questions.length) return <div>No questions found</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="test-page">
      {/* Test Header */}
      <div className="test-header">
        <h1>{test?.title || 'Test'}</h1>
        <div className="test-info">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>Time: {Math.floor(timeTaken / 60)}:{(timeTaken % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Card */}
      <div className="question-card">
        <div className="question-text">
          {typeof currentQuestion.question === 'object' 
            ? currentQuestion.question.en 
            : currentQuestion.question}
        </div>

        <div className="options-list">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className={`option-btn ${answers[currentQuestion.id] === option ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option)}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="navigation">
        <button 
          onClick={goToPrevious} 
          disabled={currentQuestionIndex === 0}
          className="nav-btn"
        >
          Previous
        </button>
        
        <button 
          onClick={goToNext}
          disabled={currentQuestionIndex === questions.length - 1}
          className="nav-btn"
        >
          Next
        </button>
      </div>

      {/* Submit Button */}
      <div className="submit-section">
        <button 
          onClick={confirmSubmit}
          disabled={submitting}
          className="submit-btn"
        >
          {submitting ? 'Submitting...' : 'Submit Test'}
        </button>
        <p className="attempted-count">
          Attempted: {Object.keys(answers).length} / {questions.length}
        </p>
      </div>

      {/* Question Navigator */}
      <div className="question-navigator">
        {questions.map((q, index) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestionIndex(index)}
            className={`question-dot ${
              index === currentQuestionIndex ? 'current' : ''
            } ${answers[q.id] ? 'answered' : ''}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TestPage;
