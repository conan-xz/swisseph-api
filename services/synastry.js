const crypto = require('crypto');

const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈', element: 'fire' },
  { name: '金牛座', symbol: '♉', element: 'earth' },
  { name: '双子座', symbol: '♊', element: 'air' },
  { name: '巨蟹座', symbol: '♋', element: 'water' },
  { name: '狮子座', symbol: '♌', element: 'fire' },
  { name: '处女座', symbol: '♍', element: 'earth' },
  { name: '天秤座', symbol: '♎', element: 'air' },
  { name: '天蝎座', symbol: '♏', element: 'water' },
  { name: '射手座', symbol: '♐', element: 'fire' },
  { name: '摩羯座', symbol: '♑', element: 'earth' },
  { name: '水瓶座', symbol: '♒', element: 'air' },
  { name: '双鱼座', symbol: '♓', element: 'water' }
];

const RELATION_TYPES = {
  love: '恋爱',
  friend: '朋友',
  work: '合作',
  family: '家人'
};

const ALLOWED_PLANETS = ['太阳', '月亮', '水星', '金星', '火星', '木星', '土星'];

const ASPECT_BASE_EFFECTS = {
  conjunction: 6,
  sextile: 7,
  trine: 9,
  square: -8,
  opposition: -6
};

const PLANET_WEIGHTS = {
  love: {
    attraction: { '太阳': 0.8, '月亮': 0.7, '水星': 0.4, '金星': 1.6, '火星': 1.6, '木星': 0.5, '土星': 0.4 },
    emotion: { '太阳': 0.8, '月亮': 1.7, '水星': 0.5, '金星': 1.0, '火星': 0.5, '木星': 0.6, '土星': 0.6 },
    communication: { '太阳': 0.5, '月亮': 0.7, '水星': 1.8, '金星': 0.5, '火星': 0.5, '木星': 0.7, '土星': 0.7 },
    stability: { '太阳': 0.8, '月亮': 0.9, '水星': 0.5, '金星': 1.0, '火星': 0.5, '木星': 0.9, '土星': 1.4 }
  },
  friend: {
    attraction: { '太阳': 0.5, '月亮': 0.6, '水星': 0.7, '金星': 0.8, '火星': 0.5, '木星': 0.8, '土星': 0.3 },
    emotion: { '太阳': 0.8, '月亮': 1.4, '水星': 0.7, '金星': 0.8, '火星': 0.4, '木星': 0.8, '土星': 0.5 },
    communication: { '太阳': 0.5, '月亮': 0.6, '水星': 1.8, '金星': 0.4, '火星': 0.5, '木星': 1.0, '土星': 0.6 },
    stability: { '太阳': 0.6, '月亮': 0.7, '水星': 0.5, '金星': 0.6, '火星': 0.4, '木星': 0.9, '土星': 1.0 }
  },
  work: {
    attraction: { '太阳': 0.3, '月亮': 0.3, '水星': 0.7, '金星': 0.4, '火星': 0.7, '木星': 0.6, '土星': 0.6 },
    emotion: { '太阳': 0.4, '月亮': 0.8, '水星': 0.6, '金星': 0.4, '火星': 0.3, '木星': 0.5, '土星': 0.8 },
    communication: { '太阳': 0.5, '月亮': 0.4, '水星': 1.9, '金星': 0.3, '火星': 0.8, '木星': 1.0, '土星': 0.8 },
    stability: { '太阳': 0.9, '月亮': 0.4, '水星': 0.6, '金星': 0.3, '火星': 0.8, '木星': 0.8, '土星': 1.6 }
  },
  family: {
    attraction: { '太阳': 0.3, '月亮': 0.8, '水星': 0.4, '金星': 0.5, '火星': 0.3, '木星': 0.7, '土星': 0.7 },
    emotion: { '太阳': 0.7, '月亮': 1.9, '水星': 0.5, '金星': 0.7, '火星': 0.3, '木星': 0.8, '土星': 0.9 },
    communication: { '太阳': 0.4, '月亮': 0.5, '水星': 1.4, '金星': 0.4, '火星': 0.5, '木星': 0.7, '土星': 0.8 },
    stability: { '太阳': 0.8, '月亮': 1.1, '水星': 0.4, '金星': 0.5, '火星': 0.4, '木星': 0.7, '土星': 1.7 }
  }
};

function clampScore(value, min = 35, max = 95) {
  return Math.max(min, Math.min(max, value));
}

function roundToNearestFive(value) {
  return Math.round(value / 5) * 5;
}

function degreeToHouse(degree, houses) {
  const normalizedDegree = degree % 360;
  for (let i = 0; i < houses.length; i += 1) {
    const currentCusp = houses[i] % 360;
    const nextCusp = houses[(i + 1) % houses.length] % 360;
    if (currentCusp < nextCusp) {
      if (normalizedDegree >= currentCusp && normalizedDegree < nextCusp) {
        return i + 1;
      }
    } else if (normalizedDegree >= currentCusp || normalizedDegree < nextCusp) {
      return i + 1;
    }
  }
  return 1;
}

function degreeToSign(degree) {
  const normalizedDegree = degree % 360;
  const signIndex = Math.floor(normalizedDegree / 30);
  return ZODIAC_SIGNS[signIndex];
}

function decorateChartData(chartData) {
  return {
    ...chartData,
    planets: (chartData.planets || []).map((planet) => {
      const sign = degreeToSign(planet.degree);
      const house = degreeToHouse(planet.degree, chartData.houses || []);
      return {
        ...planet,
        sign: sign ? sign.symbol : '?',
        signName: sign ? sign.name : '未知',
        house
      };
    })
  };
}

function getConfidence(timeKnownA, timeKnownB) {
  if (timeKnownA && timeKnownB) {
    return {
      level: 'high',
      label: '高可信',
      description: '双方出生时间完整，已纳入宫位和轴线信息。'
    };
  }
  if (timeKnownA || timeKnownB) {
    return {
      level: 'medium',
      label: '中可信',
      description: '有一方缺少精确出生时间，宫位落入和上升相关结论已降级。'
    };
  }
  return {
    level: 'low',
    label: '基础版',
    description: '双方都缺少精确出生时间，结果主要基于行星关系推断。'
  };
}

function getPreviewFromChart(chartData, label) {
  const sun = chartData.planets.find((planet) => planet.name === '太阳');
  const moon = chartData.planets.find((planet) => planet.name === '月亮');
  const ascSign = degreeToSign(chartData.ascendant || 0);
  const sunSign = sun ? degreeToSign(sun.degree) : null;
  const moonSign = moon ? degreeToSign(moon.degree) : null;

  return {
    name: label,
    sun: sunSign ? sunSign.name : '未知',
    moon: moonSign ? moonSign.name : '未知',
    asc: ascSign ? ascSign.name : '未知',
    title: `${label}的星座名片`,
    subtitle: `${sunSign ? sunSign.name : '未知'} · ${moonSign ? moonSign.name : '未知'} · ${ascSign ? ascSign.name : '未知'}`
  };
}

function buildCrossAspects(chartA, chartB) {
  const sourcePlanets = (chartA.planets || []).filter((planet) => ALLOWED_PLANETS.includes(planet.name));
  const targetPlanets = (chartB.planets || []).filter((planet) => ALLOWED_PLANETS.includes(planet.name));
  const aspects = [];

  sourcePlanets.forEach((planetA) => {
    targetPlanets.forEach((planetB) => {
      const diff = Math.abs(planetA.degree - planetB.degree);
      const normalizedDiff = Math.min(diff, 360 - diff);
      [
        { type: 'conjunction', chineseName: '合相', angle: 0, orb: 10, symbol: '☌' },
        { type: 'sextile', chineseName: '六分相', angle: 60, orb: 6, symbol: '✶' },
        { type: 'square', chineseName: '四分相', angle: 90, orb: 8, symbol: '□' },
        { type: 'trine', chineseName: '三分相', angle: 120, orb: 8, symbol: '△' },
        { type: 'opposition', chineseName: '对分相', angle: 180, orb: 10, symbol: '☍' }
      ].forEach((aspectType) => {
        const orb = Math.abs(normalizedDiff - aspectType.angle);
        if (orb <= aspectType.orb) {
          aspects.push({
            type: aspectType.type,
            chineseName: aspectType.chineseName,
            symbol: aspectType.symbol,
            orbDiff: orb,
            planetA,
            planetB
          });
        }
      });
    });
  });

  return aspects.sort((a, b) => a.orbDiff - b.orbDiff);
}

function buildSummary(totalScore, relationType, dimensionScores) {
  const relationLabel = RELATION_TYPES[relationType] || '关系';
  const topDimension = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1])[0][0];
  const topMap = {
    attraction: '吸引力',
    emotion: '情绪共鸣',
    communication: '沟通协同',
    stability: '长期稳定'
  };

  if (totalScore >= 85) {
    return `${relationLabel}里的高匹配组合，${topMap[topDimension]}尤其突出。`;
  }
  if (totalScore >= 75) {
    return `${relationLabel}整体发展空间不错，${topMap[topDimension]}是你们最自然的优势。`;
  }
  if (totalScore >= 65) {
    return `${relationLabel}基础不差，但仍需要持续经营边界、节奏和表达方式。`;
  }
  return `${relationLabel}的磨合感偏强，建议慢一点推进，多观察相处节奏。`;
}

function generateSynastryReport(chartAInput, chartBInput, relationType, options = {}) {
  const chartA = decorateChartData(chartAInput);
  const chartB = decorateChartData(chartBInput);
  const crossAspects = buildCrossAspects(chartA, chartB);
  const weights = PLANET_WEIGHTS[relationType] || PLANET_WEIGHTS.love;
  const scores = {
    attraction: 60,
    emotion: 60,
    communication: 60,
    stability: 60
  };

  const strengths = [];
  const risks = [];

  crossAspects.forEach((aspect) => {
    Object.keys(scores).forEach((dimension) => {
      const weightA = weights[dimension][aspect.planetA.name] || 0;
      const weightB = weights[dimension][aspect.planetB.name] || 0;
      if (!weightA && !weightB) {
        return;
      }

      const delta = ASPECT_BASE_EFFECTS[aspect.type] * ((weightA + weightB) / 2) * Math.max(0.55, 1 - aspect.orbDiff / 12) * 0.65;
      scores[dimension] += delta;

      const item = {
        title: `${options.personALabel || '你'}的${aspect.planetA.name} ${aspect.symbol} ${options.personBLabel || 'TA'}的${aspect.planetB.name}`,
        description: `${aspect.chineseName} ${aspect.orbDiff.toFixed(1)}°，会明显影响${dimension === 'attraction' ? '吸引力' : dimension === 'emotion' ? '情绪共鸣' : dimension === 'communication' ? '沟通协同' : '长期稳定'}。`
      };

      if (delta >= 3.0) {
        strengths.push(item);
      }
      if (delta <= -3.0) {
        risks.push(item);
      }
    });
  });

  const dimensionScores = {
    attraction: clampScore(roundToNearestFive(scores.attraction)),
    emotion: clampScore(roundToNearestFive(scores.emotion)),
    communication: clampScore(roundToNearestFive(scores.communication)),
    stability: clampScore(roundToNearestFive(scores.stability))
  };

  const totalScore = clampScore(roundToNearestFive(
    (dimensionScores.attraction + dimensionScores.emotion + dimensionScores.communication + dimensionScores.stability) / 4
  ));

  return {
    relationType,
    relationLabel: RELATION_TYPES[relationType] || '关系',
    totalScore,
    dimensionScores,
    confidence: getConfidence(options.timeKnownA, options.timeKnownB),
    summary: buildSummary(totalScore, relationType, dimensionScores),
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
    suggestions: [
      '先把高分维度当成连接入口，再处理低分维度的摩擦。',
      '重要话题尽量一次说清楚，避免用冷处理代替表达。',
      options.timeKnownA && options.timeKnownB ? '可以继续结合双方近 30 天时运来判断关系推进窗口。' : '如果能补充更精确的出生时间，宫位和定位会更稳定。'
    ],
    keyAspects: crossAspects.slice(0, 8),
    houseOverlays: [],
    chartA,
    chartB
  };
}

function makeInviteCode() {
  return crypto.randomBytes(6).toString('hex');
}

module.exports = {
  generateSynastryReport,
  getPreviewFromChart,
  makeInviteCode
};
