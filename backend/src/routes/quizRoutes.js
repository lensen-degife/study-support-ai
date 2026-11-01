const express = require("express");
const router = express.Router();
const { logQuizEvent, getQuizViolations } = require("../controllers/quizIntegrityController");

// Quiz telemetry and violation logging endpoints
router.post("/:attemptId/log-event", logQuizEvent);
router.get("/:attemptId/violations", getQuizViolations);

module.exports = router;
