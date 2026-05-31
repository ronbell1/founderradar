'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';

// ── Constants ────────────────────────────────────────────────────

const PURPOSE_META = {
  job_hunt: { icon: '🎯', label: 'Job Hunt', color: '#6c5ce7', heroLine: 'Your research brief for getting hired here' },
  founder: { icon: '🚀', label: 'Founder Mode', color: '#00cec9', heroLine: 'Competitive intel & partnership strategy' },
  networking: { icon: '🤝', label: 'Networking', color: '#fdcb6e', heroLine: 'Your guide to meaningful connections' },
  lead_gen: { icon: '📊', label: 'Lead Gen', color: '#ff6b6b', heroLine: 'Intelligence for closing this account' },
};

const SIDEBAR_SECTIONS = {
  job_hunt: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'Key People' },
    { id: 'culture', icon: '🏢', label: 'Culture & Reviews' },
    { id: 'interview', icon: '🎤', label: 'Interview Prep' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'hiring', icon: '📋', label: 'Hiring Activity' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Latest Activity' },
    { id: 'strategy', icon: '🎯', label: 'Application Strategy' },
  ],
  founder: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'Key Contacts' },
    { id: 'market', icon: '📈', label: 'Market Position' },
    { id: 'funding', icon: '💰', label: 'Funding Intel' },
    { id: 'partnerships', icon: '🤝', label: 'Partnerships' },
    { id: 'competitors', icon: '⚔️', label: 'Competitors' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Latest Activity' },
  ],
  networking: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'People to Connect' },
    { id: 'starters', icon: '💬', label: 'Conversation Starters' },
    { id: 'strategy', icon: '🗺️', label: 'Connection Strategy' },
    { id: 'outreach', icon: '✉️', label: 'Message Templates' },
    { id: 'community', icon: '🌐', label: 'Community Presence' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Latest Activity' },
  ],
  lead_gen: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'Decision Makers' },
    { id: 'pain', icon: '🔥', label: 'Pain Points' },
    { id: 'signals', icon: '📡', label: 'Buy Signals' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'call', icon: '📞', label: 'Call Brief' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Latest Activity' },
  ],
};

// ── Utility Components ───────────────────────────────────────────

function CopyBtn({ text, label = '📋 Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>{copied ? '✓ Copied!' : label}</button>;
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="section-header">
      <div className="section-header-icon">{icon}</div>
      <div>
        <h3 className="section-header-title">{title}</h3>
        {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

function DataCard({ icon, label, value, accent }) {
  return (
    <div className={`data-card ${accent ? 'data-card--accent' : ''}`}>
      <div className="data-card-icon">{icon}</div>
      <div className="data-card-value">{value}</div>
      <div className="data-card-label">{label}</div>
    </div>
  );
}

function HighlightText({ text, maxLen = 600 }) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.slice(0, maxLen);
  // Split into sentences
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) {
    return <p className="highlight-text">{clean}</p>;
  }
  // First 1-2 sentences as lead, rest as body
  const lead = sentences.slice(0, 2).join(' ');
  const body = sentences.slice(2).join(' ');
  return (
    <div className="highlight-text-block">
      <p className="highlight-text-lead">{lead}</p>
      {body && <p className="highlight-text-body">{body}</p>}
    </div>
  );
}

function LinkCard({ item, compact }) {
  if (!item) return null;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={`link-card ${compact ? 'link-card--compact' : ''}`}>
      <div className="link-card-title">{item.title}</div>
      {!compact && item.snippet && <div className="link-card-snippet">{item.snippet.slice(0, 120)}</div>}
      <div className="link-card-meta">
        {item.source && <span>{item.source}</span>}
        {item.date && <span>{item.date}</span>}
        <span className="link-card-url">{item.url?.replace(/^https?:\/\//, '').split('/')[0]}</span>
      </div>
    </a>
  );
}

function Sparkline({ points, width = 200, height = 40 }) {
  if (!points?.length) return null;
  const max = Math.max(...points.map(p => p.value));
  const min = Math.min(...points.map(p => p.value));
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pathData = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p.value - min) / range) * (height - 6) - 3;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  // Area fill
  const areaData = pathData + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block', width: '100%' }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaData} fill="url(#sparkFill)" />
      <path d={pathData} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

// ── Progress Tracker ─────────────────────────────────────────────

function ProgressTracker({ sources, overallMessage }) {
  const done = sources.filter(s => s.status === 'completed' || s.status === 'failed').length;
  return (
    <div className="card-flat" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="flex items-center justify-between mb-md">
        <h3>🔬 Research Progress</h3>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{overallMessage}</span>
      </div>
      <div className="progress-bar mb-lg">
        <div className="progress-fill" style={{ width: `${sources.length > 0 ? (done / sources.length) * 100 : 0}%` }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
        {sources.map(s => (
          <div key={s.id} className={`source-card ${s.status}`}>
            <div className="source-icon">{s.icon}</div>
            <div className="source-info">
              <div className="source-name">{s.source}</div>
              <div className="source-status">
                {s.status === 'queued' && 'Waiting...'}
                {s.status === 'active' && 'Fetching...'}
                {s.status === 'completed' && '✓ Done'}
                {s.status === 'failed' && '✗ Failed'}
              </div>
            </div>
            <div className={`source-indicator ${s.status}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Executive Summary (Hero Banner) ──────────────────────────────

function ExecutiveSummary({ company, purpose, score, overview, trends, people, news, repos }) {
  const meta = PURPOSE_META[purpose] || PURPOSE_META.networking;
  const topPerson = people?.leaders?.[0];
  return (
    <div className="exec-summary fade-in">
      <div className="exec-summary-header">
        <div className="exec-summary-score">
          <div className="exec-score-ring" style={{ '--score-color': score?.score >= 75 ? 'var(--hot)' : score?.score >= 50 ? 'var(--warm)' : 'var(--cool)' }}>
            <span className="exec-score-num">{score?.score || '—'}</span>
          </div>
          <span className="exec-score-label">{score?.tierLabel || 'Scoring...'}</span>
        </div>
        <div className="exec-summary-info">
          <h2 className="exec-summary-company">{company}</h2>
          <p className="exec-summary-tagline">{meta.heroLine}</p>
        </div>
      </div>
      <div className="exec-summary-chips">
        {overview?.keyMetrics?.slice(0, 5).map((m, i) => (
          <div key={i} className="exec-chip">
            <span className="exec-chip-value">{m.value}</span>
            <span className="exec-chip-label">{m.label}</span>
          </div>
        ))}
        {topPerson && people?.hasRealData && (
          <div className="exec-chip exec-chip--person">
            <span className="exec-chip-value">{topPerson.name}</span>
            <span className="exec-chip-label">{topPerson.title}</span>
          </div>
        )}
        {trends && (
          <div className="exec-chip">
            <span className="exec-chip-value">{trends.trend === 'rising' ? '📈' : trends.trend === 'declining' ? '📉' : '→'} {trends.currentValue}</span>
            <span className="exec-chip-label">Trend Index</span>
          </div>
        )}
        {news?.news?.length > 0 && (
          <div className="exec-chip">
            <span className="exec-chip-value">{news.news.length}</span>
            <span className="exec-chip-label">Recent Articles</span>
          </div>
        )}
        {repos?.length > 0 && (
          <div className="exec-chip">
            <span className="exec-chip-value">{repos.reduce((s, r) => s + (r.stars || 0), 0).toLocaleString()}</span>
            <span className="exec-chip-label">GitHub ⭐</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Score Gauge ──────────────────────────────────────────────────

function OpportunityScore({ score }) {
  const circ = 2 * Math.PI * 70;
  const offset = circ - (score.score / 100) * circ;
  const color = score.score >= 75 ? 'var(--hot)' : score.score >= 50 ? 'var(--warm)' : score.score >= 25 ? 'var(--cool)' : 'var(--cold)';
  return (
    <div className="card fade-in">
      <SectionHeader icon="📊" title="Opportunity Score" subtitle={score.explanation} />
      <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap', marginTop: 'var(--space-lg)' }}>
        <div className="score-gauge">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle className="score-track" cx="80" cy="80" r="65" />
            <circle className="score-value" cx="80" cy="80" r="65" stroke={color} strokeDasharray={2 * Math.PI * 65} strokeDashoffset={2 * Math.PI * 65 - (score.score / 100) * 2 * Math.PI * 65} />
          </svg>
          <div className="text-center">
            <div className="score-number" style={{ color }}>{score.score}</div>
            <div className="score-label">/ 100</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, marginBottom: 'var(--space-md)' }}>
            {score.tierLabel}
          </div>
          {score.breakdown?.map((item, i) => (
            <div key={i} className="score-breakdown-row">
              <span className="score-breakdown-label">{item.icon} {item.category}</span>
              <div className="pain-track" style={{ flex: 1 }}>
                <div className={`pain-fill ${item.score >= item.max * 0.7 ? 'high' : item.score >= item.max * 0.4 ? 'medium' : 'low'}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }} />
              </div>
              <span className="score-breakdown-value">{item.score}/{item.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION: Overview ────────────────────────────────────────────

function CompanyOverview({ data, score, trends, whois }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      {/* Metrics row */}
      {data.keyMetrics?.length > 0 && (
        <div className="data-cards-row">
          {data.keyMetrics.map((m, i) => (
            <DataCard key={i} icon={m.label === 'Founded' ? '📅' : m.label === 'Employees' ? '👥' : m.label === 'Revenue' ? '💰' : m.label === 'Valuation' ? '📈' : m.label === 'Domain Age' ? '🌐' : '📊'} label={m.label} value={m.value} />
          ))}
        </div>
      )}
      {/* Trends card */}
      {trends && (
        <div className="card-flat trends-card">
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-sm">
              <span style={{ fontSize: '1.2rem' }}>📈</span>
              <h4>Search Interest — 12 Months</h4>
            </div>
            <span className={`trend-badge trend-badge--${trends.trend}`}>
              {trends.trend === 'rising' ? '▲ Rising' : trends.trend === 'declining' ? '▼ Declining' : '— Stable'}
            </span>
          </div>
          <div className="trends-chart">
            <Sparkline points={trends.points} width={600} height={48} />
          </div>
          <div className="trends-stats">
            <div className="trends-stat"><span className="trends-stat-label">Current</span><span className="trends-stat-value">{trends.currentValue}</span></div>
            <div className="trends-stat"><span className="trends-stat-label">Average</span><span className="trends-stat-value">{trends.average}</span></div>
            <div className="trends-stat"><span className="trends-stat-label">Peak</span><span className="trends-stat-value">{trends.maxValue}</span></div>
          </div>
        </div>
      )}
      {/* Summary */}
      {data.summary && (
        <div className="card-flat summary-card">
          <SectionHeader icon="📝" title="Company Summary" />
          <HighlightText text={data.summary} maxLen={1500} />
        </div>
      )}
      {/* WHOIS */}
      {whois && (
        <div className="card-flat">
          <SectionHeader icon="🔎" title="Domain Intelligence" />
          <div className="data-cards-row" style={{ marginTop: 'var(--space-md)' }}>
            {whois.domain && <DataCard icon="🌐" label="Domain" value={whois.domain} />}
            {whois.age && <DataCard icon="📅" label="Domain Age" value={whois.age} />}
            {whois.registrar && <DataCard icon="🏢" label="Registrar" value={whois.registrar} />}
          </div>
        </div>
      )}
      {/* Score */}
      {score && <OpportunityScore score={score} />}
    </div>
  );
}

// ── SECTION: Key People ──────────────────────────────────────────

function KeyPeople({ data }) {
  if (!data) return null;
  const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe', '#55efc4'];
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="👥" title="Key People" subtitle={data.hasRealData ? 'Real people identified from AI research' : 'Generic roles — look up actual people on LinkedIn'} />
      {data.hasRealData && <div className="badge badge-success" style={{ width: 'fit-content' }}>✓ Verified from live research</div>}
      <div className="people-grid">
        {data.leaders?.map((person, i) => (
          <div key={i} className="person-card-v2">
            <div className="person-card-v2-header">
              <div className="person-avatar" style={{ background: colors[i % colors.length] }}>{person.name?.charAt(0) || '#'}</div>
              <div className="person-card-v2-priority">
                <span className={`priority-dot priority-dot--${person.priority || 'medium'}`} />
                #{person.outreachOrder}
              </div>
            </div>
            <div className="person-card-v2-body">
              <div className="person-name">{person.name}</div>
              <div className="person-title-v2">{person.title}</div>
              {person.bio && <p className="person-bio">{person.bio.slice(0, 120)}</p>}
              <div className="person-reason-v2">{person.reason}</div>
            </div>
          </div>
        ))}
      </div>
      {data.strategy && (
        <div className="callout-card callout-card--info">
          <div className="callout-icon">💡</div>
          <div>
            <div className="callout-title">Outreach Strategy</div>
            <div className="callout-text">{data.strategy}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: Outreach ────────────────────────────────────────────

function OutreachMessages({ data }) {
  const [active, setActive] = useState(0);
  if (!data?.variants) return null;
  const v = data.variants[active];
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="✉️" title="Outreach Templates" subtitle="Ready-to-send messages — customize the bracketed parts" />
      <div className="tabs">
        {data.variants.map((variant, i) => (
          <button key={i} className={`tab ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}>{variant.icon} {variant.label}</button>
        ))}
      </div>
      {v && (
        <div className="message-card">
          <div className="flex items-center justify-between mb-md">
            <div className="message-type-badge">{v.icon} {v.type}</div>
            <CopyBtn text={`${v.subject ? `Subject: ${v.subject}\n\n` : ''}${v.body}`} />
          </div>
          {v.subject && <div className="email-subject"><strong>Subject:</strong> {v.subject}</div>}
          <div className="message-content">{v.body}</div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: Tech Stack ──────────────────────────────────────────

function TechStack({ data, repos }) {
  if (!data) return null;
  const cats = [...new Set(data.stack?.map(t => t.category) || [])];
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="💻" title="Technology Stack" subtitle={data.summary} />
      {cats.length > 0 && (
        <div className="card">
          {cats.map(cat => (
            <div key={cat} className="tech-category">
              <div className="tech-category-label">{cat}</div>
              <div className="tech-grid">
                {data.stack.filter(t => t.category === cat).map((tech, i) => <div key={i} className="tech-pill">{tech.name}</div>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.stack?.length === 0 && <EmptyState icon="💻" message="No technologies detected from research data." />}
      {repos?.length > 0 && (
        <div className="card">
          <SectionHeader icon="📦" title="Open Source Repositories" subtitle={`${repos.length} repositories found on GitHub`} />
          <div className="repos-grid">
            {repos.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="repo-card">
                <div className="repo-card-header">
                  <span className="repo-name">{r.name?.split('/').pop() || r.name}</span>
                  <div className="repo-stats">
                    {r.language && <span className="repo-lang">{r.language}</span>}
                    <span className="repo-stars">⭐ {r.stars?.toLocaleString()}</span>
                  </div>
                </div>
                {r.description && <p className="repo-desc">{r.description.slice(0, 120)}</p>}
                <div className="repo-meta">{r.name}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SECTION: Recent Activity ─────────────────────────────────────

function RecentActivity({ data }) {
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="📰" title="Latest Activity" subtitle={`${data?.news?.length || 0} news articles · ${data?.hnPosts?.length || 0} Hacker News discussions`} />
      {data?.news?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">📰 Recent News</h4>
          <div className="links-grid">
            {data.news.map((item, i) => (
              <LinkCard key={i} item={{ ...item, source: item.source || 'News', date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' }} />
            ))}
          </div>
        </div>
      )}
      {data?.hnPosts?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">🔶 Hacker News</h4>
          <div className="hn-list">
            {data.hnPosts.map((post, i) => (
              <a key={i} href={post.hnUrl || post.url} target="_blank" rel="noopener noreferrer" className="hn-item">
                <div className="hn-score"><span className="hn-points">▲ {post.points}</span></div>
                <div className="hn-body">
                  <div className="hn-title">{post.title}</div>
                  <div className="hn-meta">💬 {post.comments} · by {post.author}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {(!data?.news?.length && !data?.hnPosts?.length) && <EmptyState icon="📰" message="No recent activity found from public sources." />}
    </div>
  );
}

// ── Job Hunt Sections ────────────────────────────────────────────

function CultureInsights({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🏢" title="Culture & Reviews" subtitle="Signals extracted from research data" />
      <div className="data-cards-row">
        <DataCard icon="🏠" label="Work Style" value={data.workStyle || '—'} />
        <DataCard icon="😊" label="Sentiment" value={`${data.sentiment?.positivePercent || 50}% Positive`} />
        <DataCard icon="🎭" label="Mood" value={data.sentiment?.label || '—'} />
      </div>
      {data.values?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">Culture Signals</h4>
          <div className="tech-grid">{data.values.map((v, i) => <div key={i} className="tech-pill" style={{ fontSize: '0.85rem' }}>{v}</div>)}</div>
        </div>
      )}
      {data.reviews?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">From the Web</h4>
          <div className="links-grid">{data.reviews.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div>
        </div>
      )}
    </div>
  );
}

function InterviewPrep({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🎤" title="Interview Prep" subtitle="Tips and questions to nail your interview" />
      <div className="two-col">
        <div className="card">
          <h4 className="subsection-title">📝 Prep Checklist</h4>
          <div className="checklist">{data.tips?.map((t, i) => <div key={i} className="checklist-item"><span className="checklist-bullet">→</span>{t}</div>)}</div>
        </div>
        <div className="card">
          <h4 className="subsection-title">❓ Ask These Questions</h4>
          <div className="checklist">{data.questions?.map((q, i) => <div key={i} className="checklist-item"><span className="checklist-bullet">?</span>{q}</div>)}</div>
        </div>
      </div>
      {data.interviewInsights?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">🔍 Insights from the Web</h4>
          <div className="links-grid">{data.interviewInsights.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div>
        </div>
      )}
    </div>
  );
}

function HiringActivity({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="📋" title="Hiring Activity" subtitle={data.summary} />
      {data.signals?.length > 0 ? (
        <div className="card"><div className="links-grid">{data.signals.map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      ) : <EmptyState icon="📋" message="No recent hiring signals from public sources. Check the company careers page." />}
    </div>
  );
}

function ApplicationStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🎯" title="Application Strategy" subtitle="Your step-by-step plan" />
      <div className="callout-card callout-card--info">
        <div className="callout-icon">📋</div>
        <div><div className="callout-title">Approach</div><div className="callout-text">{data.approach}</div></div>
      </div>
      <div className="callout-card callout-card--warning">
        <div className="callout-icon">⏰</div>
        <div><div className="callout-title">Best Timing</div><div className="callout-text">{data.timeline}</div></div>
      </div>
      <div className="card">
        <h4 className="subsection-title">💡 Pro Tips</h4>
        <div className="checklist">{data.tips?.map((t, i) => <div key={i} className="checklist-item"><span className="checklist-bullet">✦</span>{t}</div>)}</div>
      </div>
    </div>
  );
}

// ── Founder Sections ─────────────────────────────────────────────

function MarketPosition({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="📈" title="Market Position" subtitle={data.summary} />
      <div className="flex items-center gap-sm" style={{ flexWrap: 'wrap' }}>
        {data.strengths?.length > 0 && data.strengths.map((s, i) => <span key={`s${i}`} className="badge badge-success">{s}</span>)}
        {data.weaknesses?.length > 0 && data.weaknesses.map((w, i) => <span key={`w${i}`} className="badge badge-danger">{w}</span>)}
      </div>
      {data.insights?.length > 0 && (
        <div className="card"><h4 className="subsection-title">🔍 Market Intelligence</h4><div className="links-grid">{data.insights.slice(0, 5).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      )}
    </div>
  );
}

function FundingIntel({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="💰" title="Funding Intel" subtitle={data.summary} />
      {data.signals?.length > 0 && (
        <div className="signal-cards">{data.signals.map((s, i) => <div key={i} className="callout-card callout-card--info"><div className="callout-icon">💰</div><div className="callout-text">{s}</div></div>)}</div>
      )}
      {data.data?.length > 0 && (
        <div className="card"><h4 className="subsection-title">🔍 Sources</h4><div className="links-grid">{data.data.slice(0, 5).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      )}
    </div>
  );
}

function PartnershipAngles({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🤝" title="Partnership Angles" subtitle="Strategic collaboration opportunities" />
      <div className="angles-grid">
        {data.angles?.map((a, i) => (
          <div key={i} className="angle-card">
            <div className="angle-title">{a.type}</div>
            <div className="angle-desc">{a.description}</div>
          </div>
        ))}
      </div>
      {data.data?.length > 0 && (
        <div className="card"><h4 className="subsection-title">🔍 Related Sources</h4><div className="links-grid">{data.data.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      )}
    </div>
  );
}

function CompetitiveLandscape({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="⚔️" title="Competitive Landscape" subtitle={data.summary} />
      {data.data?.length > 0 ? (
        <div className="card"><div className="links-grid">{data.data.slice(0, 5).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      ) : <EmptyState icon="⚔️" message='Search for "[company] vs [competitor]" for detailed comparisons.' />}
    </div>
  );
}

// ── Networking Sections ──────────────────────────────────────────

function ConversationStarters({ data }) {
  if (!data?.topics) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="💬" title="Conversation Starters" subtitle="Copy a prompt and personalize it" />
      <div className="starters-grid">
        {data.topics.map((t, i) => (
          <div key={i} className="starter-card">
            <div className="flex items-center justify-between mb-md">
              <span className="starter-topic">{t.topic}</span>
              <CopyBtn text={t.prompt} />
            </div>
            <p className="starter-prompt">{t.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🗺️" title="Connection Strategy" subtitle="Step-by-step plan to build genuine relationships" />
      <div className="card">
        <div className="steps-list">
          {data.steps?.map((step, i) => (
            <div key={i} className="step-item">
              <div className="step-number">{i + 1}</div>
              <p className="step-text">{step}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h4 className="subsection-title">✅ Best Practices</h4>
        <div className="checklist">{data.bestPractices?.map((bp, i) => <div key={i} className="checklist-item"><span className="checklist-bullet">✓</span>{bp}</div>)}</div>
      </div>
    </div>
  );
}

function CommunityPresence({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🌐" title="Community Presence" subtitle="Where they show up online" />
      <div className="data-cards-row">
        <DataCard icon="💻" label="GitHub" value={data.github} />
        <DataCard icon="🔶" label="Hacker News" value={data.hackernews} />
      </div>
      {data.contentLinks?.length > 0 && <div className="card"><h4 className="subsection-title">📝 Content & Talks</h4><div className="links-grid">{data.contentLinks.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>}
      {data.communityLinks?.length > 0 && <div className="card"><h4 className="subsection-title">🌍 Community Activity</h4><div className="links-grid">{data.communityLinks.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>}
    </div>
  );
}

// ── Lead Gen Sections ────────────────────────────────────────────

function PainPoints({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="🔥" title="Pain Points" subtitle="Potential pain areas detected from public data" />
      {data.pains?.length > 0 ? (
        <div className="card">
          <div className="pain-grid">
            {data.pains.map((p, i) => (
              <div key={i} className="pain-item">
                <div className="pain-item-header">
                  <span className="pain-item-category">{p.category}</span>
                  <span className={`pain-item-severity pain-item-severity--${p.intensity >= 7 ? 'high' : p.intensity >= 4 ? 'medium' : 'low'}`}>
                    {p.intensity >= 7 ? 'High' : p.intensity >= 4 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <div className="pain-track"><div className={`pain-fill ${p.intensity >= 7 ? 'high' : p.intensity >= 4 ? 'medium' : 'low'}`} style={{ width: `${p.intensity * 10}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      ) : <EmptyState icon="🔥" message="No significant pain signals detected from public data." />}
      {data.data?.length > 0 && (
        <div className="card"><h4 className="subsection-title">🔍 Sources</h4><div className="links-grid">{data.data.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      )}
    </div>
  );
}

function BuySignals({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="📡" title="Buy Signals" subtitle="Timing indicators suggesting readiness" />
      {data.signals?.length > 0 ? (
        <div className="signal-cards">
          {data.signals.map((s, i) => (
            <div key={i} className="signal-card">
              <div className="signal-card-label">{s.label}</div>
              <div className="signal-card-desc">{s.description}</div>
            </div>
          ))}
        </div>
      ) : <EmptyState icon="📡" message="No strong buy signals detected." />}
      {data.data?.length > 0 && (
        <div className="card"><h4 className="subsection-title">🔍 Sources</h4><div className="links-grid">{data.data.slice(0, 4).map((r, i) => <LinkCard key={i} item={r} />)}</div></div>
      )}
    </div>
  );
}

function CallBrief({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in section-stack">
      <SectionHeader icon="📞" title="Call Prep Brief" subtitle="Everything you need before the call" />
      <div className="card">
        <div className="flex items-center justify-between mb-lg">
          <h4 className="subsection-title" style={{ marginBottom: 0 }}>Call Script</h4>
          <CopyBtn text={`Hook: ${data.hook}\nPain: ${data.painHypothesis}\nAngle: ${data.outreachAngle}\nQuestions:\n${data.discoveryQuestions?.map(q => `- ${q}`).join('\n')}`} label="📋 Copy All" />
        </div>
        <div className="brief-block">
          <div className="brief-block-label">🎣 Opening Hook</div>
          <div className="brief-block-content brief-block-content--accent">{data.hook}</div>
        </div>
        <div className="brief-block">
          <div className="brief-block-label">🎯 Pain Hypothesis</div>
          <div className="brief-block-content">{data.painHypothesis}</div>
        </div>
        <div className="brief-block">
          <div className="brief-block-label">💡 Outreach Angle</div>
          <div className="brief-block-content">{data.outreachAngle}</div>
        </div>
        <div className="brief-block">
          <div className="brief-block-label">❓ Discovery Questions</div>
          <div className="checklist" style={{ marginTop: 'var(--space-sm)' }}>{data.discoveryQuestions?.map((q, i) => <div key={i} className="checklist-item"><span className="checklist-bullet">{i + 1}</span>{q}</div>)}</div>
        </div>
      </div>
      {data.objectionPrep?.length > 0 && (
        <div className="card">
          <h4 className="subsection-title">🛡️ Objection Handling</h4>
          <div className="objection-list">
            {data.objectionPrep.map((o, i) => (
              <div key={i} className="objection-item">
                <div className="objection-q">&ldquo;{o.objection}&rdquo;</div>
                <div className="objection-a">→ {o.response}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────

export default function DossierPage() {
  const params = useParams();
  const dossierId = params.id;

  const [status, setStatus] = useState('loading');
  const [sources, setSources] = useState([]);
  const [overallMessage, setOverallMessage] = useState('Connecting...');
  const [dossier, setDossier] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!dossierId) return;
    const es = new EventSource(`/api/progress/${dossierId}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'plan_ready': setSources(data.sources || []); setOverallMessage(data.message); setStatus('researching'); break;
        case 'source_started': setSources(prev => prev.map(s => s.id === data.sourceId ? { ...s, status: 'active' } : s)); break;
        case 'source_completed': setSources(prev => prev.map(s => s.id === data.sourceId ? { ...s, status: 'completed' } : s)); break;
        case 'source_failed': setSources(prev => prev.map(s => s.id === data.sourceId ? { ...s, status: 'failed' } : s)); break;
        case 'research_completed': setOverallMessage(data.message); setStatus('synthesizing'); break;
        case 'synthesis_started': setOverallMessage(data.message); break;
        case 'score_ready': setOverallMessage(`Score: ${data.score}/100`); break;
        case 'dossier_ready': setOverallMessage('✓ Ready!'); setStatus('completed'); es.close(); fetchDossier(); break;
        case 'error': setOverallMessage(data.message); setStatus('failed'); es.close(); break;
        case 'research_started': setOverallMessage(data.message); setStatus('researching'); break;
      }
    };
    es.onerror = () => fetchDossier();
    return () => es.close();
  }, [dossierId]);

  const fetchDossier = useCallback(async () => {
    try {
      const res = await fetch(`/api/dossier/${dossierId}`);
      const data = await res.json();
      if (data.status === 'completed') { setDossier(data); setStatus('completed'); }
      else if (data.status === 'failed') { setStatus('failed'); setOverallMessage(data.error || 'Failed'); }
    } catch (err) { console.error(err); }
  }, [dossierId]);

  useEffect(() => { if (status === 'completed' && !dossier) fetchDossier(); }, [status, dossier, fetchDossier]);

  const purpose = dossier?.input?.purpose || 'networking';
  const purposeMeta = PURPOSE_META[purpose] || PURPOSE_META.networking;
  const sections = SIDEBAR_SECTIONS[purpose] || SIDEBAR_SECTIONS.networking;
  const syn = dossier?.synthesis || {};

  function renderSection() {
    switch (activeSection) {
      case 'overview': return <CompanyOverview data={syn.companyOverview} score={dossier?.score} trends={syn.trendsData} whois={syn.whoisData} />;
      case 'people': return <KeyPeople data={syn.keyPeople} />;
      case 'outreach': return <OutreachMessages data={syn.outreach} />;
      case 'tech': return <TechStack data={syn.techStack} repos={syn.githubRepos} />;
      case 'news': return <RecentActivity data={syn.recentActivity} />;
      case 'culture': return <CultureInsights data={syn.cultureInsights} />;
      case 'interview': return <InterviewPrep data={syn.interviewPrep} />;
      case 'hiring': return <HiringActivity data={syn.hiringActivity} />;
      case 'strategy': return purpose === 'job_hunt' ? <ApplicationStrategy data={syn.applicationStrategy} /> : <ConnectionStrategy data={syn.connectionStrategy} />;
      case 'market': return <MarketPosition data={syn.marketPosition} />;
      case 'funding': return <FundingIntel data={syn.fundingIntel} />;
      case 'partnerships': return <PartnershipAngles data={syn.partnershipAngles} />;
      case 'competitors': return <CompetitiveLandscape data={syn.competitiveLandscape} />;
      case 'starters': return <ConversationStarters data={syn.conversationStarters} />;
      case 'community': return <CommunityPresence data={syn.communityPresence} />;
      case 'pain': return <PainPoints data={syn.painPoints} />;
      case 'signals': return <BuySignals data={syn.buySignals} />;
      case 'call': return <CallBrief data={syn.callBrief} />;
      default: return <CompanyOverview data={syn.companyOverview} score={dossier?.score} trends={syn.trendsData} whois={syn.whoisData} />;
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dossier-header">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="badge" style={{ background: `${purposeMeta.color}22`, color: purposeMeta.color, border: `1px solid ${purposeMeta.color}44` }}>{purposeMeta.icon} {purposeMeta.label}</span>
            <span className={`badge ${status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-accent'}`}>
              {status === 'researching' && '🔍 Researching'}{status === 'synthesizing' && '🤖 Synthesizing'}{status === 'completed' && '✓ Complete'}{status === 'failed' && '✗ Failed'}{status === 'loading' && '⏳ Loading'}
            </span>
          </div>
          <h1>{dossier?.input?.companyName || 'Generating...'}</h1>
          {dossier?.input?.domain && <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>{dossier.input.domain}</p>}
        </div>
        <a href="/" className="btn btn-ghost">← New Search</a>
      </div>

      {/* Research progress */}
      {(status === 'researching' || status === 'synthesizing') && <ProgressTracker sources={sources} overallMessage={overallMessage} />}
      {status === 'synthesizing' && (
        <div className="card text-center fade-in" style={{ padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-lg)', borderWidth: '3px' }} />
          <h3>Synthesizing Intelligence</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>Generating {purposeMeta.label.toLowerCase()} report...</p>
        </div>
      )}

      {/* Error */}
      {status === 'failed' && (
        <div className="card text-center" style={{ padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
          <h3>Generation Failed</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>{overallMessage}</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>← Try Again</a>
        </div>
      )}

      {/* Completed */}
      {status === 'completed' && dossier && (
        <>
          <ExecutiveSummary
            company={dossier.input?.companyName}
            purpose={purpose}
            score={dossier.score}
            overview={syn.companyOverview}
            trends={syn.trendsData}
            people={syn.keyPeople}
            news={syn.recentActivity}
            repos={syn.githubRepos}
          />
          <div className="dossier-layout">
            <nav className="dossier-sidebar">
              <div className="sidebar-section-label">Sections</div>
              {sections.map(section => (
                <button key={section.id} className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}>
                  <span className="item-icon">{section.icon}</span>{section.label}
                </button>
              ))}
            </nav>
            <div className="dossier-content">{renderSection()}</div>
          </div>
        </>
      )}
    </div>
  );
}
