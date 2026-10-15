/**
 * EcoSort AI - Automated Test Suite
 * 
 * Verifies:
 * 1. Health endpoint response and security (no exposed secret keys)
 * 2. Categories endpoint (all 8 canonical categories present)
 * 3. Input validation (rejection of empty/short/long inputs)
 * 4. Classification output structure (item, category, explanation, disposal_method, recycling_tip, safety_notes)
 * 5. Predefined offline knowledge base fallback handling
 * 6. Rate limiting enforcement
 */

const http = require('http');
const app = require('./server');

let server;
const TEST_PORT = 3847;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting EcoSort AI Automated Backend Test Suite');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise(resolve => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------
    // Test 1: GET /api/health
    // -----------------------------------------------------------
    console.log('Test Group 1: Health Check & System Status');
    const healthRes = await makeRequest('/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthRes.data && healthRes.data.status === 'healthy', 'Health check reports "healthy"');
    assert(healthRes.data && healthRes.data.canonical_categories === 8, '8 canonical categories configured');
    assert(!healthRes.raw.includes('AIzaSy'), 'No API secrets or private tokens leaked in health response');

    // -----------------------------------------------------------
    // Test 2: GET /api/categories
    // -----------------------------------------------------------
    console.log('\nTest Group 2: Categories Metadata');
    const catRes = await makeRequest('/api/categories');
    assert(catRes.status === 200, 'GET /api/categories returns HTTP 200');
    assert(Array.isArray(catRes.data.categories) && catRes.data.categories.length === 8, 'Returns exactly 8 canonical categories');
    
    const catNames = catRes.data.categories.map(c => c.name);
    assert(catNames.includes('Wet or Organic Waste'), 'Includes "Wet or Organic Waste"');
    assert(catNames.includes('Hazardous or Special-Handling Waste'), 'Includes "Hazardous or Special-Handling Waste"');
    assert(catNames.includes('Electronic Waste (E-Waste)'), 'Includes "Electronic Waste (E-Waste)"');

    // -----------------------------------------------------------
    // Test 3: Input Validation on POST /api/classify
    // -----------------------------------------------------------
    console.log('\nTest Group 3: Input Validation & Sanitization');
    
    // Empty input
    const emptyRes = await makeRequest('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { item: '' }
    });
    assert(emptyRes.status === 400, 'Rejects empty input with HTTP 400');

    // Too short (<2 characters)
    const shortRes = await makeRequest('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { item: 'a' }
    });
    assert(shortRes.status === 400, 'Rejects 1-character input with HTTP 400');

    // Non-string input
    const nonStringRes = await makeRequest('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { item: 12345 }
    });
    assert(nonStringRes.status === 400, 'Rejects non-string payload with HTTP 400');

    // Excessively long input (>120 chars)
    const longString = 'a'.repeat(150);
    const longRes = await makeRequest('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { item: longString }
    });
    assert(longRes.status === 400, 'Rejects string >120 characters with HTTP 400');

    // -----------------------------------------------------------
    // Test 4: Classification of Common Household Items
    // -----------------------------------------------------------
    console.log('\nTest Group 4: Classification & Content Verification');

    const testItems = [
      { query: 'plastic water bottle', expectedCat: 'Plastic Waste' },
      { query: 'banana peel', expectedCat: 'Wet or Organic Waste' },
      { query: 'cardboard box', expectedCat: 'Recyclable Paper and Cardboard' },
      { query: 'aluminum soda can', expectedCat: 'Metal Waste' },
      { query: 'glass jam jar', expectedCat: 'Glass Waste' },
      { query: 'lithium battery', expectedCat: 'Hazardous or Special-Handling Waste' },
      { query: 'old smartphone', expectedCat: 'Electronic Waste (E-Waste)' },
      { query: 'greasy pizza box', expectedCat: 'General or Non-Recyclable Waste' }
    ];

    for (const testCase of testItems) {
      const classRes = await makeRequest('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { item: testCase.query }
      });

      assert(classRes.status === 200, `POST /api/classify for "${testCase.query}" returns HTTP 200`);
      assert(classRes.data && classRes.data.category === testCase.expectedCat, 
        `"${testCase.query}" correctly mapped to category: "${testCase.expectedCat}"`);
      assert(Boolean(classRes.data.disposal_method && classRes.data.disposal_method.length > 10), 
        `Has detailed disposal method guidance`);
      assert(Boolean(classRes.data.recycling_tip && classRes.data.recycling_tip.length > 5), 
        `Has actionable recycling/upcycling tip`);
      assert(Boolean(classRes.data.safety_notes), 
        `Has safety and precaution notes`);
      assert(typeof classRes.data.is_fallback === 'boolean', 
        `Explicitly tags is_fallback boolean (${classRes.data.is_fallback})`);
      assert(Boolean(classRes.data.source), 
        `Identifies source honestly: "${classRes.data.source}"`);
    }

    // -----------------------------------------------------------
    // Test 5: Rate Limiting & Security
    // -----------------------------------------------------------
    console.log('\nTest Group 5: Rate Limiting Headers');
    const rateRes = await makeRequest('/api/health');
    // Note: rateLimiter middleware is on /api/classify
    const classRateRes = await makeRequest('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { item: 'newspaper' }
    });
    assert(classRateRes.headers['x-ratelimit-limit'] === '30', 'X-RateLimit-Limit header set to 30');
    assert(classRateRes.headers['x-ratelimit-remaining'] !== undefined, 'X-RateLimit-Remaining header present');

    console.log('\n======================================================');
    console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('Fatal test runner error:', error);
    failed++;
  } finally {
    server.close();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
