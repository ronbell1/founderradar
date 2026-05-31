'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ── Constants ────────────────────────────────────────────────────

const PURPOSE_META = {
  job_hunt: { icon: '🎯', label: 'Job Hunt', color: '#6c5ce7' },
  founder: { icon: '🚀', label: 'Founder Mode', color: '#00cec9' },
  networking: { icon: '🤝', label: 'Networking', color: '#fdcb6e' },
  lead_gen: { icon: '📊', label: 'Lead Gen', color: '#ff6b6b' },
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

// ── Small Components ─────────────────────────────────────────────

function CopyBtn({ text, label = '📋 Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>{copied ? '✓ Copied!' : label}</button>;
}

function SearchResultCard({ item }) {
  if (!item) return null;
  return (
    <div className="news-item">
      <div className="news-dot" />
      <div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
          {item.title}
        </a>
        {item.snippet && <div className="news-snippet">{item.snippet}</div>}
        {item.date && <div className="news-date">{item.date}</div>}
      </div>
    </div>
  );
}

function Sparkline({ points, width = 200, height = 40 }) {
  if (!points?.length) return null;
  const max = Math.max(...points.map(p => p.value));
  const min = Math.min(...points.map(p => p.value));
  const range = max - min || 1;
  const w = width;
  const h = height;
  const step = w / (points.length - 1);
  const pathD = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p.value - min) / range) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-sm)' }}>
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

// ── Score Gauge ──────────────────────────────────────────────────

function OpportunityScore({ score }) {
  const circ = 2 * Math.PI * 70;
  const offset = circ - (score.score / 100) * circ;
  const color = score.score >= 75 ? 'var(--hot)' : score.score >= 50 ? 'var(--warm)' : score.score >= 25 ? 'var(--cool)' : 'var(--cold)';

  return (
    <div className="card fade-in">
      <h3 style={{ marginBottom: 'var(--space-lg)' }}>📊 Opportunity Score</h3>
      <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
        <div className="score-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle className="score-track" cx="90" cy="90" r="70" />
            <circle className="score-value" cx="90" cy="90" r="70" stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          <div className="text-center">
            <div className="score-number" style={{ color }}>{score.score}</div>
            <div className="score-label">/ 100</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, marginBottom: 'var(--space-md)' }}>
            {score.tierLabel}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>{score.explanation}</p>
          {score.breakdown?.map((item, i) => (
            <div key={i} className="pain-bar">
              <span className="pain-label" style={{ width: '120px' }}>{item.icon} {item.category}</span>
              <div className="pain-track">
                <div className={`pain-fill ${item.score >= item.max * 0.7 ? 'high' : item.score >= item.max * 0.4 ? 'medium' : 'low'}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', width: '40px', textAlign: 'right' }}>{item.score}/{item.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION RENDERERS ────────────────────────────────────────────

function CompanyOverview({ data, score, trends, whois }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      {data.keyMetrics?.length > 0 && (
        <div className="metrics-grid">
          {data.keyMetrics.map((m, i) => (
            <div key={i} className="metric-card"><div className="metric-value">{m.value}</div><div className="metric-label">{m.label}</div></div>
          ))}
        </div>
      )}
      {trends && (
        <div className="card-flat">
          <div className="flex items-center justify-between mb-md">
            <h4>📈 Google Trends — 12 Month</h4>
            <span className="badge badge-accent">{trends.trend === 'rising' ? '📈 Rising' : trends.trend === 'declining' ? '📉 Declining' : '→ Stable'}</span>
          </div>
          <Sparkline points={trends.points} width={600} height={60} />
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 'var(--space-sm)' }}>{trends.summary}</p>
        </div>
      )}
      {data.summary && (
        <div className="card-flat" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {typeof data.summary === 'string' ? data.summary.slice(0, 2000) : ''}
        </div>
      )}
      {whois && (
        <div className="card-flat">
          <h4 style={{ marginBottom: 'var(--space-sm)' }}>🔎 Domain Intel</h4>
          <div className="metrics-grid">
            {whois.domain && <div className="metric-card"><div className="metric-value" style={{ fontSize: '1rem' }}>{whois.domain}</div><div className="metric-label">Domain</div></div>}
            {whois.age && <div className="metric-card"><div className="metric-value">{whois.age}</div><div className="metric-label">Domain Age</div></div>}
            {whois.registrar && <div className="metric-card"><div className="metric-value" style={{ fontSize: '0.75rem' }}>{whois.registrar}</div><div className="metric-label">Registrar</div></div>}
          </div>
        </div>
      )}
      {score && <OpportunityScore score={score} />}
    </div>
  );
}

function KeyPeople({ data }) {
  if (!data) return null;
  const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff', '#a29bfe', '#55efc4'];
  return (
    <div className="fade-in">
      {data.hasRealData && <div className="badge badge-success mb-lg">✓ Real people from AI research</div>}
      {!data.hasRealData && <div className="badge badge-warning mb-lg">⚠ Generic roles — AI research may still be processing</div>}
      <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        {data.leaders?.map((person, i) => (
          <div key={i} className="person-card">
            <div className="person-avatar" style={{ background: colors[i % colors.length] }}>
              {person.name?.charAt(0) || '#'}
            </div>
            <div className="person-info">
              <div className="person-name">{person.name}</div>
              <div className="person-title">{person.title}</div>
              {person.bio && <div className="person-reason" style={{ fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: '0.78rem', marginBottom: '4px' }}>{person.bio}</div>}
              <div className="person-reason">{person.reason}</div>
            </div>
            <div className="person-order">
              {person.priority === 'high' ? '🔴' : person.priority === 'medium' ? '🟡' : '🟢'} #{person.outreachOrder}
            </div>
          </div>
        ))}
      </div>
      {data.strategy && (
        <div className="insight-card"><div className="insight-category">💡 Outreach Strategy</div><div className="insight-text">{data.strategy}</div></div>
      )}
    </div>
  );
}

function OutreachMessages({ data }) {
  const [active, setActive] = useState(0);
  if (!data?.variants) return null;
  const v = data.variants[active];
  return (
    <div className="fade-in">
      <div className="tabs mb-lg">
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

function TechStack({ data, repos }) {
  if (!data) return null;
  const cats = [...new Set(data.stack?.map(t => t.category) || [])];
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>💻 Tech Stack</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>{data.summary}</p>
        {cats.map(cat => (
          <div key={cat} style={{ marginBottom: 'var(--space-md)' }}>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{cat}</h4>
            <div className="tech-grid">
              {data.stack.filter(t => t.category === cat).map((tech, i) => <div key={i} className="tech-pill">{tech.name}</div>)}
            </div>
          </div>
        ))}
        {data.stack?.length === 0 && <p className="text-muted">No technologies detected from research data.</p>}
      </div>

      {repos?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>📦 GitHub Repositories</h3>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            {repos.map((r, i) => (
              <div key={i} className="card-flat" style={{ padding: 'var(--space-md)' }}>
                <div className="flex items-center justify-between">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</a>
                  <div className="flex items-center gap-sm">
                    {r.language && <span className="tech-pill" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>{r.language}</span>}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>⭐ {r.stars?.toLocaleString()}</span>
                  </div>
                </div>
                {r.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.4 }}>{r.description.slice(0, 150)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivity({ data }) {
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      {data?.news?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>📰 News</h3>
          {data.news.map((item, i) => (
            <div key={i} className="news-item">
              <div className="news-dot" />
              <div>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{item.title}</a>
                <div className="news-date">{item.source} {item.date && `• ${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data?.hnPosts?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>🔶 Hacker News Discussions</h3>
          {data.hnPosts.map((post, i) => (
            <div key={i} className="news-item">
              <div className="news-dot" style={{ background: '#ff6600' }} />
              <div style={{ flex: 1 }}>
                <a href={post.hnUrl || post.url} target="_blank" rel="noopener noreferrer" className="news-title" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{post.title}</a>
                <div className="flex items-center gap-md" style={{ marginTop: '4px' }}>
                  <span className="news-date">▲ {post.points} points</span>
                  <span className="news-date">💬 {post.comments} comments</span>
                  <span className="news-date">by {post.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {(!data?.news?.length && !data?.hnPosts?.length) && <div className="card"><h3>📰 Latest Activity</h3><p className="text-muted mt-md">No recent activity found.</p></div>}
    </div>
  );
}

// ── Job Hunt Sections ────────────────────────────────────────────

function CultureInsights({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>🏢 Culture Signals</h3>
        {data.values?.length > 0 && <div className="tech-grid mb-lg">{data.values.map((v, i) => <div key={i} className="tech-pill" style={{ fontSize: '0.85rem' }}>{v}</div>)}</div>}
        <div className="metrics-grid">
          <div className="metric-card"><div className="metric-value">{data.workStyle || '—'}</div><div className="metric-label">Work Style</div></div>
          <div className="metric-card"><div className="metric-value">{data.sentiment?.positivePercent || 50}%</div><div className="metric-label">Positive Sentiment</div></div>
          <div className="metric-card"><div className="metric-value">{data.sentiment?.label || '—'}</div><div className="metric-label">Overall Mood</div></div>
        </div>
      </div>
      {data.reviews?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-md)' }}>💬 Culture & Reviews Mentions</h3>
          {data.reviews.map((r, i) => <SearchResultCard key={i} item={r} />)}
        </div>
      )}
    </div>
  );
}

function InterviewPrep({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>📝 Preparation Tips</h3><ul className="brief-questions">{data.tips?.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>❓ Questions to Ask</h3><ul className="brief-questions">{data.questions?.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
      {data.interviewInsights?.length > 0 && (
        <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Interview Insights from Web</h3>{data.interviewInsights.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>
      )}
    </div>
  );
}

function HiringActivity({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h3 style={{ marginBottom: 'var(--space-md)' }}>📋 Hiring Activity</h3>
      <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>{data.summary}</p>
      {data.signals?.length > 0 ? data.signals.map((r, i) => <SearchResultCard key={i} item={r} />) : <p className="text-muted">No recent hiring signals from public sources.</p>}
    </div>
  );
}

function ApplicationStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h3 style={{ marginBottom: 'var(--space-lg)' }}>🎯 Application Strategy</h3>
      <div className="brief-section"><div className="brief-label">📋 Approach</div><div className="brief-content">{data.approach}</div></div>
      <div className="brief-section"><div className="brief-label">⏰ Timing</div><div className="brief-content">{data.timeline}</div></div>
      <div className="brief-section"><div className="brief-label">💡 Pro Tips</div><ul className="brief-questions">{data.tips?.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
    </div>
  );
}

// ── Founder Sections ─────────────────────────────────────────────

function MarketPosition({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>📈 Market Analysis</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{data.summary}</p>
        {data.strengths?.length > 0 && <div className="mb-md"><span className="badge badge-success mb-md">Strengths: {data.strengths.join(', ')}</span></div>}
        {data.weaknesses?.length > 0 && <div><span className="badge badge-danger">Weaknesses: {data.weaknesses.join(', ')}</span></div>}
      </div>
      {data.insights?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Market Intelligence</h3>{data.insights.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

function FundingIntel({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>💰 Funding Intel</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{data.summary}</p>
        {data.signals?.length > 0 && (
          <div style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {data.signals.map((s, i) => <div key={i} className="insight-card"><div className="insight-text">{s}</div></div>)}
          </div>
        )}
      </div>
      {data.data?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Funding Data Sources</h3>{data.data.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

function PartnershipAngles({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
        {data.angles?.map((a, i) => <div key={i} className="insight-card"><div className="insight-category">{a.type}</div><div className="insight-text">{a.description}</div></div>)}
      </div>
      {data.data?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Partnership Data</h3>{data.data.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

function CompetitiveLandscape({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h3 style={{ marginBottom: 'var(--space-md)' }}>⚔️ Competitive Landscape</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>{data.summary}</p>
      {data.data?.length > 0 ? data.data.map((r, i) => <SearchResultCard key={i} item={r} />) : <p className="text-muted">Search for specific competitors to get detailed comparisons.</p>}
    </div>
  );
}

// ── Networking Sections ──────────────────────────────────────────

function ConversationStarters({ data }) {
  if (!data?.topics) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
      {data.topics.map((t, i) => (
        <div key={i} className="message-card">
          <div className="flex items-center justify-between mb-md">
            <div className="message-type-badge">💬 {t.topic}</div>
            <CopyBtn text={t.prompt} />
          </div>
          <div className="message-content" style={{ fontStyle: 'italic' }}>{t.prompt}</div>
        </div>
      ))}
    </div>
  );
}

function ConnectionStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>🗺️ Steps to Connect</h3>
        {data.steps?.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: '3px' }}>{step}</p>
          </div>
        ))}
      </div>
      <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>✅ Best Practices</h3><ul className="brief-questions">{data.bestPractices?.map((bp, i) => <li key={i}>{bp}</li>)}</ul></div>
    </div>
  );
}

function CommunityPresence({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>🌐 Community Presence</h3>
        <div className="metrics-grid">
          <div className="metric-card"><div className="metric-value">💻</div><div className="metric-label">GitHub — {data.github}</div></div>
          <div className="metric-card"><div className="metric-value">🔶</div><div className="metric-label">HN — {data.hackernews}</div></div>
        </div>
      </div>
      {data.contentLinks?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>📝 Content & Talks</h3>{data.contentLinks.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
      {data.communityLinks?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🌍 Community Activity</h3>{data.communityLinks.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

// ── Lead Gen Sections ────────────────────────────────────────────

function PainPoints({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>🔥 Pain Points</h3>
        {data.sentiment && <div className="badge badge-accent mb-lg">{data.sentiment.label}</div>}
        {data.pains?.length > 0 ? (
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            {data.pains.map((p, i) => (
              <div key={i} className="pain-bar">
                <span className="pain-label">{p.category}</span>
                <div className="pain-track"><div className={`pain-fill ${p.intensity >= 7 ? 'high' : p.intensity >= 4 ? 'medium' : 'low'}`} style={{ width: `${p.intensity * 10}%` }} /></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', width: '45px', textAlign: 'right' }}>{p.intensity}/10</span>
              </div>
            ))}
          </div>
        ) : <p className="text-muted">No significant pain signals detected from public data.</p>}
      </div>
      {data.data?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Pain Signal Sources</h3>{data.data.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

function BuySignals({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      {data.signals?.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {data.signals.map((s, i) => <div key={i} className="insight-card"><div className="insight-category">{s.label}</div><div className="insight-text">{s.description}</div></div>)}
        </div>
      )}
      {data.data?.length > 0 && <div className="card"><h3 style={{ marginBottom: 'var(--space-md)' }}>🔍 Signal Sources</h3>{data.data.map((r, i) => <SearchResultCard key={i} item={r} />)}</div>}
    </div>
  );
}

function CallBrief({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-lg">
        <h3>📞 Call Prep Brief</h3>
        <CopyBtn text={`Hook: ${data.hook}\nPain: ${data.painHypothesis}\nAngle: ${data.outreachAngle}\nQuestions:\n${data.discoveryQuestions?.map(q => `- ${q}`).join('\n')}`} label="📋 Copy All" />
      </div>
      <div className="brief-section"><div className="brief-label">🎣 Opening Hook</div><div className="brief-content" style={{ fontStyle: 'italic', color: 'var(--accent-secondary)' }}>{data.hook}</div></div>
      <div className="brief-section"><div className="brief-label">🎯 Pain Hypothesis</div><div className="brief-content">{data.painHypothesis}</div></div>
      <div className="brief-section"><div className="brief-label">💡 Angle</div><div className="brief-content">{data.outreachAngle}</div></div>
      <div className="brief-section"><div className="brief-label">❓ Discovery Questions</div><ul className="brief-questions">{data.discoveryQuestions?.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
      {data.objectionPrep?.length > 0 && (
        <div className="brief-section">
          <div className="brief-label">🛡️ Objection Prep</div>
          {data.objectionPrep.map((o, i) => (
            <div key={i} style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>"{o.objection}"</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>→ {o.response}</div>
            </div>
          ))}
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
      // Job Hunt
      case 'culture': return <CultureInsights data={syn.cultureInsights} />;
      case 'interview': return <InterviewPrep data={syn.interviewPrep} />;
      case 'hiring': return <HiringActivity data={syn.hiringActivity} />;
      case 'strategy': return purpose === 'job_hunt' ? <ApplicationStrategy data={syn.applicationStrategy} /> : <ConnectionStrategy data={syn.connectionStrategy} />;
      // Founder
      case 'market': return <MarketPosition data={syn.marketPosition} />;
      case 'funding': return <FundingIntel data={syn.fundingIntel} />;
      case 'partnerships': return <PartnershipAngles data={syn.partnershipAngles} />;
      case 'competitors': return <CompetitiveLandscape data={syn.competitiveLandscape} />;
      // Networking
      case 'starters': return <ConversationStarters data={syn.conversationStarters} />;
      case 'community': return <CommunityPresence data={syn.communityPresence} />;
      // Lead Gen
      case 'pain': return <PainPoints data={syn.painPoints} />;
      case 'signals': return <BuySignals data={syn.buySignals} />;
      case 'call': return <CallBrief data={syn.callBrief} />;
      default: return <CompanyOverview data={syn.companyOverview} score={dossier?.score} trends={syn.trendsData} whois={syn.whoisData} />;
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: '1200px', margin: '0 auto' }}>
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
        <div className="flex items-center gap-sm">
          <a href="/" className="btn btn-ghost">← New Search</a>
        </div>
      </div>

      {(status === 'researching' || status === 'synthesizing') && <ProgressTracker sources={sources} overallMessage={overallMessage} />}

      {status === 'synthesizing' && (
        <div className="card text-center fade-in" style={{ padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-lg)', borderWidth: '3px' }} />
          <h3>Synthesizing Intelligence</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>Generating {purposeMeta.label.toLowerCase()} report...</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="card text-center" style={{ padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
          <h3>Generation Failed</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>{overallMessage}</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>← Try Again</a>
        </div>
      )}

      {status === 'completed' && dossier && (
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
      )}
    </div>
  );
}
