// src/services/testService.js
import api from './api';

/**
 * Get single attempt with questions
 * @param {number} attemptId - The attempt ID
 * @returns {Promise} API response with attempt data
 */
export const getAttempt = async (attemptId) => {
  try {
    const response = await api.get(`/api/tests/attempt/${attemptId}`);
    console.log('getAttempt - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getAttempt - Error:', error.message);
    throw error;
  }
};

/**
 * Get last attempt for a specific test with questions
 * @param {string} testId - The test ID
 * @returns {Promise} API response with lastAttempt data
 */
export const getLastAttempt = async (testId) => {
  try {
    const response = await api.get(`/api/tests/last-attempt/${testId}`);
    console.log('getLastAttempt - Response:', {
      hasLastAttempt: !!response.data?.lastAttempt,
      questionsCount: response.data?.lastAttempt?.questions?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error('getLastAttempt - Error:', error.message);
    throw error;
  }
};

/**
 * Get last attempts for multiple tests
 * @param {string[]|string} testIds - Array of test IDs or comma-separated string
 * @returns {Promise} API response with lastAttempts map
 */
export const getLastAttempts = async (testIds) => {
  try {
    const ids = Array.isArray(testIds) ? testIds.join(',') : testIds;
    const response = await api.get(`/api/tests/last-attempts?testIds=${ids}`);
    console.log('getLastAttempts - Response:', {
      testIds: ids,
      attemptsCount: Object.keys(response.data?.lastAttempts || {}).length
    });
    return response.data;
  } catch (error) {
    console.error('getLastAttempts - Error:', error.message);
    throw error;
  }
};

/**
 * Get user's test history
 * @param {Object} params - Query parameters
 * @param {string} params.examType - Filter by exam type
 * @param {string} params.subject - Filter by subject
 * @param {number} params.limit - Number of records
 * @param {number} params.offset - Pagination offset
 * @returns {Promise} API response with attempts
 */
export const getHistory = async (params = {}) => {
  try {
    const { examType, subject, limit = 20, offset = 0 } = params;
    const query = new URLSearchParams();
    if (examType) query.append('examType', examType);
    if (subject) query.append('subject', subject);
    query.append('limit', limit);
    query.append('offset', offset);
    
    const response = await api.get(`/api/tests/history?${query.toString()}`);
    console.log('getHistory - Response:', {
      total: response.data?.total,
      attemptsCount: response.data?.attempts?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error('getHistory - Error:', error.message);
    throw error;
  }
};

/**
 * Save test attempt with questions snapshot
 * CRITICAL: Must send questionsSnapshot for accurate review
 * @param {Object} attemptData - The attempt data
 * @param {string} attemptData.testId - Test ID
 * @param {string} attemptData.examType - Exam type (CGL, CHSL, DP)
 * @param {string} attemptData.subject - Subject
 * @param {number} attemptData.score - Score obtained
 * @param {number} attemptData.totalMarks - Total marks
 * @param {number} attemptData.correctAnswers - Correct answers count
 * @param {number} attemptData.wrongAnswers - Wrong answers count
 * @param {number} attemptData.unanswered - Unanswered count
 * @param {number} attemptData.timeTaken - Time taken in seconds
 * @param {Object} attemptData.answers - Map of questionId -> answer
 * @param {Array} attemptData.questions - FULL questions array (CRITICAL!)
 * @returns {Promise} API response with saved attempt
 */
export const saveTestAttempt = async (attemptData) => {
  try {
    const payload = {
      testId: attemptData.testId,
      examType: attemptData.examType || 'CGL',
      subject: attemptData.subject || 'General',
      score: attemptData.score || 0,
      totalMarks: attemptData.totalMarks || 0,
      correctAnswers: attemptData.correctAnswers || 0,
      wrongAnswers: attemptData.wrongAnswers || 0,
      unanswered: attemptData.unanswered || 0,
      timeTaken: attemptData.timeTaken || 0,
      answers: attemptData.answers || {},
      // ✅ CRITICAL: Send questions snapshot
      questionsSnapshot: attemptData.questions || []
    };
    
    console.log('saveTestAttempt - Sending:', {
      testId: payload.testId,
      questionsSnapshotCount: payload.questionsSnapshot.length,
      score: payload.score,
      totalMarks: payload.totalMarks
    });
    
    const response = await api.post('/api/tests/attempt', payload);
    
    console.log('saveTestAttempt - Success:', {
      attemptId: response.data?.attempt?.id,
      questionsStored: response.data?.attempt?.questions?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('saveTestAttempt - Error:', error.message);
    console.error('saveTestAttempt - Request payload:', {
      testId: attemptData.testId,
      questionsCount: attemptData.questions?.length || 0
    });
    throw error;
  }
};

/**
 * Get test leaderboard
 * @param {string} testId - Test ID
 * @param {number} limit - Number of top scorers
 * @returns {Promise} API response with leaderboard
 */
export const getLeaderboard = async (testId, limit = 10) => {
  try {
    const response = await api.get(`/api/tests/leaderboard/${testId}?limit=${limit}`);
    console.log('getLeaderboard - Response:', {
      testId,
      leaderboardCount: response.data?.leaderboard?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error('getLeaderboard - Error:', error.message);
    throw error;
  }
};

export default {
  getAttempt,
  getLastAttempt,
  getLastAttempts,
  getHistory,
  saveTestAttempt,
  getLeaderboard
};
