// Opportunity Score Calculator (0-100)
// Uses REAL data from Wire API responses with correct paths
// Data keys: google_news, google_trends, hackernews, github, whois,
//   agentic_search, website_crawl, search_* (Anakin Search queries)

/**
 * Calculate Opportunity Score from raw research data
 * @param {object} rawData - All collected research data
 * @returns {{ score, breakdown, explanation, tier, tierLabel }}
 */
export function calculateBuyNowScore(rawData) {
  const breakdown = [];
  let totalScore = 0;

  const corpus = JSON.stringify(rawData).toLowerCase();

  // 1. Funding & Growth (0-20 points)
  const fundingScore = scoreFunding(rawData, corpus);
  breakdown.push({ category: 'Funding & Growth', score: fundingScore.score, max: 20, signal: fundingScore.signal, icon: '💰' });
  totalScore += fundingScore.score;

  // 2. Hiring Velocity (0-20 points)
  const hiringScore = scoreHiring(corpus);
  breakdown.push({ category: 'Hiring Velocity', score: hiringScore.score, max: 20, signal: hiringScore.signal, icon: '👥' });
  totalScore += hiringScore.score;

  // 3. Search Momentum — actual Google Trends data (0-15 points)
  const trendsScore = scoreTrends(rawData);
  breakdown.push({ category: 'Search Momentum', score: trendsScore.score, max: 15, signal: trendsScore.signal, icon: '📈' });
  totalScore += trendsScore.score;

  // 4. Community Buzz (0-15 points)
  const communityScore = scoreCommunity(rawData);
  breakdown.push({ category: 'Community Buzz', score: communityScore.score, max: 15, signal: communityScore.signal, icon: '💬' });
  totalScore += communityScore.score;

  // 5. News Activity (0-15 points)
  const newsScore = scoreNews(rawData);
  breakdown.push({ category: 'News Activity', score: newsScore.score, max: 15, signal: newsScore.signal, icon: '📰' });
  totalScore += newsScore.score;

  // 6. Data Richness (0-15 points)
  const richnessScore = scoreRichness(rawData);
  breakdown.push({ category: 'Data Richness', score: richnessScore.score, max: 15, signal: richnessScore.signal, icon: '🔬' });
  totalScore += richnessScore.score;

  const tier = totalScore >= 75 ? 'hot' : totalScore >= 50 ? 'warm' : totalScore >= 25 ? 'cool' : 'cold';
  const tierLabels = { hot: 'Hot — Act Now', warm: 'Warm — Good Timing', cool: 'Cool — Monitor', cold: 'Cold — Low Priority' };

  return {
    score: Math.min(100, Math.round(totalScore)),
    breakdown,
    tier,
    tierLabel: tierLabels[tier],
    explanation: generateExplanation(totalScore, breakdown),
  };
}

function scoreFunding(rawData, corpus) {
  const fundingTerms = ['series a', 'series b', 'series c', 'series d', 'seed round', 'raised', 'funding', 'investment', 'valuation', 'venture'];
  const recentTerms = ['2026', '2025', 'recently', 'just raised', 'announced'];

  const hasFunding = fundingTerms.filter(t => corpus.includes(t)).length;
  const isRecent = recentTerms.some(t => corpus.includes(t));

  let score = 3;
  if (hasFunding >= 3 && isRecent) score = 20;
  else if (hasFunding >= 2 && isRecent) score = 16;
  else if (hasFunding >= 2) score = 12;
  else if (hasFunding >= 1) score = 8;
  else if (corpus.includes('revenue') || corpus.includes('growth')) score = 5;

  return { score, signal: hasFunding > 0 ? `${hasFunding} funding signals${isRecent ? ' (recent)' : ''}` : 'No funding signals' };
}

function scoreHiring(corpus) {
  const jobTerms = ['hiring', 'job opening', 'we\'re hiring', 'join our team', 'career', 'recruiting', 'headcount', 'open position', 'job posting'];
  const count = jobTerms.filter(t => corpus.includes(t)).length;

  let score = 3;
  if (count >= 6) score = 20;
  else if (count >= 4) score = 16;
  else if (count >= 2) score = 10;
  else if (count >= 1) score = 6;

  return { score, signal: `${count} hiring signals` };
}

function scoreTrends(rawData) {
  const gt = rawData.google_trends;
  if (!gt || gt.error) return { score: 3, signal: 'No trends data' };

  // Use actual numerical data
  const points = gt.data || [];
  if (!Array.isArray(points) || points.length < 4) return { score: 5, signal: 'Limited trends data' };

  const values = points.map(p => p.value || 0);
  const recent = values.slice(-4);
  const early = values.slice(0, 4);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;

  let score = 7;
  if (recentAvg > earlyAvg * 1.2) score = 15;
  else if (recentAvg > earlyAvg * 1.05) score = 12;
  else if (recentAvg > earlyAvg * 0.95) score = 8;
  else score = 4;

  const direction = recentAvg > earlyAvg * 1.1 ? 'Rising' : recentAvg < earlyAvg * 0.9 ? 'Declining' : 'Stable';
  return { score, signal: `${direction} trend (${Math.round(recentAvg)} vs ${Math.round(earlyAvg)} avg)` };
}

function scoreCommunity(rawData) {
  let score = 0;

  // HN posts — actual data
  const hn = rawData.hackernews;
  if (hn && !hn.error) {
    const hits = hn.hits || [];
    if (Array.isArray(hits)) {
      const topPoints = hits.slice(0, 5).reduce((sum, h) => sum + (h.points || 0), 0);
      if (topPoints > 500) score += 8;
      else if (topPoints > 100) score += 5;
      else if (hits.length > 0) score += 3;
    }
  }

  // GitHub — actual data
  const gh = rawData.github;
  if (gh && !gh.error) {
    const repos = gh.repositories || [];
    if (Array.isArray(repos)) {
      const topStars = repos.slice(0, 3).reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      if (topStars > 5000) score += 7;
      else if (topStars > 500) score += 5;
      else if (repos.length > 0) score += 2;
    }
  }

  return { score: Math.min(15, score), signal: `Community activity from HN + GitHub` };
}

function scoreNews(rawData) {
  const gn = rawData.google_news;
  if (!gn || gn.error) return { score: 3, signal: 'No news data' };

  const articles = gn.data || [];
  if (!Array.isArray(articles)) return { score: 3, signal: 'No news articles' };

  let score = 3;
  if (articles.length >= 8) score = 15;
  else if (articles.length >= 5) score = 12;
  else if (articles.length >= 2) score = 8;
  else if (articles.length >= 1) score = 5;

  return { score, signal: `${articles.length} recent news articles` };
}

function scoreRichness(rawData) {
  let sourcesWithData = 0;
  for (const [key, value] of Object.entries(rawData)) {
    if (value && !value.error && Object.keys(value).length > 0) sourcesWithData++;
  }

  let score = 3;
  if (sourcesWithData >= 10) score = 15;
  else if (sourcesWithData >= 7) score = 12;
  else if (sourcesWithData >= 4) score = 8;
  else if (sourcesWithData >= 2) score = 5;

  return { score, signal: `${sourcesWithData} data sources returned data` };
}

function generateExplanation(score, breakdown) {
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 3).map(b => b.category).join(', ');

  if (score >= 75) return `Strong signals across the board. Key drivers: ${strengths}. Great timing to reach out.`;
  if (score >= 50) return `Good signals with room to grow. Strongest areas: ${strengths}. Worth pursuing.`;
  if (score >= 25) return `Some activity but limited urgency. Top signals: ${strengths}. Monitor for trigger events.`;
  return `Low activity across signals. May not be the right time.`;
}
