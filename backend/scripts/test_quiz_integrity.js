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

async function runIntegrityTests() {
  console.log("=========================================");
  console.log("TESTING QUIZ INTEGRITY & TELEMETRY SYSTEM");
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
    const testAttemptId = `test_att_${Date.now()}`;

    // 1. Reject invalid event type
    const badEventRes = await makeRequest(server, {
      method: "POST",
      path: `/api/quizzes/${testAttemptId}/log-event`,
      body: { eventType: "INVALID_EVENT" },
    });
    assert(badEventRes.status === 400, "Rejects invalid eventType with 400 Bad Request");

    // 2. Log TAB_SWITCH violation
    const tabSwitchRes = await makeRequest(server, {
      method: "POST",
      path: `/api/quizzes/${testAttemptId}/log-event`,
      body: {
        eventType: "TAB_SWITCH",
        timeSpentAwaySeconds: 14,
        details: "Student switched browser tabs",
      },
    });
    assert(tabSwitchRes.status === 201, "Logs TAB_SWITCH violation successfully");
    assert(tabSwitchRes.body.totalViolations === 1, "Tracks violation count");

    // 3. Log FULLSCREEN_EXIT violation
    const fsExitRes = await makeRequest(server, {
      method: "POST",
      path: `/api/quizzes/${testAttemptId}/log-event`,
      body: {
        eventType: "FULLSCREEN_EXIT",
        details: "Exited fullscreen mode",
      },
    });
    assert(fsExitRes.status === 201, "Logs FULLSCREEN_EXIT violation successfully");

    // 4. Log CLIPBOARD_ATTEMPT violation
    const clipRes = await makeRequest(server, {
      method: "POST",
      path: `/api/quizzes/${testAttemptId}/log-event`,
      body: {
        eventType: "CLIPBOARD_ATTEMPT",
        details: "Attempted to copy question text",
      },
    });
    assert(clipRes.status === 201, "Logs CLIPBOARD_ATTEMPT violation successfully");

    // 5. Log DEVTOOLS_KEYPRESS violation
    const devtoolsRes = await makeRequest(server, {
      method: "POST",
      path: `/api/quizzes/${testAttemptId}/log-event`,
      body: {
        eventType: "DEVTOOLS_KEYPRESS",
        details: "Pressed F12 DevTools shortcut",
      },
    });
    assert(devtoolsRes.status === 201, "Logs DEVTOOLS_KEYPRESS violation successfully");

    // 6. Retrieve violations summary
    const getViolationsRes = await makeRequest(server, {
      method: "GET",
      path: `/api/quizzes/${testAttemptId}/violations`,
    });
    assert(getViolationsRes.status === 200, "GET /api/quizzes/:attemptId/violations returns 200");
    assert(getViolationsRes.body.violations.length === 4, "Returns all 4 recorded violations");
    assert(typeof getViolationsRes.body.integrityScore === "number", "Calculates numerical integrityScore");
    assert(getViolationsRes.body.rating === "High Suspicion" || getViolationsRes.body.rating === "Moderate Risk", "Assigns integrity rating");
    assert(getViolationsRes.body.summary.includes("Left quiz window"), "Produces readable summary description");

    // 7. Assessment submission merges integrity report
    const assessRes = await makeRequest(server, {
      method: "POST",
      path: "/api/assess",
      body: {
        quizId: testAttemptId,
        attemptId: testAttemptId,
        topic: "Python Lists",
        studentAnswers: { q1: "Square brackets [] (List)" },
        questions: [
          {
            id: "q1",
            question: "Which syntax defines a mutable sequence?",
            options: ["Square brackets [] (List)", "Parentheses ()"],
            correctAnswer: "Square brackets [] (List)",
            sectionRef: "SEC-PY-101",
          },
        ],
      },
    });
    assert(assessRes.status === 200, "POST /api/assess succeeds with attemptId");
    assert(assessRes.body.integrity !== undefined, "Attached integrity report in assessment response");
    assert(assessRes.body.integrity.metrics.totalViolations === 4, "Matches telemetry violation count");

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

runIntegrityTests();
