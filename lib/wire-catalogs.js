// Wire Catalog Discovery & Action Mapping
// Dynamically discovers available catalogs and maps research intents to action IDs

import { getCatalog, searchActions } from './anakin.js';

// Cache for discovered catalogs
let catalogCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Known catalog slugs we care about
const TARGET_CATALOGS = ['linkedin', 'glassdoor', 'github', 'google-trends', 'reddit', 'hackernews'];

// Action intent mapping — maps what we want to do to search queries
const ACTION_INTENTS = {
  linkedin_company: { catalog: 'linkedin', searchTerms: ['company info', 'company profile', 'company details'] },
  linkedin_employees: { catalog: 'linkedin', searchTerms: ['employee count', 'headcount', 'employee history'] },
  linkedin_jobs: { catalog: 'linkedin', searchTerms: ['job listings', 'job postings', 'jobs'] },
  linkedin_people: { catalog: 'linkedin', searchTerms: ['people search', 'employee search', 'people'] },
  glassdoor_reviews: { catalog: 'glassdoor', searchTerms: ['company reviews', 'reviews', 'ratings'] },
  glassdoor_ratings: { catalog: 'glassdoor', searchTerms: ['ratings', 'overall rating'] },
  github_org: { catalog: 'github', searchTerms: ['organization', 'org overview', 'org repos'] },
  github_repos: { catalog: 'github', searchTerms: ['repositories', 'repo list'] },
  google_trends: { catalog: 'google-trends', searchTerms: ['search interest', 'trends', 'search'] },
  reddit_search: { catalog: 'reddit', searchTerms: ['search', 'posts', 'subreddit'] },
  hackernews_search: { catalog: 'hackernews', searchTerms: ['search', 'stories', 'top stories'] },
};

/**
 * Discover all available actions for our target catalogs
 */
export async function discoverCatalogs() {
  if (catalogCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return catalogCache;
  }

  const discovered = {};

  // Try to discover each catalog's actions
  const promises = TARGET_CATALOGS.map(async (slug) => {
    try {
      const catalog = await getCatalog(slug);
      if (catalog && catalog.actions) {
        discovered[slug] = {
          catalog: catalog.catalog,
          actions: catalog.actions.map(a => ({
            actionId: a.action_id,
            name: a.name,
            description: a.description,
            authMode: a.auth_mode,
            params: a.parameters,
            credits: a.credits_per_call,
          })),
        };
      }
    } catch (err) {
      console.warn(`[Wire] Could not discover catalog: ${slug}`, err.message);
    }
  });

  await Promise.allSettled(promises);

  catalogCache = discovered;
  cacheTimestamp = Date.now();
  return discovered;
}

/**
 * Find the best action ID for a given intent
 */
export async function findAction(intent) {
  const catalogs = await discoverCatalogs();
  const intentConfig = ACTION_INTENTS[intent];

  if (!intentConfig) return null;

  const catalogData = catalogs[intentConfig.catalog];
  if (!catalogData) return null;

  // Try to match by searching action names/descriptions
  for (const term of intentConfig.searchTerms) {
    const match = catalogData.actions.find(a =>
      a.name.toLowerCase().includes(term) ||
      (a.description && a.description.toLowerCase().includes(term)) ||
      a.actionId.toLowerCase().includes(term.replace(/\s+/g, '_'))
    );
    if (match) return match;
  }

  // Return first action as fallback
  return catalogData.actions[0] || null;
}

/**
 * Find all non-auth-required actions for a catalog
 */
export async function findPublicActions(catalogSlug) {
  const catalogs = await discoverCatalogs();
  const catalogData = catalogs[catalogSlug];
  if (!catalogData) return [];
  return catalogData.actions.filter(a => a.authMode !== 'required');
}

/**
 * Get the research plan — which actions to run for a given company
 */
export async function getResearchPlan(companyName, domain) {
  const catalogs = await discoverCatalogs();
  const plan = [];

  // LinkedIn — company info (may need auth)
  const liActions = catalogs['linkedin']?.actions || [];
  for (const action of liActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'LinkedIn',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '🔗',
      });
    }
  }

  // Glassdoor
  const gdActions = catalogs['glassdoor']?.actions || [];
  for (const action of gdActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'Glassdoor',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '⭐',
      });
    }
  }

  // GitHub
  const ghActions = catalogs['github']?.actions || [];
  for (const action of ghActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'GitHub',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '💻',
      });
    }
  }

  // Google Trends
  const gtActions = catalogs['google-trends']?.actions || [];
  for (const action of gtActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'Google Trends',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '📈',
      });
    }
  }

  // Reddit
  const rdActions = catalogs['reddit']?.actions || [];
  for (const action of rdActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'Reddit',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '💬',
      });
    }
  }

  // Hacker News
  const hnActions = catalogs['hackernews']?.actions || [];
  for (const action of hnActions) {
    if (action.authMode !== 'required') {
      plan.push({
        source: 'Hacker News',
        actionId: action.actionId,
        params: inferParams(action, companyName, domain),
        icon: '🔶',
      });
    }
  }

  return plan;
}

/**
 * Infer params for an action based on its schema and our inputs
 */
function inferParams(action, companyName, domain) {
  const params = {};
  const schema = action.params?.properties || {};

  for (const [key, def] of Object.entries(schema)) {
    const lk = key.toLowerCase();

    // Company name fields
    if (lk.includes('company') || lk.includes('name') || lk.includes('query') || lk.includes('keyword') || lk.includes('search') || lk.includes('q')) {
      params[key] = companyName;
    }
    // URL/domain fields
    else if (lk.includes('url') || lk.includes('domain') || lk.includes('website')) {
      params[key] = domain ? `https://${domain}` : companyName;
    }
    // Username/org fields (for GitHub)
    else if (lk.includes('username') || lk.includes('org') || lk.includes('owner')) {
      params[key] = companyName.toLowerCase().replace(/\s+/g, '');
    }
  }

  // If no params matched, try setting the first required param
  const required = action.params?.required || [];
  if (Object.keys(params).length === 0 && required.length > 0) {
    params[required[0]] = companyName;
  }

  return params;
}
