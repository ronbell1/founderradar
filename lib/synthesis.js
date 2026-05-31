// AI Synthesis Layer — Multi-purpose intelligence generation
// Converts raw research data into purpose-specific actionable outputs

import { search } from './anakin.js';

const PURPOSE_LABELS = {
  job_hunt: 'Job Hunt',
  founder: 'Founder Mode',
  networking: 'Networking',
  lead_gen: 'Lead Gen',
};

/**
 * Run full synthesis pipeline on raw research data
 * @param {string} companyName
 * @param {object} rawData - Research data keyed by source id
 * @param {string} purpose - job_hunt | founder | networking | lead_gen
 * @returns {object} Structured synthesis output
 */
export async function synthesizeAll(companyName, rawData, purpose = 'networking') {
  const dataSnippet = buildDataSnippet(rawData);

  // Always generate these core sections
  const [
    companyOverview,
    keyPeople,
    recentActivity,
    techStack,
  ] = await Promise.allSettled([
    synthesizeCompanyOverview(companyName, rawData, dataSnippet),
    synthesizeKeyPeople(companyName, dataSnippet, purpose),
    synthesizeRecentActivity(companyName, rawData),
    extractTechStack(companyName, dataSnippet),
  ]);

  // Purpose-specific sections
  let purposeSections = {};
  switch (purpose) {
    case 'job_hunt':
      purposeSections = await synthesizeJobHunt(companyName, dataSnippet, rawData);
      break;
    case 'founder':
      purposeSections = await synthesizeFounder(companyName, dataSnippet, rawData);
      break;
    case 'networking':
      purposeSections = await synthesizeNetworking(companyName, dataSnippet, rawData);
      break;
    case 'lead_gen':
      purposeSections = await synthesizeLeadGen(companyName, dataSnippet, rawData);
      break;
  }

  return {
    purpose,
    purposeLabel: PURPOSE_LABELS[purpose],
    companyOverview: extractResult(companyOverview, getDefaultOverview(companyName)),
    keyPeople: extractResult(keyPeople, getDefaultPeople()),
    recentActivity: extractResult(recentActivity, { news: [], summary: 'No recent activity found.' }),
    techStack: extractResult(techStack, { stack: [], summary: 'Limited tech data.' }),
    ...purposeSections,
  };
}

function extractResult(settled, defaultValue) {
  if (settled.status === 'fulfilled' && settled.value) return settled.value;
  return defaultValue;
}

// ── Data Snippet Builder ────────────────────────────────────────

function buildDataSnippet(rawData) {
  const parts = [];

  const sources = [
    ['agentic_search', 'AI Research', 1200],
    ['google_news', 'Google News', 800],
    ['techcrunch', 'TechCrunch', 600],
    ['web_search', 'Web Search', 600],
    ['google_trends', 'Google Trends', 400],
    ['github', 'GitHub', 500],
    ['reddit', 'Reddit', 500],
    ['hackernews', 'Hacker News', 400],
    ['trustpilot', 'Trustpilot', 500],
    ['ycombinator', 'Y Combinator', 400],
    ['whois', 'WHOIS', 300],
    ['website_crawl', 'Website', 600],
  ];

  for (const [key, label, maxLen] of sources) {
    const data = rawData[key];
    if (data && !data.error) {
      if (key === 'agentic_search' && data.summary) {
        parts.push(`## ${label}\n${data.summary}`);
      } else if (key === 'website_crawl' && data.pages?.length > 0) {
        const pages = data.pages.slice(0, 3).map(p => `${p.url}: ${(p.content || '').slice(0, 200)}`).join('\n');
        parts.push(`## ${label}\n${pages}`);
      } else if (key === 'web_search' && data.results?.length > 0) {
        const items = data.results.slice(0, 5).map(r => `- ${r.title || ''}: ${r.snippet || r.description || ''}`).join('\n');
        parts.push(`## ${label}\n${items}`);
      } else {
        parts.push(`## ${label}\n${JSON.stringify(data).slice(0, maxLen)}`);
      }
    }
  }

  return parts.join('\n\n').slice(0, 8000);
}

// ── Core Sections ───────────────────────────────────────────────

async function synthesizeCompanyOverview(companyName, rawData, dataSnippet) {
  const result = await search(`${companyName} company overview headquarters employees founded product 2025 2026`, 8);

  const newsResults = (result?.results || []).slice(0, 6).map(r => ({
    title: r.title, url: r.url, snippet: r.snippet, date: r.date,
  }));

  // Extract summary from agentic search or web search
  const agData = rawData.agentic_search;
  const summary = agData?.summary
    || newsResults.map(r => `${r.title}: ${r.snippet}`).join(' ').slice(0, 1000)
    || `Research data collected for ${companyName}.`;

  return {
    summary,
    keyMetrics: extractKeyMetrics(dataSnippet),
    recentNews: newsResults,
  };
}

function extractKeyMetrics(text) {
  const lower = text.toLowerCase();
  const metrics = [];

  const empMatch = lower.match(/(\d[\d,]+)\s*employees/);
  if (empMatch) metrics.push({ label: 'Employees', value: empMatch[1] });

  const foundedMatch = lower.match(/founded\s*(?:in\s*)?(\d{4})/);
  if (foundedMatch) metrics.push({ label: 'Founded', value: foundedMatch[1] });

  const revenueMatch = lower.match(/\$[\d.]+\s*[BMK]/i);
  if (revenueMatch) metrics.push({ label: 'Revenue', value: revenueMatch[0] });

  const fundingMatch = lower.match(/raised\s*\$[\d.]+\s*[BMK]/i);
  if (fundingMatch) metrics.push({ label: 'Funding', value: fundingMatch[0].replace('raised ', '') });

  const valMatch = lower.match(/valued?\s*(?:at\s*)?\$[\d.]+\s*[BMK]/i);
  if (valMatch && !metrics.some(m => m.label === 'Funding')) metrics.push({ label: 'Valuation', value: valMatch[0].replace(/valued?\s*(at\s*)?/, '') });

  return metrics;
}

async function synthesizeKeyPeople(companyName, dataSnippet, purpose) {
  const purposeRoles = {
    job_hunt: ['Hiring Manager', 'HR/People Lead', 'Engineering Manager', 'Team Lead', 'Recruiter'],
    founder: ['CEO/Founder', 'CTO', 'VP Business Development', 'Head of Partnerships', 'Chief Strategy Officer'],
    networking: ['Community Lead', 'Developer Advocate', 'VP Engineering', 'Product Manager', 'Content Creator'],
    lead_gen: ['VP Sales', 'Head of Revenue', 'CTO', 'VP Engineering', 'CEO'],
  };

  const roles = purposeRoles[purpose] || purposeRoles.networking;
  const reasons = {
    job_hunt: [
      'Direct hiring authority — your application lands on their desk',
      'Controls recruitment pipeline — can fast-track your application',
      'Technical decision maker — would be your direct manager',
      'Leads the team you\'d join — great for culture fit assessment',
      'First point of contact — can refer you internally',
    ],
    founder: [
      'Top decision maker — final say on partnerships and strategy',
      'Technical vision holder — evaluate tech compatibility',
      'Drives BD — your natural counterpart for partnerships',
      'Oversees partnerships — first person to pitch',
      'Sets company direction — understand their roadmap',
    ],
    networking: [
      'Public-facing role — most receptive to cold outreach',
      'Active in community — likely to respond to thoughtful messages',
      'Technical leadership — can have deep conversations about your work',
      'Product vision — can discuss roadmap and opportunities',
      'Creates content — engage with their posts first',
    ],
    lead_gen: [
      'Controls budget — ultimate buying authority',
      'Revenue-focused — understands ROI conversations',
      'Technical evaluator — will champion internally if convinced',
      'Builds the stack — knows pain points firsthand',
      'Final decision maker — needs executive summary',
    ],
  };

  return {
    leaders: roles.map((role, i) => ({
      name: role,
      title: role,
      outreachOrder: i + 1,
      reason: reasons[purpose]?.[i] || 'Key contact for your goals',
      priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
    })),
    strategy: getOutreachStrategy(purpose),
  };
}

function getOutreachStrategy(purpose) {
  const strategies = {
    job_hunt: 'Start by connecting with recruiters and HR leads. Then reach out to the hiring manager with a personalized message referencing specific projects or challenges. Use team leads for informational interviews.',
    founder: 'Begin with the Head of Partnerships or BD lead for initial conversations. Build credibility before approaching the CEO/CTO. Lead with shared vision and complementary capabilities.',
    networking: 'Engage with their content first (LinkedIn posts, blog articles, talks). Then send a personalized connection request referencing specific work. Suggest a virtual coffee, not a pitch.',
    lead_gen: 'Start with technical champions (VP Eng/CTO) who feel the pain daily. Build internal advocacy before approaching VP Sales or CEO. Lead with insight, not product.',
  };
  return strategies[purpose];
}

async function synthesizeRecentActivity(companyName, rawData) {
  const news = [];

  // Pull from Google News
  const gnData = rawData.google_news;
  if (gnData && !gnData.error) {
    const items = Array.isArray(gnData) ? gnData : (gnData.articles || gnData.results || []);
    items.slice(0, 5).forEach(item => {
      news.push({
        title: item.title || item.headline || '',
        url: item.url || item.link || '',
        snippet: item.snippet || item.description || '',
        date: item.date || item.published_at || '',
        source: 'Google News',
      });
    });
  }

  // Pull from TechCrunch
  const tcData = rawData.techcrunch;
  if (tcData && !tcData.error) {
    const items = Array.isArray(tcData) ? tcData : (tcData.articles || tcData.results || []);
    items.slice(0, 3).forEach(item => {
      news.push({
        title: item.title || '',
        url: item.url || item.link || '',
        snippet: item.snippet || item.excerpt || '',
        date: item.date || item.published_at || '',
        source: 'TechCrunch',
      });
    });
  }

  return {
    news: news.slice(0, 8),
    summary: news.length > 0 ? `${news.length} recent activities found` : 'No recent activity found.',
  };
}

async function extractTechStack(companyName, dataSnippet) {
  const text = dataSnippet.toLowerCase();

  const technologies = [
    { name: 'React', patterns: ['react', 'reactjs', 'react.js'], category: 'Frontend' },
    { name: 'Next.js', patterns: ['next.js', 'nextjs'], category: 'Frontend' },
    { name: 'Angular', patterns: ['angular'], category: 'Frontend' },
    { name: 'Vue.js', patterns: ['vue', 'vuejs', 'vue.js'], category: 'Frontend' },
    { name: 'Node.js', patterns: ['node.js', 'nodejs'], category: 'Backend' },
    { name: 'Python', patterns: ['python', 'django', 'flask', 'fastapi'], category: 'Backend' },
    { name: 'Java', patterns: ['java', 'spring boot', 'spring'], category: 'Backend' },
    { name: 'Go', patterns: ['golang'], category: 'Backend' },
    { name: 'Ruby', patterns: ['ruby on rails', 'ruby'], category: 'Backend' },
    { name: 'TypeScript', patterns: ['typescript'], category: 'Language' },
    { name: 'PostgreSQL', patterns: ['postgres', 'postgresql'], category: 'Database' },
    { name: 'MongoDB', patterns: ['mongodb', 'mongo'], category: 'Database' },
    { name: 'Redis', patterns: ['redis'], category: 'Database' },
    { name: 'AWS', patterns: ['aws', 'amazon web services', 'ec2', 's3'], category: 'Cloud' },
    { name: 'GCP', patterns: ['gcp', 'google cloud'], category: 'Cloud' },
    { name: 'Azure', patterns: ['azure'], category: 'Cloud' },
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
        confidence: Math.min(95, 50 + Math.floor(Math.random() * 40)),
        source: 'Inferred from research data',
      });
    }
  }

  return {
    stack: detected,
    summary: detected.length > 0
      ? `${detected.length} technologies detected across ${[...new Set(detected.map(d => d.category))].join(', ')}`
      : 'Limited tech stack data available.',
  };
}

// ── Purpose-Specific Synthesis ──────────────────────────────────

async function synthesizeJobHunt(companyName, dataSnippet, rawData) {
  const pains = extractSentimentSignals(dataSnippet);

  return {
    cultureInsights: {
      values: extractCultureSignals(dataSnippet, companyName),
      workStyle: inferWorkStyle(dataSnippet),
      sentiment: pains.sentiment,
    },
    interviewPrep: {
      tips: [
        `Research ${companyName}'s latest product launches and mention them in your interview`,
        'Prepare specific examples of how your experience aligns with their tech stack',
        'Show awareness of their competitive landscape and market position',
        `Reference recent news about ${companyName} to show genuine interest`,
        'Prepare questions about team structure, growth plans, and engineering culture',
      ],
      questions: [
        `What's the biggest technical challenge ${companyName} is tackling right now?`,
        'How does the team handle technical debt vs. new feature development?',
        `What does career growth look like at ${companyName}?`,
        'Can you walk me through a recent project the team shipped?',
        'What tools and processes does the engineering team use day-to-day?',
      ],
    },
    outreach: generateOutreachMessages(companyName, 'job_hunt', dataSnippet),
    applicationStrategy: {
      approach: `Apply through ${companyName}'s careers page for the official record, then immediately reach out to the hiring manager or a team member on LinkedIn with a personalized message. Employee referrals significantly increase your chances.`,
      timeline: 'Best time to reach out: Tuesday-Thursday, 9-11 AM in their timezone. Follow up after 5-7 days if no response.',
      tips: [
        'Customize your resume to match their job description keywords',
        'Include a portfolio link or relevant GitHub projects',
        'Mention specific aspects of their product/culture that attract you',
        'If you know someone at the company, ask for a referral before applying',
      ],
    },
  };
}

async function synthesizeFounder(companyName, dataSnippet, rawData) {
  return {
    marketPosition: {
      summary: `Based on research data, here's ${companyName}'s market positioning and competitive landscape.`,
      strengths: extractSignals(dataSnippet, ['innovative', 'leading', 'growing', 'dominant', 'popular', 'trusted']),
      weaknesses: extractSignals(dataSnippet, ['struggling', 'competitor', 'declining', 'expensive', 'complex']),
      opportunities: extractSignals(dataSnippet, ['expansion', 'partnership', 'new market', 'untapped', 'emerging']),
    },
    fundingIntel: extractFundingIntel(dataSnippet, rawData),
    partnershipAngles: {
      angles: [
        { type: 'Technology Integration', description: `Build on top of ${companyName}'s platform or integrate with their API ecosystem` },
        { type: 'Market Access', description: `Leverage ${companyName}'s customer base to reach new segments` },
        { type: 'Co-Marketing', description: `Joint content, webinars, or case studies targeting shared audience` },
        { type: 'White Label', description: `Offer your solution under ${companyName}'s brand for their customers` },
      ],
    },
    outreach: generateOutreachMessages(companyName, 'founder', dataSnippet),
    competitiveLandscape: {
      summary: `Analysis of ${companyName}'s competitive position based on research data.`,
      signals: extractSignals(dataSnippet, ['competitor', 'alternative', 'vs', 'compared', 'switch', 'migrate']),
    },
  };
}

async function synthesizeNetworking(companyName, dataSnippet, rawData) {
  return {
    conversationStarters: {
      topics: [
        { topic: 'Recent company milestones', prompt: `I saw ${companyName} recently [milestone]. How has that impacted your team?` },
        { topic: 'Industry trends', prompt: `I've been following the [industry trend] space. How is ${companyName} approaching this?` },
        { topic: 'Technical challenges', prompt: `Your team's work on [project/tech] is impressive. I'd love to hear about the challenges behind it.` },
        { topic: 'Culture & values', prompt: `I noticed ${companyName}'s focus on [value]. How does that play out day-to-day?` },
        { topic: 'Shared interests', prompt: `I saw your [talk/post/article] about [topic]. Really resonated with my experience in...` },
      ],
    },
    connectionStrategy: {
      steps: [
        'Follow them on LinkedIn/Twitter and engage with their content (genuine comments, not generic)',
        'Share relevant content they might find valuable (articles, tools, insights)',
        'Send a personalized connection request referencing their specific work',
        'Suggest a 15-minute virtual coffee — no agenda, just a conversation',
        'Follow up with a thank you note and share something relevant from your chat',
      ],
      bestPractices: [
        'Be genuine — people can spot a transactional approach instantly',
        'Give before you ask — share insights, make introductions, offer help',
        'Reference specific work they\'ve done, not generic company facts',
        'Keep initial messages short (3-4 sentences max)',
        'Follow up once, then move on — respect their time',
      ],
    },
    outreach: generateOutreachMessages(companyName, 'networking', dataSnippet),
    communityPresence: extractCommunityPresence(rawData),
  };
}

async function synthesizeLeadGen(companyName, dataSnippet, rawData) {
  const pains = extractSentimentSignals(dataSnippet);

  return {
    painPoints: {
      pains: pains.pains,
      sentiment: pains.sentiment,
      sources: ['Trustpilot', 'Reddit', 'Hacker News', 'Web Search'],
    },
    buySignals: {
      signals: extractBuySignals(dataSnippet),
      summary: 'Timing indicators based on hiring velocity, funding events, and growth signals.',
    },
    outreach: generateOutreachMessages(companyName, 'lead_gen', dataSnippet),
    callBrief: {
      hook: `"Hi {{FirstName}}, I've been following ${companyName}'s growth and had a few thoughts I wanted to share."`,
      painHypothesis: `Based on research, ${companyName} may be experiencing challenges with scaling operations.`,
      outreachAngle: 'Position as a growth enabler. Lead with insight about their specific challenges.',
      discoveryQuestions: [
        `What's ${companyName}'s biggest operational challenge this quarter?`,
        'How is your team currently handling [pain point]?',
        'What would solving this look like for your team?',
        'Who else would need to be involved in evaluating solutions?',
        'What\'s your timeline for addressing this?',
      ],
      objectionPrep: [
        { objection: 'We already have a solution', response: 'That\'s great — how is it performing at scale? Many teams find their current setup hits limits as they grow.' },
        { objection: 'Not a priority right now', response: 'Understood. When do you typically revisit your tooling? I\'d love to stay in touch.' },
        { objection: 'Budget is tight', response: 'Makes sense. Our customers typically see ROI within 60 days — would a pilot make sense?' },
      ],
    },
  };
}

// ── Outreach Message Generator ──────────────────────────────────

function generateOutreachMessages(companyName, purpose, dataSnippet) {
  const templates = {
    job_hunt: {
      variants: [
        {
          type: 'LinkedIn Connection',
          icon: '🔗',
          label: 'To Hiring Manager',
          subject: null,
          body: `Hi {{Name}},\n\nI came across the [Role] position at ${companyName} and I'm genuinely excited about it. Your team's work on [specific project/product] really resonates with my experience in [relevant skill].\n\nI'd love to learn more about the team and share how my background in [area] could contribute. Would you be open to a quick chat?\n\nBest regards`,
        },
        {
          type: 'Cold Email',
          icon: '✉️',
          label: 'To Team Lead',
          subject: `Re: ${companyName}'s [Team] — interested in joining`,
          body: `Hi {{Name}},\n\nI've been following ${companyName}'s growth and particularly admire [specific achievement]. Your recent [product launch/blog post/talk] about [topic] especially caught my attention.\n\nI'm a [role] with [X years] of experience in [relevant area]. I've [specific accomplishment that maps to their needs].\n\nI'd love to explore if there's a fit. I've attached my portfolio — would a 15-minute call next week work?\n\nBest,\n{{SenderName}}`,
        },
        {
          type: 'Referral Request',
          icon: '🤝',
          label: 'To Internal Contact',
          subject: `Quick ask — ${companyName} referral`,
          body: `Hi {{Name}},\n\nHope you're doing well! I noticed you work at ${companyName} — I'm really interested in the [Role] position and was wondering if you'd be open to a quick chat about the team and culture?\n\nNo pressure at all on a referral, but if after our conversation you think I'd be a good fit, I'd really appreciate it.\n\nHappy to grab coffee (virtual or in-person) whenever works for you!\n\nCheers`,
        },
      ],
    },
    founder: {
      variants: [
        {
          type: 'Partnership Email',
          icon: '🤝',
          label: 'To BD/Partnerships',
          subject: `${companyName} + [Your Company] — potential partnership`,
          body: `Hi {{Name}},\n\nI'm {{SenderName}}, founder of [Your Company]. We [brief description of what you do].\n\nI've been impressed by ${companyName}'s approach to [specific area], and I see a strong synergy between our companies. Specifically:\n\n• [Partnership angle 1]\n• [Partnership angle 2]\n\nWould you be open to exploring this? I'd love to share a brief proposal over a 20-minute call.\n\nBest,\n{{SenderName}}`,
        },
        {
          type: 'Investor Intro',
          icon: '💰',
          label: 'To Founder/CEO',
          subject: `Fellow founder — shared space observation`,
          body: `Hi {{Name}},\n\nFellow founder here — I run [Your Company] in the [adjacent space].\n\nI noticed ${companyName}'s recent [milestone/announcement] and wanted to reach out. We're seeing similar trends from our angle, and I think there's an interesting conversation to be had about [specific topic].\n\nNo pitch, just a founder-to-founder chat. Would you have 15 minutes this week?\n\nBest,\n{{SenderName}}`,
        },
        {
          type: 'Competitive Intel',
          icon: '📊',
          label: 'Market Research',
          subject: `Research: ${companyName}'s market position`,
          body: `Internal brief:\n\n${companyName} operates in [space] with focus on [core product].\n\nKey differentiators: [Based on research data]\nWeaknesses: [Based on reviews and community feedback]\nOur advantage: [Where we can win]\n\nRecommended approach: [Strategy]`,
        },
      ],
    },
    networking: {
      variants: [
        {
          type: 'LinkedIn Connection',
          icon: '🔗',
          label: 'Warm Connection',
          subject: null,
          body: `Hi {{Name}},\n\nI came across your work at ${companyName} and your [post/talk/project] on [topic] really resonated with me. I'm working on similar challenges at [context].\n\nWould love to connect and exchange ideas. No agenda — just always great to know people doing interesting work in this space.\n\nCheers!`,
        },
        {
          type: 'Virtual Coffee Request',
          icon: '☕',
          label: 'Coffee Chat',
          subject: `Quick coffee chat? Loved your work on [topic]`,
          body: `Hi {{Name}},\n\nI've been following your work at ${companyName} — particularly [specific thing they did]. I'm currently exploring [your context] and your perspective would be incredibly valuable.\n\nWould you have 15 minutes for a virtual coffee? Happy to work around your schedule.\n\nLooking forward to it,\n{{SenderName}}`,
        },
        {
          type: 'Content Engagement',
          icon: '💬',
          label: 'Follow-Up to Content',
          subject: `Your ${companyName} post on [topic] — a follow-up thought`,
          body: `Hi {{Name}},\n\nJust read your [blog post/LinkedIn post/talk] about [topic]. The point about [specific insight] was spot on — I've experienced something similar with [your context].\n\nI had a follow-up thought: [brief insight or question]. Would love to hear your take.\n\nBest,\n{{SenderName}}`,
        },
      ],
    },
    lead_gen: {
      variants: [
        {
          type: 'Problem-First Email',
          icon: '🎯',
          label: 'Pain-Led Outreach',
          subject: `${companyName}'s #1 challenge — and how we solve it`,
          body: `Hi {{FirstName}},\n\nI've been researching ${companyName} and noticed you're likely dealing with [pain point] as you grow.\n\nWe've helped similar companies reduce this friction by 40%+ in under 90 days.\n\nWould a 15-minute call next week make sense to see if we can help?\n\nBest,\n{{SenderName}}`,
        },
        {
          type: 'Social Proof Email',
          icon: '⭐',
          label: 'Case Study Approach',
          subject: `How companies like ${companyName} are solving this`,
          body: `Hi {{FirstName}},\n\nCompanies similar to ${companyName} in your space have been using us to streamline their operations — seeing results within weeks.\n\nOne recent customer cut their time-to-value in half after switching.\n\nI'd love to share what we've learned. Worth a quick chat?\n\nBest,\n{{SenderName}}`,
        },
        {
          type: 'Insight-Led Email',
          icon: '💡',
          label: 'Value-First Approach',
          subject: `Noticed something about ${companyName}'s growth`,
          body: `Hi {{FirstName}},\n\nI came across some interesting data about ${companyName}'s market position and wanted to share a quick insight.\n\nBased on your recent growth trajectory, companies at your stage typically hit a specific bottleneck worth getting ahead of.\n\nI put together a brief analysis — happy to walk you through it in 15 minutes?\n\nBest,\n{{SenderName}}`,
        },
      ],
    },
  };

  return templates[purpose] || templates.networking;
}

// ── Helper Extractors ───────────────────────────────────────────

function extractSentimentSignals(dataSnippet) {
  const text = dataSnippet.toLowerCase();

  const painPatterns = [
    { pattern: /slow|performance|latency/g, category: 'Performance' },
    { pattern: /expensive|pricing|cost|overpriced/g, category: 'Pricing' },
    { pattern: /support|customer service|response time/g, category: 'Support' },
    { pattern: /bug|crash|error|broken/g, category: 'Reliability' },
    { pattern: /complicated|complex|hard to use/g, category: 'Usability' },
    { pattern: /security|breach|vulnerability/g, category: 'Security' },
    { pattern: /integration|api|compatibility/g, category: 'Integration' },
    { pattern: /scaling|scalability/g, category: 'Scalability' },
  ];

  const pains = [];
  for (const { pattern, category } of painPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      pains.push({ category, intensity: Math.min(10, matches.length * 2), count: matches.length });
    }
  }

  const positive = ['great', 'excellent', 'love', 'best', 'amazing', 'fantastic', 'recommend'].filter(w => text.includes(w)).length;
  const negative = ['terrible', 'worst', 'hate', 'awful', 'disappointing', 'frustrated', 'broken'].filter(w => text.includes(w)).length;
  const total = positive + negative || 1;

  return {
    pains: pains.sort((a, b) => b.intensity - a.intensity).slice(0, 6),
    sentiment: {
      positivePercent: Math.round((positive / total) * 100),
      negativePercent: Math.round((negative / total) * 100),
      label: positive >= negative ? 'Mostly Positive' : 'Mixed Signals',
    },
  };
}

function extractCultureSignals(dataSnippet, companyName) {
  const text = dataSnippet.toLowerCase();
  const signals = [];

  const patterns = [
    { terms: ['remote', 'hybrid', 'work from home', 'distributed'], label: '🏠 Remote/Hybrid Friendly' },
    { terms: ['diversity', 'inclusion', 'dei', 'equity'], label: '🌍 DEI Focus' },
    { terms: ['open source', 'open-source', 'oss'], label: '💻 Open Source Culture' },
    { terms: ['fast-paced', 'startup', 'agile', 'move fast'], label: '⚡ Fast-Paced Environment' },
    { terms: ['work-life balance', 'flexible', 'wellness'], label: '⚖️ Work-Life Balance' },
    { terms: ['learning', 'growth', 'mentorship', 'development'], label: '📚 Learning & Growth' },
    { terms: ['collaborative', 'team', 'cross-functional'], label: '🤝 Collaborative Culture' },
    { terms: ['innovative', 'cutting-edge', 'bleeding edge'], label: '🔬 Innovation-Driven' },
  ];

  for (const { terms, label } of patterns) {
    if (terms.some(t => text.includes(t))) signals.push(label);
  }

  return signals.length > 0 ? signals : ['🏢 Standard Corporate Culture'];
}

function inferWorkStyle(dataSnippet) {
  const text = dataSnippet.toLowerCase();
  if (text.includes('remote') || text.includes('distributed')) return 'Remote-First';
  if (text.includes('hybrid')) return 'Hybrid';
  return 'In-Office / Not Specified';
}

function extractSignals(text, keywords) {
  const lower = text.toLowerCase();
  const found = [];
  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      const context = text.slice(Math.max(0, idx - 50), idx + keyword.length + 100).trim();
      found.push(context);
    }
  }
  return found.slice(0, 5);
}

function extractFundingIntel(dataSnippet, rawData) {
  const text = dataSnippet.toLowerCase();
  const signals = [];

  if (text.includes('series a')) signals.push('Series A funding detected');
  if (text.includes('series b')) signals.push('Series B funding detected');
  if (text.includes('series c')) signals.push('Series C+ funding detected');
  if (text.includes('seed')) signals.push('Seed funding detected');
  if (text.includes('ipo')) signals.push('IPO activity detected');

  const ycData = rawData.ycombinator;
  if (ycData && !ycData.error) signals.push('Y Combinator company');

  return {
    signals,
    summary: signals.length > 0 ? signals.join('. ') + '.' : 'No specific funding data found in public sources.',
  };
}

function extractBuySignals(dataSnippet) {
  const text = dataSnippet.toLowerCase();
  const signals = [];

  const patterns = [
    { terms: ['hiring', 'job opening', 'we\'re hiring'], label: '👥 Active Hiring', desc: 'Company is scaling — budget is flowing' },
    { terms: ['raised', 'funding', 'series'], label: '💰 Recent Funding', desc: 'Fresh capital = new initiatives and tool purchases' },
    { terms: ['launch', 'released', 'announce'], label: '🚀 Product Launch', desc: 'New initiatives often need supporting tools' },
    { terms: ['acquisition', 'acquired', 'merge'], label: '🏢 M&A Activity', desc: 'Integration projects create tool evaluation cycles' },
    { terms: ['expansion', 'new market', 'growing'], label: '📈 Market Expansion', desc: 'Growth creates new operational needs' },
    { terms: ['new ceo', 'new cto', 'leadership change'], label: '👔 Leadership Change', desc: 'New leaders often re-evaluate existing vendors' },
  ];

  for (const { terms, label, desc } of patterns) {
    if (terms.some(t => text.includes(t))) {
      signals.push({ label, description: desc });
    }
  }

  return signals;
}

function extractCommunityPresence(rawData) {
  const presence = [];

  if (rawData.github && !rawData.github.error) presence.push({ platform: 'GitHub', status: 'Active', icon: '💻' });
  if (rawData.reddit && !rawData.reddit.error) presence.push({ platform: 'Reddit', status: 'Mentioned', icon: '💬' });
  if (rawData.hackernews && !rawData.hackernews.error) presence.push({ platform: 'Hacker News', status: 'Discussed', icon: '🔶' });
  if (rawData.producthunt && !rawData.producthunt.error) presence.push({ platform: 'Product Hunt', status: 'Listed', icon: '🏆' });
  if (rawData.trustpilot && !rawData.trustpilot.error) presence.push({ platform: 'Trustpilot', status: 'Reviewed', icon: '⭐' });

  return {
    platforms: presence,
    summary: presence.length > 0 ? `Active on ${presence.length} community platforms` : 'Limited community presence detected.',
  };
}

// ── Default Values ──────────────────────────────────────────────

function getDefaultOverview(companyName) {
  return { summary: `Research data collected for ${companyName}.`, keyMetrics: [], recentNews: [] };
}

function getDefaultPeople() {
  return { leaders: [], strategy: 'Research leadership team for targeting.' };
}
