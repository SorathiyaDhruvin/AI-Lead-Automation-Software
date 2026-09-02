const assert = require("assert");
const http = require("http");
const app = require("../src/app");
const pool = require("../src/config/db");
const leadModel = require("../src/models/leadModel");
const executionModel = require("../src/models/executionModel");
const { evaluateConditions } = require("../src/services/automationEngine");

async function runTests() {
    console.log("\n==================================================");
    console.log("🚀 Running Automated Integration & Quality Tests...");
    console.log("==================================================\n");

    let server;
    let baseUrl;
    let testPassed = 0;
    let testFailed = 0;

    function recordResult(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASSED: ${name}`);
            testPassed++;
        } catch (err) {
            console.error(`  ❌ FAILED: ${name} -> ${err.message}`);
            testFailed++;
        }
    }

    async function recordAsyncResult(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASSED: ${name}`);
            testPassed++;
        } catch (err) {
            console.error(`  ❌ FAILED: ${name} -> ${err.message}`);
            testFailed++;
        }
    }

    function httpGet(path) {
        return new Promise((resolve, reject) => {
            http.get(`${baseUrl}${path}`, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(data || "{}") }));
            }).on("error", reject);
        });
    }

    function httpPost(path, body) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify(body);
            const req = http.request(`${baseUrl}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(payload)
                }
            }, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(data || "{}") }));
            });
            req.on("error", reject);
            req.write(payload);
            req.end();
        });
    }

    try {
        // Boot ephemeral test server on random port
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}`;
                console.log(`ℹ️  Test HTTP server running at ${baseUrl}`);
                resolve();
            });
        });

        // Test 1: API Health check
        await recordAsyncResult("GET /api/health returns 200 and healthy status", async () => {
            const res = await httpGet("/api/health");
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
        });

        // Test 2: Protected routes reject unauthenticated requests
        await recordAsyncResult("GET /api/leads without Bearer token returns 401 Unauthorized", async () => {
            const res = await httpGet("/api/leads");
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
        });

        // Test 3: Protected admin route rejects unauthorized requests
        await recordAsyncResult("GET /api/admin/stats without Bearer token returns 401 Unauthorized", async () => {
            const res = await httpGet("/api/admin/stats");
            assert.strictEqual(res.status, 401);
        });

        // Test 4: Public lead capture validation
        await recordAsyncResult("POST /api/public-leads/public-capture rejects missing required parameters", async () => {
            const res = await httpPost("/api/public-leads/public-capture", {
                name: "Invalid Submission"
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
        });


        // Test 5: Automation engine condition evaluator unit tests
        recordResult("Automation Engine: score_threshold condition evaluates correctly", () => {
            const leadHigh = { ai_score: 85, status: "new" };
            const leadLow = { ai_score: 30, status: "new" };
            const condition = [{ type: "score_threshold", value: 70 }];

            assert.strictEqual(evaluateConditions(condition, leadHigh, {}), true);
            assert.strictEqual(evaluateConditions(condition, leadLow, {}), false);
        });

        recordResult("Automation Engine: status_equals condition evaluates correctly", () => {
            const leadQualified = { ai_score: 50, status: "qualified" };
            const leadNew = { ai_score: 50, status: "new" };
            const condition = [{ type: "status_equals", value: "qualified" }];

            assert.strictEqual(evaluateConditions(condition, leadQualified, {}), true);
            assert.strictEqual(evaluateConditions(condition, leadNew, {}), false);
        });

        // Test 6: Database connection check
        await recordAsyncResult("PostgreSQL Database pool connection works", async () => {
            const client = await pool.connect();
            assert.ok(client);
            client.release();
        });

        console.log("\n--------------------------------------------------");
        console.log(`📊 Test Results: ${testPassed} Passed, ${testFailed} Failed`);
        console.log("--------------------------------------------------\n");

        if (testFailed > 0) {
            process.exit(1);
        } else {
            console.log("✨ All automated tests passed successfully!\n");
            process.exit(0);
        }

    } catch (err) {
        console.error("🔥 Unexpected test error:", err);
        process.exit(1);
    } finally {
        if (server) server.close();
    }
}

runTests();
