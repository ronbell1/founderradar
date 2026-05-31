// Buy Now Score Calculator
// Deterministic scoring based on research signals (0-100)

/**
 * Calculate the Buy Now Score from raw research data
 * @param {object} rawData - All collected research data
 * @returns {{ score: number, breakdown: object[], explanation: string, tier: string }}
 */
export function calculateBuyNowScore(rawData) {
  const breakdown = [];
  let totalScore = 0;

  // 1. Funding Recency (0-20 points)
  const fundingScore = scoreFunding(rawData);
  breakdown.push({ category: 'Funding Recency', score: fundingScore.score, max: 20, signal: fundingScore.signal, icon: '💰' });
  totalScore += fundingScore.score;

  // 2. Hiring Velocity (0-20 points)
  const hiringScore = scoreHiring(rawData);
  breakdown.push({ category: 'Hiring Velocity', score: hiringScore.score, max: 20, signal: hiringScore.signal, icon: '👥' });
  totalScore += hiringScore.score;

  // 3. Leadership Change (0-15 points)
  const leadershipScore = scoreLeadership(rawData);
  breakdown.push({ category: 'Leadership Change', score: leadershipScore.score, max: 15, signal: leadershipScore.signal, icon: '👔' });
  totalScore += leadershipScore.score;

  // 4. Google Trends Momentum (0-15 points)
  const trendsScore = scoreTrends(rawData);
  breakdown.push({ category: 'Search Momentum', score: trendsScore.score, max: 15, signal: trendsScore.signal, icon: '📈' });
  totalScore += trendsScore.score;

  // 5. Pain Intensity (0-15 points)
  const painScore = scorePain(rawData);
  breakdown.push({ category: 'Pain Intensity', score: painScore.score, max: 15, signal: painScore.signal, icon: '🔥' });
  totalScore += painScore.score;

  // 6. Growth Indicators (0-15 points)
  const growthScore = scoreGrowth(rawData);
  breakdown.push({ category: 'Growth Indicators', score: growthScore.score, max: 15, signal: growthScore.signal, icon: '🚀' });
  totalScore += growthScore.score;

  const tier = totalScore >= 75 ? 'hot' : totalScore >= 50 ? 'warm' : totalScore >= 25 ? 'cool' : 'cold';
  const tierLabels = { hot: '🔥 Hot — Act Now', warm: '☀️ Warm — Strong Potential', cool: '❄️ Cool — Monitor', cold: '🧊 Cold — Low Priority' };

  return {
    score: Math.min(100, Math.round(totalScore)),
    breakdown,
    tier,
    tierLabel: tierLabels[tier],
    explanation: generateExplanation(totalScore, breakdown),
  };
}

function scoreFunding(rawData) {
  const data = rawData.agenticSearch || rawData.websiteCrawl || {};
  const text = JSON.stringify(data).toLowerCase();

  // Look for funding signals
  const fundingTerms = ['series a', 'series b', 'series c', 'series d', 'seed round', 'raised', 'funding', 'investment', 'ipo', 'valuation'];
  const recentTerms = ['2026', '2025', 'recently', 'just raised', 'announced'];

  let score = 0;
  const hasAnyfunding = fundingTerms.some(t => text.includes(t));
  const isRecent = recentTerms.some(t => text.includes(t));

  if (hasAnyfunding && isRecent) score = 18;
  else if (hasAnyfunding) score = 12;
  else if (text.includes('revenue') || text.includes('growth')) score = 8;
  else score = 4; // Baseline for existing companies

  return { score: Math.min(20, score), signal: hasAnyfunding ? 'Funding activity detected' : 'No recent funding signals' };
}

function scoreHiring(rawData) {
  const linkedin = rawData.linkedin || {};
  const jobs = rawData.linkedinJobs || {};
  const allData = { ...linkedin, ...jobs };
  const text = JSON.stringify(allData).toLowerCase();

  let score = 0;
  const jobCount = (text.match(/job|position|role|hiring|opening/g) || []).length;

  if (jobCount > 20) score = 20;
  else if (jobCount > 10) score = 16;
  else if (jobCount > 5) score = 12;
  else if (jobCount > 2) score = 8;
  else score = 3;

  return { score: Math.min(20, score), signal: `${jobCount} hiring signals detected` };
}

function scoreLeadership(rawData) {
  const text = JSON.stringify(rawData).toLowerCase();
  const leaderTerms = ['ceo', 'cto', 'cfo', 'coo', 'vp ', 'vice president', 'chief', 'head of', 'director'];
  const changeTerms = ['new', 'appointed', 'hired', 'joined', 'promoted'];

  const hasLeaders = leaderTerms.filter(t => text.includes(t)).length;
  const hasChanges = changeTerms.some(t => text.includes(t));

  let score = 0;
  if (hasChanges && hasLeaders > 2) score = 15;
  else if (hasChanges) score = 10;
  else if (hasLeaders > 3) score = 7;
  else score = 3;

  return { score: Math.min(15, score), signal: hasChanges ? 'Leadership changes detected' : `${hasLeaders} leaders identified` };
}

function scoreTrends(rawData) {
  const trends = rawData.googleTrends || {};
  const text = JSON.stringify(trends).toLowerCase();

  let score = 0;
  if (text.includes('rising') || text.includes('breakout') || text.includes('increasing')) score = 15;
  else if (text.includes('stable') || text.includes('steady')) score = 8;
  else if (Object.keys(trends).length > 0) score = 6;
  else score = 3;

  return { score: Math.min(15, score), signal: score >= 12 ? 'Strong search momentum' : 'Moderate search interest' };
}

function scorePain(rawData) {
  const reddit = rawData.reddit || {};
  const glassdoor = rawData.glassdoor || {};
  const text = JSON.stringify({ ...reddit, ...glassdoor }).toLowerCase();

  const painTerms = ['problem', 'issue', 'frustrated', 'terrible', 'broken', 'slow', 'expensive', 'hate', 'worst', 'complaint', 'bug', 'outage'];
  const painCount = painTerms.filter(t => text.includes(t)).length;

  let score = 0;
  if (painCount >= 5) score = 15;
  else if (painCount >= 3) score = 11;
  else if (painCount >= 1) score = 7;
  else score = 3;

  return { score: Math.min(15, score), signal: `${painCount} pain signals across sources` };
}

function scoreGrowth(rawData) {
  const text = JSON.stringify(rawData).toLowerCase();

  const growthTerms = ['growing', 'expansion', 'scaling', 'new market', 'launch', 'partnership', 'acquisition', 'revenue growth', 'user growth'];
  const growthCount = growthTerms.filter(t => text.includes(t)).length;

  let score = 0;
  if (growthCount >= 4) score = 15;
  else if (growthCount >= 2) score = 10;
  else if (growthCount >= 1) score = 6;
  else score = 3;

  return { score: Math.min(15, score), signal: `${growthCount} growth indicators found` };
}

function generateExplanation(score, breakdown) {
  const top = breakdown.sort((a, b) => b.score - a.score).slice(0, 3);
  const strengths = top.map(b => b.category).join(', ');

  if (score >= 75) return `This account shows very strong buying signals. Key drivers: ${strengths}. Recommend immediate outreach.`;
  if (score >= 50) return `Good potential with moderate signals. Strongest areas: ${strengths}. Worth pursuing with a targeted approach.`;
  if (score >= 25) return `Some activity but limited urgency signals. Consider monitoring for trigger events.`;
  return `Low activity across all signals. Not recommended for immediate outreach.`;
}
