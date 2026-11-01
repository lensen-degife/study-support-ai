const net = require("net");
if (net.setDefaultAutoSelectFamily) {
  net.setDefaultAutoSelectFamily(false);
}

const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.warn("Unexpected pool client warning:", err.message);
  });
}

// In-memory fallback for local testing without Neon.
// Data here is temporary and disappears when the server restarts.
const memoryPlans = new Map();
const memoryUsers = new Map();
const memoryViolations = [];

// Default seed password hash: "Password123!"
const DEFAULT_HASH = "$2b$10$DR3Z5/jiUo666wNlyXGTDeugb9DPqaO2.YSbxib009fX6pEm/BORC";

// Initialize seeded in-memory users for offline testing
memoryUsers.set("jordan.lee@university.edu", {
  id: "00000000-0000-0000-0000-000000000001",
  email: "jordan.lee@university.edu",
  hashed_password: DEFAULT_HASH,
  name: "Jordan Lee",
  role: "student",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
memoryUsers.set("alex.kim@university.edu", {
  id: "00000000-0000-0000-0000-000000000002",
  email: "alex.kim@university.edu",
  hashed_password: DEFAULT_HASH,
  name: "Alex Kim",
  role: "student",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
memoryUsers.set("tutor@university.edu", {
  id: "00000000-0000-0000-0000-000000000003",
  email: "tutor@university.edu",
  hashed_password: DEFAULT_HASH,
  name: "Dr. Turing",
  role: "tutor",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});
memoryUsers.set("admin@university.edu", {
  id: "00000000-0000-0000-0000-000000000004",
  email: "admin@university.edu",
  hashed_password: DEFAULT_HASH,
  name: "Admin User",
  role: "admin",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

async function query(text, params = []) {
  if (!pool) {
    throw new Error("Remote database is not configured.");
  }

  return pool.query(text, params);
}

// User operations
async function createUser({ email, hashedPassword, name, role = "student" }) {
  const normalizedEmail = email.trim().toLowerCase();
  const validRole = ["student", "tutor", "admin"].includes(role) ? role : "student";

  if (!pool) {
    if (memoryUsers.has(normalizedEmail)) {
      const err = new Error("Email already registered");
      err.code = "23505";
      throw err;
    }
    const id = require("crypto").randomUUID();
    const now = new Date().toISOString();
    const newUser = {
      id,
      email: normalizedEmail,
      hashed_password: hashedPassword,
      name: name.trim(),
      role: validRole,
      created_at: now,
      updated_at: now,
    };
    memoryUsers.set(normalizedEmail, newUser);
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    };
  }

  const result = await query(
    `INSERT INTO users (email, hashed_password, name, role)
     VALUES (LOWER($1), $2, $3, $4)
     RETURNING id, email, name, role, created_at, updated_at`,
    [normalizedEmail, hashedPassword, name.trim(), validRole]
  );

  const created = result.rows[0];

  // Also ensure student record exists for foreign key references in study_plans
  await query(
    `INSERT INTO students (id, name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [created.id, created.name, created.email]
  ).catch(() => {});

  return created;
}

async function findUserByEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();

  if (!pool) {
    return memoryUsers.get(normalizedEmail) || null;
  }

  try {
    const result = await query(
      `SELECT id, email, hashed_password, name, role, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [normalizedEmail]
    );
    return result.rows[0] || memoryUsers.get(normalizedEmail) || null;
  } catch (err) {
    console.warn("Query failed in findUserByEmail, falling back to memory:", err.message);
    return memoryUsers.get(normalizedEmail) || null;
  }
}

async function findUserById(id) {
  if (!id) return null;

  if (!pool) {
    for (const u of memoryUsers.values()) {
      if (u.id === id) {
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: u.created_at,
          updated_at: u.updated_at,
        };
      }
    }
    return null;
  }

  try {
    const result = await query(
      `SELECT id, email, name, role, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.warn("Query failed in findUserById, falling back to memory:", err.message);
    for (const u of memoryUsers.values()) {
      if (u.id === id) {
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: u.created_at,
          updated_at: u.updated_at,
        };
      }
    }
    return null;
  }
}

async function getMaterials() {
  if (!pool) {
    return [
      {
        id: "SEC_PY_01",
        section_number: 1,
        title: "Python Lists & Mutability",
        content: "Lists are ordered, mutable collections.",
      },
      {
        id: "SEC_PY_02",
        section_number: 2,
        title: "Python Tuples & Immutability",
        content: "Tuples are ordered, immutable collections.",
      },
      {
        id: "SEC_PY_03",
        section_number: 3,
        title: "Python Dictionaries",
        content: "Dictionaries store key-value pairs.",
      },
    ];
  }

  const result = await query(
    `SELECT id, section_number, title, content, image_url
     FROM materials
     ORDER BY section_number`
  );

  return result.rows;
}

async function insertPlan(planData) {
  const {
    student_id,
    student_name,
    topic,
    score,
    total_questions = 3,
    activities,
    section_references,
  } = planData;

  if (!student_id || !student_name || !topic) {
    throw new Error("Student ID, name, and topic are required.");
  }

  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total_questions) ||
    total_questions < 1 ||
    score < 0 ||
    score > total_questions
  ) {
    throw new Error("Invalid assessment score.");
  }

  if (!Array.isArray(activities) || !Array.isArray(section_references)) {
    throw new Error("Activities and section references must be arrays.");
  }

  if (!pool) {
    const id = require("crypto").randomUUID();

    const plan = {
      id,
      ...planData,
      total_questions,
      created_at: new Date().toISOString(),
    };

    memoryPlans.set(id, plan);
    return plan;
  }

  // Ensure student exists in students table to satisfy foreign key constraint
  await query(
    `INSERT INTO students (id, name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [student_id, student_name]
  ).catch(() => {});

  const result = await query(
    `INSERT INTO study_plans
       (student_id, student_name, topic, score, total_questions,
        activities, section_references)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     RETURNING *`,
    [
      student_id,
      student_name,
      topic,
      score,
      total_questions,
      JSON.stringify(activities),
      JSON.stringify(section_references),
    ]
  );

  return result.rows[0];
}

async function getPlanById(id) {
  if (!pool) {
    return memoryPlans.get(id) || null;
  }

  try {
    const result = await query(
      "SELECT * FROM study_plans WHERE id = $1",
      [id]
    );
    return result.rows[0] || memoryPlans.get(id) || null;
  } catch (err) {
    console.warn("Neon query failed in getPlanById, falling back to memory:", err.message);
    return memoryPlans.get(id) || null;
  }
}

async function getAllPlans(studentId = null) {
  if (!pool) {
    let plans = Array.from(memoryPlans.values());
    if (studentId) {
      plans = plans.filter((p) => p.student_id === studentId);
    }
    return plans.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  try {
    let result;
    if (studentId) {
      result = await query(
        "SELECT * FROM study_plans WHERE student_id = $1 ORDER BY created_at DESC LIMIT 50",
        [studentId]
      );
    } else {
      result = await query(
        "SELECT * FROM study_plans ORDER BY created_at DESC LIMIT 50"
      );
    }
    return result.rows;
  } catch (err) {
    console.warn("Neon query failed in getAllPlans, falling back to memory:", err.message);
    let plans = Array.from(memoryPlans.values());
    if (studentId) {
      plans = plans.filter((p) => p.student_id === studentId);
    }
    return plans.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }
}

async function checkConnection() {
  if (!pool) {
    console.log("Database is not configured.");
    return { connected: false, mode: "memory" };
  }

  try {
    await query("SELECT 1");

    console.log("Database connected successfully!");

    return { connected: true, mode: "neon" };
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

async function updatePlanActivities(id, activities) {
  if (!pool) {
    const plan = memoryPlans.get(id);
    if (!plan) return null;
    plan.activities = activities;
    return plan;
  }

  const result = await query(
    `UPDATE study_plans
     SET activities = $1::jsonb
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(activities), id]
  );

  return result.rows[0] || null;
}

async function insertQuizViolation({
  attempt_id,
  student_id = null,
  event_type,
  timestamp = new Date().toISOString(),
  time_spent_away_seconds = 0,
  details = "",
}) {
  if (!attempt_id || !event_type) {
    throw new Error("attempt_id and event_type are required.");
  }

  const record = {
    id: require("crypto").randomUUID(),
    attempt_id,
    student_id,
    event_type,
    timestamp: new Date(timestamp).toISOString(),
    time_spent_away_seconds: parseInt(time_spent_away_seconds, 10) || 0,
    details: details || "",
    created_at: new Date().toISOString(),
  };

  if (!pool) {
    memoryViolations.push(record);
    return record;
  }

  try {
    const result = await query(
      `INSERT INTO quiz_violations
         (attempt_id, student_id, event_type, timestamp, time_spent_away_seconds, details)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        record.attempt_id,
        record.student_id,
        record.event_type,
        record.timestamp,
        record.time_spent_away_seconds,
        record.details,
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.warn("Postgres insertQuizViolation failed, falling back to memory:", err.message);
    memoryViolations.push(record);
    return record;
  }
}

async function getViolationsByAttempt(attempt_id) {
  if (!attempt_id) return [];

  if (!pool) {
    return memoryViolations.filter((v) => v.attempt_id === attempt_id);
  }

  try {
    const result = await query(
      `SELECT * FROM quiz_violations
       WHERE attempt_id = $1
       ORDER BY timestamp ASC`,
      [attempt_id]
    );
    return result.rows;
  } catch (err) {
    console.warn("Postgres getViolationsByAttempt failed, falling back to memory:", err.message);
    return memoryViolations.filter((v) => v.attempt_id === attempt_id);
  }
}

function calculateIntegrityScore(violations = []) {
  let score = 100;
  let tabSwitches = 0;
  let totalTimeAwaySeconds = 0;
  let fullscreenExits = 0;
  let clipboardAttempts = 0;
  let devtoolsAttempts = 0;

  for (const v of violations) {
    switch (v.event_type) {
      case "TAB_SWITCH":
        tabSwitches += 1;
        totalTimeAwaySeconds += (v.time_spent_away_seconds || 0);
        score -= 15 + Math.min(20, Math.floor((v.time_spent_away_seconds || 0) / 2));
        break;
      case "FULLSCREEN_EXIT":
        fullscreenExits += 1;
        score -= 20;
        break;
      case "CLIPBOARD_ATTEMPT":
        clipboardAttempts += 1;
        score -= 10;
        break;
      case "DEVTOOLS_KEYPRESS":
        devtoolsAttempts += 1;
        score -= 25;
        break;
      default:
        score -= 5;
    }
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let rating = "High Integrity";
  if (finalScore < 60) {
    rating = "High Suspicion";
  } else if (finalScore < 85) {
    rating = "Moderate Risk";
  }

  const summaryParts = [];
  if (tabSwitches > 0) {
    summaryParts.push(
      `Left quiz window ${tabSwitches} time${tabSwitches > 1 ? "s" : ""} for a total of ${totalTimeAwaySeconds}s`
    );
  }
  if (fullscreenExits > 0) {
    summaryParts.push(
      `Exited fullscreen ${fullscreenExits} time${fullscreenExits > 1 ? "s" : ""}`
    );
  }
  if (clipboardAttempts > 0) {
    summaryParts.push(
      `${clipboardAttempts} unauthorized clipboard attempt${clipboardAttempts > 1 ? "s" : ""}`
    );
  }
  if (devtoolsAttempts > 0) {
    summaryParts.push(
      `${devtoolsAttempts} developer tools / bypass shortcut attempt${devtoolsAttempts > 1 ? "s" : ""}`
    );
  }

  const summary = summaryParts.length > 0
    ? summaryParts.join(". ") + "."
    : "Clean session. Zero integrity infractions detected.";

  return {
    score: finalScore,
    rating,
    summary,
    metrics: {
      totalViolations: violations.length,
      tabSwitches,
      totalTimeAwaySeconds,
      fullscreenExits,
      clipboardAttempts,
      devtoolsAttempts,
    },
    violations,
  };
}

async function closePool() {
  if (pool) {
    await pool.end();
  }
}

module.exports = {
  query,
  createUser,
  findUserByEmail,
  findUserById,
  getMaterials,
  insertPlan,
  getPlanById,
  getAllPlans,
  updatePlanActivities,
  insertQuizViolation,
  getViolationsByAttempt,
  calculateIntegrityScore,
  checkConnection,
  closePool,
};
