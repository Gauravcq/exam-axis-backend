const fs = require('fs').promises;
const path = require('path');
const { apiResponse } = require('../utils/helpers');

const QUESTIONS_FILE = path.join(__dirname, '../data/questions.json');

// Get questions WITHOUT answers (for test display)
const getQuestionsForTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const lang = req.query.lang || 'en'; // Support language preference

        // Read questions file
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);

        const questions = allQuestions[testId];

        if (!questions || questions.length === 0) {
            return apiResponse(res, 404, false, 'Test not found', {
                availableTests: Object.keys(allQuestions).slice(0, 5)
            });
        }

        // Exclude correctAnswer and explanation for test display
        const testQuestions = questions.map((q, index) => ({
            id: index,
            questionNumber: q.questionNo || index + 1,
            question: q.question,  // Returns { en: "...", hi: "..." }
            options: q.options     // Returns [{ en: "...", hi: "..." }, ...]
        }));

        return apiResponse(res, 200, true, 'Questions fetched successfully', {
            testId,
            totalQuestions: testQuestions.length,
            questions: testQuestions
        });

    } catch (error) {
        console.error('Error fetching questions:', error);
        return apiResponse(res, 500, false, 'Failed to load questions');
    }
};

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

        // Include correctAnswer and explanation for review
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
        console.error('Error fetching questions:', error);
        return apiResponse(res, 500, false, 'Failed to load questions');
    }
};

// Helper function to check if answer is correct
const isAnswerCorrect = (userAnswerIndex, options, correctAnswer) => {
    // userAnswerIndex is 0, 1, 2, or 3
    if (userAnswerIndex < 0 || userAnswerIndex > 3 || userAnswerIndex === null || userAnswerIndex === undefined) {
        return false;
    }
    
    const selectedOption = options[userAnswerIndex];
    
    if (!selectedOption) return false;
    
    // Compare with correctAnswer (both have en/hi structure)
    // Match if either language matches
    return (
        selectedOption.en === correctAnswer.en ||
        selectedOption.hi === correctAnswer.hi
    );
};

// Get correct answer index from options
const getCorrectAnswerIndex = (options, correctAnswer) => {
    for (let i = 0; i < options.length; i++) {
        if (options[i].en === correctAnswer.en || options[i].hi === correctAnswer.hi) {
            return i;
        }
    }
    return -1;
};

// Submit and verify answers
const submitTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const { answers } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return apiResponse(res, 400, false, 'Invalid answers format. Expected array of indices (0-3)');
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
            const userAnswerIndex = answers[index]; // 0, 1, 2, 3, or null/-1 for unanswered
            const isCorrect = isAnswerCorrect(userAnswerIndex, q.options, q.correctAnswer);
            const correctAnswerIndex = getCorrectAnswerIndex(q.options, q.correctAnswer);
            
            // Get user's selected option text
            const userAnswer = (userAnswerIndex >= 0 && userAnswerIndex <= 3) 
                ? q.options[userAnswerIndex] 
                : null;
            
            return {
                questionNumber: q.questionNo || index + 1,
                question: q.question,
                options: q.options,
                userAnswerIndex: userAnswerIndex,
                userAnswer: userAnswer,
                correctAnswerIndex: correctAnswerIndex,
                correctAnswer: q.correctAnswer,
                isCorrect,
                isAttempted: userAnswerIndex !== null && userAnswerIndex !== -1 && userAnswerIndex !== undefined,
                explanation: q.explanation || { en: 'No explanation available', hi: 'कोई स्पष्टीकरण उपलब्ध नहीं है' }
            };
        });

        const attemptedCount = results.filter(r => r.isAttempted).length;
        const correctCount = results.filter(r => r.isCorrect).length;
        const incorrectCount = attemptedCount - correctCount;
        const unattemptedCount = questions.length - attemptedCount;
        
        // Scoring: +2 for correct, -0.5 for incorrect (SSC pattern)
        const positiveMarks = correctCount * 2;
        const negativeMarks = incorrectCount * 0.5;
        const score = positiveMarks - negativeMarks;
        const maxScore = questions.length * 2;
        const percentage = parseFloat(((correctCount / questions.length) * 100).toFixed(2));

        if (req.user && req.user.id) {
            console.log(`User ${req.user.email} completed test ${testId}: ${percentage}%`);
        }

        return apiResponse(res, 200, true, 'Test submitted successfully', {
            testId,
            userId: req.user?.id,
            userEmail: req.user?.email,
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
        const questionCount = exists ? allQuestions[testId].length : 0;
        
        return apiResponse(res, 200, true, exists ? 'Test exists' : 'Test not found', {
            exists,
            testId,
            questionCount
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
            questionCount: allQuestions[testId].length,
            firstQuestion: allQuestions[testId][0]?.question?.en?.substring(0, 50) + '...' || 'No questions'
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

// Admin - Get all test cards with details
const getAdminTestCards = async (req, res) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return apiResponse(res, 403, false, 'Admin access required');
        }
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        const testCards = Object.keys(allQuestions).map(testId => {
            const questions = allQuestions[testId];
            return {
                testId,
                questionCount: questions.length,
                sampleQuestion: {
                    en: questions[0]?.question?.en?.substring(0, 80) + '...' || 'No questions',
                    hi: questions[0]?.question?.hi?.substring(0, 80) + '...' || 'कोई प्रश्न नहीं'
                },
                lastQuestionNo: questions[questions.length - 1]?.questionNo || 0,
                hasQuestions: questions.length > 0
            };
        });
        
        return apiResponse(res, 200, true, 'Test cards fetched for admin', {
            total: testCards.length,
            testCards
        });
        
    } catch (error) {
        console.error('Error fetching admin test cards:', error);
        return apiResponse(res, 500, false, 'Failed to fetch test cards');
    }
};

// Validate bilingual question format
const validateBilingualQuestion = (q, index) => {
    const errors = [];
    
    // Check question
    if (!q.question || !q.question.en || !q.question.hi) {
        errors.push(`Question ${index + 1}: Missing bilingual question (en/hi)`);
    }
    
    // Check options
    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${index + 1}: Must have exactly 4 options`);
    } else {
        q.options.forEach((opt, optIndex) => {
            if (!opt.en || !opt.hi) {
                errors.push(`Question ${index + 1}, Option ${optIndex + 1}: Missing en/hi`);
            }
        });
    }
    
    // Check correctAnswer
    if (!q.correctAnswer || !q.correctAnswer.en || !q.correctAnswer.hi) {
        errors.push(`Question ${index + 1}: Missing bilingual correctAnswer (en/hi)`);
    } else {
        // Verify correctAnswer matches one of the options
        const matchFound = q.options?.some(opt => 
            opt.en === q.correctAnswer.en || opt.hi === q.correctAnswer.hi
        );
        if (!matchFound) {
            errors.push(`Question ${index + 1}: correctAnswer doesn't match any option`);
        }
    }
    
    return errors;
};

// Bulk upload questions (Admin only)
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
        
        // Validate each question
        const allErrors = [];
        questions.forEach((q, index) => {
            const errors = validateBilingualQuestion(q, index);
            allErrors.push(...errors);
        });
        
        if (allErrors.length > 0) {
            return apiResponse(res, 400, false, 'Validation failed', {
                errorCount: allErrors.length,
                errors: allErrors.slice(0, 10) // Return first 10 errors
            });
        }
        
        // Read existing data
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        // If test doesn't exist, create it
        if (!allQuestions[testId]) {
            allQuestions[testId] = [];
        }
        
        const existingCount = allQuestions[testId].length;
        
        // Prepare new questions with proper format
        const newQuestions = questions.map((q, index) => ({
            questionNo: q.questionNo || existingCount + index + 1,
            question: {
                en: q.question.en.trim(),
                hi: q.question.hi.trim()
            },
            options: q.options.map(opt => ({
                en: opt.en.trim(),
                hi: opt.hi.trim()
            })),
            correctAnswer: {
                en: q.correctAnswer.en.trim(),
                hi: q.correctAnswer.hi.trim()
            },
            explanation: {
                en: q.explanation?.en?.trim() || '',
                hi: q.explanation?.hi?.trim() || ''
            }
        }));
        
        // Append new questions
        allQuestions[testId].push(...newQuestions);
        
        // Save back to file
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(allQuestions, null, 2));
        
        return apiResponse(res, 200, true, 'Questions uploaded successfully', {
            testId,
            existingCount,
            addedCount: newQuestions.length,
            newTotal: allQuestions[testId].length,
            message: `Added ${newQuestions.length} questions to ${testId}`
        });
        
    } catch (error) {
        console.error('Bulk upload error:', error);
        return apiResponse(res, 500, false, `Upload failed: ${error.message}`);
    }
};

// Quick format check for preview
const checkQuestionFormat = async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!questions || !Array.isArray(questions)) {
            return apiResponse(res, 400, false, 'Questions array required');
        }
        
        const validQuestions = [];
        const invalidQuestions = [];
        
        questions.forEach((q, index) => {
            const errors = validateBilingualQuestion(q, index);
            
            if (errors.length === 0) {
                validQuestions.push({
                    number: q.questionNo || index + 1,
                    questionPreview: {
                        en: q.question.en?.substring(0, 50) + '...',
                        hi: q.question.hi?.substring(0, 50) + '...'
                    },
                    optionsCount: q.options?.length || 0,
                    hasExplanation: !!(q.explanation?.en || q.explanation?.hi)
                });
            } else {
                invalidQuestions.push({
                    number: index + 1,
                    errors: errors
                });
            }
        });
        
        return apiResponse(res, 200, true, 'Format check completed', {
            total: questions.length,
            valid: validQuestions.length,
            invalid: invalidQuestions.length,
            validQuestions: validQuestions.slice(0, 5),
            invalidQuestions: invalidQuestions.slice(0, 5)
        });
        
    } catch (error) {
        console.error('Format check error:', error);
        return apiResponse(res, 500, false, 'Format check failed');
    }
};

// Delete questions from a test (Admin only)
const deleteQuestions = async (req, res) => {
    try {
        const { testId } = req.params;
        const { questionNumbers } = req.body; // Array of questionNo to delete
        
        if (!req.user || !req.user.isAdmin) {
            return apiResponse(res, 403, false, 'Admin access required');
        }
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        if (!allQuestions[testId]) {
            return apiResponse(res, 404, false, 'Test not found');
        }
        
        const beforeCount = allQuestions[testId].length;
        
        // Filter out questions to delete
        allQuestions[testId] = allQuestions[testId].filter(
            q => !questionNumbers.includes(q.questionNo)
        );
        
        const afterCount = allQuestions[testId].length;
        const deletedCount = beforeCount - afterCount;
        
        // Save back
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(allQuestions, null, 2));
        
        return apiResponse(res, 200, true, `Deleted ${deletedCount} questions`, {
            testId,
            deletedCount,
            remainingCount: afterCount
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        return apiResponse(res, 500, false, 'Failed to delete questions');
    }
};

// Update a single question (Admin only)
const updateQuestion = async (req, res) => {
    try {
        const { testId, questionNo } = req.params;
        const { question } = req.body;
        
        if (!req.user || !req.user.isAdmin) {
            return apiResponse(res, 403, false, 'Admin access required');
        }
        
        const errors = validateBilingualQuestion(question, 0);
        if (errors.length > 0) {
            return apiResponse(res, 400, false, 'Invalid question format', { errors });
        }
        
        const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
        const allQuestions = JSON.parse(data);
        
        if (!allQuestions[testId]) {
            return apiResponse(res, 404, false, 'Test not found');
        }
        
        const qIndex = allQuestions[testId].findIndex(
            q => q.questionNo === parseInt(questionNo)
        );
        
        if (qIndex === -1) {
            return apiResponse(res, 404, false, 'Question not found');
        }
        
        // Update the question
        allQuestions[testId][qIndex] = {
            questionNo: parseInt(questionNo),
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation || { en: '', hi: '' }
        };
        
        await fs.writeFile(QUESTIONS_FILE, JSON.stringify(allQuestions, null, 2));
        
        return apiResponse(res, 200, true, 'Question updated successfully', {
            testId,
            questionNo: parseInt(questionNo)
        });
        
    } catch (error) {
        console.error('Update error:', error);
        return apiResponse(res, 500, false, 'Failed to update question');
    }
};

module.exports = {
    getQuestions,
    getQuestionsForTest,
    submitTest,
    checkTestExists,
    getAvailableTests,
    getAdminTestCards,
    bulkUploadQuestions,
    checkQuestionFormat,
    deleteQuestions,
    updateQuestion
};