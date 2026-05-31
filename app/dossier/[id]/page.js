'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    { id: 'culture', icon: '🏢', label: 'Culture & Values' },
    { id: 'interview', icon: '🎤', label: 'Interview Prep' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Recent Activity' },
    { id: 'strategy', icon: '🎯', label: 'Application Strategy' },
  ],
  founder: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'Key Contacts' },
    { id: 'market', icon: '📈', label: 'Market Position' },
    { id: 'funding', icon: '💰', label: 'Funding Intel' },
    { id: 'partnerships', icon: '🤝', label: 'Partnership Angles' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Recent Activity' },
  ],
  networking: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'People to Connect' },
    { id: 'starters', icon: '💬', label: 'Conversation Starters' },
    { id: 'strategy', icon: '🗺️', label: 'Connection Strategy' },
    { id: 'outreach', icon: '✉️', label: 'Message Templates' },
    { id: 'community', icon: '🌐', label: 'Community Presence' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Recent Activity' },
  ],
  lead_gen: [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'people', icon: '👥', label: 'Decision Makers' },
    { id: 'pain', icon: '🔥', label: 'Pain Points' },
    { id: 'signals', icon: '📡', label: 'Buy Signals' },
    { id: 'outreach', icon: '✉️', label: 'Outreach Templates' },
    { id: 'call', icon: '📞', label: 'Call Brief' },
    { id: 'tech', icon: '💻', label: 'Tech Stack' },
    { id: 'news', icon: '📰', label: 'Recent Activity' },
  ],
};

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-sm)' }}>
        {sources.map(s => (
          <div key={s.id} className={`source-card ${s.status}`}>
            <div className="source-icon">{s.icon}</div>
            <div className="source-info">
              <div className="source-name">{s.source}</div>
              <div className="source-status">
                {s.status === 'queued' && 'Waiting...'}
                {s.status === 'active' && 'Fetching...'}
                {s.status === 'completed' && '✓ Complete'}
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

// ── Copy Button ──────────────────────────────────────────────────

function CopyBtn({ text, label = '📋 Copy' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>{copied ? '✓ Copied!' : label}</button>;
}

// ── Score Gauge ──────────────────────────────────────────────────

function OpportunityScore({ score }) {
  const circ = 2 * Math.PI * 70;
  const offset = circ - (score.score / 100) * circ;
  const color = score.score >= 75 ? 'var(--hot)' : score.score >= 50 ? 'var(--warm)' : score.score >= 25 ? 'var(--cool)' : 'var(--cold)';

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>📊 Opportunity Score</h2>
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
        <div style={{ flex: 1, minWidth: '250px' }}>
          <div className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, marginBottom: 'var(--space-md)' }}>
            {score.tierLabel}
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>
            {score.explanation}
          </p>
          {score.breakdown?.map((item, i) => (
            <div key={i} className="pain-bar">
              <span className="pain-label">{item.icon} {item.category}</span>
              <div className="pain-track">
                <div className={`pain-fill ${item.score >= item.max * 0.7 ? 'high' : item.score >= item.max * 0.4 ? 'medium' : 'low'}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }} />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', width: '45px', textAlign: 'right' }}>{item.score}/{item.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Company Overview ─────────────────────────────────────────────

function CompanyOverview({ data, score }) {
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
      {data.summary && (
        <div className="card-flat" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {typeof data.summary === 'string' ? data.summary.slice(0, 1500) : JSON.stringify(data.summary).slice(0, 1500)}
        </div>
      )}
      {score && <OpportunityScore score={score} />}
    </div>
  );
}

// ── Key People ───────────────────────────────────────────────────

function KeyPeople({ data, purposeMeta }) {
  if (!data) return null;
  const avatarColors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff'];

  return (
    <div className="fade-in">
      <div className="card-flat mb-lg">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>👥 Who to Reach Out To</h3>
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {data.leaders?.map((person, i) => (
            <div key={i} className="person-card">
              <div className="person-avatar" style={{ background: avatarColors[i % avatarColors.length] }}>
                #{person.outreachOrder}
              </div>
              <div className="person-info">
                <div className="person-name">{person.name}</div>
                <div className="person-title">{person.title}</div>
                <div className="person-reason">{person.reason}</div>
              </div>
              <div className="person-order">
                {person.priority === 'high' ? '🔴' : person.priority === 'medium' ? '🟡' : '🟢'} #{person.outreachOrder}
              </div>
            </div>
          ))}
        </div>
      </div>
      {data.strategy && (
        <div className="insight-card">
          <div className="insight-category">💡 Outreach Strategy</div>
          <div className="insight-text">{data.strategy}</div>
        </div>
      )}
    </div>
  );
}

// ── Outreach Messages ────────────────────────────────────────────

function OutreachMessages({ data }) {
  const [active, setActive] = useState(0);
  if (!data?.variants) return null;
  const v = data.variants[active];

  return (
    <div className="fade-in">
      <div className="tabs mb-lg">
        {data.variants.map((variant, i) => (
          <button key={i} className={`tab ${active === i ? 'active' : ''}`} onClick={() => setActive(i)}>
            {variant.icon} {variant.label}
          </button>
        ))}
      </div>
      {v && (
        <div className="message-card">
          <div className="flex items-center justify-between mb-md">
            <div className="message-type-badge">{v.icon} {v.type}</div>
            <CopyBtn text={`${v.subject ? `Subject: ${v.subject}\n\n` : ''}${v.body}`} />
          </div>
          {v.subject && (
            <div className="email-subject"><strong>Subject:</strong> {v.subject}</div>
          )}
          <div className="message-content">{v.body}</div>
        </div>
      )}
    </div>
  );
}

// ── Tech Stack ───────────────────────────────────────────────────

function TechStack({ data }) {
  if (!data) return null;
  const cats = [...new Set(data.stack?.map(t => t.category) || [])];
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-md)' }}>💻 Tech Stack</h2>
      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>{data.summary}</p>
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 'var(--space-md)' }}>
          <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-sm)' }}>{cat}</h4>
          <div className="tech-grid">
            {data.stack.filter(t => t.category === cat).map((tech, i) => (
              <div key={i} className="tech-pill"><span>{tech.name}</span>
                <div className="tech-confidence"><div className="tech-confidence-fill" style={{ width: `${tech.confidence}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recent Activity / News ───────────────────────────────────────

function RecentActivity({ data }) {
  if (!data?.news?.length) return <div className="card fade-in"><h2>📰 Recent Activity</h2><p className="text-muted mt-md">No recent activity found.</p></div>;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-md)' }}>📰 Recent Activity</h2>
      <div>
        {data.news.map((item, i) => (
          <div key={i} className="news-item">
            <div className="news-dot" />
            <div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                {item.title}
              </a>
              {item.snippet && <div className="news-snippet">{item.snippet}</div>}
              <div className="news-date">{item.source} {item.date && `• ${item.date}`}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Job Hunt: Culture & Values ───────────────────────────────────

function CultureInsights({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🏢 Culture & Values</h2>
      {data.values?.length > 0 && (
        <div className="tech-grid mb-lg">
          {data.values.map((v, i) => <div key={i} className="tech-pill" style={{ fontSize: '0.85rem' }}>{v}</div>)}
        </div>
      )}
      <div className="dossier-grid">
        <div className="metric-card"><div className="metric-value">{data.workStyle || '—'}</div><div className="metric-label">Work Style</div></div>
        <div className="metric-card">
          <div className="metric-value">{data.sentiment?.positivePercent || 50}%</div>
          <div className="metric-label">Positive Sentiment</div>
        </div>
        <div className="metric-card"><div className="metric-value">{data.sentiment?.label || '—'}</div><div className="metric-label">Overall Mood</div></div>
      </div>
    </div>
  );
}

// ── Job Hunt: Interview Prep ─────────────────────────────────────

function InterviewPrep({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--space-md)' }}>📝 Preparation Tips</h2>
        <ul className="brief-questions">{data.tips?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--space-md)' }}>❓ Questions to Ask</h2>
        <ul className="brief-questions">{data.questions?.map((q, i) => <li key={i}>{q}</li>)}</ul>
      </div>
    </div>
  );
}

// ── Job Hunt: Application Strategy ───────────────────────────────

function ApplicationStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🎯 Application Strategy</h2>
      <div className="brief-section">
        <div className="brief-label">📋 Approach</div>
        <div className="brief-content">{data.approach}</div>
      </div>
      <div className="brief-section">
        <div className="brief-label">⏰ Timing</div>
        <div className="brief-content">{data.timeline}</div>
      </div>
      <div className="brief-section">
        <div className="brief-label">💡 Pro Tips</div>
        <ul className="brief-questions">{data.tips?.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
    </div>
  );
}

// ── Founder: Market Position ─────────────────────────────────────

function MarketPosition({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>📈 Market Position</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>{data.summary}</p>
      <div className="dossier-grid">
        {[{ label: '💪 Strengths', items: data.strengths }, { label: '⚠️ Weaknesses', items: data.weaknesses }, { label: '🌟 Opportunities', items: data.opportunities }]
          .filter(g => g.items?.length > 0)
          .map(group => (
            <div key={group.label} className="card-flat">
              <h4 style={{ marginBottom: 'var(--space-sm)' }}>{group.label}</h4>
              {group.items.map((item, i) => (
                <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '6px', lineHeight: 1.5 }}>
                  ...{item.slice(0, 150)}...
                </p>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Founder: Funding Intel ───────────────────────────────────────

function FundingIntel({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-md)' }}>💰 Funding Intel</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{data.summary}</p>
      {data.signals?.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          {data.signals.map((s, i) => <div key={i} className="insight-card"><div className="insight-text">{s}</div></div>)}
        </div>
      )}
    </div>
  );
}

// ── Founder: Partnerships ────────────────────────────────────────

function PartnershipAngles({ data }) {
  if (!data?.angles) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
      {data.angles.map((a, i) => (
        <div key={i} className="insight-card">
          <div className="insight-category">{a.type}</div>
          <div className="insight-text">{a.description}</div>
        </div>
      ))}
    </div>
  );
}

// ── Networking: Conversation Starters ─────────────────────────────

function ConversationStarters({ data }) {
  if (!data?.topics) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
      {data.topics.map((t, i) => (
        <div key={i} className="message-card">
          <div className="message-type-badge">💬 {t.topic}</div>
          <div className="message-content" style={{ fontStyle: 'italic' }}>{t.prompt}</div>
        </div>
      ))}
    </div>
  );
}

// ── Networking: Connection Strategy ──────────────────────────────

function ConnectionStrategy({ data }) {
  if (!data) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-lg)' }}>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--space-md)' }}>🗺️ Steps to Connect</h2>
        {data.steps?.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: '3px' }}>{step}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 'var(--space-md)' }}>✅ Best Practices</h2>
        <ul className="brief-questions">{data.bestPractices?.map((bp, i) => <li key={i}>{bp}</li>)}</ul>
      </div>
    </div>
  );
}

// ── Networking: Community Presence ────────────────────────────────

function CommunityPresence({ data }) {
  if (!data?.platforms?.length) return <div className="card fade-in"><h2>🌐 Community</h2><p className="text-muted mt-md">{data?.summary || 'No data'}</p></div>;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-md)' }}>🌐 Community Presence</h2>
      <div className="dossier-grid">
        {data.platforms.map((p, i) => (
          <div key={i} className="metric-card"><div className="metric-value">{p.icon}</div><div className="metric-label">{p.platform} — {p.status}</div></div>
        ))}
      </div>
    </div>
  );
}

// ── Lead Gen: Pain Points ────────────────────────────────────────

function PainPoints({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🔥 Pain Points</h2>
      {data.sentiment && <div className="flex items-center gap-md mb-lg"><span className="badge badge-accent">{data.sentiment.label}</span></div>}
      {data.pains?.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {data.pains.map((p, i) => (
            <div key={i} className="pain-bar">
              <span className="pain-label">{p.category}</span>
              <div className="pain-track"><div className={`pain-fill ${p.intensity >= 7 ? 'high' : p.intensity >= 4 ? 'medium' : 'low'}`} style={{ width: `${p.intensity * 10}%` }} /></div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', width: '50px', textAlign: 'right' }}>{p.intensity}/10</span>
            </div>
          ))}
        </div>
      ) : <p className="text-muted">No significant pain signals detected.</p>}
    </div>
  );
}

// ── Lead Gen: Buy Signals ────────────────────────────────────────

function BuySignals({ data }) {
  if (!data?.signals?.length) return null;
  return (
    <div className="fade-in" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
      {data.signals.map((s, i) => (
        <div key={i} className="insight-card">
          <div className="insight-category">{s.label}</div>
          <div className="insight-text">{s.description}</div>
        </div>
      ))}
    </div>
  );
}

// ── Lead Gen: Call Brief ─────────────────────────────────────────

function CallBrief({ data }) {
  if (!data) return null;
  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-lg">
        <h2>📞 Call Prep Brief</h2>
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

// ── Main Page ────────────────────────────────────────────────────

export default function DossierPage() {
  const params = useParams();
  const dossierId = params.id;

  const [status, setStatus] = useState('loading');
  const [sources, setSources] = useState([]);
  const [overallMessage, setOverallMessage] = useState('Connecting...');
  const [dossier, setDossier] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  // SSE Progress
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
    } catch (err) { console.error('Fetch error:', err); }
  }, [dossierId]);

  useEffect(() => {
    if (status === 'completed' && !dossier) fetchDossier();
  }, [status, dossier, fetchDossier]);

  const purpose = dossier?.input?.purpose || 'networking';
  const purposeMeta = PURPOSE_META[purpose] || PURPOSE_META.networking;
  const sections = SIDEBAR_SECTIONS[purpose] || SIDEBAR_SECTIONS.networking;
  const syn = dossier?.synthesis || {};

  function renderSection() {
    switch (activeSection) {
      case 'overview': return <CompanyOverview data={syn.companyOverview} score={dossier?.score} />;
      case 'people': return <KeyPeople data={syn.keyPeople} purposeMeta={purposeMeta} />;
      case 'outreach': return <OutreachMessages data={syn.outreach} />;
      case 'tech': return <TechStack data={syn.techStack} />;
      case 'news': return <RecentActivity data={syn.recentActivity} />;
      // Job Hunt
      case 'culture': return <CultureInsights data={syn.cultureInsights} />;
      case 'interview': return <InterviewPrep data={syn.interviewPrep} />;
      case 'strategy': return purpose === 'job_hunt' ? <ApplicationStrategy data={syn.applicationStrategy} /> : <ConnectionStrategy data={syn.connectionStrategy} />;
      // Founder
      case 'market': return <MarketPosition data={syn.marketPosition} />;
      case 'funding': return <FundingIntel data={syn.fundingIntel} />;
      case 'partnerships': return <PartnershipAngles data={syn.partnershipAngles} />;
      // Networking
      case 'starters': return <ConversationStarters data={syn.conversationStarters} />;
      case 'community': return <CommunityPresence data={syn.communityPresence} />;
      // Lead Gen
      case 'pain': return <PainPoints data={syn.painPoints} />;
      case 'signals': return <BuySignals data={syn.buySignals} />;
      case 'call': return <CallBrief data={syn.callBrief} />;
      default: return <CompanyOverview data={syn.companyOverview} score={dossier?.score} />;
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dossier-header">
        <div>
          <div className="flex items-center gap-sm mb-md">
            <span className="badge" style={{ background: `${purposeMeta.color}22`, color: purposeMeta.color, border: `1px solid ${purposeMeta.color}44` }}>
              {purposeMeta.icon} {purposeMeta.label}
            </span>
            <span className={`badge ${status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-accent'}`}>
              {status === 'researching' && '🔍 Researching'}
              {status === 'synthesizing' && '🤖 Synthesizing'}
              {status === 'completed' && '✓ Complete'}
              {status === 'failed' && '✗ Failed'}
              {status === 'loading' && '⏳ Loading'}
            </span>
          </div>
          <h1>{dossier?.input?.companyName || 'Generating...'}</h1>
          {dossier?.input?.domain && <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>{dossier.input.domain}</p>}
        </div>
        <div className="flex items-center gap-sm">
          {status === 'completed' && <button className="btn btn-secondary" onClick={() => window.print()}>📄 Export</button>}
          <a href="/" className="btn btn-ghost">← New Search</a>
        </div>
      </div>

      {/* Progress */}
      {(status === 'researching' || status === 'synthesizing') && <ProgressTracker sources={sources} overallMessage={overallMessage} />}

      {status === 'synthesizing' && (
        <div className="card text-center fade-in" style={{ padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-lg)', borderWidth: '3px' }} />
          <h3>Synthesizing Intelligence</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>Generating {purposeMeta.label.toLowerCase()} insights...</p>
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

      {/* Completed: Sidebar + Content */}
      {status === 'completed' && dossier && (
        <div className="dossier-layout">
          <nav className="dossier-sidebar">
            <div className="sidebar-section-label">Sections</div>
            {sections.map(section => (
              <button key={section.id} className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}>
                <span className="item-icon">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
          <div className="dossier-content">
            {renderSection()}
          </div>
        </div>
      )}
    </div>
  );
}
