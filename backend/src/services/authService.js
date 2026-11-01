const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "study-support-jwt-secret-key-super-secure-dev-2026";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "study_auth_token";
const TOKEN_EXPIRY = "7d";
const BCRYPT_ROUNDS = 12;

// In-memory sliding window rate limiter for login attempts
// Map of IP/identifier -> { count, firstAttemptTime, blockedUntil }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_MS = 15 * 60 * 1000; // 15 minutes lockout

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSec = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      blocked: true,
      retryAfterSec,
      message: `Too many failed login attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`
    };
  }

  // Reset window if expired
  if (now - record.firstAttemptTime > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - record.count) };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record || (now - record.firstAttemptTime > WINDOW_MS)) {
    record = { count: 1, firstAttemptTime: now, blockedUntil: 0 };
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_MS;
    }
  }

  loginAttempts.set(key, record);
}

function recordSuccessfulAttempt(key) {
  loginAttempts.delete(key);
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  // RFC 5322 compatible regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim()) && email.length <= 255;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }

  if (password.length > 128) {
    return { valid: false, message: "Password must not exceed 128 characters." };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasLower || !hasUpper || !hasDigitOrSpecial) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number or special character."
    };
  }

  return { valid: true };
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
  };
}

module.exports = {
  JWT_SECRET,
  AUTH_COOKIE_NAME,
  validateEmail,
  validatePassword,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  sanitizeUser,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
};
