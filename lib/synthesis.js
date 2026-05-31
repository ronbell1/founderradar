// AI Synthesis Layer — Converts raw research data into actionable intelligence
// Uses REAL data from APIs: actual person names from agentic search, actual news from Google News,
// actual trends from Google Trends, actual repos from GitHub, actual posts from HN

import { search } from './anakin.js';

const PURPOSE_LABELS = {
  job_hunt: 'Job Hunt',
  founder: 'Founder Mode',
  networking: 'Networking',
  lead_gen: 'Lead Gen',
};

/**
 * Run full synthesis pipeline
 * @param {string} companyName
 * @param {object} rawData - Research data keyed by source id
 * @param {string} purpose - job_hunt | founder | networking | lead_gen
 */
export async function synthesizeAll(companyName, rawData, purpose = 'networking') {
  // Extract real people from agentic search
  const realPeople = extractRealPeople(rawData);
  // Extract real news articles
  const realNews = extractRealNews(rawData);
  // Extract real GitHub repos
  const realRepos = extractRealRepos(rawData);
  // Extract real HN posts
  const realHNPosts = extractRealHNPosts(rawData);
  // Extract real trends data
  const realTrends = extractRealTrends(rawData);
  // Extract WHOIS data
  const whoisData = extractWhoisData(rawData);
  // Extract website data
  const websiteData = extractWebsiteData(rawData);
  // Aggregate all search results
  const searchResults = extractAllSearchResults(rawData);
  // Build text corpus for pattern matching
  const textCorpus = buildTextCorpus(rawData);
  // Get agentic summary
  const agenticSummary = rawData.agentic_search?.summary || '';

  // Core sections (always generated)
  const companyOverview = buildCompanyOverview(companyName, agenticSummary, searchResults, realNews, realTrends, whoisData, textCorpus);
  const keyPeople = buildKeyPeople(realPeople, purpose, companyName);
  const recentActivity = { news: realNews, hnPosts: realHNPosts, summary: `${realNews.length} news articles, ${realHNPosts.length} HN discussions` };
  const techStack = buildTechStack(textCorpus, realRepos);
  const githubRepos = realRepos;
  const trendsData = realTrends;

  // Purpose-specific sections
  let purposeSections = {};
  switch (purpose) {
    case 'job_hunt':
      purposeSections = buildJobHuntSections(companyName, textCorpus, searchResults, realPeople);
      break;
    case 'founder':
      purposeSections = buildFounderSections(companyName, textCorpus, searchResults, rawData);
      break;
    case 'networking':
      purposeSections = buildNetworkingSections(companyName, textCorpus, searchResults, rawData, realPeople);
      break;
    case 'lead_gen':
      purposeSections = buildLeadGenSections(companyName, textCorpus, searchResults, realPeople);
      break;
  }

  return {
    purpose,
    purposeLabel: PURPOSE_LABELS[purpose],
    companyOverview,
    keyPeople,
    recentActivity,
    techStack,
    githubRepos,
    trendsData,
    whoisData,
    outreach: generateOutreachMessages(companyName, purpose, realPeople),
    ...purposeSections,
  };
}

// ── Real Data Extractors ────────────────────────────────────────

function extractRealPeople(rawData) {
  const ag = rawData.agentic_search;
  if (!ag || ag.error) return [];

  const structured = ag.structured || {};

  // Try all possible keys for people arrays
  const possibleKeys = [
    'leadership_team', 'leaders', 'key_people', 'team', 'decision_makers',
    'executives', 'management', 'contacts', 'people', 'stakeholders',
  ];

  let team = [];
  for (const key of possibleKeys) {
    if (Array.isArray(structured[key]) && structured[key].length > 0) {
      team = structured[key];
      break;
    }
  }

  // If no named key found, search all values for arrays of people
  if (team.length === 0) {
    for (const val of Object.values(structured)) {
      if (Array.isArray(val) && val.length > 0 && val[0] && (val[0].name || val[0].title)) {
        team = val;
        break;
      }
    }
  }

  // Try to extract email format from structured data
  const emailFormat = structured.email_format || structured.emailFormat || structured.email_pattern || '';

  // Extract LinkedIn URLs from the contact search results
  const contactLinks = extractContactLinks(rawData);

  // Extract from array
  if (team.length > 0) {
    return team.filter(p => p.name).map((p, i) => {
      const linkedin = p.linkedin || p.linkedin_url || p.linkedinUrl || p.linkedin_profile || '';
      const twitter = p.twitter || p.twitter_handle || p.twitterHandle || p.x_handle || '';
      const email = p.email || p.email_address || '';
      const website = p.website || p.blog || p.personal_website || '';

      // Try to find a LinkedIn URL from search results if not in structured data
      const matchedContact = !linkedin ? contactLinks.find(c => {
        const personLower = p.name.toLowerCase();
        const urlLower = c.url.toLowerCase();
        const nameParts = personLower.split(' ');
        return nameParts.some(part => part.length > 2 && urlLower.includes(part));
      }) : null;

      return {
        name: p.name,
        title: p.position || p.title || p.role || '',
        bio: p.biography || p.bio || p.description || '',
        order: i + 1,
        contact: {
          linkedin: linkedin || matchedContact?.url || '',
          twitter: twitter ? (twitter.startsWith('@') ? twitter : `@${twitter}`) : '',
          email: email,
          website: website,
          emailFormat: emailFormat,
        },
      };
    });
  }

  // Fallback: parse names from the agentic summary text
  const summary = ag.summary || '';
  if (summary.length > 50) {
    return extractPeopleFromText(summary);
  }

  return [];
}

function extractContactLinks(rawData) {
  const contacts = rawData.search_contacts;
  if (!contacts || contacts.error || !contacts.results) return [];
  return contacts.results
    .filter(r => r.url && r.url.includes('linkedin.com/in/'))
    .map(r => ({ url: r.url, title: r.title || '' }));
}

function extractPeopleFromText(text) {
  const people = [];
  // Match patterns like "Name as/is Title" or "Title Name" etc.
  const patterns = [
    /(\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:as|is|serves as)\s+(?:the\s+)?([A-Z][A-Za-z\s&/,]+?)(?:\.|,|\band\b|$)/g,
    /(\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*[—–-]\s*([A-Z][A-Za-z\s&/,]+?)(?:\.|,|$)/g,
    // "CEO Patrick Collison" or "CTO Jurgen van Gael"
    /(?:CEO|CTO|CFO|COO|CMO|CRO|VP|President|Head of \w+)\s+([A-Z][a-z]+ (?:van |de |[A-Z])[A-Za-z]+)/g,
    // "include(s) Name as Title" or "include(s) Title Name"
    /includes?\s+(?:CEO|CTO|CFO|COO|CMO|President|CRO)\s+([A-Z][a-z]+ (?:van |de |[A-Z])[A-Za-z]+)/g,
  ];

  // Pattern 1 & 2: Name + Title
  for (const pattern of patterns.slice(0, 2)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const title = match[2].trim();
      if (name.length > 3 && title.length > 2 && !people.some(p => p.name === name)) {
        people.push({ name, title, bio: '', order: people.length + 1 });
      }
    }
  }

  // Pattern 3 & 4: Title + Name — extract title from context
  const titleNamePattern = /((?:CEO|CTO|CFO|COO|CMO|CRO|VP|President|Head of \w+))\s+([A-Z][a-z]+ (?:van |de |[A-Z])[A-Za-z]+)/g;
  let match;
  while ((match = titleNamePattern.exec(text)) !== null) {
    const title = match[1].trim();
    const name = match[2].trim();
    if (name.length > 3 && !people.some(p => p.name === name)) {
      people.push({ name, title, bio: '', order: people.length + 1 });
    }
  }

  return people.slice(0, 8);
}

function extractRealNews(rawData) {
  const news = [];

  // Google News: data structure is { query, data: [ { title, url, published, source } ] }
  const gn = rawData.google_news;
  if (gn && !gn.error) {
    const articles = gn.data || gn.articles || gn.results || [];
    if (Array.isArray(articles)) {
      articles.slice(0, 8).forEach(a => {
        if (a.title) {
          news.push({
            title: a.title,
            url: a.url || '',
            date: a.published || a.date || '',
            source: a.source || 'Google News',
            snippet: a.snippet || a.description || '',
          });
        }
      });
    }
  }

  return news;
}

function extractRealRepos(rawData) {
  const gh = rawData.github;
  if (!gh || gh.error) return [];

  // GitHub: data structure is { repositories: [ { full_name, description, stargazers_count, language, html_url } ] }
  const repos = gh.repositories || gh.items || [];
  if (!Array.isArray(repos)) return [];

  return repos.slice(0, 8).map(r => ({
    name: r.full_name || r.name || '',
    description: r.description || '',
    stars: r.stargazers_count || r.stars || 0,
    language: r.language || '',
    url: r.html_url || r.url || '',
    forks: r.forks_count || r.forks || 0,
    topics: r.topics || [],
  }));
}

function extractRealHNPosts(rawData) {
  const hn = rawData.hackernews;
  if (!hn || hn.error) return [];

  // HN: data structure is { hits: [ { title, url, author, points, num_comments, created_at } ] }
  const hits = hn.hits || hn.data || [];
  if (!Array.isArray(hits)) return [];

  return hits.slice(0, 8).map(h => ({
    title: h.title || '',
    url: h.url || `https://news.ycombinator.com/item?id=${h.id || h.objectID}`,
    author: h.author || '',
    points: h.points || 0,
    comments: h.num_comments || 0,
    date: h.created_at || '',
    hnUrl: `https://news.ycombinator.com/item?id=${h.objectID || h.id}`,
  }));
}

function extractRealTrends(rawData) {
  const gt = rawData.google_trends;
  if (!gt || gt.error) return null;

  // Google Trends: { keyword, timeframe, data: [ { date, value, formatted_date } ] }
  const points = gt.data || [];
  if (!Array.isArray(points) || points.length === 0) return null;

  const values = points.map(p => p.value || 0);
  const latest = values.slice(-4);
  const earliest = values.slice(0, 4);
  const latestAvg = latest.reduce((a, b) => a + b, 0) / latest.length;
  const earliestAvg = earliest.reduce((a, b) => a + b, 0) / earliest.length;
  const trend = latestAvg > earliestAvg * 1.1 ? 'rising' : latestAvg < earliestAvg * 0.9 ? 'declining' : 'stable';
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  return {
    keyword: gt.keyword || '',
    points: points.map(p => ({ date: p.formatted_date || '', value: p.value || 0 })),
    trend,
    currentValue: values[values.length - 1] || 0,
    maxValue: maxVal,
    minValue: minVal,
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    summary: `Search interest is ${trend} (avg: ${Math.round(latestAvg)} vs ${Math.round(earliestAvg)} 12mo ago). Peak: ${maxVal}, Current: ${values[values.length - 1] || 0}.`,
  };
}

function extractWhoisData(rawData) {
  const wh = rawData.whois;
  if (!wh || wh.error) return null;

  return {
    domain: wh.domain || '',
    registered: wh.registered || '',
    expires: wh.expires || '',
    registrar: wh.registrar || '',
    age: wh.registered ? calculateDomainAge(wh.registered) : null,
    nameservers: wh.nameservers || [],
  };
}

function calculateDomainAge(registeredDate) {
  try {
    const reg = new Date(registeredDate);
    const now = new Date();
    const years = Math.floor((now - reg) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} years`;
  } catch { return null; }
}

function extractWebsiteData(rawData) {
  const wc = rawData.website_crawl;
  if (!wc || wc.error || !wc.pages?.length) return null;
  return {
    pages: wc.pages.slice(0, 5).map(p => ({
      url: p.url || '',
      content: (p.content || '').slice(0, 2000),
      title: p.title || '',
    })),
  };
}

function extractAllSearchResults(rawData) {
  const all = [];
  for (const [key, value] of Object.entries(rawData)) {
    if (key.startsWith('search_') && value && !value.error && value.results) {
      for (const r of value.results) {
        all.push({ ...r, sourceQuery: key });
      }
    }
  }
  return all;
}

function buildTextCorpus(rawData) {
  const parts = [];
  for (const [key, value] of Object.entries(rawData)) {
    if (value && !value.error) {
      parts.push(JSON.stringify(value).slice(0, 2000));
    }
  }
  return parts.join(' ').toLowerCase();
}

// ── Core Section Builders ───────────────────────────────────────

function buildCompanyOverview(companyName, summary, searchResults, news, trends, whois, corpus) {
  const metrics = [];

  // Extract metrics from text
  const empMatch = corpus.match(/(\d[\d,]+)\s*employees/);
  if (empMatch) metrics.push({ label: 'Employees', value: empMatch[1] });

  const foundedMatch = corpus.match(/founded\s*(?:in\s*)?(\d{4})/);
  if (foundedMatch) metrics.push({ label: 'Founded', value: foundedMatch[1] });

  const revenueMatch = corpus.match(/(?:revenue[:\s]*)\$?([\d.]+\s*[bmk])/i);
  if (revenueMatch) metrics.push({ label: 'Revenue', value: '$' + revenueMatch[1].toUpperCase() });

  const valMatch = corpus.match(/(?:valued?\s*(?:at\s*)?|valuation[:\s]*)\$?([\d.]+\s*[bmk])/i);
  if (valMatch) metrics.push({ label: 'Valuation', value: '$' + valMatch[1].toUpperCase() });

  if (whois?.age) metrics.push({ label: 'Domain Age', value: whois.age });

  if (trends) metrics.push({ label: 'Trend', value: trends.trend === 'rising' ? '📈 Rising' : trends.trend === 'declining' ? '📉 Declining' : '→ Stable' });

  // Build summary from agentic search or best search result
  let overviewSummary = summary;
  if (!overviewSummary && searchResults.length > 0) {
    overviewSummary = searchResults.slice(0, 5).map(r => `${r.title}: ${r.snippet}`).join('\n');
  }
  if (!overviewSummary) {
    overviewSummary = `Research data collected for ${companyName}.`;
  }

  return {
    summary: overviewSummary,
    keyMetrics: metrics,
    newsCount: news.length,
  };
}

function buildKeyPeople(realPeople, purpose, companyName) {
  if (realPeople.length > 0) {
    // Map real people to purpose-specific outreach reasons
    const mapped = realPeople.map((person, i) => ({
      ...person,
      outreachOrder: i + 1,
      reason: getPurposeReason(person.title, purpose),
      priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
    }));
    return {
      leaders: mapped,
      strategy: getOutreachStrategy(purpose),
      hasRealData: true,
    };
  }

  // Fallback: generic roles
  return {
    leaders: getFallbackPeople(purpose, companyName),
    strategy: getOutreachStrategy(purpose),
    hasRealData: false,
  };
}

function getPurposeReason(title, purpose) {
  const t = title.toLowerCase();
  const reasons = {
    job_hunt: {
      default: 'Key contact — reach out for insights about the team',
      ceo: 'Company leader — follow their vision, reference in interviews',
      cto: 'Technical leader — your potential skip-level, great for tech culture questions',
      cfo: 'Finance leader — understand company stability and growth plans',
      cmo: 'Marketing leader — shows company direction and brand priorities',
      vp: 'Senior leader — potential hiring authority for their department',
      hr: 'People/HR — direct line to open roles and referrals',
      eng: 'Engineering leader — likely your direct or skip-level manager',
      head: 'Department head — hiring authority with team budget',
    },
    founder: {
      default: 'Key executive — potential partnership or competitive intel contact',
      ceo: 'Top decision maker — final say on partnerships and strategy',
      cto: 'Technical vision — evaluate technology alignment and integration potential',
      cfo: 'Financial strategy — understand their investment priorities',
      cmo: 'Market strategy — potential co-marketing partner',
      vp: 'Department leader — explore specific collaboration areas',
    },
    networking: {
      default: 'Professional connection — valuable for industry knowledge',
      ceo: 'Industry thought leader — follow their content, engage thoughtfully',
      cto: 'Technical thought leader — connect over shared engineering interests',
      cmo: 'Brand leader — potential content collaboration',
      vp: 'Senior professional — great for mentorship and industry insights',
    },
    lead_gen: {
      default: 'Potential stakeholder — could influence purchasing decisions',
      ceo: 'Ultimate decision maker — engage after building champion support',
      cto: 'Technical evaluator — will champion internally if convinced',
      cfo: 'Budget holder — address ROI and cost concerns',
      vp: 'Department budget owner — key decision influencer',
    },
  };

  const purposeReasons = reasons[purpose] || reasons.networking;

  if (t.includes('ceo') || t.includes('chief executive')) return purposeReasons.ceo;
  if (t.includes('cto') || t.includes('chief technology')) return purposeReasons.cto;
  if (t.includes('cfo') || t.includes('chief financial')) return purposeReasons.cfo;
  if (t.includes('cmo') || t.includes('chief marketing')) return purposeReasons.cmo;
  if (t.includes('vp') || t.includes('vice president')) return purposeReasons.vp;
  if (t.includes('hr') || t.includes('people') || t.includes('talent')) return purposeReasons.hr || purposeReasons.default;
  if (t.includes('engineer') || t.includes('engineering')) return purposeReasons.eng || purposeReasons.default;
  if (t.includes('head')) return purposeReasons.head || purposeReasons.default;
  return purposeReasons.default;
}

function getOutreachStrategy(purpose) {
  const strategies = {
    job_hunt: 'Start by connecting with recruiters and HR leads. Then reach out to the hiring manager with a personalized message referencing specific projects. Use team leads for informational interviews before applying.',
    founder: 'Begin with the Head of Partnerships or BD lead. Build credibility before approaching the CEO/CTO. Lead with shared vision and complementary capabilities.',
    networking: 'Engage with their content first (LinkedIn posts, blog articles, talks). Then send a personalized connection request referencing their specific work.',
    lead_gen: 'Start with technical champions (VP Eng/CTO) who feel the pain daily. Build internal advocacy before approaching VP Sales or CEO. Lead with insight, not product.',
  };
  return strategies[purpose];
}

function getFallbackPeople(purpose, companyName) {
  const roles = {
    job_hunt: [
      { name: 'Hiring Manager', title: 'Hiring Manager', bio: `Look up the specific hiring manager for the role you want at ${companyName}`, order: 1 },
      { name: 'Recruiter', title: 'Talent Acquisition', bio: 'First point of contact — can fast-track your application', order: 2 },
      { name: 'Engineering Lead', title: 'Engineering Manager', bio: 'Your potential direct manager — great for culture questions', order: 3 },
    ],
    founder: [
      { name: 'CEO/Founder', title: 'Chief Executive', bio: 'Final say on strategy and partnerships', order: 1 },
      { name: 'CTO', title: 'Chief Technology Officer', bio: 'Technical alignment and integration potential', order: 2 },
      { name: 'BD Lead', title: 'Business Development', bio: 'Your natural counterpart for partnership discussions', order: 3 },
    ],
    networking: [
      { name: 'Developer Advocate', title: 'Developer Relations', bio: 'Most public-facing and receptive to outreach', order: 1 },
      { name: 'Engineering Lead', title: 'VP Engineering', bio: 'Technical conversations and industry insights', order: 2 },
    ],
    lead_gen: [
      { name: 'CTO/VP Eng', title: 'Technical Leadership', bio: 'Key technical evaluator', order: 1 },
      { name: 'VP Sales', title: 'Revenue Leadership', bio: 'Understands pain first-hand', order: 2 },
      { name: 'CEO', title: 'Chief Executive', bio: 'Final decision maker', order: 3 },
    ],
  };
  return (roles[purpose] || roles.networking).map((r, i) => ({
    ...r,
    outreachOrder: i + 1,
    reason: 'Look up the actual person in this role at the company',
    priority: i === 0 ? 'high' : 'medium',
  }));
}

function buildTechStack(corpus, repos) {
  const technologies = [
    { name: 'React', patterns: ['react', 'reactjs', 'react.js'], category: 'Frontend' },
    { name: 'Next.js', patterns: ['next.js', 'nextjs'], category: 'Frontend' },
    { name: 'Angular', patterns: ['angular'], category: 'Frontend' },
    { name: 'Vue.js', patterns: ['vue', 'vuejs'], category: 'Frontend' },
    { name: 'Node.js', patterns: ['node.js', 'nodejs'], category: 'Backend' },
    { name: 'Python', patterns: ['python', 'django', 'flask', 'fastapi'], category: 'Backend' },
    { name: 'Ruby', patterns: ['ruby on rails', ' ruby '], category: 'Backend' },
    { name: 'Java', patterns: [' java ', 'spring boot'], category: 'Backend' },
    { name: 'Go', patterns: ['golang', ' go '], category: 'Backend' },
    { name: 'Rust', patterns: [' rust '], category: 'Backend' },
    { name: 'TypeScript', patterns: ['typescript'], category: 'Language' },
    { name: 'PostgreSQL', patterns: ['postgres', 'postgresql'], category: 'Database' },
    { name: 'MongoDB', patterns: ['mongodb', 'mongo'], category: 'Database' },
    { name: 'Redis', patterns: ['redis'], category: 'Database' },
    { name: 'AWS', patterns: ['aws', 'amazon web services', 'ec2', 's3 '], category: 'Cloud' },
    { name: 'GCP', patterns: ['gcp', 'google cloud'], category: 'Cloud' },
    { name: 'Azure', patterns: ['azure'], category: 'Cloud' },
    { name: 'Docker', patterns: ['docker'], category: 'DevOps' },
    { name: 'Kubernetes', patterns: ['kubernetes', 'k8s'], category: 'DevOps' },
  ];

  const detected = [];
  for (const tech of technologies) {
    if (tech.patterns.some(p => corpus.includes(p))) {
      detected.push({ name: tech.name, category: tech.category, source: 'Research data' });
    }
  }

  // Add languages from GitHub repos
  const repoLanguages = [...new Set(repos.filter(r => r.language).map(r => r.language))];
  for (const lang of repoLanguages) {
    if (!detected.some(d => d.name.toLowerCase() === lang.toLowerCase())) {
      detected.push({ name: lang, category: 'Language', source: 'GitHub repos' });
    }
  }

  return {
    stack: detected,
    summary: detected.length > 0
      ? `${detected.length} technologies detected across ${[...new Set(detected.map(d => d.category))].join(', ')}`
      : 'Limited tech stack data.',
  };
}

// ── Purpose-Specific Section Builders ───────────────────────────

function buildJobHuntSections(companyName, corpus, searchResults, realPeople) {
  const cultureResults = searchResults.filter(r => r.sourceQuery === 'search_culture');
  const hiringResults = searchResults.filter(r => r.sourceQuery === 'search_hiring');
  const salaryResults = searchResults.filter(r => r.sourceQuery === 'search_salary');
  const interviewResults = searchResults.filter(r => r.sourceQuery === 'search_interview');

  return {
    cultureInsights: {
      values: extractCultureSignals(corpus),
      workStyle: inferWorkStyle(corpus),
      reviews: cultureResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      sentiment: analyzeSentiment(corpus),
    },
    interviewPrep: {
      tips: [
        `Research ${companyName}'s latest product launches and mention them`,
        'Prepare examples that align with their tech stack',
        'Show awareness of their competitive landscape',
        `Reference recent news about ${companyName}`,
        'Prepare thoughtful questions about team structure and growth',
      ],
      questions: [
        `What's the biggest technical challenge ${companyName} is tackling?`,
        'How does the team balance technical debt vs. new features?',
        `What does career growth look like at ${companyName}?`,
        'Walk me through a recent project the team shipped?',
        'What tools and processes does the engineering team use?',
      ],
      interviewInsights: interviewResults.slice(0, 4).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
    },
    salaryInsights: {
      data: salaryResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      summary: salaryResults.length > 0 ? `${salaryResults.length} salary data points found` : 'Search for salary data on Levels.fyi or Glassdoor for detailed comp info.',
    },
    hiringActivity: {
      signals: hiringResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      summary: hiringResults.length > 0 ? `${hiringResults.length} hiring signals detected` : 'Check the company careers page for current openings.',
    },
    applicationStrategy: {
      approach: `Apply through ${companyName}'s careers page, then immediately reach out to the hiring manager on LinkedIn. Employee referrals significantly increase your chances.`,
      timeline: 'Best time: Tuesday-Thursday, 9-11 AM in their timezone. Follow up after 5-7 days.',
      tips: [
        'Customize your resume to match their job description keywords',
        'Include a portfolio link or relevant GitHub projects',
        `Mention specific ${companyName} products/features that attract you`,
        'Ask for a referral if you know someone at the company',
      ],
    },
  };
}

function buildFounderSections(companyName, corpus, searchResults, rawData) {
  const fundingResults = searchResults.filter(r => r.sourceQuery === 'search_funding');
  const competitorResults = searchResults.filter(r => r.sourceQuery === 'search_competitors');
  const partnerResults = searchResults.filter(r => r.sourceQuery === 'search_partnerships');
  const marketResults = searchResults.filter(r => r.sourceQuery === 'search_market');

  return {
    marketPosition: {
      summary: `Market analysis for ${companyName} based on ${marketResults.length + competitorResults.length} data points.`,
      insights: marketResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      strengths: extractSignals(corpus, ['innovative', 'leading', 'growing', 'dominant', 'popular', 'trusted', 'largest']),
      weaknesses: extractSignals(corpus, ['struggling', 'declining', 'expensive', 'complex', 'slow', 'complaint']),
    },
    fundingIntel: {
      data: fundingResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      signals: extractFundingSignals(corpus),
      summary: fundingResults.length > 0 ? `${fundingResults.length} funding-related data points` : 'No recent public funding data found.',
    },
    partnershipAngles: {
      data: partnerResults.slice(0, 4).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      angles: [
        { type: 'Technology Integration', description: `Build on ${companyName}'s platform or integrate with their API ecosystem` },
        { type: 'Market Access', description: `Leverage ${companyName}'s customer base to reach new segments` },
        { type: 'Co-Marketing', description: 'Joint content, webinars, or case studies for shared audience' },
        { type: 'White Label', description: `Offer your solution under ${companyName}'s brand` },
      ],
    },
    competitiveLandscape: {
      data: competitorResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      summary: competitorResults.length > 0 ? `${competitorResults.length} competitive intelligence data points` : 'Search for "[company] vs [competitor]" for specific comparisons.',
    },
  };
}

function buildNetworkingSections(companyName, corpus, searchResults, rawData, realPeople) {
  const peopleResults = searchResults.filter(r => r.sourceQuery === 'search_people');
  const contentResults = searchResults.filter(r => r.sourceQuery === 'search_content');
  const communityResults = searchResults.filter(r => r.sourceQuery === 'search_community');

  return {
    conversationStarters: {
      topics: [
        { topic: 'Recent company news', prompt: `I saw ${companyName} recently [milestone from news]. How has that impacted your team?` },
        { topic: 'Their tech/product', prompt: `Your team's work on [specific product] is impressive. I'd love to hear about the challenges.` },
        { topic: 'Industry trends', prompt: `I've been following the [industry] space. How is ${companyName} approaching this?` },
        { topic: 'Open source work', prompt: `I noticed your GitHub repos — [specific repo]. Really clean approach to [topic].` },
        { topic: 'Shared interests', prompt: 'I saw your [talk/post/article] about [topic]. Really resonated with my experience.' },
      ],
    },
    connectionStrategy: {
      steps: [
        'Follow them on LinkedIn/Twitter and engage with their content genuinely',
        'Share relevant content they might find valuable',
        'Send a personalized connection request referencing their specific work',
        'Suggest a 15-minute virtual coffee — no agenda, just conversation',
        'Follow up with a thank-you and share something relevant from your chat',
      ],
      bestPractices: [
        'Be genuine — people spot transactional approaches instantly',
        'Give before you ask — share insights, make introductions',
        'Reference specific work, not generic company facts',
        'Keep initial messages to 3-4 sentences max',
        'Follow up once, then move on — respect their time',
      ],
    },
    communityPresence: {
      github: (rawData.github && !rawData.github.error) ? 'Active' : 'Unknown',
      hackernews: (rawData.hackernews && !rawData.hackernews.error) ? 'Discussed' : 'Unknown',
      contentLinks: contentResults.slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })),
      communityLinks: communityResults.slice(0, 4).map(r => ({ title: r.title, url: r.url, snippet: r.snippet })),
    },
  };
}

function buildLeadGenSections(companyName, corpus, searchResults, realPeople) {
  const painResults = searchResults.filter(r => r.sourceQuery === 'search_pain');
  const fundingResults = searchResults.filter(r => r.sourceQuery === 'search_funding');
  const techResults = searchResults.filter(r => r.sourceQuery === 'search_tech');
  const newsResults = searchResults.filter(r => r.sourceQuery === 'search_news');

  return {
    painPoints: {
      pains: extractPainSignals(corpus),
      data: painResults.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      sentiment: analyzeSentiment(corpus),
      sources: painResults.length > 0 ? `${painResults.length} pain signal data points` : 'Limited pain data — try searching their Trustpilot or G2 reviews.',
    },
    buySignals: {
      signals: extractBuySignals(corpus),
      data: [...fundingResults, ...newsResults].slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet, url: r.url })),
      summary: 'Timing indicators from hiring, funding, and growth signals.',
    },
    callBrief: {
      hook: realPeople.length > 0
        ? `"Hi ${realPeople[0].name.split(' ')[0]}, I've been following ${companyName}'s growth and had a few thoughts to share."`
        : `"Hi {{FirstName}}, I've been following ${companyName}'s growth and had a few thoughts to share."`,
      painHypothesis: `Based on research, ${companyName} may be experiencing challenges with scaling operations, which is common at their growth stage.`,
      outreachAngle: 'Position as a growth enabler. Lead with insight about their specific challenges, not your product.',
      discoveryQuestions: [
        `What's ${companyName}'s biggest operational challenge this quarter?`,
        'How is your team currently handling [pain point]?',
        'What would solving this look like for your team?',
        'Who else would need to be involved in evaluating solutions?',
        'What\'s your timeline for addressing this?',
      ],
      objectionPrep: [
        { objection: 'We already have a solution', response: 'That\'s great — how is it performing at scale? Many teams find limits as they grow.' },
        { objection: 'Not a priority right now', response: 'Understood. When do you typically revisit tooling? I\'d love to stay in touch.' },
        { objection: 'Budget is tight', response: 'Makes sense. Our customers see ROI within 60 days — would a pilot make sense?' },
      ],
    },
  };
}

// ── Outreach Message Generator ──────────────────────────────────

function generateOutreachMessages(companyName, purpose, realPeople) {
  const firstName = realPeople.length > 0 ? realPeople[0].name.split(' ')[0] : '{{Name}}';

  const templates = {
    job_hunt: {
      variants: [
        {
          type: 'LinkedIn Connection',
          icon: '🔗',
          label: 'To Hiring Manager',
          subject: null,
          body: `Hi ${firstName},\n\nI came across the [Role] position at ${companyName} and I'm genuinely excited about it. Your team's work on [specific product/project] really resonates with my experience in [relevant skill].\n\nI'd love to learn more about the role and share how my background could contribute. Would you be open to a quick chat?\n\nBest regards`,
        },
        {
          type: 'Cold Email',
          icon: '✉️',
          label: 'To Team Lead',
          subject: `Re: ${companyName}'s [Team] — interested in joining`,
          body: `Hi ${firstName},\n\nI've been following ${companyName}'s growth and particularly admire [specific achievement]. Your recent [product launch/blog post] caught my attention.\n\nI'm a [role] with [X years] experience in [relevant area]. I've [specific accomplishment that maps to their needs].\n\nWould a 15-minute call next week work to explore if there's a fit?\n\nBest,\n[Your Name]`,
        },
        {
          type: 'Referral Request',
          icon: '🤝',
          label: 'To Internal Contact',
          subject: `Quick ask — ${companyName} referral`,
          body: `Hi ${firstName},\n\nHope you're doing well! I noticed you work at ${companyName} — I'm really interested in the [Role] position and wondering if you'd be open to a quick chat about the team?\n\nNo pressure on a referral, but if after our conversation you think I'd be a good fit, I'd really appreciate it.\n\nHappy to grab coffee whenever works!\n\nCheers`,
        },
      ],
    },
    founder: {
      variants: [
        {
          type: 'Partnership Email',
          icon: '🤝',
          label: 'To BD/Partnerships',
          subject: `${companyName} + [Your Company] — partnership idea`,
          body: `Hi ${firstName},\n\nI'm [Your Name], founder of [Your Company]. We [brief description].\n\nI've been impressed by ${companyName}'s approach to [specific area], and I see strong synergy:\n\n• [Partnership angle 1]\n• [Partnership angle 2]\n\nWould you be open to exploring this over a 20-minute call?\n\nBest,\n[Your Name]`,
        },
        {
          type: 'Founder-to-Founder',
          icon: '💰',
          label: 'To CEO/Founder',
          subject: `Fellow founder — shared space observation`,
          body: `Hi ${firstName},\n\nFellow founder here — I run [Your Company] in the [adjacent space].\n\nI noticed ${companyName}'s recent [milestone] and wanted to reach out. We're seeing similar trends and I think there's an interesting conversation about [specific topic].\n\nNo pitch — just a founder-to-founder chat. Would you have 15 minutes?\n\nBest,\n[Your Name]`,
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
          body: `Hi ${firstName},\n\nI came across your work at ${companyName} and your [post/talk/project] on [topic] really resonated. I'm working on similar challenges.\n\nWould love to connect and exchange ideas — no agenda, just great to know people doing interesting work.\n\nCheers!`,
        },
        {
          type: 'Virtual Coffee',
          icon: '☕',
          label: 'Coffee Chat',
          subject: `Quick coffee chat? Loved your work on [topic]`,
          body: `Hi ${firstName},\n\nI've been following your work at ${companyName} — particularly [specific thing]. Your perspective would be incredibly valuable for [your context].\n\nWould you have 15 minutes for a virtual coffee?\n\nLooking forward to it,\n[Your Name]`,
        },
      ],
    },
    lead_gen: {
      variants: [
        {
          type: 'Problem-First',
          icon: '🎯',
          label: 'Pain-Led Outreach',
          subject: `${companyName}'s #1 challenge — we can help`,
          body: `Hi ${firstName},\n\nI've been researching ${companyName} and noticed you're likely dealing with [pain point] as you scale.\n\nWe've helped similar companies reduce this by 40%+ in under 90 days.\n\nWorth a 15-minute call to see if we can help?\n\nBest,\n[Your Name]`,
        },
        {
          type: 'Insight-Led',
          icon: '💡',
          label: 'Value-First',
          subject: `Noticed something about ${companyName}'s growth`,
          body: `Hi ${firstName},\n\nI came across some interesting data about ${companyName}'s market position and wanted to share.\n\nBased on your growth trajectory, companies at your stage typically hit a bottleneck worth getting ahead of.\n\nI put together a brief analysis — happy to walk through it in 15 minutes?\n\nBest,\n[Your Name]`,
        },
        {
          type: 'Social Proof',
          icon: '⭐',
          label: 'Case Study',
          subject: `How companies like ${companyName} are solving this`,
          body: `Hi ${firstName},\n\nCompanies similar to ${companyName} have been using us to streamline operations — seeing results within weeks.\n\nOne customer cut time-to-value in half after switching.\n\nWorth a quick chat?\n\nBest,\n[Your Name]`,
        },
      ],
    },
  };

  return templates[purpose] || templates.networking;
}

// ── Helper Functions ────────────────────────────────────────────

function extractCultureSignals(corpus) {
  const signals = [];
  const patterns = [
    { terms: ['remote', 'hybrid', 'work from home', 'distributed'], label: '🏠 Remote/Hybrid' },
    { terms: ['diversity', 'inclusion', 'dei'], label: '🌍 DEI Focus' },
    { terms: ['open source', 'open-source'], label: '💻 Open Source Culture' },
    { terms: ['fast-paced', 'startup', 'agile', 'move fast'], label: '⚡ Fast-Paced' },
    { terms: ['work-life balance', 'flexible', 'wellness'], label: '⚖️ Work-Life Balance' },
    { terms: ['learning', 'growth', 'mentorship'], label: '📚 Learning & Growth' },
    { terms: ['collaborative', 'cross-functional'], label: '🤝 Collaborative' },
    { terms: ['innovative', 'cutting-edge'], label: '🔬 Innovation-Driven' },
  ];
  for (const { terms, label } of patterns) {
    if (terms.some(t => corpus.includes(t))) signals.push(label);
  }
  return signals.length > 0 ? signals : ['🏢 Standard Corporate'];
}

function inferWorkStyle(corpus) {
  if (corpus.includes('remote-first') || corpus.includes('fully remote')) return 'Remote-First';
  if (corpus.includes('remote') || corpus.includes('distributed')) return 'Remote-Friendly';
  if (corpus.includes('hybrid')) return 'Hybrid';
  return 'Not Specified';
}

function analyzeSentiment(corpus) {
  const positive = ['great', 'excellent', 'love', 'best', 'amazing', 'fantastic', 'recommend'].filter(w => corpus.includes(w)).length;
  const negative = ['terrible', 'worst', 'hate', 'awful', 'disappointing', 'frustrated', 'broken'].filter(w => corpus.includes(w)).length;
  const total = positive + negative || 1;
  return {
    positivePercent: Math.round((positive / total) * 100),
    negativePercent: Math.round((negative / total) * 100),
    label: positive >= negative ? 'Mostly Positive' : 'Mixed Signals',
  };
}

function extractSignals(corpus, keywords) {
  return keywords.filter(k => corpus.includes(k));
}

function extractFundingSignals(corpus) {
  const signals = [];
  if (corpus.includes('series a')) signals.push('Series A funding detected');
  if (corpus.includes('series b')) signals.push('Series B funding detected');
  if (corpus.includes('series c') || corpus.includes('series d')) signals.push('Series C+ funding detected');
  if (corpus.includes('seed')) signals.push('Seed funding detected');
  if (corpus.includes('ipo')) signals.push('IPO activity detected');
  if (corpus.match(/raised\s*\$[\d.]+/)) signals.push('Recent fundraise detected');
  return signals;
}

function extractPainSignals(corpus) {
  const painPatterns = [
    { pattern: /slow|performance|latency/g, category: 'Performance' },
    { pattern: /expensive|pricing|cost|overpriced/g, category: 'Pricing' },
    { pattern: /support|customer service/g, category: 'Support' },
    { pattern: /bug|crash|error|broken/g, category: 'Reliability' },
    { pattern: /complicated|complex|hard to use/g, category: 'Usability' },
    { pattern: /security|breach|vulnerability/g, category: 'Security' },
    { pattern: /integration|api|compatibility/g, category: 'Integration' },
    { pattern: /scaling|scalability/g, category: 'Scalability' },
  ];

  return painPatterns
    .map(({ pattern, category }) => {
      const matches = corpus.match(pattern);
      return matches ? { category, intensity: Math.min(10, matches.length), count: matches.length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 6);
}

function extractBuySignals(corpus) {
  const signals = [];
  const patterns = [
    { terms: ['hiring', 'job opening', 'careers'], label: '👥 Active Hiring', desc: 'Company is scaling — budget is flowing' },
    { terms: ['raised', 'funding', 'series'], label: '💰 Recent Funding', desc: 'Fresh capital = new initiatives' },
    { terms: ['launch', 'released', 'announce'], label: '🚀 Product Launch', desc: 'New initiatives need supporting tools' },
    { terms: ['acquisition', 'acquired'], label: '🏢 M&A Activity', desc: 'Integration creates tool evaluation cycles' },
    { terms: ['expansion', 'new market'], label: '📈 Expansion', desc: 'Growth creates operational needs' },
    { terms: ['new ceo', 'new cto', 'leadership'], label: '👔 Leadership Change', desc: 'New leaders re-evaluate vendors' },
  ];
  for (const { terms, label, desc } of patterns) {
    if (terms.some(t => corpus.includes(t))) signals.push({ label, description: desc });
  }
  return signals;
}
