/**
 * Swiss Ephemeris API Test Script
 *
 * Usage:
 *   node test-api.js [url] [options]
 *
 * Examples:
 *   node test-api.js                          # Test localhost:3000
 *   node test-api.js http://localhost:3000
 *   node test-api.js https://your-service.cloudurl.cn
 *   node test-api.js --birth-chart            # Generate birth chart SVG
 *   node test-api.js -b                       # Short form for birth chart
 */

const io = require('socket.io-client');

// Configuration
const SERVICE_URL = 'http://localhost:3000';
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
  },
  {
    name: 'Generate Birth Chart SVG',
    request: [{
      func: 'houses',
      args: [{
        date: {
          gregorian: {
            terrestrial: { year: 1990, month: 6, day: 15, hour: 14.5 }
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
        system: 'P'  // Placidus house system
      }]
    }]
  }
];

/**
 * Generate Birth Chart SVG
 * @param {Object} chartData - Contains planets, houses, and aspects data
 * @returns {string} SVG string
 */
function generateBirthChartSVG(chartData) {
  const CENTER = 300;
  const OUTER_RADIUS = 255;
  const INNER_RADIUS = 210;
  const PLANET_RADIUS = 149;

  // Planet symbols (using unicode zodiac symbols)
  const planetSymbols = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
    Asc: 'Asc', MC: 'MC', MeanNode: '☋'
  };

  // Zodiac signs
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

  // Convert degree to position on circle
  function degreeToPos(deg, radius) {
    const rad = (deg - 90) * Math.PI / 180;
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad)
    };
  }

  // Normalize degree to 0-360
  function normalizeDegree(deg) {
    return ((deg % 360) + 360) % 360;
  }

  // Generate SVG header
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" id="chart">
  <title>Birth Chart</title>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
    <g id="dot">
      <circle cx="0" cy="0" r="1.2"/>
    </g>
  </defs>
  <g id="main">`;

  // Draw outer circles
  svg += `
    <g id="chartbody">
      <circle cx="${CENTER}" cy="${CENTER}" r="${OUTER_RADIUS}" fill="none" stroke="#ccc" stroke-width="1"/>
      <circle cx="${CENTER}" cy="${CENTER}" r="${INNER_RADIUS}" fill="none" stroke="#999" stroke-width="1"/>
      <circle cx="${CENTER}" cy="${CENTER}" r="186" fill="none" stroke="#ccc" stroke-width="1"/>
      <circle cx="${CENTER}" cy="${CENTER}" r="146" fill="none" stroke="#eee" stroke-width="1"/>
    </g>`;

  // Draw zodiac sectors
  svg += '<g id="zodiac">';
  for (let i = 0; i < 12; i++) {
    const startDeg = i * 30;
    const endDeg = (i + 1) * 30;
    const midDeg = startDeg + 15;

    // Draw zodiac sector
    const start1 = degreeToPos(startDeg, OUTER_RADIUS);
    const end1 = degreeToPos(startDeg, INNER_RADIUS);
    const start2 = degreeToPos(endDeg, INNER_RADIUS);
    const end2 = degreeToPos(endDeg, OUTER_RADIUS);

    svg += `
      <path d="M ${start1.x},${start1.y} L ${end1.x},${end1.y} A ${INNER_RADIUS},${INNER_RADIUS} 0 0,1 ${start2.x},${start2.y} L ${end2.x},${end2.y} A ${OUTER_RADIUS},${OUTER_RADIUS} 0 0,0 ${start1.x},${start1.y}"
            fill="${i % 2 === 0 ? '#f9f9f9' : '#fff'}" stroke="#ddd" stroke-width="0.5"/>`;

    // Draw zodiac symbol
    const symbolPos = degreeToPos(midDeg, (OUTER_RADIUS + INNER_RADIUS) / 2);
    svg += `
      <text x="${symbolPos.x}" y="${symbolPos.y}"
            text-anchor="middle" dominant-baseline="middle"
            font-size="20" font-family="serif">${zodiacSymbols[i]}</text>`;
  }
  svg += '</g>';

  // Draw house cusps
  if (chartData.houses && chartData.houses.length >= 12) {
    svg += '<g id="cuspids">';
    for (let i = 0; i < 12; i++) {
      const houseAngle = chartData.houses[i];
      const pos = degreeToPos(houseAngle, INNER_RADIUS);

      // Draw house line (extended for 1st and 10th houses)
      const isImportant = i === 0 || i === 9;
      const lineEnd = degreeToPos(houseAngle, isImportant ? 40 : 90);

      svg += `
        <line x1="${pos.x}" y1="${pos.y}" x2="${lineEnd.x}" y2="${lineEnd.y}"
              stroke="${isImportant ? '#333' : '#999'}" stroke-width="${isImportant ? 2 : 1}"/>`;

      // Draw house number
      const labelAngle = houseAngle + 5;
      const labelPos = degreeToPos(labelAngle, 80);
      svg += `
        <text x="${labelPos.x}" y="${labelPos.y}"
              text-anchor="middle" dominant-baseline="middle"
              font-size="14" fill="#666">${i + 1}</text>`;
    }
    svg += '</g>';
  }

  // Draw aspects
  if (chartData.aspects && chartData.aspects.length > 0) {
    svg += '<g id="aspects">';
    const aspectColors = {
      conjunction: '#000',
      opposition: '#666',
      trine: '#00f',
      square: '#f00',
      sextile: '#090'
    };

    chartData.aspects.forEach(aspect => {
      if (aspect.orb < 8) {  // Only show aspects within 8 degrees
        const pos1 = degreeToPos(aspect.body1Angle, PLANET_RADIUS);
        const pos2 = degreeToPos(aspect.body2Angle, PLANET_RADIUS);
        const color = aspectColors[aspect.type] || '#999';

        svg += `
          <line x1="${pos1.x}" y1="${pos1.y}" x2="${pos2.x}" y2="${pos2.y}"
                stroke="${color}" stroke-width="0.5" opacity="0.6"/>`;
      }
    });
    svg += '</g>';
  }

  // Draw planets
  if (chartData.planets) {
    svg += '<g id="planets">';
    chartData.planets.forEach(planet => {
      const pos = degreeToPos(planet.longitude, PLANET_RADIUS);

      // Draw planet marker line
      const innerPos = degreeToPos(planet.longitude, PLANET_RADIUS - 20);
      svg += `
        <line x1="${innerPos.x}" y1="${innerPos.y}" x2="${pos.x}" y2="${pos.y}"
              stroke="#333" stroke-width="1"/>`;

      // Draw planet dot
      svg += `
        <use href="#dot" x="${pos.x}" y="${pos.y}" class="dot ${planet.name}"/>`;

      // Draw planet symbol
      const symbolPos = degreeToPos(planet.longitude, PLANET_RADIUS - 30);
      const symbol = planetSymbols[planet.name] || planet.name.substring(0, 3);
      svg += `
        <text x="${symbolPos.x}" y="${symbolPos.y}"
              text-anchor="middle" dominant-baseline="middle"
              font-size="16" font-family="serif">${symbol}</text>`;
    });
    svg += '</g>';
  }

  svg += `
  </g>
</svg>`;

  return svg;
}

/**
 * Calculate aspects between planets
 * @param {Array} planets - Array of planet objects with longitude
 * @returns {Array} Array of aspects
 */
function calculateAspects(planets) {
  const aspects = [];
  const aspectTypes = [
    { name: 'conjunction', angle: 0, orb: 10 },
    { name: 'opposition', angle: 180, orb: 10 },
    { name: 'trine', angle: 120, orb: 8 },
    { name: 'square', angle: 90, orb: 8 },
    { name: 'sextile', angle: 60, orb: 6 }
  ];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude);
      const normalizedDiff = Math.min(diff, 360 - diff);

      aspectTypes.forEach(aspectType => {
        const orb = Math.abs(normalizedDiff - aspectType.angle);
        if (orb <= aspectType.orb) {
          aspects.push({
            body1: planets[i].name,
            body2: planets[j].name,
            body1Angle: planets[i].longitude,
            body2Angle: planets[j].longitude,
            type: aspectType.name,
            orb: orb
          });
        }
      });
    }
  }

  return aspects;
}

/**
 * Convert ISO string to date object format required by swisseph
 */
function isoToDateObj(isoString) {
  const date = new Date(isoString);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,  // swisseph expects 1-12
    day: date.getDate(),
    hour: date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  };
}

/**
 * Test birth chart generation
 */
async function testBirthChartGeneration(socket) {
  console.log('\n📋 Test: Generate Birth Chart');

  const birthDate = '1990-06-15T14:30:00.000Z';
  // Using coordinates that work with Placidus system
  // Beijing's longitude (116°E) causes issues with Placidus, so using a different location
  const longitude = 0;  // Greenwich
  const latitude = 51.5;  // London

  // Convert ISO date to swisseph format
  const dateObj = isoToDateObj(birthDate);
  console.log(`   📅 Birth date: ${JSON.stringify(dateObj)}`);
  console.log(`   📍 Location: ${longitude}°, ${latitude}°`);

  // Step 1: Get all planet positions
  const planetIds = [
    { id: 0, name: 'Sun' },
    { id: 1, name: 'Moon' },
    { id: 2, name: 'Mercury' },
    { id: 3, name: 'Venus' },
    { id: 4, name: 'Mars' },
    { id: 5, name: 'Jupiter' },
    { id: 6, name: 'Saturn' },
    { id: 7, name: 'Uranus' },
    { id: 8, name: 'Neptune' },
    { id: 9, name: 'Pluto' }
  ];

  const planetRequests = planetIds.map(p => ({
    func: 'calc',
    args: [{
      date: { gregorian: { terrestrial: dateObj } },
      observer: {
        ephemeris: 'swisseph',
        geographic: { longitude, latitude, height: 0 }
      },
      body: {
        id: p.id,
        position: {}  // Required by swisseph.calc
      }
    }]
  }));

  // Step 2: Get Julian Day first, then house cusps
  // swe_houses signature: swe_houses(tjd_ut, geolat, geolon, housenos_both, callback)
  // So we need to call swe_julday first to get the Julian Day
  const juldayRequest = {
    func: 'swe_julday',
    args: [dateObj.year, dateObj.month, dateObj.day, dateObj.hour, 1]  // 1 = SE_GREG_CAL
  };

  let julianDay = null;
  let housesReceived = false;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeListener('swisseph result', handler);
      reject(new Error('Timeout after ' + TIMEOUT + 'ms'));
    }, TIMEOUT);

    const planets = [];

    const handler = (result) => {
      try {
        // Debug log to see the actual result structure
        console.log(`   🔍 Received result type: ${typeof result}, keys: ${Object.keys(result || {}).join(', ')}`);

        // Check for Julian Day result (returns a number directly)
        if (typeof result === 'number' || (result && !result.body && !result.house && Object.keys(result).length === 0)) {
          julianDay = typeof result === 'number' ? result : result.julianDay || result.jd || result;

          if (julianDay) {
            console.log(`   ✅ Received Julian Day: ${julianDay}`);

            // Now send houses request
            const housesRequest = {
              func: 'swe_houses',
              args: [julianDay, latitude, longitude, 'P']
            };

            socket.emit('swisseph', [housesRequest]);
            console.log(`   📤 Sent houses request`);
            return;
          }
        }

        // swisseph.calc returns the full options object with nested body.position
        if (result && result.body && result.body.position && result.body.position.longitude) {
          const planetId = parseInt(result.body.id);
          const planetName = planetIds.find(p => p.id === planetId)?.name || `Planet${planetId}`;
          const longitude = result.body.position.longitude.decimalDegree || result.body.position.longitude;

          planets.push({
            name: planetName,
            longitude: longitude
          });

          console.log(`   ✅ Received ${planetName}: ${longitude.toFixed(2)}°`);

          // Check if we have all planets
          if (planets.length === planetIds.length) {
            console.log(`   📊 All ${planets.length} planets received`);
          }
        } else if (result && (result.cusps || result.house)) {
          // House result - swe_houses returns 'house' array, not 'cusps'
          const cusps = result.cusps || result.house;
          housesReceived = true;
          console.log(`   ✅ Received ${cusps.length} house cusps`);

          // Wait for planets to be complete
          if (planets.length === planetIds.length) {
            clearTimeout(timeout);

            const aspects = calculateAspects(planets);

            const chartData = {
              planets: planets,
              houses: cusps,
              aspects: aspects
            };

            console.log(`   ✅ Calculated ${aspects.length} aspects`);

            // Generate SVG
            const svg = generateBirthChartSVG(chartData);

            // Save to file
            const fs = require('fs');
            const outputPath = '/Users/xiaozhu/_work/_code/swisseph-api/birth-chart.svg';
            fs.writeFileSync(outputPath, svg);

            console.log(`   ✅ SVG saved to ${outputPath}`);
            console.log(`   📊 SVG size: ${svg.length} bytes`);

            socket.removeListener('swisseph result', handler);
            resolve({ success: true, path: outputPath });
          } else {
            console.log(`   ⏳ Waiting for more planets (${planets.length}/${planetIds.length})`);
          }
        } else {
          console.log(`   ⚠️  Unexpected result format:`, JSON.stringify(result).substring(0, 300));
        }
      } catch (error) {
        console.error(`   ❌ Error handling result:`, error.message);
        clearTimeout(timeout);
        socket.removeListener('swisseph result', handler);
        reject(error);
      }
    };

    // Set up listener BEFORE sending requests
    socket.on('swisseph result', handler);

    // Small delay to ensure listener is ready
    setTimeout(() => {
      // Send planet requests and Julian Day request
      socket.emit('swisseph', [...planetRequests, juldayRequest]);
    }, 100);
  });
}

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
 * Main test runner
 */
async function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('  Swiss Ephemeris API Test Suite');
  console.log('═════════════════════════════════════════════════════');
  console.log(`  Target: ${SERVICE_URL}`);
  console.log('═════════════════════════════════════════════════════');

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

  // Check if we should run birth chart generation
  const runBirthChart = process.argv.includes('--birth-chart') || process.argv.includes('-b');

  if (runBirthChart) {
    console.log('\n🎨 Running birth chart generation test...');
    try {
      await testBirthChartGeneration(socket);
      results.passed++;
    } catch (error) {
      console.error(`   ❌ Birth chart generation failed:`, error.message);
      results.failed++;
    }
  } else {
    // Run standard tests
    i = 0
    for (const test of tests) {
      try {
        if (i > 0) {
          continue;
        }
        await runTest(socket, test.name, test.request);
        results.passed++;
        i++;
      } catch (error) {
        console.error(`   ❌ Test failed:`, error.message);
        results.failed++;
      }
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
