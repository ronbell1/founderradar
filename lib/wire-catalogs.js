// Wire Catalog — Hardcoded action mappings from discovered catalogs
// Each entry: { source, icon, actionId, buildParams(companyName, domain) }
// Only the BEST action per source is selected for the research plan

/**
 * Build the research plan for a company.
 * Returns an array of tasks, each with the exact action_id and params.
 */
export function getResearchPlan(companyName, domain) {
  const cleanDomain = domain ? domain.replace(/^www\./, '') : null;
  const orgSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const plan = [
    // ── Google News — recent company coverage ────────────────────
    {
      id: 'google_news',
      source: 'Google News',
      icon: '📰',
      actionId: 'gn_search',
      params: { query: companyName, when: '30d', limit: 15 },
    },

    // ── TechCrunch — funding & startup news ──────────────────────
    {
      id: 'techcrunch',
      source: 'TechCrunch',
      icon: '💰',
      actionId: 'tc_search',
      params: { query: companyName, limit: 10 },
    },

    // ── Google Trends — search interest over time ────────────────
    {
      id: 'google_trends',
      source: 'Google Trends',
      icon: '📈',
      actionId: 'gt_interest_over_time',
      params: { keyword: companyName, timeframe: 'today 12-m' },
    },

    // ── Reddit — community discussions & sentiment ───────────────
    {
      id: 'reddit',
      source: 'Reddit',
      icon: '💬',
      actionId: 'rt_search',
      params: { query: companyName, sort: 'relevance', time: 'year', limit: 15 },
    },

    // ── Hacker News — tech community mentions ────────────────────
    {
      id: 'hackernews',
      source: 'Hacker News',
      icon: '🔶',
      actionId: 'hn_search',
      params: { query: companyName },
    },

    // ── GitHub — open source presence ────────────────────────────
    {
      id: 'github',
      source: 'GitHub',
      icon: '💻',
      actionId: 'gh_search_repos',
      params: { query: `${companyName}`, sort: 'stars', per_page: 10 },
    },

    // ── GitHub Org — repos if they have a GitHub org ──────────────
    {
      id: 'github_org',
      source: 'GitHub Org',
      icon: '🏗️',
      actionId: 'gh_org_repos',
      params: { org: orgSlug, sort: 'updated', per_page: 10 },
    },

    // ── Trustpilot — customer reviews & ratings ──────────────────
    ...(cleanDomain ? [{
      id: 'trustpilot',
      source: 'Trustpilot',
      icon: '⭐',
      actionId: 'tp_company_reviews',
      params: { domain: cleanDomain },
    }] : [{
      id: 'trustpilot',
      source: 'Trustpilot',
      icon: '⭐',
      actionId: 'tp_search_companies',
      params: { query: companyName },
    }]),

    // ── Y Combinator — startup directory ─────────────────────────
    {
      id: 'ycombinator',
      source: 'Y Combinator',
      icon: '🚀',
      actionId: 'yc_search_companies',
      params: { query: companyName, hits_per_page: 5 },
    },

    // ── WHOIS — domain intelligence ──────────────────────────────
    ...(cleanDomain ? [{
      id: 'whois',
      source: 'WHOIS',
      icon: '🔎',
      actionId: 'wh_domain',
      params: { domain: cleanDomain },
    }] : []),

    // ── Product Hunt — product launches ──────────────────────────
    {
      id: 'producthunt',
      source: 'Product Hunt',
      icon: '🏆',
      actionId: 'ph_product_details',
      params: { slug: orgSlug },
    },
  ];

  return plan;
}
