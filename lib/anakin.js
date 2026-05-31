// Anakin API Client — Wire, Crawl, Search, Agentic Search, URL Scraper
const API_BASE = 'https://api.anakin.io/v1';

function getApiKey() {
  const key = process.env.ANAKIN_API_KEY;
  if (!key) throw new Error('ANAKIN_API_KEY is not set');
  return key;
}

async function apiRequest(method, path, body = null) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, opts);

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const delay = retryAfter ? Number(retryAfter) * 1000 : Math.min(30000, 1000 * 2 ** attempt);
        await sleep(delay);
        continue;
      }

      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(Math.min(30000, 1000 * 2 ** attempt));
        continue;
      }

      const data = await res.json();
      return { status: res.status, data };
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Wire Endpoints ──────────────────────────────────────────────

export async function listCatalogs() {
  const { data } = await apiRequest('GET', '/wire/catalog');
  return data.catalog || [];
}

export async function getCatalog(slug) {
  const { data } = await apiRequest('GET', `/wire/catalog/${slug}`);
  return data;
}

export async function searchActions(query, options = {}) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (options.catalog) params.set('catalog', options.catalog);
  if (options.auth === false) params.set('auth', 'false');
  const { data } = await apiRequest('GET', `/wire/search?${params}`);
  return data.results || [];
}

export async function submitWireTask(actionId, params = {}, credentialId = null) {
  const body = { action_id: actionId, params };
  if (credentialId) body.credential_id = credentialId;
  const { status, data } = await apiRequest('POST', '/wire/task', body);

  if (status >= 400) {
    return { error: true, code: data?.error?.code || 'UNKNOWN', message: data?.error?.message || 'Task submission failed', data };
  }

  return { error: false, jobId: data.job_id, pollUrl: data.poll_url };
}

export async function pollWireJob(jobId, timeoutMs = 120000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await apiRequest('GET', `/wire/jobs/${jobId}`);

    if (data.status === 'completed') {
      return { status: 'completed', data: data.data, creditsUsed: data.credits_used, executionMs: data.execution_ms };
    }

    if (data.status === 'failed') {
      return { status: 'failed', error: data.error?.message || 'Job failed', code: data.error?.code };
    }

    await sleep(intervalMs);
  }
  return { status: 'timeout', error: 'Job polling timed out' };
}

// ── Crawl Endpoints ─────────────────────────────────────────────

export async function submitCrawl(url, options = {}) {
  const body = {
    url,
    maxPages: options.maxPages || 10,
    useBrowser: options.useBrowser || false,
    country: options.country || 'us',
  };
  if (options.includePatterns) body.includePatterns = options.includePatterns;
  if (options.excludePatterns) body.excludePatterns = options.excludePatterns;

  const { data } = await apiRequest('POST', '/crawl', body);
  return { jobId: data.jobId };
}

export async function pollCrawl(jobId, timeoutMs = 120000, intervalMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await apiRequest('GET', `/crawl/${jobId}`);

    if (data.status === 'completed') {
      return { status: 'completed', results: data.results, totalPages: data.totalPages };
    }
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error };
    }

    await sleep(intervalMs);
  }
  return { status: 'timeout', error: 'Crawl polling timed out' };
}

// ── Map Endpoints ───────────────────────────────────────────────

export async function submitMap(url, options = {}) {
  const body = {
    url,
    limit: options.limit || 50,
    includeSubdomains: options.includeSubdomains || false,
  };
  if (options.search) body.search = options.search;

  const { data } = await apiRequest('POST', '/map', body);
  return { jobId: data.jobId };
}

export async function pollMap(jobId, timeoutMs = 60000, intervalMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await apiRequest('GET', `/map/${jobId}`);

    if (data.status === 'completed') {
      return { status: 'completed', links: data.links, totalLinks: data.totalLinks };
    }
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error };
    }

    await sleep(intervalMs);
  }
  return { status: 'timeout', error: 'Map polling timed out' };
}

// ── Search Endpoints ────────────────────────────────────────────

export async function search(prompt, limit = 5) {
  const { data } = await apiRequest('POST', '/search', { prompt, limit });
  return data;
}

// ── Agentic Search Endpoints ────────────────────────────────────

export async function submitAgenticSearch(prompt) {
  const { data } = await apiRequest('POST', '/agentic-search', { prompt });
  return { jobId: data.job_id };
}

export async function pollAgenticSearch(jobId, timeoutMs = 300000, intervalMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await apiRequest('GET', `/agentic-search/${jobId}`);

    if (data.status === 'completed') {
      return {
        status: 'completed',
        summary: data.generatedJson?.summary,
        structuredData: data.generatedJson?.structured_data,
        dataSchema: data.generatedJson?.data_schema,
      };
    }
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error || 'Agentic search failed' };
    }

    await sleep(intervalMs);
  }
  return { status: 'timeout', error: 'Agentic search timed out' };
}

// ── URL Scraper Endpoints ───────────────────────────────────────

export async function scrapeUrl(url, options = {}) {
  const body = {
    url,
    country: options.country || 'us',
    useBrowser: options.useBrowser || false,
    generateJson: options.generateJson || false,
  };
  const { data } = await apiRequest('POST', '/url-scraper', body);
  return { jobId: data.jobId };
}

export async function pollScrape(jobId, timeoutMs = 60000, intervalMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await apiRequest('GET', `/url-scraper/${jobId}`);

    if (data.status === 'completed') {
      return {
        status: 'completed',
        html: data.html,
        markdown: data.markdown,
        generatedJson: data.generatedJson,
        cached: data.cached,
      };
    }
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error };
    }

    await sleep(intervalMs);
  }
  return { status: 'timeout', error: 'Scrape polling timed out' };
}

// ── Helper: Run Wire Task End-to-End ────────────────────────────

export async function runWireTask(actionId, params = {}, credentialId = null) {
  const submission = await submitWireTask(actionId, params, credentialId);
  if (submission.error) {
    return { status: 'failed', error: submission.message, code: submission.code };
  }
  return await pollWireJob(submission.jobId);
}

// ── Helper: Crawl End-to-End ────────────────────────────────────

export async function crawlSite(url, options = {}) {
  const { jobId } = await submitCrawl(url, options);
  return await pollCrawl(jobId);
}

// ── Helper: Agentic Search End-to-End ───────────────────────────

export async function agenticSearch(prompt) {
  const { jobId } = await submitAgenticSearch(prompt);
  return await pollAgenticSearch(jobId);
}

// ── Helper: Scrape URL End-to-End ───────────────────────────────

export async function scrapeAndPoll(url, options = {}) {
  const { jobId } = await scrapeUrl(url, options);
  return await pollScrape(jobId);
}
