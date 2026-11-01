# CS101 Python AI Study Support Agent

An autonomous, syllabus-grounded academic tutor and study planner for **CS101 Introduction to Python Programming**. Built with **Node.js/Express**, **React 18 / Vite / Tailwind CSS v4**, **Google Gemini 2.5 Flash**, and **PostgreSQL (Neon)**.

[![Live Application](https://img.shields.io/badge/Live%20Frontend-Vercel-black?style=flat&logo=vercel)](https://study-support-ai-ivory.vercel.app/)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-46E3B7?style=flat&logo=render)](https://study-support-ai.onrender.com)
[![API Health](https://img.shields.io/badge/API%20Health-200%20OK-brightgreen)](https://study-support-ai.onrender.com/health)
[![Test Suite](https://img.shields.io/badge/Automated%20Tests-42%2F42%20Passing-success)](file:///home/lensen/currentai/study-support-ai/study-support-ai/TEST_REPORT.md)

---

## 🌐 Live Deployments

* **Live Frontend Web Application**: [https://study-support-ai-ivory.vercel.app/](https://study-support-ai-ivory.vercel.app/)
* **Live Backend API**: [https://study-support-ai.onrender.com](https://study-support-ai.onrender.com)
* **Backend Health Check**: [https://study-support-ai.onrender.com/health](https://study-support-ai.onrender.com/health)

> [!NOTE]
> The backend operates on Render free tier. If the instance is cold, the initial wake-up request may take ~30–50 seconds. The frontend features automated retry and connectivity status banners.

---

## 🌟 Key Features

1. **Autonomous Bounded Agent Loop**
   * Powered by Google Gemini 2.5 Flash (AI Studio free tier).
   * Enforces a deterministic hard limit of **maximum 3 tool invocations** per prompt to eliminate runaway loops (NFR-4).
   * Offline/Quota fallback ensures continuous operation even if external LLM APIs experience rate limiting.

2. **Syllabus Grounding & Guardrails (Tool 1: `search_material`)**
   * Grounded strictly in CS101 Python modules:
     * `SEC-PY-101`: Variables, Dynamic Typing & Built-in Data Structures (Lists, Tuples, Dictionaries, Sets).
     * `SEC-PY-102`: Control Flow, Conditionals & Loops (`for`, `while`, `break`, `continue`).
     * `SEC-PY-103`: Functions, Variable Scope (`global`/`nonlocal`), and Modular Code Design.
   * **Ambiguity Handling**: Broad queries (e.g., *"Python"*, *"Coding"*) halt generation and return clarifying syllabus topic chips.
   * **Scope Guardrail**: Out-of-scope topics (e.g., *"SQL"*, *"React"*) return polite rejection guidance without LLM token waste.

3. **Anti-AI Exam Lockdown & Integrity Audit (Tool 2: `check_assessment`)**
   * Generates 3 diagnostic multiple-choice questions with code snippets, explanations, and module section citations.
   * **Lockdown Shield**: Disables text selection and right-click copying (`.quiz-lockdown-shield`).
   * **Real-time Telemetry & Anti-Cheating**:
     * Tracks tab switches (`TAB_SWITCH`), fullscreen exits (`FULLSCREEN_EXIT`), clipboard copy attempts (`CLIPBOARD_ATTEMPT`), and developer tools shortcuts (`DEVTOOLS_KEYPRESS`).
     * Automatically locks assessment if violations exceed allowed thresholds (default: 4 infractions).
     * Calculates an **Integrity Score (0–100%)** and appends an audit report to assessment results.

4. **Study Plan Formulation & Confirmation Guard (Tool 3: `save_study_plan`)**
   * Formulates personalized remedial (score < 3) or mastery/enrichment (score = 3) study plans.
   * **Explicit Confirmation Guard**: Requires explicit user confirmation via an interactive modal before committing to the database. Unconfirmed requests are blocked with HTTP 400.
   * **Interactive Activity Tracker**: Check off study activities directly from the dashboard, updating progress percentages in real time.

5. **Enterprise-Grade Authentication & RBAC**
   * Secure JWT sessions stored in HttpOnly, SameSite cookies (`study_auth_token`) + Bearer token support.
   * Password hashing with `bcryptjs` and email validation.
   * Dual-role RBAC: `student` (access and update own plans) and `tutor` (cross-student plan monitoring).
   * Brute-force rate limiting deterrence (HTTP 429 Too Many Requests).
   * Quick-login demo accounts for students and tutors.

6. **Dedicated Multi-Tab Workflow UI**
   * **Agent Tab**: End-to-end interactive AI study session with live tool execution inspector.
   * **Materials Tab**: Searchable course syllabus with module detail drawer and quick quiz triggers.
   * **Quizzes Tab**: Dedicated assessment launcher with attempt history and integrity scores.
   * **Dashboard Tab**: Study plan registry, progress charts, activity checklists, and plan reopener.

---

## 🏛️ System Architecture & Secrets Isolation

All sensitive credentials (`GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`) are isolated on the Render backend environment variables. The Vite client bundle is strictly static and communicates with the backend solely via HTTPS JSON APIs with credentialed cookies.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Browser (React 18)                       │
│  ├── Multi-Tab Navigation (Agent, Materials, Quizzes, Dashboard)       │
│  ├── Quiz Lockdown Guard & Telemetry Listener                          │
│  ├── Confirmation Modal & Interactive Activity Checklist               │
│  └── Live Tool Execution Inspector                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + HttpOnly JWT Cookie
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Express 5 API Server                          │
│  ├── /auth & /api/auth    (JWT Registration, Login, Logout, Rate Limit)│
│  ├── /api/agent           (Bounded Gemini Agent Loop: Max 3 Tool Calls)│
│  ├── /api/materials       (Syllabus Search & Topic Catalog)            │
│  ├── /api/assess          (Deterministic Assessment & Integrity Audit) │
│  ├── /api/quizzes         (Anti-AI Violation Telemetry & Lockdown)     │
│  └── /api/study-plans     (Confirmation Guard, CRUD & Checklist State) │
└───────┬───────────────────────────┬────────────────────────────┬───────┘
        │                           │                            │
        ▼                           ▼                            ▼
 ┌──────────────┐            ┌──────────────┐             ┌──────────────┐
 │ Tool 1:      │            │ Google       │             │ Tool 3:      │
 │ search_      │            │ Gemini API   │             │ save_        │
 │ material     │            │ (AI Studio   │             │ study_plan   │
 │ (Local JSON) │            │  Free Tier)  │             │ (Remote DB)  │
 └──────────────┘            └──────────────┘             └──────┬───────┘
                                                                 │
                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │      Remote PostgreSQL       │
                                                  │    (Neon Serverless DB)      │
                                                  │  [In-Memory Mock Fallback]   │
                                                  └──────────────────────────────┘
```

---

## 📁 Repository Structure

```text
study-support-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # PostgreSQL Pool + In-Memory Fallback Store
│   │   ├── controllers/
│   │   │   ├── assessmentController.js   # Assessment scoring & integrity audit controller
│   │   │   ├── authController.js         # JWT auth, cookie issuance, rate limiting
│   │   │   ├── materialController.js     # Syllabus search controller
│   │   │   └── quizIntegrityController.js # Anti-cheating telemetry violation controller
│   │   ├── data/
│   │   │   └── demoMaterials.js      # CS101 Python syllabus data & grounded MCQs
│   │   ├── middleware/
│   │   │   └── authMiddleware.js     # JWT cookie/bearer validation & RBAC enforcement
│   │   ├── routes/
│   │   │   ├── agentRoutes.js        # AI agent prompt execution route
│   │   │   ├── assessmentRoutes.js   # Assessment scoring routes
│   │   │   ├── authRoutes.js         # Authentication routes
│   │   │   ├── materialRoutes.js     # Course material search routes
│   │   │   └── quizRoutes.js         # Integrity telemetry logging routes
│   │   ├── services/
│   │   │   ├── aiService.js          # Gemini API client with bounded loop & fallbacks
│   │   │   └── authService.js        # User hashing, tokens, and credentials validation
│   │   ├── tools/
│   │   │   ├── checkAssessment.js    # Deterministic Tool 2 logic
│   │   │   └── searchMaterial.js     # Syllabus search Tool 1 logic
│   │   ├── app.js                    # Express application configuration & routes
│   │   └── server.js                 # HTTP server listener
│   ├── scripts/
│   │   ├── run_test_suite.js         # Live Neon DB benchmark test suite runner
│   │   ├── test_auth.js              # Comprehensive authentication & RBAC unit tests
│   │   └── test_quiz_integrity.js    # Quiz lockdown & integrity telemetry unit tests
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx         # Sign in / Sign up modal with demo accounts
│   │   │   ├── ProtectedRoute.jsx    # Client-side route and action protection
│   │   │   └── QuizLockdownGuard.jsx # Anti-AI fullscreen & tab lockdown component
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global authentication & user session state
│   │   ├── hooks/
│   │   │   └── useQuizIntegrity.js   # Hook capturing tab switch, blur, devtools events
│   │   ├── services/
│   │   │   └── api.js                # Frontend API client with credentials support
│   │   ├── App.jsx                   # Main single-page application with tabs & cards
│   │   ├── index.css                 # Tailwind CSS v4 styles & responsive hygiene
│   │   └── main.jsx                  # React entry point
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── vercel.json                   # Vercel SPA routing rewrite configuration
│   └── vite.config.js
├── database/
│   ├── schema.sql                    # PostgreSQL table definitions
│   ├── seed.sql                      # Initial course syllabus seed data
│   └── migrate.js                    # Database migration execution script
├── .env.example                      # Root configuration template
├── .gitignore                        # Global Git ignore rules
├── CONTRIBUTION.md                   # Contribution guidelines and role descriptions
├── DESIGN_NOTE.md                    # Architectural design decisions and rationale
├── README.md                         # Main repository guide (this file)
├── render.yaml                       # Render blueprint deployment specification
├── SERVICE_REGISTER.md               # Service register & endpoint catalogue
├── SRS.md                            # Software Requirements Specification
├── SUBMISSION_DOCUMENTATION.md       # Consolidated hackathon submission package
└── TEST_REPORT.md                    # Comprehensive test verification report
```

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* (Optional) **PostgreSQL** or free **Neon** account. If omitted, the server automatically defaults to its built-in in-memory mock store.

### 2. Clone the Repository
```bash
git clone https://github.com/lensen-degife/study-support-ai.git
cd study-support-ai
```

### 3. Backend Setup
```bash
cd backend
npm install

# Create environment configuration
cp .env.example .env
```

Configure your `.env` file:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=super_secret_development_jwt_key_at_least_32_characters_long
AUTH_COOKIE_NAME=study_auth_token

# Optional: Add Google Gemini API key (free tier from Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Add PostgreSQL connection string (Neon / Supabase / local)
DATABASE_URL=postgresql://user:pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Apply database migrations (if using PostgreSQL):
```bash
npm run migrate
```

Start the backend server:
```bash
npm run dev
# Backend starts on http://localhost:5000
```

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Create environment configuration
cp .env.example .env
```

Ensure `.env` points to your local backend:
```env
VITE_API_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm run dev
# Frontend starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing

The project includes unit and integration test suites covering authentication, role-based access control, brute-force rate limiting, and anti-AI quiz integrity telemetry.

### Running Backend Tests
```bash
cd backend
npm test
```

**Test Coverage Summary (42 Passing Tests):**
* **Auth & Security Suite** (`scripts/test_auth.js`): 28 tests passing.
  * Input validation (email format, password complexity).
  * Password hashing (`bcryptjs`) & sensitive field sanitization.
  * HttpOnly cookie issuance and Bearer token fallback.
  * Role permissions (`student` vs `tutor`).
  * Rate-limiting deterrence against brute-force login attempts (HTTP 429).
* **Quiz Integrity & Telemetry Suite** (`scripts/test_quiz_integrity.js`): 14 tests passing.
  * Violation event tracking (`TAB_SWITCH`, `FULLSCREEN_EXIT`, `CLIPBOARD_ATTEMPT`, `DEVTOOLS_KEYPRESS`).
  * Numerical score calculation (100% deduction scaling).
  * Automated lockdown triggering.
  * Assessment result integration with integrity audit reports.

---

## 🔌 API Reference

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | No | Service health check and database connectivity mode |
| `POST` | `/api/auth/register` | No | Register new student or tutor account |
| `POST` | `/api/auth/login` | No | Login and receive HttpOnly session cookie |
| `GET` | `/api/auth/me` | Yes | Retrieve authenticated user profile |
| `POST` | `/api/auth/logout` | Yes | Clear session cookie |
| `POST` | `/api/agent/prompt` | No | Execute bounded AI agent loop for topic input |
| `GET` | `/api/materials` | No | List all CS101 Python syllabus modules |
| `GET` | `/api/materials/search` | No | Query course syllabus (`?query=...`) |
| `POST` | `/api/assess` | No | Evaluate student answers and compute score |
| `POST` | `/api/quizzes/violations` | No | Log quiz anti-cheating telemetry violation |
| `GET` | `/api/quizzes/:attemptId/violations` | No | Retrieve violation audit report for attempt |
| `POST` | `/api/study-plans` | Yes | Save study plan (**requires `confirmed: true`**) |
| `GET` | `/api/study-plans` | Yes | List saved study plans (scoped to user) |
| `GET` | `/api/study-plans/:id` | Yes | Retrieve study plan by ID |
| `PATCH` | `/api/study-plans/:id/activities` | Yes | Update activity completion checklist |

---

## 👥 Demo Credentials

For quick evaluation of the application, pre-configured demo credentials are provided:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `student@cs101.edu` | `StudentPass123!` | Create quizzes, take assessments, manage personal study plans |
| **Tutor** | `tutor@cs101.edu` | `TutorPass123!` | View cross-student study plans, track student completion rates |

---

## 📚 Project Documentation

* [SRS.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/SRS.md) — Comprehensive Software Requirements Specification.
* [DESIGN_NOTE.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/DESIGN_NOTE.md) — Architecture decisions, design trade-offs, and security boundaries.
* [SUBMISSION_DOCUMENTATION.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/SUBMISSION_DOCUMENTATION.md) — Consolidated course/hackathon submission dossier.
* [TEST_REPORT.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/TEST_REPORT.md) — 5 benchmark test cases and verification results.
* [SERVICE_REGISTER.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/SERVICE_REGISTER.md) — Complete endpoint registry and dependencies.
* [CONTRIBUTION.md](file:///home/lensen/currentai/study-support-ai/study-support-ai/CONTRIBUTION.md) — Team contribution notes and development practices.

---

## 📄 License

This project is licensed under the [ISC License](file:///home/lensen/currentai/study-support-ai/study-support-ai/backend/package.json).
