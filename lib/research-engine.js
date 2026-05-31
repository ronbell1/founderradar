// Research Engine — Parallel data collection orchestrator
// Fires Wire tasks, website crawl, agentic search, and targeted searches in parallel

import { runWireTask, crawlSite, agenticSearch, search } from './anakin.js';
import { getResearchPlan, getAgenticPrompt, getSearchQueries } from './wire-catalogs.js';
import { notifyListeners, setDossierRawData } from './store.js';

/**
 * Run the full research pipeline for a company
 * @param {string} dossierId - The dossier ID to store results under
 * @param {object} input - { companyName, domain, purpose }
 */
export async function runResearch(dossierId, input) {
  const { companyName, domain, purpose } = input;

  notifyListeners(dossierId, {
    type: 'research_started',
    message: 'Starting research pipeline...',
  });

  // ── Build all task lists ──────────────────────────────────────

  // 1. Wire catalog tasks (Google News, Trends, HN, GitHub, WHOIS)
  const wirePlan = getResearchPlan(companyName, domain, purpose);
  const wireTasks = wirePlan.map(t => ({ ...t, type: 'wire' }));

  // 2. Website crawl
  const crawlTasks = domain ? [{
    id: 'website_crawl',
    source: 'Website',
    icon: '🌐',
    type: 'crawl',
    url: `https://${domain}`,
  }] : [];

  // 3. Agentic Search (deep AI research — purpose-specific)
  const agenticTasks = [{
    id: 'agentic_search',
    source: 'AI Deep Research',
    icon: '🤖',
    type: 'agentic',
    prompt: getAgenticPrompt(companyName, domain, purpose),
  }];

  // 4. Multiple targeted Anakin Search queries (purpose-specific)
  const searchQueries = getSearchQueries(companyName, domain, purpose);
  const searchTasks = searchQueries.map(sq => ({
    id: sq.id,
    source: sq.label,
    icon: '🔍',
    type: 'search',
    prompt: sq.query,
  }));

  const allTasks = [...wireTasks, ...crawlTasks, ...agenticTasks, ...searchTasks];

  // Notify UI with the full plan
  notifyListeners(dossierId, {
    type: 'plan_ready',
    message: `Researching from ${allTasks.length} sources`,
    totalSources: allTasks.length,
    sources: allTasks.map(t => ({ id: t.id, source: t.source, icon: t.icon, status: 'queued' })),
  });

  // ── Fire all tasks in parallel ────────────────────────────────

  const results = await Promise.allSettled(
    allTasks.map(task => executeTask(dossierId, task))
  );

  // ── Aggregate results ─────────────────────────────────────────

  const rawData = {};
  let completedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const task = allTasks[i];

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
    message: `Research complete: ${completedCount}/${allTasks.length} sources`,
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
      case 'wire': {
        const wireResult = await runWireTask(task.actionId, task.params);
        if (wireResult.status === 'completed') {
          // CRITICAL FIX: Wire returns { data: { status: "ok", data: { ... } } }
          // Extract the inner .data payload so consumers get the actual content
          const payload = wireResult.data;
          const innerData = payload?.data || payload;
          result = { status: 'completed', data: innerData };
        } else {
          result = { status: 'failed', error: wireResult.error || 'Wire task failed' };
        }
        break;
      }

      case 'crawl': {
        const crawlResult = await crawlSite(task.url, { maxPages: 5, useBrowser: false });
        if (crawlResult.status === 'completed') {
          const pages = (crawlResult.results || [])
            .filter(r => r.status === 'completed')
            .map(r => ({ url: r.url, content: r.markdown?.slice(0, 3000), title: r.title }));
          result = { status: 'completed', data: { pages } };
        } else {
          result = { status: 'failed', error: crawlResult.error || 'Crawl failed' };
        }
        break;
      }

      case 'agentic': {
        const agResult = await agenticSearch(task.prompt);
        if (agResult.status === 'completed') {
          result = {
            status: 'completed',
            data: {
              summary: agResult.summary || '',
              structured: agResult.structuredData || {},
            },
          };
        } else {
          result = { status: 'failed', error: agResult.error || 'Agentic search failed' };
        }
        break;
      }

      case 'search': {
        const searchResult = await search(task.prompt, 8);
        const results = searchResult?.results || [];
        result = {
          status: 'completed',
          data: {
            results: results.map(r => ({
              title: r.title || '',
              url: r.url || '',
              snippet: r.snippet || r.description || '',
              date: r.date || r.last_updated || '',
            })),
          },
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
    console.error(`[Research] ${task.source} error:`, err.message);

    setDossierRawData(dossierId, task.id, { error: err.message });

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
