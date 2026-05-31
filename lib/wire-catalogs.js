// Wire Catalog — Hardcoded research plan
// Broken sources (Reddit, TechCrunch, Trustpilot) replaced with Anakin Search queries
// Data sources: Google News, Google Trends, HN, GitHub, WHOIS, Website Crawl,
//   Agentic Search, and multiple targeted Anakin Search queries

/**
 * Build the research plan for a company.
 * Returns an array of tasks with exact action_id and params.
 * @param {string} companyName
 * @param {string|null} domain
 * @param {string} purpose - job_hunt | founder | networking | lead_gen
 */
export function getResearchPlan(companyName, domain, purpose = 'networking') {
  const cleanDomain = domain ? domain.replace(/^www\./, '') : null;
  const orgSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const plan = [
    // ── Google News — always reliable ────────────────────────────
    {
      id: 'google_news',
      source: 'Google News',
      icon: '📰',
      actionId: 'gn_search',
      params: { query: companyName, when: '30d', limit: 10 },
    },

    // ── Google Trends — always reliable ──────────────────────────
    {
      id: 'google_trends',
      source: 'Google Trends',
      icon: '📈',
      actionId: 'gt_interest_over_time',
      params: { keyword: companyName, timeframe: 'today 12-m' },
    },

    // ── Hacker News — always reliable ────────────────────────────
    {
      id: 'hackernews',
      source: 'Hacker News',
      icon: '🔶',
      actionId: 'hn_search',
      params: { query: companyName, tags: 'story' },
    },

    // ── GitHub Repos — always reliable ───────────────────────────
    {
      id: 'github',
      source: 'GitHub',
      icon: '💻',
      actionId: 'gh_search_repos',
      params: { query: companyName, sort: 'stars', per_page: 5 },
    },

    // ── WHOIS — domain intel (only if domain available) ──────────
    ...(cleanDomain ? [{
      id: 'whois',
      source: 'WHOIS',
      icon: '🔎',
      actionId: 'wh_domain',
      params: { domain: cleanDomain },
    }] : []),
  ];

  return plan;
}

/**
 * Build purpose-specific agentic search prompt
 */
export function getAgenticPrompt(companyName, domain, purpose) {
  const base = `${companyName}${domain ? ` (${domain})` : ''}`;

  const prompts = {
    job_hunt: `Research ${base} for someone who wants to work there. Include:
1. Company overview: founding year, headquarters, employee count, mission
2. Leadership team: CEO, CTO, VP Engineering, Head of HR/People, Engineering Managers — for each person provide: full name, title, brief bio, LinkedIn profile URL if findable, Twitter/X handle if findable, and the company email format (e.g. firstname@company.com)
3. Engineering culture: tech stack, development practices, remote/hybrid policy
4. Recent hiring activity: what roles they're hiring for, team growth
5. Employee sentiment: what people say about working there (Glassdoor-like)
6. Recent news: product launches, funding, expansions
7. Interview process: what to expect, typical timeline
CRITICAL: For every person listed, include their LinkedIn URL if available. Also specify the company's general email format. Provide real names and structured data with citations.`,

    founder: `Research ${base} for competitive intelligence and partnership exploration. Include:
1. Company overview: founding year, revenue, valuation, employee count
2. Leadership team: CEO, CTO, CFO, VP BD/Partnerships, Chief Strategy Officer — for each provide: full name, title, bio, LinkedIn profile URL, Twitter/X handle
3. Funding history: all rounds, amounts, lead investors, current valuation
4. Competitive landscape: top 3-5 competitors, key differentiators
5. Technology platform: APIs, integrations, developer ecosystem
6. Market position: strengths, weaknesses, market share
7. Partnership opportunities: existing partners, integration ecosystem
8. Recent strategic moves: acquisitions, new markets, pivots
CRITICAL: For every person listed, include their LinkedIn URL and Twitter handle if available. Provide real names and structured data with citations.`,

    networking: `Research ${base} for professional networking. Include:
1. Company overview: what they do, founding year, key products
2. Key people: CEO, CTO, VP Engineering, Developer Advocates, Community Leads, Content Creators — for each provide: full name, title, bio, LinkedIn profile URL, Twitter/X handle, personal blog/website if any
3. Community presence: open source projects, blog, conference talks, podcasts
4. Company culture: values, remote policy, team structure
5. Recent achievements: launches, milestones, awards
6. Industry involvement: conferences, meetups, open source contributions
CRITICAL: For every person listed, include their LinkedIn URL and Twitter handle if available. Provide real names and structured data with citations.`,

    lead_gen: `B2B sales research on ${base}. Include:
1. Company overview: founding year, headquarters, employee count, revenue
2. Decision makers: CEO, CTO, VP Sales, VP Engineering, Head of Revenue — for each provide: full name, title, bio, LinkedIn profile URL, Twitter/X handle, and the company email format
3. Technology stack: what they use, potential gaps
4. Growth signals: hiring velocity, funding, expansion
5. Pain points: common complaints, product gaps, scaling challenges
6. Competitive landscape: who they compete with
7. Recent triggers: new funding, leadership changes, product launches
8. Budget indicators: revenue, funding stage, team size
CRITICAL: For every person listed, include their LinkedIn URL if available. Also specify the company's email format (e.g. first.last@domain.com). Provide real names and structured data with citations.`,
  };

  return prompts[purpose] || prompts.networking;
}

/**
 * Build targeted search queries based on purpose.
 * Returns array of { id, label, query } objects for Anakin Search API.
 */
export function getSearchQueries(companyName, domain, purpose) {
  const base = [
    { id: 'search_overview', label: 'Company Overview', query: `${companyName} company overview headquarters employees founded revenue product 2025 2026` },
  ];

  const purposeQueries = {
    job_hunt: [
      { id: 'search_culture', label: 'Culture & Reviews', query: `${companyName} employee reviews culture work environment glassdoor` },
      { id: 'search_hiring', label: 'Hiring & Careers', query: `${companyName} hiring jobs careers engineering team 2026` },
      { id: 'search_salary', label: 'Salary & Benefits', query: `${companyName} salary compensation benefits engineer levels.fyi` },
      { id: 'search_interview', label: 'Interview Process', query: `${companyName} interview process questions experience` },
      { id: 'search_contacts', label: 'People Contacts', query: `${companyName} CEO CTO VP engineering LinkedIn site:linkedin.com/in` },
    ],
    founder: [
      { id: 'search_funding', label: 'Funding & Investors', query: `${companyName} funding round series investors valuation 2025 2026` },
      { id: 'search_competitors', label: 'Competitors', query: `${companyName} competitors alternatives vs comparison` },
      { id: 'search_partnerships', label: 'Partnerships', query: `${companyName} partnerships integrations ecosystem API` },
      { id: 'search_market', label: 'Market Analysis', query: `${companyName} market share industry analysis growth` },
      { id: 'search_contacts', label: 'People Contacts', query: `${companyName} CEO CTO founder LinkedIn site:linkedin.com/in` },
    ],
    networking: [
      { id: 'search_people', label: 'Key People', query: `${companyName} leadership team executives founders speakers` },
      { id: 'search_content', label: 'Content & Talks', query: `${companyName} blog engineering blog conference talks podcast` },
      { id: 'search_community', label: 'Community', query: `${companyName} open source community developer advocate events` },
      { id: 'search_contacts', label: 'People Contacts', query: `${companyName} team leadership LinkedIn site:linkedin.com/in` },
    ],
    lead_gen: [
      { id: 'search_pain', label: 'Pain Points', query: `${companyName} complaints problems issues customer feedback negative reviews` },
      { id: 'search_funding', label: 'Funding & Growth', query: `${companyName} funding round revenue growth hiring 2025 2026` },
      { id: 'search_tech', label: 'Tech Stack', query: `${companyName} technology stack engineering infrastructure tools` },
      { id: 'search_news', label: 'Recent News', query: `${companyName} latest news announcement launch 2026` },
      { id: 'search_contacts', label: 'People Contacts', query: `${companyName} VP sales CTO CEO LinkedIn site:linkedin.com/in` },
    ],
  };

  return [...base, ...(purposeQueries[purpose] || purposeQueries.networking)];
}
