// Research Engine — Parallel data collection orchestrator
// Fires Wire catalog tasks, website crawl, and agentic search in parallel

import { runWireTask, crawlSite, agenticSearch, search } from './anakin.js';
import { getResearchPlan } from './wire-catalogs.js';
import { notifyListeners, setDossierRawData } from './store.js';

/**
 * Run the full research pipeline for a company
 * @param {string} dossierId - The dossier ID to store results under
 * @param {object} input - { companyName, domain, linkedinUrl, jobPostingUrl }
 */
export async function runResearch(dossierId, input) {
  const { companyName, domain } = input;

  notifyListeners(dossierId, {
    type: 'research_started',
    message: 'Starting research pipeline...',
    totalSources: 0,
  });

  // Build the research plan (hardcoded action IDs)
  const wirePlan = getResearchPlan(companyName, domain);

  // Build full task list: Wire tasks + crawl + agentic search + web search
  const tasks = [
    // Wire catalog tasks (each is 1 action per source)
    ...wirePlan.map(task => ({
      ...task,
      type: 'wire',
    })),

    // Website crawl (if domain provided)
    ...(domain ? [{
      id: 'website_crawl',
      source: 'Website',
      icon: '🌐',
      type: 'crawl',
      url: `https://${domain}`,
    }] : []),

    // Agentic Search (deep AI research)
    {
      id: 'agentic_search',
      source: 'AI Research',
      icon: '🤖',
      type: 'agentic',
      prompt: buildResearchPrompt(companyName, domain),
    },

    // Web Search (recent news)
    {
      id: 'web_search',
      source: 'Web Search',
      icon: '🔍',
      type: 'search',
      prompt: `${companyName} company overview funding hiring news 2025 2026`,
    },
  ];

  // Notify UI with the plan
  notifyListeners(dossierId, {
    type: 'plan_ready',
    message: `Research plan: ${tasks.length} data sources`,
    totalSources: tasks.length,
    sources: tasks.map(t => ({ id: t.id, source: t.source, icon: t.icon, status: 'queued' })),
  });

  // Fire all tasks in parallel
  const results = await Promise.allSettled(
    tasks.map(task => executeTask(dossierId, task))
  );

  // Aggregate results
  const rawData = {};
  let completedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const task = tasks[i];

    if (result.status === 'fulfilled' && result.value?.status === 'completed') {
      rawData[task.id] = result.value.data;
      completedCount++;
    } else {
      failedCount++;
      const error = result.status === 'rejected'
        ? result.reason?.message
        : result.value?.error;
      rawData[task.id] = { error: error || 'Unknown error' };
    }
  }

  notifyListeners(dossierId, {
    type: 'research_completed',
    message: `Research complete: ${completedCount}/${tasks.length} sources succeeded`,
    completedCount,
    failedCount,
  });

  return rawData;
}

/**
 * Execute a single research task
 */
async function executeTask(dossierId, task) {
  notifyListeners(dossierId, {
    type: 'source_started',
    sourceId: task.id,
    source: task.source,
    icon: task.icon,
    message: `Fetching ${task.source}...`,
  });

  try {
    let result;

    switch (task.type) {
      case 'wire':
        result = await runWireTask(task.actionId, task.params);
        if (result.status === 'completed') {
          result = { status: 'completed', data: result.data };
        }
        break;

      case 'crawl':
        result = await crawlSite(task.url, { maxPages: 5 });
        if (result.status === 'completed') {
          const pages = (result.results || [])
            .filter(r => r.status === 'completed')
            .map(r => ({ url: r.url, content: r.markdown?.slice(0, 2000) }));
          result = { status: 'completed', data: { pages } };
        }
        break;

      case 'agentic':
        result = await agenticSearch(task.prompt);
        if (result.status === 'completed') {
          result = { status: 'completed', data: { summary: result.summary, structured: result.structuredData } };
        }
        break;

      case 'search': {
        const searchResult = await search(task.prompt, 10);
        result = {
          status: 'completed',
          data: { results: searchResult?.results || searchResult?.data?.results || [] },
        };
        break;
      }

      default:
        result = { status: 'failed', error: `Unknown task type: ${task.type}` };
    }

    const success = result.status === 'completed';
    setDossierRawData(dossierId, task.id, success ? result.data : { error: result.error });

    notifyListeners(dossierId, {
      type: success ? 'source_completed' : 'source_failed',
      sourceId: task.id,
      source: task.source,
      icon: task.icon,
      message: success ? `${task.source} ✓` : `${task.source} — ${result.error || 'failed'}`,
    });

    return result;
  } catch (err) {
    console.error(`[Research] ${task.source} (${task.actionId || task.type}) error:`, err.message);

    notifyListeners(dossierId, {
      type: 'source_failed',
      sourceId: task.id,
      source: task.source,
      icon: task.icon,
      message: `${task.source} — ${err.message}`,
    });

    return { status: 'failed', error: err.message };
  }
}

/**
 * Build a research prompt for Agentic Search
 */
function buildResearchPrompt(companyName, domain) {
  return `Comprehensive B2B sales research on ${companyName}${domain ? ` (${domain})` : ''}:

1. Company overview: founding year, headquarters, employee count, key products
2. Funding history: rounds, amounts, investors, valuation
3. Leadership team: CEO, CTO, VP Sales, recent exec changes
4. Growth signals: hiring velocity, new markets, partnerships
5. Competitive landscape: main competitors, differentiation
6. Technology stack: languages, frameworks, infrastructure
7. Customer pain points: common complaints, product gaps
8. Recent news: product launches, acquisitions, pivots

Provide structured data with citations.`;
}
