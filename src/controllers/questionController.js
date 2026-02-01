const fs = require('fs').promises;
const path = require('path');
const { apiResponse } = require('../utils/helpers');

const QUESTIONS_FILE = path.join(__dirname, '../data/questions.json');

// Get questions WITH answers (for review after submission)
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

        // ✅ FIXED: Include correctAnswer and explanation
        const fullQuestions = questions.map((q, index) => ({
            id: index,
            questionNumber: index + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,    // ✅ Now included!
            explanation: q.explanation || ''    // ✅ Now included!
        }));

        return apiResponse(res, 200, true, 'Questions fetched successfully', {
            testId,
            totalQuestions: fullQuestions.length,
            questions: fullQuestions
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
        const { answers } = req.body;

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
        const score = correctCount * 2;
        const maxScore = questions.length * 2;
        const percentage = parseFloat(((correctCount / questions.length) * 100).toFixed(2));

        if (req.user && req.user.id) {
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
            passed: percentage >= 60,
            results
        });

    } catch (error) {
        console.error('Error submitting test:', error);
        return apiResponse(res, 500, false, 'Failed to submit test');
    }
};

// Public route to check if test exists
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

// Get list of available tests
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

// NEW: Admin - Get all test cards with details (for admin panel)
const getAdminTestCards = async (req, res) => {
    try {
        // Check if user is admin (middleware should handle this, but double-check)
        if (!req.user || !req.user.isAdmin) {
            return apiResponse(res, 403, false, 'Admin access required');
        }
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const testCards = Object.keys(allQuestions).map(testId => ({
            testId,
            questionCount: allQuestions[testId].length,
            sample: allQuestions[testId][0]?.question?.substring(0, 80) + '...' || 'No questions yet',
            lastQuestion: allQuestions[testId][allQuestions[testId].length - 1]?.question?.substring(0, 80) || 'None',
            hasQuestions: allQuestions[testId].length > 0
        }));
        
        return apiResponse(res, 200, true, 'Test cards fetched for admin', {
            total: testCards.length,
            testCards
        });
        
    } catch (error) {
        console.error('Error fetching admin test cards:', error);
        return apiResponse(res, 500, false, 'Failed to fetch test cards');
    }
};

// NEW: Bulk upload questions to a test (Admin only)
const bulkUploadQuestions = async (req, res) => {
    try {
        const { testId } = req.params;
        const { questions } = req.body;
        
        // Validate input
        if (!questions || !Array.isArray(questions)) {
            return apiResponse(res, 400, false, 'Questions array is required');
        }
        
        if (questions.length === 0) {
            return apiResponse(res, 400, false, 'Please provide at least one question');
        }
        
        // Read existing data
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        // If test doesn't exist, create it
        if (!allQuestions[testId]) {
            allQuestions[testId] = [];
        }
        
        const existingCount = allQuestions[testId].length;
        
        // Validate and prepare new questions
        const newQuestions = questions.map((q, index) => {
            // Basic validation
            if (!q.question || !q.options || q.correctAnswer === undefined) {
                throw new Error(`Question ${index + 1} is missing required fields`);
            }
            
            // Ensure options is an array of 4
            if (!Array.isArray(q.options) || q.options.length !== 4) {
                throw new Error(`Question ${index + 1} must have exactly 4 options`);
            }
            
            // Ensure correctAnswer is between 0-3
            if (q.correctAnswer < 0 || q.correctAnswer > 3) {
                throw new Error(`Question ${index + 1}: correctAnswer must be 0, 1, 2, or 3`);
            }
            
            return {
                question: q.question.trim(),
                options: q.options.map(opt => opt.trim()),
                correctAnswer: parseInt(q.correctAnswer),
                difficulty: q.difficulty || 'medium',
                topic: q.topic || 'General',
                explanation: q.explanation || '',
                // Auto-generate ID based on existing count
                id: existingCount + index
            };
        });
        
        // Append new questions to existing ones
        allQuestions[testId].push(...newQuestions);
        
        // Save back to file
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(allQuestions, null, 2));
        
        return apiResponse(res, 200, true, 'Questions uploaded successfully', {
            testId,
            existingCount,
            addedCount: newQuestions.length,
            newTotal: allQuestions[testId].length,
            message: `Added ${newQuestions.length} questions to ${testId} (Now has ${allQuestions[testId].length} total)`
        });
        
    } catch (error) {
        console.error('Bulk upload error:', error);
        return apiResponse(res, 500, false, `Upload failed: ${error.message}`);
    }
};

// NEW: Quick format check (for admin panel preview)
const checkQuestionFormat = async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!questions || !Array.isArray(questions)) {
            return apiResponse(res, 400, false, 'Questions array required');
        }
        
        const validQuestions = [];
        const invalidQuestions = [];
        
        questions.forEach((q, index) => {
            if (q.question && 
                Array.isArray(q.options) && 
                q.options.length === 4 &&
                q.correctAnswer !== undefined &&
                q.correctAnswer >= 0 && 
                q.correctAnswer <= 3) {
                
                validQuestions.push({
                    number: index + 1,
                    question: q.question.substring(0, 50) + '...',
                    options: q.options,
                    correctAnswer: q.correctAnswer
                });
            } else {
                invalidQuestions.push({
                    number: index + 1,
                    error: 'Missing or invalid fields'
                });
            }
        });
        
        return apiResponse(res, 200, true, 'Format check completed', {
            total: questions.length,
            valid: validQuestions.length,
            invalid: invalidQuestions.length,
            validQuestions: validQuestions.slice(0, 3), // Show first 3
            invalidQuestions: invalidQuestions.slice(0, 5)
        });
        
    } catch (error) {
        console.error('Format check error:', error);
        return apiResponse(res, 500, false, 'Format check failed');
    }
};

module.exports = {
    getQuestions,
    submitTest,
    checkTestExists,
    getAvailableTests,
    // NEW exports
    getAdminTestCards,
    bulkUploadQuestions,
    checkQuestionFormat
};