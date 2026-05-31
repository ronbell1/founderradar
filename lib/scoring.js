// Buy Now Score Calculator
// Deterministic scoring based on research signals (0-100)
// Data keys match research-engine output: google_news, techcrunch, google_trends,
// reddit, hackernews, github, github_org, trustpilot, ycombinator, whois,
// producthunt, website_crawl, agentic_search, web_search

/**
 * Calculate the Buy Now Score from raw research data
 * @param {object} rawData - All collected research data keyed by source id
 * @returns {{ score: number, breakdown: object[], explanation: string, tier: string }}
 */
export function calculateBuyNowScore(rawData) {
  const breakdown = [];
  let totalScore = 0;

  // Stringify all data once for text-based signal detection
  const allText = JSON.stringify(rawData).toLowerCase();

  // 1. Funding Recency (0-20 points)
  const fundingScore = scoreFunding(rawData, allText);
  breakdown.push({ category: 'Funding Recency', score: fundingScore.score, max: 20, signal: fundingScore.signal, icon: '💰' });
  totalScore += fundingScore.score;

  // 2. Hiring Velocity (0-20 points)
  const hiringScore = scoreHiring(rawData, allText);
  breakdown.push({ category: 'Hiring Velocity', score: hiringScore.score, max: 20, signal: hiringScore.signal, icon: '👥' });
  totalScore += hiringScore.score;

  // 3. Leadership Change (0-15 points)
  const leadershipScore = scoreLeadership(allText);
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
  const growthScore = scoreGrowth(allText);
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

function scoreFunding(rawData, allText) {
  // Primary: TechCrunch funding articles, YC data
  const tcData = rawData.techcrunch || {};
  const ycData = rawData.ycombinator || {};
  const agData = rawData.agentic_search || {};
  const text = JSON.stringify({ ...tcData, ...ycData, ...agData }).toLowerCase();

  const fundingTerms = ['series a', 'series b', 'series c', 'series d', 'seed round', 'raised', 'funding', 'investment', 'ipo', 'valuation', 'venture', 'capital'];
  const recentTerms = ['2026', '2025', 'recently', 'just raised', 'announced', 'today'];

  const hasFunding = fundingTerms.filter(t => text.includes(t)).length;
  const isRecent = recentTerms.some(t => text.includes(t));

  let score = 0;
  if (hasFunding >= 3 && isRecent) score = 20;
  else if (hasFunding >= 2 && isRecent) score = 16;
  else if (hasFunding >= 1) score = 12;
  else if (text.includes('revenue') || text.includes('growth')) score = 8;
  else score = 4;

  return { score: Math.min(20, score), signal: hasFunding > 0 ? `${hasFunding} funding signals detected` : 'No funding signals' };
}

function scoreHiring(rawData, allText) {
  // Look for hiring signals across all sources (news, web search, etc.)
  const jobTerms = ['hiring', 'job opening', 'we\'re hiring', 'join our team', 'open position', 'career', 'job posting', 'recruiting', 'headcount'];
  const jobCount = jobTerms.filter(t => allText.includes(t)).length;

  let score = 0;
  if (jobCount >= 6) score = 20;
  else if (jobCount >= 4) score = 16;
  else if (jobCount >= 2) score = 12;
  else if (jobCount >= 1) score = 8;
  else score = 3;

  return { score: Math.min(20, score), signal: `${jobCount} hiring signals detected` };
}

function scoreLeadership(allText) {
  const leaderTerms = ['ceo', 'cto', 'cfo', 'coo', 'vp ', 'vice president', 'chief', 'head of', 'director', 'founder', 'co-founder'];
  const changeTerms = ['new ceo', 'new cto', 'appointed', 'promoted', 'steps down', 'leadership change', 'executive'];

  const hasLeaders = leaderTerms.filter(t => allText.includes(t)).length;
  const hasChanges = changeTerms.filter(t => allText.includes(t)).length;

  let score = 0;
  if (hasChanges >= 2) score = 15;
  else if (hasChanges >= 1 && hasLeaders > 2) score = 12;
  else if (hasChanges >= 1) score = 10;
  else if (hasLeaders > 3) score = 7;
  else score = 3;

  return { score: Math.min(15, score), signal: hasChanges > 0 ? `${hasChanges} leadership changes detected` : `${hasLeaders} leaders identified` };
}

function scoreTrends(rawData) {
  const trends = rawData.google_trends || {};
  if (trends.error) return { score: 3, signal: 'Google Trends data unavailable' };

  const text = JSON.stringify(trends).toLowerCase();
  const hasData = !trends.error && Object.keys(trends).length > 0;

  let score = 0;
  if (text.includes('rising') || text.includes('breakout')) score = 15;
  else if (hasData && (text.includes('100') || text.includes('increasing'))) score = 12;
  else if (hasData) score = 8;
  else score = 3;

  return { score: Math.min(15, score), signal: score >= 12 ? 'Strong search momentum' : hasData ? 'Active search interest' : 'Limited trend data' };
}

function scorePain(rawData) {
  // Pull from Reddit, Trustpilot, Hacker News
  const reddit = rawData.reddit || {};
  const trustpilot = rawData.trustpilot || {};
  const hn = rawData.hackernews || {};
  const text = JSON.stringify({ ...reddit, ...trustpilot, ...hn }).toLowerCase();

  const painTerms = ['problem', 'issue', 'frustrated', 'terrible', 'broken', 'slow', 'expensive', 'hate', 'worst', 'complaint', 'bug', 'outage', 'disappointed', 'poor'];
  const painCount = painTerms.filter(t => text.includes(t)).length;

  let score = 0;
  if (painCount >= 6) score = 15;
  else if (painCount >= 4) score = 12;
  else if (painCount >= 2) score = 8;
  else if (painCount >= 1) score = 5;
  else score = 3;

  return { score: Math.min(15, score), signal: `${painCount} pain signals across Reddit, Trustpilot, HN` };
}

function scoreGrowth(allText) {
  const growthTerms = ['growing', 'expansion', 'scaling', 'new market', 'launch', 'partnership', 'acquisition', 'revenue growth', 'user growth', 'milestone', 'record'];
  const growthCount = growthTerms.filter(t => allText.includes(t)).length;

  let score = 0;
  if (growthCount >= 5) score = 15;
  else if (growthCount >= 3) score = 12;
  else if (growthCount >= 1) score = 7;
  else score = 3;

  return { score: Math.min(15, score), signal: `${growthCount} growth indicators found` };
}

function generateExplanation(score, breakdown) {
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3).map(b => b.category).join(', ');

  if (score >= 75) return `This account shows very strong buying signals. Key drivers: ${strengths}. Recommend immediate outreach.`;
  if (score >= 50) return `Good potential with moderate signals. Strongest areas: ${strengths}. Worth pursuing with a targeted approach.`;
  if (score >= 25) return `Some activity but limited urgency signals. Consider monitoring for trigger events. Top signals: ${strengths}.`;
  return `Low activity across all signals. Not recommended for immediate outreach.`;
}
