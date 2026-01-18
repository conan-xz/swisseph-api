/**
 * Swiss Ephemeris API Test Script
 *
 * Usage:
 *   node test-api.js [url]
 *
 * Examples:
 *   node test-api.js                    # Test localhost:3000
 *   node test-api.js http://localhost:3000
 *   node test-api.js https://your-service.cloudurl.cn
 */

const io = require('socket.io-client');

// Configuration
const SERVICE_URL = process.argv[2] || 'http://localhost:3000';
const TIMEOUT = 10000;

// Test cases
const tests = [
  {
    name: 'Calculate Sun Position',
    request: [{
      func: 'calc',
      args: [{
        date: {
          gregorian: {
            terrestrial: new Date().toISOString()
          }
        },
        observer: {
          ephemeris: 'swisseph',
          geographic: {
            longitude: 0,
            latitude: 0,
            height: 0
          }
        },
        body: {
          id: 0 // Sun
        }
      }]
    }]
  },
  {
    name: 'Calculate Moon Position',
    request: [{
      func: 'calc',
      args: [{
        date: {
          gregorian: {
            terrestrial: new Date().toISOString()
          }
        },
        observer: {
          ephemeris: 'swisseph',
          geographic: {
            longitude: 116.4074,  // Beijing
            latitude: 39.9042,
            height: 43
          }
        },
        body: {
          id: 1 // Moon
        }
      }]
    }]
  },
  {
    name: 'Calculate All Planets',
    request: Array.from({ length: 10 }, (_, i) => ({
      func: 'calc',
      args: [{
        date: {
          gregorian: {
            terrestrial: new Date().toISOString()
          }
        },
        observer: {
          ephemeris: 'swisseph',
          geographic: {
            longitude: 0,
            latitude: 0,
            height: 0
          }
        },
        body: {
          id: i // 0=Sun, 1=Moon, 2-9=Planets
        }
      }]
    }))
  },
  {
    name: 'Calculate Specific Date',
    request: [{
      func: 'calc',
      args: [{
        date: {
          gregorian: {
            terrestrial: '2024-01-01T00:00:00.000Z'
          }
        },
        observer: {
          ephemeris: 'de431',
          geographic: {
            longitude: 0,
            latitude: 0,
            height: 0
          }
        },
        body: {
          id: 5 // Jupiter
        }
      }]
    }]
  }
];

/**
 * Run a single test
 */
async function runTest(socket, testName, requestData) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Test: ${testName}`);
    console.log('   Request:', JSON.stringify(requestData, null, 2));

    const timeout = setTimeout(() => {
      reject(new Error('Timeout after ' + TIMEOUT + 'ms'));
    }, TIMEOUT);

    let responseCount = 0;
    const expectedCount = requestData.length;

    const handler = (result) => {
      responseCount++;
      console.log(`   ✅ Result ${responseCount}/${expectedCount}:`, JSON.stringify(result, null, 2));

      if (responseCount >= expectedCount) {
        clearTimeout(timeout);
        socket.removeListener('swisseph result', handler);
        resolve(result);
      }
    };

    socket.on('swisseph result', handler);
    socket.emit('swisseph', requestData);
  });
}

/**
 * Test HTTP endpoint
 */
async function testHttpEndpoint() {
  const http = require('http');
  const url = new URL(SERVICE_URL);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`\n🌐 HTTP GET ${url.href}`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Headers:`, JSON.stringify(res.headers, null, 2));

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`   ✅ Response length: ${data.length} bytes`);
        console.log(`   Preview: ${data.substring(0, 200)}...`);
        resolve();
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
    req.end();
  });
}

/**
 * Main test runner
 */
async function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('  Swiss Ephemeris API Test Suite');
  console.log('═════════════════════════════════════════════════════');
  console.log(`  Target: ${SERVICE_URL}`);
  console.log('═════════════════════════════════════════════════════');

  // Test HTTP endpoint first
  try {
    await testHttpEndpoint();
  } catch (error) {
    console.error(`   ❌ HTTP test failed:`, error.message);
  }

  // Connect to Socket.IO
  console.log('\n🔌 Connecting to Socket.IO...');
  const socket = io(SERVICE_URL, {
    transports: ['websocket', 'polling'],
    timeout: TIMEOUT
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('   ✅ Connected successfully');
      console.log(`   Socket ID: ${socket.id}`);
      resolve();
    });

    socket.on('connect_error', (error) => {
      console.error('   ❌ Connection failed:', error.message);
      reject(error);
    });
  });

  // Run all tests
  const results = {
    passed: 0,
    failed: 0
  };

  for (const test of tests) {
    try {
      await runTest(socket, test.name, test.request);
      results.passed++;
    } catch (error) {
      console.error(`   ❌ Test failed:`, error.message);
      results.failed++;
    }
  }

  // Disconnect
  socket.disconnect();
  console.log('\n🔌 Disconnected');

  // Summary
  console.log('\n═════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═════════════════════════════════════════════════════');
  console.log(`  Total:  ${tests.length}`);
  console.log(`  Passed: ${results.passed} ✅`);
  console.log(`  Failed: ${results.failed} ❌`);
  console.log('═════════════════════════════════════════════════════');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
