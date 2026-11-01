const { checkAssessment } = require('../tools/checkAssessment');
const db = require('../config/db');

/**
 * Controller to process assessment evaluation submissions.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const processAssessment = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Request body is required.'
      });
    }

    const { quizId, topic, studentAnswers, questions, attemptId } = req.body;

    // Validation: return 400 error if inputs are missing or invalid
    if (
      quizId === undefined ||
      quizId === null ||
      quizId === '' ||
      !topic ||
      (typeof topic === 'string' && !topic.trim()) ||
      studentAnswers === undefined ||
      studentAnswers === null ||
      typeof studentAnswers !== 'object' ||
      Array.isArray(studentAnswers) ||
      !questions ||
      !Array.isArray(questions)
    ) {
      return res.status(400).json({
        error: 'Missing required inputs: quizId, topic, studentAnswers, and questions are required.'
      });
    }

    // Pass data into the deterministic checkAssessment tool
    const toolOutput = checkAssessment(studentAnswers, questions);

    // Compute integrity score from tracked attempt violations
    const activeAttemptId = attemptId || quizId;
    const violations = await db.getViolationsByAttempt(activeAttemptId);
    const integrity = db.calculateIntegrityScore(violations);

    // Return 200 JSON response merging tool's exact output with the request IDs and integrity report
    return res.status(200).json({
      quizId,
      attemptId: activeAttemptId,
      topic,
      activities: toolOutput.proposedActivities,
      integrity,
      ...toolOutput
    });
  } catch (error) {
    return res.status(500).json({
      error: 'An internal error occurred while processing the assessment.',
      details: error.message
    });
  }
};

module.exports = {
  processAssessment
};
