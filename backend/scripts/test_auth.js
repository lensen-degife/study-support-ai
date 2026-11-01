const http = require("http");
const app = require("../src/app");

function makeRequest(server, { method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const payload = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      ...headers,
    };
    if (payload) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return "";
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(";")[0];
}

async function runTests() {
  console.log("=========================================");
  console.log("STARTING COMPREHENSIVE AUTH TEST SUITE");
  console.log("=========================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await makeRequest(server, { method: "GET", path: "/health" });
    assert(healthRes.status === 200, "GET /health returns 200", JSON.stringify(healthRes.body));

    // 2. Reject registration with invalid email
    const badEmailRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/register",
      body: { name: "Test User", email: "not-an-email", password: "Password123!" },
    });
    assert(badEmailRes.status === 400, "Registration rejects invalid email format");

    // 3. Reject registration with weak password (missing digit/special)
    const weakPassRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/register",
      body: { name: "Test User", email: "valid@university.edu", password: "passwordonly" },
    });
    assert(weakPassRes.status === 400, "Registration rejects weak password without complexity");

    // 4. Successful registration via /auth/register
    const regRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/register",
      body: {
        name: "Samantha Wright",
        email: "samantha.wright@university.edu",
        password: "Password123!",
        role: "student",
      },
    });
    assert(regRes.status === 201, "Registration succeeds with valid input");
    assert(regRes.body.user && regRes.body.user.email === "samantha.wright@university.edu", "Returns sanitized user");
    assert(!regRes.body.user.hashed_password && !regRes.body.user.hashedPassword, "Password hash is NOT exposed");
    const regCookie = extractCookie(regRes.headers);
    assert(regCookie.includes("study_auth_token"), "HttpOnly auth cookie is issued on registration");

    // 5. Successful registration via /api/auth/register alias
    const regAliasRes = await makeRequest(server, {
      method: "POST",
      path: "/api/auth/register",
      body: {
        name: "Marcus Vance",
        email: "marcus.vance@university.edu",
        password: "Password123!",
        role: "tutor",
      },
    });
    assert(regAliasRes.status === 201, "POST /api/auth/register alias succeeds");
    assert(regAliasRes.body.user.role === "tutor", "Supports tutor role assignment");

    // 6. Prevent duplicate registration
    const dupRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/register",
      body: {
        name: "Samantha Duplicate",
        email: "samantha.wright@university.edu",
        password: "Password123!",
      },
    });
    assert(dupRes.status === 409, "Registration blocks duplicate email with 409 Conflict");

    // 7. Login with incorrect password
    const badLoginRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/login",
      body: {
        email: "samantha.wright@university.edu",
        password: "WrongPassword999!",
      },
    });
    assert(badLoginRes.status === 401, "Login rejects invalid password with 401");

    // 8. Login with seeded test student account
    const loginRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/login",
      body: {
        email: "jordan.lee@university.edu",
        password: "Password123!",
      },
    });
    assert(loginRes.status === 200, "Login succeeds with valid seeded credentials");
    assert(loginRes.body.user.name === "Jordan Lee", "Login returns user profile");
    const authCookie = extractCookie(loginRes.headers);
    assert(authCookie.includes("study_auth_token"), "Login issues study_auth_token cookie");

    // 9. Login via /api/auth/login alias
    const loginAliasRes = await makeRequest(server, {
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: "tutor@university.edu",
        password: "Password123!",
      },
    });
    assert(loginAliasRes.status === 200, "POST /api/auth/login alias succeeds");
    const tutorCookie = extractCookie(loginAliasRes.headers);

    // 10. GET /auth/me without authentication
    const unauthMe = await makeRequest(server, { method: "GET", path: "/auth/me" });
    assert(unauthMe.status === 401, "GET /auth/me without cookie returns 401 Unauthorized");

    // 11. GET /auth/me with Cookie
    const authMe = await makeRequest(server, {
      method: "GET",
      path: "/auth/me",
      headers: { Cookie: authCookie },
    });
    assert(authMe.status === 200, "GET /auth/me with cookie returns 200");
    assert(authMe.body.user.email === "jordan.lee@university.edu", "Returns authenticated user data");

    // 12. GET /auth/me with Authorization Bearer header
    const authMeBearer = await makeRequest(server, {
      method: "GET",
      path: "/api/auth/me",
      headers: { Authorization: `Bearer ${loginRes.body.token}` },
    });
    assert(authMeBearer.status === 200, "GET /api/auth/me with Bearer token returns 200");

    // 13. Study plans route protection - unauthenticated
    const unauthPlans = await makeRequest(server, {
      method: "GET",
      path: "/api/study-plans",
    });
    assert(unauthPlans.status === 401, "GET /api/study-plans requires auth (returns 401)");

    // 14. Save study plan - authenticated student
    const savePlanRes = await makeRequest(server, {
      method: "POST",
      path: "/api/study-plans",
      headers: { Cookie: authCookie },
      body: {
        confirmed: true,
        topic: "Python Data Structures",
        score: 3,
        totalQuestions: 3,
        activities: [
          { id: "act-1", title: "Review mutability", type: "reading", completed: false },
        ],
        references: ["SEC-PY-101"],
      },
    });
    assert(savePlanRes.status === 201, "Authenticated user can save study plan");
    const createdPlanId = savePlanRes.body.plan?.id;

    // 15. Read study plans - authenticated student
    const authPlans = await makeRequest(server, {
      method: "GET",
      path: "/api/study-plans",
      headers: { Cookie: authCookie },
    });
    assert(authPlans.status === 200, "Authenticated user can list study plans");
    assert(Array.isArray(authPlans.body) && authPlans.body.length > 0, "Returns user study plans");

    // 16. Update study plan activities
    if (createdPlanId) {
      const updateRes = await makeRequest(server, {
        method: "PATCH",
        path: `/api/study-plans/${createdPlanId}/activities`,
        headers: { Cookie: authCookie },
        body: {
          activities: [
            { id: "act-1", title: "Review mutability", type: "reading", completed: true },
          ],
        },
      });
      assert(updateRes.status === 200, "Authenticated user can update activities");
    }

    // 17. Tutor role access to study plans
    const tutorPlans = await makeRequest(server, {
      method: "GET",
      path: "/api/study-plans",
      headers: { Cookie: tutorCookie },
    });
    assert(tutorPlans.status === 200, "Tutor role can access study plans");

    // 18. Logout endpoint
    const logoutRes = await makeRequest(server, {
      method: "POST",
      path: "/auth/logout",
      headers: { Cookie: authCookie },
    });
    assert(logoutRes.status === 200, "POST /auth/logout returns 200");
    const clearedCookie = extractCookie(logoutRes.headers);
    assert(clearedCookie.includes("Max-Age=0") || clearedCookie.includes("study_auth_token="), "Logout clears auth cookie");

    // 19. Rate limiting deterrence verification
    console.log(">>> Verifying rate limiting deterrence (consecutive failed attempts)...");
    const attackerEmail = "brute.force@university.edu";
    let hitRateLimit = false;
    for (let i = 0; i < 6; i++) {
      const attempt = await makeRequest(server, {
        method: "POST",
        path: "/auth/login",
        body: { email: attackerEmail, password: "IncorrectPassword!" },
      });
      if (attempt.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, "Brute force attempts trigger 429 Too Many Requests rate limiting deterrence");

    console.log("\n=========================================");
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log("=========================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
