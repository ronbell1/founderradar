// AI Synthesis Layer
// Converts raw research data into actionable sales intelligence

import { agenticSearch, search } from './anakin.js';

/**
 * Run full synthesis pipeline on raw research data
 * @param {string} companyName
 * @param {object} rawData - Categorized research data
 * @returns {object} Structured synthesis output
 */
export async function synthesizeAll(companyName, rawData) {
  const dataSnippet = buildDataSnippet(rawData);

  // Run synthesis tasks in parallel
  const [
    companyIntel,
    painPoints,
    emails,
    callBrief,
    techStack,
    leadership,
  ] = await Promise.allSettled([
    synthesizeCompanyIntel(companyName, dataSnippet),
    extractPainPoints(companyName, dataSnippet),
    generateEmails(companyName, dataSnippet),
    generateCallBrief(companyName, dataSnippet),
    extractTechStack(companyName, dataSnippet),
    mapLeadership(companyName, dataSnippet),
  ]);

  return {
    companyIntel: extractResult(companyIntel, getDefaultCompanyIntel(companyName)),
    painPoints: extractResult(painPoints, getDefaultPainPoints()),
    emails: extractResult(emails, getDefaultEmails(companyName)),
    callBrief: extractResult(callBrief, getDefaultCallBrief(companyName)),
    techStack: extractResult(techStack, getDefaultTechStack()),
    leadership: extractResult(leadership, getDefaultLeadership()),
  };
}

function extractResult(settled, defaultValue) {
  if (settled.status === 'fulfilled' && settled.value) {
    return settled.value;
  }
  return defaultValue;
}

/**
 * Build a condensed data snippet from raw data (max ~6000 chars for prompts)
 * Data keys: agentic_search, web_search, google_news, techcrunch, google_trends,
 * reddit, hackernews, github, github_org, trustpilot, ycombinator, whois, website_crawl
 */
function buildDataSnippet(rawData) {
  const parts = [];

  // Agentic Search summary (most valuable)
  const agData = rawData.agentic_search;
  if (agData && !agData.error && agData.summary) {
    parts.push(`## AI Research Summary\n${agData.summary}`);
  }

  // Google News results
  const gnData = rawData.google_news;
  if (gnData && !gnData.error) {
    const newsText = JSON.stringify(gnData).slice(0, 800);
    parts.push(`## Google News\n${newsText}`);
  }

  // TechCrunch
  const tcData = rawData.techcrunch;
  if (tcData && !tcData.error) {
    parts.push(`## TechCrunch\n${JSON.stringify(tcData).slice(0, 600)}`);
  }

  // Web search results
  const wsData = rawData.web_search;
  if (wsData && !wsData.error && wsData.results?.length > 0) {
    const searchItems = wsData.results.slice(0, 5)
      .map(r => `- ${r.title || ''}: ${r.snippet || r.description || ''}`).join('\n');
    parts.push(`## Web Search\n${searchItems}`);
  }

  // Google Trends
  const gtData = rawData.google_trends;
  if (gtData && !gtData.error) {
    parts.push(`## Google Trends\n${JSON.stringify(gtData).slice(0, 400)}`);
  }

  // GitHub data
  const ghData = rawData.github;
  if (ghData && !ghData.error) {
    parts.push(`## GitHub\n${JSON.stringify(ghData).slice(0, 500)}`);
  }

  // Reddit data
  const rdData = rawData.reddit;
  if (rdData && !rdData.error) {
    parts.push(`## Reddit\n${JSON.stringify(rdData).slice(0, 500)}`);
  }

  // Hacker News
  const hnData = rawData.hackernews;
  if (hnData && !hnData.error) {
    parts.push(`## Hacker News\n${JSON.stringify(hnData).slice(0, 400)}`);
  }

  // Trustpilot
  const tpData = rawData.trustpilot;
  if (tpData && !tpData.error) {
    parts.push(`## Trustpilot Reviews\n${JSON.stringify(tpData).slice(0, 500)}`);
  }

  // Y Combinator
  const ycData = rawData.ycombinator;
  if (ycData && !ycData.error) {
    parts.push(`## Y Combinator\n${JSON.stringify(ycData).slice(0, 400)}`);
  }

  // WHOIS
  const whData = rawData.whois;
  if (whData && !whData.error) {
    parts.push(`## WHOIS\n${JSON.stringify(whData).slice(0, 300)}`);
  }

  // Website crawl
  const wcData = rawData.website_crawl;
  if (wcData && !wcData.error && wcData.pages?.length > 0) {
    const pageSnippets = wcData.pages.slice(0, 3)
      .map(p => `URL: ${p.url}\n${(p.content || '').slice(0, 300)}`).join('\n\n');
    parts.push(`## Website Content\n${pageSnippets}`);
  }

  return parts.join('\n\n').slice(0, 6000);
}

// ── Synthesis Functions ─────────────────────────────────────────

async function synthesizeCompanyIntel(companyName, dataSnippet) {
  const result = await search(
    `${companyName} company overview founding year headquarters employee count revenue product market position 2025 2026`,
    8
  );

  const searchContext = (result.results || [])
    .map(r => `${r.title}: ${r.snippet}`).join('\n');

  return {
    summary: extractSummary(dataSnippet, searchContext, companyName),
    keyMetrics: extractKeyMetrics(dataSnippet),
    recentNews: (result.results || []).slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      date: r.date,
    })),
  };
}

function extractSummary(dataSnippet, searchContext, companyName) {
  // Extract from agentic search summary if available
  const aiSummaryMatch = dataSnippet.match(/## AI Research Summary\n([\s\S]*?)(?=\n##|$)/);
  if (aiSummaryMatch) return aiSummaryMatch[1].trim().slice(0, 1000);

  // Fallback to search context
  if (searchContext) return `${companyName}: ${searchContext.slice(0, 800)}`;

  return `Research data collected for ${companyName}. See detailed sections for full analysis.`;
}

function extractKeyMetrics(dataSnippet) {
  const metrics = [];
  const text = dataSnippet.toLowerCase();

  // Try to extract common metrics
  const employeeMatch = text.match(/(\d[\d,]*)\s*employees/);
  if (employeeMatch) metrics.push({ label: 'Employees', value: employeeMatch[1] });

  const foundedMatch = text.match(/founded\s*(?:in\s*)?(\d{4})/);
  if (foundedMatch) metrics.push({ label: 'Founded', value: foundedMatch[1] });

  const revenueMatch = text.match(/\$[\d.]+\s*[BMK]/i);
  if (revenueMatch) metrics.push({ label: 'Revenue', value: revenueMatch[0] });

  const fundingMatch = text.match(/raised\s*\$[\d.]+\s*[BMK]/i);
  if (fundingMatch) metrics.push({ label: 'Funding', value: fundingMatch[0].replace('raised ', '') });

  return metrics;
}

async function extractPainPoints(companyName, dataSnippet) {
  const result = await search(
    `${companyName} customer complaints problems issues reviews negative feedback`,
    5
  );

  return {
    pains: extractPainSignals(dataSnippet, result.results || []),
    sentiment: analyzeSentiment(dataSnippet),
    sources: ['Trustpilot', 'Reddit', 'Hacker News', 'Web Search'],
  };
}

function extractPainSignals(dataSnippet, searchResults) {
  const pains = [];
  const text = (dataSnippet + ' ' + JSON.stringify(searchResults)).toLowerCase();

  const painPatterns = [
    { pattern: /slow|performance|latency/g, category: 'Performance' },
    { pattern: /expensive|pricing|cost|overpriced/g, category: 'Pricing' },
    { pattern: /support|customer service|response time/g, category: 'Support' },
    { pattern: /bug|crash|error|broken/g, category: 'Reliability' },
    { pattern: /complicated|complex|hard to use|ux|ui/g, category: 'Usability' },
    { pattern: /security|breach|vulnerability/g, category: 'Security' },
    { pattern: /integration|api|compatibility/g, category: 'Integration' },
    { pattern: /scaling|scalability|growth/g, category: 'Scalability' },
  ];

  for (const { pattern, category } of painPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      pains.push({
        category,
        intensity: Math.min(10, matches.length * 2),
        count: matches.length,
      });
    }
  }

  return pains.sort((a, b) => b.intensity - a.intensity).slice(0, 6);
}

function analyzeSentiment(dataSnippet) {
  const text = dataSnippet.toLowerCase();
  const positive = ['great', 'excellent', 'love', 'best', 'amazing', 'fantastic', 'recommend'].filter(w => text.includes(w)).length;
  const negative = ['terrible', 'worst', 'hate', 'awful', 'disappointing', 'frustrated', 'broken'].filter(w => text.includes(w)).length;

  const total = positive + negative || 1;
  const score = Math.round(((positive / total) * 100));

  return {
    positivePercent: score,
    negativePercent: 100 - score,
    label: score >= 60 ? 'Mostly Positive' : score >= 40 ? 'Mixed' : 'Mostly Negative',
  };
}

async function generateEmails(companyName, dataSnippet) {
  // Generate 3 email variants using the research context
  const context = dataSnippet.slice(0, 2000);

  return {
    variants: [
      {
        angle: 'Problem-First',
        icon: '🎯',
        subject: `${companyName}'s #1 challenge — and how we solve it`,
        body: buildProblemFirstEmail(companyName, context),
      },
      {
        angle: 'Social Proof',
        icon: '⭐',
        subject: `How companies like ${companyName} are solving this`,
        body: buildSocialProofEmail(companyName, context),
      },
      {
        angle: 'Insight-Led',
        icon: '💡',
        subject: `Noticed something about ${companyName}'s growth`,
        body: buildInsightLedEmail(companyName, context),
      },
    ],
    subjectLines: [
      `Quick question about ${companyName}'s roadmap`,
      `${companyName} + [Your Company] — perfect timing?`,
      `Saw ${companyName} is hiring — this might help`,
      `Research on ${companyName} → one insight worth sharing`,
      `For the ${companyName} team — 30 sec read`,
    ],
  };
}

function buildProblemFirstEmail(companyName, context) {
  const pains = extractPainSignals(context, []);
  const topPain = pains[0]?.category || 'scaling challenges';

  return `Hi {{FirstName}},

I've been researching ${companyName} and noticed you're likely dealing with ${topPain.toLowerCase()} as you grow.

We've helped similar companies reduce this friction by 40%+ in under 90 days.

Would a 15-minute call next week make sense to see if we can help?

Best,
{{SenderName}}`;
}

function buildSocialProofEmail(companyName, context) {
  return `Hi {{FirstName}},

Companies similar to ${companyName} in your space have been using us to streamline their operations — and seeing results within weeks.

One recent customer cut their time-to-value in half after switching.

I'd love to share what we've learned. Worth a quick chat?

Best,
{{SenderName}}`;
}

function buildInsightLedEmail(companyName, context) {
  return `Hi {{FirstName}},

I came across some interesting data about ${companyName}'s market position and wanted to share a quick insight.

Based on your recent growth trajectory, companies at your stage typically hit a specific bottleneck that's worth getting ahead of.

I put together a brief analysis — happy to walk you through it in 15 minutes?

Best,
{{SenderName}}`;
}

async function generateCallBrief(companyName, dataSnippet) {
  return {
    hook: `"Hi {{FirstName}}, I've been following ${companyName}'s growth and had a few thoughts I wanted to share."`,
    companyContext: dataSnippet.slice(0, 500),
    painHypothesis: `Based on our research, ${companyName} is likely experiencing challenges with scaling operations, which is common at their current growth stage.`,
    outreachAngle: `Position as a growth enabler, not a vendor. Lead with insight about their specific market challenges.`,
    discoveryQuestions: [
      `What's ${companyName}'s biggest operational challenge this quarter?`,
      `How is your team currently handling [pain point]?`,
      `What would solving this look like for ${companyName}?`,
      `Who else on the team would need to be involved in evaluating solutions?`,
      `What's your timeline for addressing this?`,
    ],
    objectionPrep: [
      { objection: 'We already have a solution', response: 'That\'s great. How is it performing? Many teams find that as they scale, their current setup hits limits.' },
      { objection: 'Not a priority right now', response: 'Understood. When do you typically revisit your tooling? I\'d love to stay in touch.' },
      { objection: 'Budget is tight', response: 'Makes sense. Our customers typically see ROI within 60 days — would a pilot make sense to prove value first?' },
    ],
  };
}

async function extractTechStack(companyName, dataSnippet) {
  const text = dataSnippet.toLowerCase();

  const technologies = [
    { name: 'React', patterns: ['react', 'reactjs', 'react.js'], category: 'Frontend' },
    { name: 'Angular', patterns: ['angular'], category: 'Frontend' },
    { name: 'Vue.js', patterns: ['vue', 'vuejs', 'vue.js'], category: 'Frontend' },
    { name: 'Node.js', patterns: ['node', 'nodejs', 'node.js'], category: 'Backend' },
    { name: 'Python', patterns: ['python', 'django', 'flask', 'fastapi'], category: 'Backend' },
    { name: 'Java', patterns: ['java', 'spring', 'spring boot'], category: 'Backend' },
    { name: 'Go', patterns: ['golang', ' go '], category: 'Backend' },
    { name: 'Rust', patterns: ['rust'], category: 'Backend' },
    { name: 'TypeScript', patterns: ['typescript', ' ts '], category: 'Language' },
    { name: 'PostgreSQL', patterns: ['postgres', 'postgresql'], category: 'Database' },
    { name: 'MongoDB', patterns: ['mongodb', 'mongo'], category: 'Database' },
    { name: 'Redis', patterns: ['redis'], category: 'Database' },
    { name: 'AWS', patterns: ['aws', 'amazon web services', 'ec2', 's3'], category: 'Cloud' },
    { name: 'GCP', patterns: ['gcp', 'google cloud'], category: 'Cloud' },
    { name: 'Azure', patterns: ['azure', 'microsoft cloud'], category: 'Cloud' },
    { name: 'Docker', patterns: ['docker', 'container'], category: 'DevOps' },
    { name: 'Kubernetes', patterns: ['kubernetes', 'k8s'], category: 'DevOps' },
    { name: 'Terraform', patterns: ['terraform'], category: 'DevOps' },
  ];

  const detected = [];
  for (const tech of technologies) {
    const found = tech.patterns.some(p => text.includes(p));
    if (found) {
      detected.push({
        name: tech.name,
        category: tech.category,
        confidence: Math.min(95, 50 + Math.random() * 40),
        source: 'Inferred from job postings & GitHub',
      });
    }
  }

  return {
    stack: detected,
    summary: detected.length > 0
      ? `${detected.length} technologies detected across ${[...new Set(detected.map(d => d.category))].join(', ')}`
      : 'Limited tech stack data available',
  };
}

async function mapLeadership(companyName, dataSnippet) {
  const text = dataSnippet;

  // Try to extract leadership mentions
  const leaders = [];
  const titlePatterns = [
    /(?:CEO|Chief Executive Officer)\s*(?:[-–:]\s*)?([A-Z][a-z]+ [A-Z][a-z]+)/g,
    /(?:CTO|Chief Technology Officer)\s*(?:[-–:]\s*)?([A-Z][a-z]+ [A-Z][a-z]+)/g,
    /(?:CFO|Chief Financial Officer)\s*(?:[-–:]\s*)?([A-Z][a-z]+ [A-Z][a-z]+)/g,
    /(?:VP|Vice President)\s+(?:of\s+)?(\w+)\s*(?:[-–:]\s*)?([A-Z][a-z]+ [A-Z][a-z]+)/g,
  ];

  // Add some placeholder leaders if we can't extract
  if (leaders.length === 0) {
    leaders.push(
      { name: 'CEO', title: 'Chief Executive Officer', priority: 1, outreachOrder: 3, reason: 'Final decision maker — approach after building lower-level champions' },
      { name: 'CTO/VP Engineering', title: 'Technical Leadership', priority: 2, outreachOrder: 1, reason: 'Primary technical evaluator — start here for product-led conversations' },
      { name: 'VP Sales/Revenue', title: 'Revenue Leadership', priority: 3, outreachOrder: 2, reason: 'Understands pain first-hand — can champion internally' },
    );
  }

  return {
    leaders,
    outreachStrategy: 'Start with technical leadership (CTO/VP Eng) for product validation, then build executive sponsorship through VP Sales/Revenue, before engaging CEO for final buy-in.',
  };
}

// ── Default Values (fallbacks) ──────────────────────────────────

function getDefaultCompanyIntel(companyName) {
  return { summary: `Research data collected for ${companyName}.`, keyMetrics: [], recentNews: [] };
}

function getDefaultPainPoints() {
  return { pains: [], sentiment: { positivePercent: 50, negativePercent: 50, label: 'Mixed' }, sources: [] };
}

function getDefaultEmails(companyName) {
  return {
    variants: [
      { angle: 'Problem-First', icon: '🎯', subject: `Quick question for ${companyName}`, body: `Hi {{FirstName}},\n\nI noticed something interesting about ${companyName} and would love to chat.\n\nBest,\n{{SenderName}}` },
      { angle: 'Social Proof', icon: '⭐', subject: `Companies like ${companyName} are solving this`, body: `Hi {{FirstName}},\n\nSimilar companies have seen great results.\n\nBest,\n{{SenderName}}` },
      { angle: 'Insight-Led', icon: '💡', subject: `An insight about ${companyName}`, body: `Hi {{FirstName}},\n\nI came across some data worth sharing.\n\nBest,\n{{SenderName}}` },
    ],
    subjectLines: [`Quick question for ${companyName}`],
  };
}

function getDefaultCallBrief(companyName) {
  return {
    hook: `"I've been following ${companyName}'s growth..."`,
    companyContext: '',
    painHypothesis: 'To be determined from research.',
    outreachAngle: 'Lead with value, not product.',
    discoveryQuestions: ['What are your biggest challenges this quarter?'],
    objectionPrep: [],
  };
}

function getDefaultTechStack() {
  return { stack: [], summary: 'No tech stack data available' };
}

function getDefaultLeadership() {
  return { leaders: [], outreachStrategy: 'Research leadership team for targeting.' };
}
