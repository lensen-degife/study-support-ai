const db = require("../config/db");
const {
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  generateToken,
  sanitizeUser,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} = require("../services/authService");
const { setAuthCookie, clearAuthCookie } = require("../middleware/authMiddleware");

/**
 * POST /auth/register or /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, name, role = "student" } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate account
    const existingUser = await db.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered. Please sign in." });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Persist new user
    const newUser = await db.createUser({
      email: normalizedEmail,
      hashedPassword,
      name: name.trim(),
      role: ["student", "tutor", "admin"].includes(role) ? role : "student",
    });

    const token = generateToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Registration successful.",
      user: sanitizeUser(newUser),
      token,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email is already registered. Please sign in." });
    }
    next(error);
  }
}

/**
 * POST /auth/login or /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const clientIp = req.ip || req.connection?.remoteAddress || "local";
    const rateLimitKey = `${clientIp}_${(email || "").trim().toLowerCase()}`;

    // Brute-force deterrence rate limiting
    const rateStatus = checkRateLimit(rateLimitKey);
    if (!rateStatus.allowed) {
      return res.status(429).json({
        error: rateStatus.message,
        retryAfterSec: rateStatus.retryAfterSec,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.findUserByEmail(normalizedEmail);

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await comparePassword(password, user.hashed_password);
    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Reset rate limiter on successful auth
    recordSuccessfulAttempt(rateLimitKey);

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Login successful.",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/logout or /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /auth/me or /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Not authenticated.",
        code: "UNAUTHORIZED",
      });
    }

    // Refresh user state from database to get up-to-date attributes
    const dbUser = await db.findUserById(req.user.id);
    const user = dbUser ? sanitizeUser(dbUser) : sanitizeUser(req.user);

    return res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
