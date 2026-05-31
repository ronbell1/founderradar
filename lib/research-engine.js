// Research Engine — Parallel data collection orchestrator
// Fires Wire catalog tasks, website crawl, and agentic search in parallel

import { runWireTask, crawlSite, agenticSearch, search } from './anakin.js';
import { getResearchPlan } from './wire-catalogs.js';
import { notifyListeners, setDossierRawData, updateDossier } from './store.js';

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

  // Build the research plan from available Wire catalogs
  let wirePlan = [];
  try {
    wirePlan = await getResearchPlan(companyName, domain);
  } catch (err) {
    console.warn('[Research] Could not build Wire plan:', err.message);
  }

  // Build the full task list
  const tasks = [];

  // 1. Wire catalog tasks
  for (const task of wirePlan) {
    tasks.push({
      id: `wire_${task.source.toLowerCase().replace(/\s+/g, '_')}_${task.actionId}`,
      source: task.source,
      icon: task.icon,
      type: 'wire',
      actionId: task.actionId,
      params: task.params,
    });
  }

  // 2. Website Crawl (if domain is provided)
  if (domain) {
    tasks.push({
      id: 'website_crawl',
      source: 'Website',
      icon: '🌐',
      type: 'crawl',
      url: `https://${domain}`,
    });
  }

  // 3. Agentic Search (always)
  tasks.push({
    id: 'agentic_search',
    source: 'AI Research',
    icon: '🤖',
    type: 'agentic',
    prompt: buildResearchPrompt(companyName, domain),
  });

  // 4. Web Search for recent news (always)
  tasks.push({
    id: 'web_search',
    source: 'Web Search',
    icon: '🔍',
    type: 'search',
    prompt: `${companyName} latest news funding hiring 2025 2026`,
  });

  // Notify total sources
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
      rawData[task.id] = { error: result.reason?.message || result.value?.error || 'Unknown error' };
    }
  }

  // Flatten raw data into category groups for easier synthesis
  const categorizedData = categorizeData(rawData, tasks);

  notifyListeners(dossierId, {
    type: 'research_completed',
    message: `Research complete: ${completedCount} sources succeeded, ${failedCount} failed`,
    completedCount,
    failedCount,
  });

  return categorizedData;
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
        break;

      case 'crawl':
        result = await crawlSite(task.url, { maxPages: 8 });
        if (result.status === 'completed') {
          // Extract markdown from crawl results
          const pages = (result.results || [])
            .filter(r => r.status === 'completed')
            .map(r => ({ url: r.url, content: r.markdown }));
          result = { status: 'completed', data: { pages } };
        }
        break;

      case 'agentic':
        result = await agenticSearch(task.prompt);
        if (result.status === 'completed') {
          result = { status: 'completed', data: { summary: result.summary, structured: result.structuredData } };
        }
        break;

      case 'search':
        const searchResult = await search(task.prompt, 10);
        result = { status: 'completed', data: { results: searchResult.results || [] } };
        break;

      default:
        result = { status: 'failed', error: `Unknown task type: ${task.type}` };
    }

    if (result.status === 'completed') {
      setDossierRawData(dossierId, task.id, result.data);
      notifyListeners(dossierId, {
        type: 'source_completed',
        sourceId: task.id,
        source: task.source,
        icon: task.icon,
        message: `${task.source} — done`,
      });
    } else {
      notifyListeners(dossierId, {
        type: 'source_failed',
        sourceId: task.id,
        source: task.source,
        icon: task.icon,
        message: `${task.source} — ${result.error || 'failed'}`,
      });
    }

    return result;
  } catch (err) {
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
  return `Comprehensive analysis of ${companyName}${domain ? ` (${domain})` : ''}:
- Company overview, founding year, headquarters, employee count
- Recent funding rounds and investors
- Key leadership team and recent executive changes
- Product offerings and competitive positioning
- Recent news, product launches, partnerships
- Growth trajectory and market position
- Technology stack and engineering culture
- Customer pain points and market challenges
- Hiring trends and open positions
Provide structured data with sources.`;
}

/**
 * Categorize raw data into logical groups for synthesis
 */
function categorizeData(rawData, tasks) {
  const categorized = {
    linkedin: {},
    glassdoor: {},
    github: {},
    googleTrends: {},
    reddit: {},
    hackerNews: {},
    websiteCrawl: {},
    agenticSearch: {},
    webSearch: {},
  };

  for (const [key, value] of Object.entries(rawData)) {
    if (value?.error) continue; // Skip failed sources

    if (key.startsWith('wire_linkedin')) categorized.linkedin[key] = value;
    else if (key.startsWith('wire_glassdoor')) categorized.glassdoor[key] = value;
    else if (key.startsWith('wire_github')) categorized.github[key] = value;
    else if (key.startsWith('wire_google')) categorized.googleTrends[key] = value;
    else if (key.startsWith('wire_reddit')) categorized.reddit[key] = value;
    else if (key.startsWith('wire_hacker')) categorized.hackerNews[key] = value;
    else if (key === 'website_crawl') categorized.websiteCrawl = value;
    else if (key === 'agentic_search') categorized.agenticSearch = value;
    else if (key === 'web_search') categorized.webSearch = value;
  }

  return categorized;
}
