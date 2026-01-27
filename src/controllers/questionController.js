const fs = require('fs').promises;
const path = require('path');
const { apiResponse } = require('../utils/helpers');

const QUESTIONS_FILE = path.join(__dirname, '../data/questions.json');

// Get questions WITHOUT answers
const getQuestions = async (req, res) => {
    try {
        const { testId } = req.params;
        
        // Read questions file
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const questions = allQuestions[testId];
        
        if (!questions || questions.length === 0) {
            return apiResponse(res, 404, false, 'Test not found', { 
                availableTests: Object.keys(allQuestions).slice(0, 5) 
            });
        }

        // Remove correct answers and explanations for security
        const safeQuestions = questions.map((q, index) => ({
            id: index,
            questionNumber: index + 1,
            question: q.question,
            options: q.options
            // NOT sending: correctAnswer, explanation
        }));

        return apiResponse(res, 200, true, 'Questions fetched successfully', {
            testId,
            totalQuestions: safeQuestions.length,
            questions: safeQuestions
        });

    } catch (error) {
        console.error('Error fetching questions:', error);
        return apiResponse(res, 500, false, 'Failed to load questions');
    }
};

// Submit and verify answers
const submitTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { answers } = req.body; // Array of user's answers [0, 2, 1, 3, ...]

        if (!answers || !Array.isArray(answers)) {
            return apiResponse(res, 400, false, 'Invalid answers format');
        }

        // Read questions file
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const questions = allQuestions[testId];
        
        if (!questions || questions.length === 0) {
            return apiResponse(res, 404, false, 'Test not found');
        }

        if (answers.length !== questions.length) {
            return apiResponse(res, 400, false, 'Invalid number of answers', {
                expected: questions.length,
                received: answers.length
            });
        }

        // Calculate results
        const results = questions.map((q, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === q.correctAnswer;
            
            return {
                questionNumber: index + 1,
                question: q.question,
                options: q.options,
                userAnswer: userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect,
                explanation: q.explanation || 'No explanation available'
            };
        });

        const correctCount = results.filter(r => r.isCorrect).length;
        const incorrectCount = results.length - correctCount;
        const score = correctCount * 2; // 2 marks per question
        const maxScore = questions.length * 2;
        const percentage = parseFloat(((correctCount / questions.length) * 100).toFixed(2));

        // Optionally save attempt to database
        if (req.user && req.user.id) {
            // You can save to TestAttempt model here if you want
            console.log(`User ${req.user.email} completed test ${testId}: ${percentage}%`);
        }

        return apiResponse(res, 200, true, 'Test submitted successfully', {
            testId,
            userId: req.user.id,
            userEmail: req.user.email,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            incorrectAnswers: incorrectCount,
            score,
            maxScore,
            percentage,
            passed: percentage >= 60, // Pass if 60% or more
            results
        });

    } catch (error) {
        console.error('Error submitting test:', error);
        return apiResponse(res, 500, false, 'Failed to submit test');
    }
};

// Public route to check if test exists (no auth needed)
const checkTestExists = async (req, res) => {
    try {
        const { testId } = req.params;
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const exists = allQuestions.hasOwnProperty(testId);
        
        return apiResponse(res, 200, true, exists ? 'Test exists' : 'Test not found', {
            exists,
            testId
        });
        
    } catch (error) {
        console.error('Error checking test:', error);
        return apiResponse(res, 500, false, 'Failed to check test');
    }
};

// Get list of available tests (for admin or debugging)
const getAvailableTests = async (req, res) => {
    try {
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const tests = Object.keys(allQuestions).map(testId => ({
            testId,
            questionCount: allQuestions[testId].length
        }));
        
        return apiResponse(res, 200, true, 'Available tests fetched', {
            totalTests: tests.length,
            tests
        });
        
    } catch (error) {
        console.error('Error fetching tests:', error);
        return apiResponse(res, 500, false, 'Failed to fetch tests');
    }
};

module.exports = {
    getQuestions,
    submitTest,
    checkTestExists,
    getAvailableTests
};