const { AUTH_COOKIE_NAME, verifyToken } = require("../services/authService");

/**
 * Cookie options for HttpOnly auth cookies
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
}

/**
 * Attach auth cookie to outgoing response
 */
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
}

/**
 * Clear auth cookie from outgoing response
 */
function clearAuthCookie(res) {
  const options = {
    ...getCookieOptions(),
    maxAge: 0,
  };
  res.clearCookie(AUTH_COOKIE_NAME, options);
}

/**
 * Extracts and verifies JWT from Cookie or Authorization header.
 * Attaches user payload to req.user if valid.
 */
function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check HttpOnly cookie first
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }
  // 2. Check Authorization Bearer header as fallback
  else if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
    }
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

/**
 * Requires an authenticated user session.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required to access this resource.",
      code: "UNAUTHORIZED",
    });
  }
  next();
}

/**
 * Requires specific user roles (e.g. 'admin', 'tutor').
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to perform this action.",
        code: "FORBIDDEN",
      });
    }

    next();
  };
}

module.exports = {
  getCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  authenticateToken,
  requireAuth,
  requireRole,
};
