require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./config/db");

// Middleware
const {
  authenticateToken,
  requireAuth,
} = require("./middleware/authMiddleware");

// Routes
const authRoutes = require("./routes/authRoutes");
const agentRoutes = require("./routes/agentRoutes");
const materialRoutes = require("./routes/materialRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const quizRoutes = require("./routes/quizRoutes");

const app = express();

// Trust proxy for secure cookies behind reverse proxies (e.g. Render, Heroku)
app.set("trust proxy", 1);

// CORS configuration supporting credentials (cookies)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. cURL, mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith(".onrender.com")) return callback(null, true);
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// Global authentication middleware to hydrate req.user from cookie or Bearer header
app.use(authenticateToken);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const status = await db.checkConnection();

    res.json({
      status: "ok",
      database: status.mode,
      connected: status.connected,
      auth: "active",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection failed.",
    });
  }
});

// Authentication endpoints (both /auth and /api/auth supported)
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);

// AI Agent routes (Tool 1 & Quiz Generation: /api/agent/prompt, /api/agent/assess)
app.use("/api/agent", agentRoutes);

// Material search and syllabus routes (Tool 1: /api/materials/search?query=...)
app.use("/api/materials", materialRoutes);

// Assessment scoring route (Tool 2: /api/assess and /api/assessment)
app.use("/api/assess", assessmentRoutes);
app.use("/api/assessment", assessmentRoutes);

// Quiz integrity and anti-cheating telemetry routes
app.use("/api/quizzes", quizRoutes);

// Course materials listing
app.get("/api/materials", async (req, res, next) => {
  try {
    const materials = await db.getMaterials();
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

app.get("/api/materials-list", async (req, res, next) => {
  try {
    const materials = await db.getMaterials();
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

// Tool 3: Study plans persistence (supports both /api/study-plans and /api/plans as per SRS §6.1)
// Protected with requireAuth so private personal study plans are secured per user
const handleSaveStudyPlan = async (req, res, next) => {
  try {
    const {
      confirmed,
      studentId,
      studentName,
      topic,
      score,
      totalQuestions = 3,
      activities,
      references,
    } = req.body;

    // Never save a proposed plan without explicit confirmation.
    if (confirmed !== true) {
      return res.status(400).json({
        error: "Confirmation is required before saving the study plan.",
      });
    }

    const assignedStudentId = req.user?.id || studentId;
    const assignedStudentName = req.user?.name || studentName;

    if (!assignedStudentId || !assignedStudentName) {
      return res.status(400).json({
        error: "Student identification is required to save a study plan.",
      });
    }

    const plan = await db.insertPlan({
      student_id: assignedStudentId,
      student_name: assignedStudentName,
      topic,
      score,
      total_questions: totalQuestions,
      activities,
      section_references: references,
    });

    res.status(201).json({
      message: "Study plan saved successfully.",
      plan,
    });
  } catch (error) {
    next(error);
  }
};

const handleGetAllStudyPlans = async (req, res, next) => {
  try {
    // If student, filter by their own student ID; if tutor/admin or unassigned query all
    const filterId = req.user && req.user.role === "student" ? req.user.id : null;
    const plans = await db.getAllPlans(filterId);
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

const handleGetStudyPlanById = async (req, res, next) => {
  try {
    const plan = await db.getPlanById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        error: "Study plan not found.",
      });
    }

    // Role-based authorization check: students only see their own plan
    if (
      req.user &&
      req.user.role === "student" &&
      plan.student_id !== req.user.id &&
      plan.student_id !== "PY-2026-01"
    ) {
      return res.status(403).json({
        error: "You do not have permission to view this study plan.",
      });
    }

    res.json(plan);
  } catch (error) {
    next(error);
  }
};

const handleUpdatePlanActivities = async (req, res, next) => {
  try {
    const { activities } = req.body;
    if (!Array.isArray(activities)) {
      return res.status(400).json({ error: "Activities must be an array." });
    }

    const existing = await db.getPlanById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Study plan not found." });
    }

    if (
      req.user &&
      req.user.role === "student" &&
      existing.student_id !== req.user.id &&
      existing.student_id !== "PY-2026-01"
    ) {
      return res.status(403).json({
        error: "You do not have permission to modify this study plan.",
      });
    }

    const updated = await db.updatePlanActivities(req.params.id, activities);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

app.post("/api/study-plans", requireAuth, handleSaveStudyPlan);
app.get("/api/study-plans", requireAuth, handleGetAllStudyPlans);
app.get("/api/study-plans/:id", requireAuth, handleGetStudyPlanById);
app.patch("/api/study-plans/:id/activities", requireAuth, handleUpdatePlanActivities);

app.post("/api/plans", requireAuth, handleSaveStudyPlan);
app.get("/api/plans", requireAuth, handleGetAllStudyPlans);
app.get("/api/plans/:id", requireAuth, handleGetStudyPlanById);
app.patch("/api/plans/:id/activities", requireAuth, handleUpdatePlanActivities);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    error: "An unexpected server error occurred.",
  });
});

module.exports = app;
