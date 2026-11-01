const db = require("../config/db");

const VALID_EVENT_TYPES = [
  "TAB_SWITCH",
  "FULLSCREEN_EXIT",
  "CLIPBOARD_ATTEMPT",
  "DEVTOOLS_KEYPRESS",
];

/**
 * POST /api/quizzes/:attemptId/log-event
 * Logs an integrity violation event during a quiz session.
 */
async function logQuizEvent(req, res, next) {
  try {
    const { attemptId } = req.params;
    const {
      eventType,
      timestamp = new Date().toISOString(),
      timeSpentAwaySeconds = 0,
      details = "",
      studentId,
    } = req.body || {};

    if (!attemptId || typeof attemptId !== "string" || !attemptId.trim()) {
      return res.status(400).json({ error: "attemptId parameter is required." });
    }

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        error: `Invalid eventType. Allowed types: ${VALID_EVENT_TYPES.join(", ")}`,
      });
    }

    const assignedStudentId = req.user?.id || studentId || "anonymous";

    const violation = await db.insertQuizViolation({
      attempt_id: attemptId.trim(),
      student_id: assignedStudentId,
      event_type: eventType,
      timestamp,
      time_spent_away_seconds: parseInt(timeSpentAwaySeconds, 10) || 0,
      details: details || `Infraction logged: ${eventType}`,
    });

    // Fetch updated totals for real-time client feedback
    const allViolations = await db.getViolationsByAttempt(attemptId.trim());
    const integrity = db.calculateIntegrityScore(allViolations);

    return res.status(201).json({
      message: "Quiz event logged successfully.",
      violation,
      totalViolations: allViolations.length,
      integrityScore: integrity.score,
      rating: integrity.rating,
      summary: integrity.summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/quizzes/:attemptId/violations
 * Retrieves all violations and calculated integrity score for a quiz attempt.
 */
async function getQuizViolations(req, res, next) {
  try {
    const { attemptId } = req.params;

    if (!attemptId || !attemptId.trim()) {
      return res.status(400).json({ error: "attemptId is required." });
    }

    const violations = await db.getViolationsByAttempt(attemptId.trim());
    const integrity = db.calculateIntegrityScore(violations);

    return res.status(200).json({
      attemptId: attemptId.trim(),
      integrityScore: integrity.score,
      rating: integrity.rating,
      summary: integrity.summary,
      metrics: integrity.metrics,
      violations: integrity.violations,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  logQuizEvent,
  getQuizViolations,
};
