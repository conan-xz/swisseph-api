/**
 * Standalone Birth Chart SVG Generator
 * Generates a birth chart SVG with sample data
 */

const fs = require('fs');
const path = require('path');

// Output path
const OUTPUT_PATH = path.join(__dirname, 'birth-chart-new.svg');

/**
 * Generate Birth Chart SVG
 */
function generateBirthChartSVG(chartData) {
  const CENTER = 300;
  const OUTER_RADIUS = 255;
  const INNER_RADIUS = 210;
  const PLANET_RADIUS = 149;

  const planetSymbols = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
    Asc: 'Asc', MC: 'MC', MeanNode: '☋'
  };

  const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

  function degreeToPos(deg, radius) {
    const rad = (deg - 90) * Math.PI / 180;
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad)
    };
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" id="chart">
  <title>Birth Chart - ${(new Date()).toISOString().split('T')[0]}</title>
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

    const start1 = degreeToPos(startDeg, OUTER_RADIUS);
    const end1 = degreeToPos(startDeg, INNER_RADIUS);
    const start2 = degreeToPos(endDeg, INNER_RADIUS);
    const end2 = degreeToPos(endDeg, OUTER_RADIUS);

    svg += `
      <path d="M ${start1.x},${start1.y} L ${end1.x},${end1.y} A ${INNER_RADIUS},${INNER_RADIUS} 0 0,1 ${start2.x},${start2.y} L ${end2.x},${end2.y} A ${OUTER_RADIUS},${OUTER_RADIUS} 0 0,0 ${start1.x},${start1.y}"
            fill="${i % 2 === 0 ? '#f9f9f9' : '#fff'}" stroke="#ddd" stroke-width="0.5"/>`;

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
      const isImportant = i === 0 || i === 9;
      const lineEnd = degreeToPos(houseAngle, isImportant ? 40 : 90);

      svg += `
        <line x1="${pos.x}" y1="${pos.y}" x2="${lineEnd.x}" y2="${lineEnd.y}"
              stroke="${isImportant ? '#333' : '#999'}" stroke-width="${isImportant ? 2 : 1}"/>`;

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
      if (aspect.orb < 8) {
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
      const innerPos = degreeToPos(planet.longitude, PLANET_RADIUS - 20);

      svg += `
        <line x1="${innerPos.x}" y1="${innerPos.y}" x2="${pos.x}" y2="${pos.y}"
              stroke="#333" stroke-width="1"/>`;

      svg += `
        <use href="#dot" x="${pos.x}" y="${pos.y}" class="dot ${planet.name}"/>`;

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
 * Main function
 */
function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('  Birth Chart SVG Generator (Standalone)');
  console.log('═════════════════════════════════════════════════════');

  // Sample birth chart data (1990-06-15 14:30 GMT, London)
  const sampleData = {
    planets: [
      { name: 'Sun', longitude: 84.35 },      // Gemini
      { name: 'Moon', longitude: 294.56 },    // Capricorn
      { name: 'Mercury', longitude: 72.45 },  // Gemini
      { name: 'Venus', longitude: 56.78 },    // Taurus
      { name: 'Mars', longitude: 35.23 },     // Taurus
      { name: 'Jupiter', longitude: 96.12 },  // Cancer
      { name: 'Saturn', longitude: 298.67 },  // Capricorn
      { name: 'Uranus', longitude: 283.45 },  // Capricorn
      { name: 'Neptune', longitude: 287.89 }, // Capricorn
      { name: 'Pluto', longitude: 234.12 }    // Scorpio
    ],
    houses: [
      227, 258, 289, 320, 350, 15, 46, 76, 107, 138, 169, 198  // 12 house cusps
    ]
  };

  // Calculate aspects
  sampleData.aspects = calculateAspects(sampleData.planets);

  console.log(`\n📊 Planets: ${sampleData.planets.length}`);
  console.log(`🏠 Houses: ${sampleData.houses.length}`);
  console.log(`✨ Aspects: ${sampleData.aspects.length}`);

  // Generate SVG
  console.log(`\n🎨 Generating SVG...`);
  const svg = generateBirthChartSVG(sampleData);

  // Save to file
  fs.writeFileSync(OUTPUT_PATH, svg);
  console.log(`✅ SVG saved to: ${OUTPUT_PATH}`);
  console.log(`📊 File size: ${svg.length} bytes`);

  // Open in browser
  const { exec } = require('child_process');
  const command = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} "${OUTPUT_PATH}"`, (error) => {
    if (error) console.log(`\n💡 Open manually: ${OUTPUT_PATH}`);
    else console.log(`\n🌐 Opened in browser`);
  });

  console.log('\n✅ Done!');
}

main();
