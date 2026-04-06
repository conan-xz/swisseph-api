const swisseph = require('swisseph');

swisseph.swe_set_ephe_path(process.env.SWISSEPH_EPHEMERIS_PATH || (__dirname + '/../ephe'));

const PLANET_IDS = [
  { id: swisseph.SE_SUN, name: '太阳', symbol: '☉' },
  { id: swisseph.SE_MOON, name: '月亮', symbol: '☽' },
  { id: swisseph.SE_MERCURY, name: '水星', symbol: '☿' },
  { id: swisseph.SE_VENUS, name: '金星', symbol: '♀' },
  { id: swisseph.SE_MARS, name: '火星', symbol: '♂' },
  { id: swisseph.SE_JUPITER, name: '木星', symbol: '♃' },
  { id: swisseph.SE_SATURN, name: '土星', symbol: '♄' },
  { id: swisseph.SE_URANUS, name: '天王星', symbol: '♅' },
  { id: swisseph.SE_NEPTUNE, name: '海王星', symbol: '♆' },
  { id: swisseph.SE_PLUTO, name: '冥王星', symbol: '♇' }
];

const HOUSE_SYSTEM_CODES = {
  placidus: 'P',
  equal: 'E',
  whole: 'W',
  koch: 'K',
  campanus: 'C',
  regiomontanus: 'R',
  topocentric: 'T'
};

const ASPECT_TYPES = [
  { type: 'conjunction', chineseName: '合相', angle: 0, orb: 10, color: '#000', symbol: '☌' },
  { type: 'opposition', chineseName: '对分相', angle: 180, orb: 10, color: '#666', symbol: '☍' },
  { type: 'trine', chineseName: '三分相', angle: 120, orb: 8, color: '#00f', symbol: '△' },
  { type: 'square', chineseName: '四分相', angle: 90, orb: 8, color: '#f00', symbol: '□' },
  { type: 'sextile', chineseName: '六分相', angle: 60, orb: 6, color: '#090', symbol: '✶' }
];

function toUTCDateObject(params) {
  const { year, month, day, hour, minute, timeZone = 8 } = params;
  const localHour = hour + minute / 60;
  let utcHour = localHour - timeZone;
  let utcYear = year;
  let utcMonth = month;
  let utcDay = day;

  if (utcHour < 0) {
    utcHour += 24;
    utcDay -= 1;
    if (utcDay < 1) {
      utcMonth -= 1;
      if (utcMonth < 1) {
        utcMonth = 12;
        utcYear -= 1;
      }
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const isLeapYear = (utcYear % 4 === 0 && utcYear % 100 !== 0) || utcYear % 400 === 0;
      utcDay = utcMonth === 2 && isLeapYear ? 29 : daysInMonth[utcMonth - 1];
    }
  } else if (utcHour >= 24) {
    utcHour -= 24;
    utcDay += 1;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeapYear = (utcYear % 4 === 0 && utcYear % 100 !== 0) || utcYear % 400 === 0;
    const maxDay = utcMonth === 2 && isLeapYear ? 29 : daysInMonth[utcMonth - 1];
    if (utcDay > maxDay) {
      utcDay = 1;
      utcMonth += 1;
      if (utcMonth > 12) {
        utcMonth = 1;
        utcYear += 1;
      }
    }
  }

  return {
    year: utcYear,
    month: utcMonth,
    day: utcDay,
    hour: utcHour
  };
}

function calculateAspects(planets) {
  const aspects = [];

  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const diff = Math.abs(planets[i].longitude - planets[j].longitude);
      const normalizedDiff = Math.min(diff, 360 - diff);

      for (let k = 0; k < ASPECT_TYPES.length; k += 1) {
        const aspectType = ASPECT_TYPES[k];
        const orb = Math.abs(normalizedDiff - aspectType.angle);
        if (orb <= aspectType.orb) {
          aspects.push({
            type: aspectType.type,
            chineseName: aspectType.chineseName,
            symbol: aspectType.symbol,
            color: aspectType.color,
            angle: aspectType.angle,
            orb: orb,
            orbDiff: orb,
            interpretation: aspectType.chineseName,
            planet1: {
              name: planets[i].name,
              symbol: planets[i].symbol,
              degree: planets[i].longitude
            },
            planet2: {
              name: planets[j].name,
              symbol: planets[j].symbol,
              degree: planets[j].longitude
            }
          });
          break;
        }
      }
    }
  }

  return aspects;
}

function generateBirthChart(params) {
  const { year, month, day, hour, minute, lat, lng, houseSystem = 'placidus', timeZone = 8 } = params;

  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    throw new Error('lat and lng are required');
  }

  const utcDate = toUTCDateObject({ year, month, day, hour, minute, timeZone });
  const julianDay = swisseph.swe_julday(
    utcDate.year,
    utcDate.month,
    utcDate.day,
    utcDate.hour,
    swisseph.SE_GREG_CAL
  );

  const flag = swisseph.SEFLG_SPEED | swisseph.SEFLG_MOSEPH;
  const planets = PLANET_IDS.map((planetInfo) => {
    const body = swisseph.swe_calc_ut(julianDay, planetInfo.id, flag);
    if (body.error) {
      throw new Error(body.error);
    }

    return {
      id: planetInfo.id,
      name: planetInfo.name,
      symbol: planetInfo.symbol,
      degree: body.longitude,
      longitude: body.longitude,
      latitude: body.latitude,
      speed: body.longitudeSpeed
    };
  });

  const houseResult = swisseph.swe_houses(
    julianDay,
    lat,
    lng,
    HOUSE_SYSTEM_CODES[houseSystem] || 'P'
  );

  if (houseResult.error) {
    throw new Error(houseResult.error);
  }

  const houses = Array.isArray(houseResult.house) ? houseResult.house.slice(0, 12) : [];
  const aspects = calculateAspects(planets);

  return {
    planets,
    houses,
    aspects,
    ascendant: houseResult.ascendant,
    midheaven: houseResult.mc,
    descendant: (houseResult.ascendant + 180) % 360,
    immumcoeli: (houseResult.mc + 180) % 360,
    julianDay
  };
}

module.exports = {
  generateBirthChart,
  HOUSE_SYSTEM_CODES
};
