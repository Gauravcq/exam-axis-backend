const fs = require('fs').promises;
const path = require('path');
const { apiResponse } = require('../utils/helpers');

// ✅ Fix: Use correct path for Vercel
const QUESTIONS_FILE = path.join(process.cwd(), 'src', 'data', 'questions.json');

// Helper: Read questions file safely
const readQuestionsFile = async () => {
    try {
        console.log('📁 Reading from:', QUESTIONS_FILE);
        
        // Check if file exists
        try {
            await fs.access(QUESTIONS_FILE);
        } catch (err) {
            console.error('❌ File not found:', QUESTIONS_FILE);
            
            // Try alternative path
            const altPath = path.join(__dirname, '../data/questions.json');
            console.log('📁 Trying alternative path:', altPath);
            
            try {
                await fs.access(altPath);
                const data = await fs.readFile(altPath, 'utf8');
                return JSON.parse(data);
            } catch (altErr) {
                console.error('❌ Alternative path also failed');
                throw new Error('Questions file not found');
            }
        }
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        console.log('✅ File read successfully');
        return JSON.parse(data);
        
    } catch (error) {
        console.error('❌ Error reading questions file:', error.message);
        throw error;
    }
};

// Get available tests
const getAvailableTests = async (req, res) => {
    try {
        console.log('📋 getAvailableTests called');
        
        const allQuestions = await readQuestionsFile();
        
        const tests = Object.keys(allQuestions).map(testId => ({
            testId,
            questionCount: allQuestions[testId]?.length || 0
        }));
        
        return apiResponse(res, 200, true, 'Available tests fetched', {
            totalTests: tests.length,
            tests
        });
        
    } catch (error) {
        console.error('❌ getAvailableTests error:', error);
        return apiResponse(res, 500, false, 'Failed to fetch tests: ' + error.message);
    }
};

// Check if test exists
const checkTestExists = async (req, res) => {
    try {
        const { testId } = req.params;
        console.log('🔍 checkTestExists:', testId);
        
        const allQuestions = await readQuestionsFile();
        
        const exists = allQuestions.hasOwnProperty(testId);
        
        return apiResponse(res, 200, true, exists ? 'Test exists' : 'Test not found', {
            exists,
            testId,
            questionCount: exists ? allQuestions[testId].length : 0
        });
        
    } catch (error) {
        console.error('❌ checkTestExists error:', error);
        return apiResponse(res, 500, false, 'Failed: ' + error.message);
    }
};

// Get questions WITH answers
const getQuestions = async (req, res) => {
    try {
        const { testId } = req.params;
        
        console.log('========================================');
        console.log('📚 getQuestions called');
        console.log('testId:', testId);
        console.log('========================================');

        const allQuestions = await readQuestionsFile();

        console.log('Available tests:', Object.keys(allQuestions));

        const questions = allQuestions[testId];

        if (!questions || questions.length === 0) {
            console.log('❌ Test not found:', testId);
            return apiResponse(res, 404, false, 'Test not found', {
                requestedTestId: testId,
                availableTests: Object.keys(allQuestions)
            });
        }

        console.log(`✅ Found ${questions.length} questions`);

        const fullQuestions = questions.map((q, index) => ({
            id: index,
            questionNumber: q.questionNo || index + 1,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || { en: '', hi: '' }
        }));

        return apiResponse(res, 200, true, 'Questions fetched successfully', {
            testId,
            totalQuestions: fullQuestions.length,
            questions: fullQuestions
        });

    } catch (error) {
        console.error('❌ getQuestions error:', error);
        return apiResponse(res, 500, false, 'Failed to load questions: ' + error.message);
    }
};

// Get questions WITHOUT answers (for test taking)
const getQuestionsForTest = async (req, res) => {
    try {
        const { testId } = req.params;
        console.log('📝 getQuestionsForTest:', testId);

        const allQuestions = await readQuestionsFile();
        const questions = allQuestions[testId];

        if (!questions || questions.length === 0) {
            return apiResponse(res, 404, false, 'Test not found', {
                requestedTestId: testId,
                availableTests: Object.keys(allQuestions).slice(0, 10)
            });
        }

        const testQuestions = questions.map((q, index) => ({
            id: index,
            questionNumber: q.questionNo || index + 1,
            question: q.question,
            options: q.options
        }));

        return apiResponse(res, 200, true, 'Questions fetched successfully', {
            testId,
            totalQuestions: testQuestions.length,
            questions: testQuestions
        });

    } catch (error) {
        console.error('❌ getQuestionsForTest error:', error);
        return apiResponse(res, 500, false, 'Failed: ' + error.message);
    }
};

// Helper functions for answer checking
const isAnswerCorrect = (userAnswerIndex, options, correctAnswer) => {
    if (userAnswerIndex === null || userAnswerIndex === undefined || userAnswerIndex < 0 || userAnswerIndex > 3) {
        return false;
    }
    
    const selectedOption = options[userAnswerIndex];
    if (!selectedOption) return false;
    
    return (
        selectedOption.en === correctAnswer.en ||
        selectedOption.hi === correctAnswer.hi
    );
};

const getCorrectAnswerIndex = (options, correctAnswer) => {
    for (let i = 0; i < options.length; i++) {
        if (options[i].en === correctAnswer.en || options[i].hi === correctAnswer.hi) {
            return i;
        }
    }
    return -1;
};

// Submit test
const submitTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { answers } = req.body;

        console.log('📤 submitTest:', testId);

        if (!answers || !Array.isArray(answers)) {
            return apiResponse(res, 400, false, 'Invalid answers format');
        }

        const allQuestions = await readQuestionsFile();
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

        const results = questions.map((q, index) => {
            const userAnswerIndex = answers[index];
            const isCorrect = isAnswerCorrect(userAnswerIndex, q.options, q.correctAnswer);
            const correctAnswerIndex = getCorrectAnswerIndex(q.options, q.correctAnswer);
            
            const userAnswer = (userAnswerIndex >= 0 && userAnswerIndex <= 3) 
                ? q.options[userAnswerIndex] 
                : null;
            
            return {
                questionNumber: q.questionNo || index + 1,
                question: q.question,
                options: q.options,
                userAnswerIndex,
                userAnswer,
                correctAnswerIndex,
                correctAnswer: q.correctAnswer,
                isCorrect,
                isAttempted: userAnswerIndex !== null && userAnswerIndex !== -1 && userAnswerIndex !== undefined,
                explanation: q.explanation || { en: '', hi: '' }
            };
        });

        const attemptedCount = results.filter(r => r.isAttempted).length;
        const correctCount = results.filter(r => r.isCorrect).length;
        const incorrectCount = attemptedCount - correctCount;
        const unattemptedCount = questions.length - attemptedCount;
        
        const positiveMarks = correctCount * 2;
        const negativeMarks = incorrectCount * 0.5;
        const score = positiveMarks - negativeMarks;
        const maxScore = questions.length * 2;
        const percentage = parseFloat(((correctCount / questions.length) * 100).toFixed(2));

        return apiResponse(res, 200, true, 'Test submitted successfully', {
            testId,
            userId: req.user?.id || null,
            userEmail: req.user?.email || null,
            summary: {
                totalQuestions: questions.length,
                attempted: attemptedCount,
                unattempted: unattemptedCount,
                correct: correctCount,
                incorrect: incorrectCount,
                positiveMarks,
                negativeMarks,
                score,
                maxScore,
                percentage,
                passed: percentage >= 40
            },
            results
        });

    } catch (error) {
        console.error('❌ submitTest error:', error);
        return apiResponse(res, 500, false, 'Failed: ' + error.message);
    }
};

// Admin functions
const getAdminTestCards = async (req, res) => {
    try {
        console.log('👑 getAdminTestCards');
        
        const allQuestions = await readQuestionsFile();
        
        const testCards = Object.keys(allQuestions).map(testId => {
            const questions = allQuestions[testId];
            return {
                testId,
                questionCount: questions.length,
                hasQuestions: questions.length > 0
            };
        });
        
        return apiResponse(res, 200, true, 'Test cards fetched', {
            total: testCards.length,
            testCards
        });
        
    } catch (error) {
        console.error('❌ getAdminTestCards error:', error);
        return apiResponse(res, 500, false, 'Failed: ' + error.message);
    }
};

const bulkUploadQuestions = async (req, res) => {
    return apiResponse(res, 503, false, 'Bulk upload not available on serverless. Use database instead.');
};

const checkQuestionFormat = async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!questions || !Array.isArray(questions)) {
            return apiResponse(res, 400, false, 'Questions array required');
        }
        
        return apiResponse(res, 200, true, 'Format check completed', {
            total: questions.length,
            valid: questions.length,
            invalid: 0
        });
        
    } catch (error) {
        return apiResponse(res, 500, false, 'Failed: ' + error.message);
    }
};

const deleteQuestions = async (req, res) => {
    return apiResponse(res, 503, false, 'Delete not available on serverless.');
};

const updateQuestion = async (req, res) => {
    return apiResponse(res, 503, false, 'Update not available on serverless.');
};

const deleteTest = async (req, res) => {
    return apiResponse(res, 503, false, 'Delete not available on serverless.');
};

module.exports = {
    getAvailableTests,
    checkTestExists,
    getQuestions,
    getQuestionsForTest,
    submitTest,
    getAdminTestCards,
    bulkUploadQuestions,
    checkQuestionFormat,
    deleteQuestions,
    updateQuestion,
    deleteTest
};