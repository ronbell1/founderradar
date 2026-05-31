'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ── Progress Tracker Component ───────────────────────────────────

function ProgressTracker({ sources, overallMessage }) {
  return (
    <div className="card-flat" style={{ marginBottom: 'var(--space-xl)' }}>
      <div className="flex items-center justify-between mb-md">
        <h3>🔬 Research Progress</h3>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{overallMessage}</span>
      </div>

      <div className="progress-bar mb-lg">
        <div
          className="progress-fill"
          style={{
            width: `${sources.length > 0 ? (sources.filter(s => s.status === 'completed' || s.status === 'failed').length / sources.length) * 100 : 0}%`
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)' }}>
        {sources.map((source) => (
          <div key={source.id} className={`source-card ${source.status}`}>
            <div className="source-icon">{source.icon}</div>
            <div className="source-info">
              <div className="source-name">{source.source}</div>
              <div className="source-status">
                {source.status === 'queued' && 'Waiting...'}
                {source.status === 'active' && 'Fetching...'}
                {source.status === 'completed' && '✓ Complete'}
                {source.status === 'failed' && '✗ Failed'}
              </div>
            </div>
            <div className={`source-indicator ${source.status}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Buy Now Score Component ──────────────────────────────────────

function BuyNowScore({ score }) {
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score.score / 100) * circumference;

  const getColor = () => {
    if (score.score >= 75) return 'var(--hot)';
    if (score.score >= 50) return 'var(--warm)';
    if (score.score >= 25) return 'var(--cool)';
    return 'var(--cold)';
  };

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🎯 Buy Now Score</h2>

      <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
        <div className="score-gauge">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle className="score-track" cx="90" cy="90" r="70" />
            <circle
              className="score-value"
              cx="90" cy="90" r="70"
              stroke={getColor()}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="text-center">
            <div className="score-number" style={{ color: getColor() }}>{score.score}</div>
            <div className="score-label">/ 100</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <div className="badge" style={{
            background: score.tier === 'hot' ? 'var(--danger-glow)' : score.tier === 'warm' ? 'var(--warning-glow)' : 'var(--bg-glass)',
            color: getColor(),
            borderColor: getColor(),
            border: `1px solid`,
            marginBottom: 'var(--space-md)',
          }}>
            {score.tierLabel}
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>
            {score.explanation}
          </p>

          {score.breakdown?.map((item, i) => (
            <div key={i} className="pain-bar">
              <span className="pain-label">{item.icon} {item.category}</span>
              <div className="pain-track">
                <div
                  className={`pain-fill ${item.score >= item.max * 0.7 ? 'high' : item.score >= item.max * 0.4 ? 'medium' : 'low'}`}
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', width: '45px', textAlign: 'right' }}>
                {item.score}/{item.max}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Company Intel Component ──────────────────────────────────────

function CompanyIntel({ data }) {
  if (!data) return null;

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🏢 Company Intelligence</h2>

      {data.keyMetrics?.length > 0 && (
        <div className="metrics-grid mb-lg">
          {data.keyMetrics.map((m, i) => (
            <div key={i} className="metric-card">
              <div className="metric-value">{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 'var(--space-lg)' }}>
        {data.summary}
      </div>

      {data.recentNews?.length > 0 && (
        <>
          <h4 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-tertiary)' }}>📰 Recent News</h4>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            {data.recentNews.map((news, i) => (
              <a
                key={i}
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <strong>{news.title}</strong>
                {news.snippet && <p style={{ color: 'var(--text-tertiary)', marginTop: '2px', fontSize: '0.8rem' }}>{news.snippet}</p>}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pain Analysis Component ──────────────────────────────────────

function PainAnalysis({ data }) {
  if (!data) return null;

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>🔥 Pain Analysis</h2>

      {data.sentiment && (
        <div className="flex items-center gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge-accent">{data.sentiment.label}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            {data.sentiment.positivePercent}% positive · {data.sentiment.negativePercent}% negative
          </span>
        </div>
      )}

      {data.pains?.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
          {data.pains.map((pain, i) => (
            <div key={i} className="pain-bar">
              <span className="pain-label">{pain.category}</span>
              <div className="pain-track">
                <div
                  className={`pain-fill ${pain.intensity >= 7 ? 'high' : pain.intensity >= 4 ? 'medium' : 'low'}`}
                  style={{ width: `${pain.intensity * 10}%` }}
                />
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', width: '50px', textAlign: 'right' }}>
                {pain.intensity}/10
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">No significant pain signals detected.</p>
      )}

      {data.sources?.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
          Sources: {data.sources.join(', ')}
        </p>
      )}
    </div>
  );
}

// ── Email Variants Component ─────────────────────────────────────

function EmailVariants({ data }) {
  const [activeVariant, setActiveVariant] = useState(0);
  const [copied, setCopied] = useState(null);

  if (!data?.variants) return null;

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>✉️ Email Variants</h2>

      <div className="tabs mb-lg">
        {data.variants.map((v, i) => (
          <button
            key={i}
            className={`tab ${activeVariant === i ? 'active' : ''}`}
            onClick={() => setActiveVariant(i)}
          >
            {v.icon} {v.angle}
          </button>
        ))}
      </div>

      {data.variants[activeVariant] && (
        <div className="email-card">
          <div className="email-header">
            <div className="email-angle">
              <span>{data.variants[activeVariant].icon}</span>
              <span>{data.variants[activeVariant].angle}</span>
            </div>
            <button
              className={`copy-btn ${copied === 'email' ? 'copied' : ''}`}
              onClick={() => copyToClipboard(
                `Subject: ${data.variants[activeVariant].subject}\n\n${data.variants[activeVariant].body}`,
                'email'
              )}
            >
              {copied === 'email' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>

          <div className="email-subject">
            <strong>Subject:</strong> {data.variants[activeVariant].subject}
          </div>

          <div className="email-body">
            {data.variants[activeVariant].body}
          </div>
        </div>
      )}

      {data.subjectLines?.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-sm)', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            📝 Subject Line Variants
          </h4>
          <div style={{ display: 'grid', gap: '4px' }}>
            {data.subjectLines.map((sl, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                }}
              >
                <span>{sl}</span>
                <button
                  className={`copy-btn ${copied === `sl-${i}` ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(sl, `sl-${i}`)}
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                >
                  {copied === `sl-${i}` ? '✓' : '📋'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Call Brief Component ─────────────────────────────────────────

function CallBrief({ data }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const copyAll = () => {
    const text = `CALL BRIEF\n\nHook: ${data.hook}\n\nContext: ${data.companyContext}\n\nPain Hypothesis: ${data.painHypothesis}\n\nOutreach Angle: ${data.outreachAngle}\n\nDiscovery Questions:\n${data.discoveryQuestions?.map(q => `- ${q}`).join('\n')}\n\nObjection Prep:\n${data.objectionPrep?.map(o => `Q: ${o.objection}\nA: ${o.response}`).join('\n\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card fade-in">
      <div className="flex items-center justify-between mb-lg">
        <h2>📞 Call Prep Brief</h2>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyAll}>
          {copied ? '✓ Copied!' : '📋 Copy All'}
        </button>
      </div>

      <div className="brief-section">
        <div className="brief-label">🎣 Opening Hook</div>
        <div className="brief-content" style={{ fontStyle: 'italic', color: 'var(--accent-secondary)' }}>
          {data.hook}
        </div>
      </div>

      <div className="brief-section">
        <div className="brief-label">🎯 Pain Hypothesis</div>
        <div className="brief-content">{data.painHypothesis}</div>
      </div>

      <div className="brief-section">
        <div className="brief-label">💡 Outreach Angle</div>
        <div className="brief-content">{data.outreachAngle}</div>
      </div>

      <div className="brief-section">
        <div className="brief-label">❓ Discovery Questions</div>
        <ul className="brief-questions">
          {data.discoveryQuestions?.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>

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

// ── Tech Stack Component ─────────────────────────────────────────

function TechFingerprint({ data }) {
  if (!data) return null;

  const categories = [...new Set(data.stack?.map(t => t.category) || [])];

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-md)' }}>💻 Tech Stack Fingerprint</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>{data.summary}</p>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 'var(--space-md)' }}>
          <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-sm)' }}>
            {cat}
          </h4>
          <div className="tech-grid">
            {data.stack.filter(t => t.category === cat).map((tech, i) => (
              <div key={i} className="tech-pill">
                <span>{tech.name}</span>
                <div className="tech-confidence">
                  <div className="tech-confidence-fill" style={{ width: `${tech.confidence}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Leadership Map Component ─────────────────────────────────────

function PeopleMap({ data }) {
  if (!data) return null;

  return (
    <div className="card fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>👥 Decision Maker Map</h2>

      {data.leaders?.length > 0 && (
        <div className="dossier-grid mb-lg">
          {data.leaders.map((leader, i) => (
            <div key={i} className="card-flat" style={{ padding: 'var(--space-md)' }}>
              <div className="flex items-center gap-sm mb-md">
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--accent-gradient)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, color: 'white',
                }}>
                  #{leader.outreachOrder}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{leader.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{leader.title}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {leader.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      {data.outreachStrategy && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'rgba(108, 92, 231, 0.06)',
          border: '1px solid rgba(108, 92, 231, 0.15)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          <strong style={{ color: 'var(--accent-secondary)' }}>💡 Strategy:</strong> {data.outreachStrategy}
        </div>
      )}
    </div>
  );
}

// ── Export Button Component ───────────────────────────────────────

function ExportButton({ dossierId, companyName }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 100);
  };

  return (
    <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
      {exporting ? <span className="spinner" /> : '📄'} Export PDF
    </button>
  );
}

// ── Main Dossier Page ────────────────────────────────────────────

export default function DossierPage() {
  const params = useParams();
  const dossierId = params.id;

  const [status, setStatus] = useState('loading');
  const [sources, setSources] = useState([]);
  const [overallMessage, setOverallMessage] = useState('Connecting...');
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const eventSourceRef = useRef(null);

  // Connect to SSE for progress
  useEffect(() => {
    if (!dossierId) return;

    const es = new EventSource(`/api/progress/${dossierId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'plan_ready':
          setSources(data.sources || []);
          setOverallMessage(data.message);
          setStatus('researching');
          break;

        case 'source_started':
          setSources(prev => prev.map(s =>
            s.id === data.sourceId ? { ...s, status: 'active' } : s
          ));
          break;

        case 'source_completed':
          setSources(prev => prev.map(s =>
            s.id === data.sourceId ? { ...s, status: 'completed' } : s
          ));
          break;

        case 'source_failed':
          setSources(prev => prev.map(s =>
            s.id === data.sourceId ? { ...s, status: 'failed' } : s
          ));
          break;

        case 'research_completed':
          setOverallMessage(data.message);
          setStatus('synthesizing');
          break;

        case 'synthesis_started':
          setOverallMessage(data.message);
          break;

        case 'score_ready':
          setOverallMessage(`Score: ${data.score}/100`);
          break;

        case 'synthesis_completed':
          setOverallMessage('Finalizing dossier...');
          break;

        case 'dossier_ready':
          setOverallMessage('✓ Dossier ready!');
          setStatus('completed');
          es.close();
          fetchDossier();
          break;

        case 'error':
          setOverallMessage(data.message);
          setStatus('failed');
          es.close();
          break;

        case 'research_started':
          setOverallMessage(data.message);
          setStatus('researching');
          break;
      }
    };

    es.onerror = () => {
      // Try fetching the dossier directly on SSE error
      fetchDossier();
    };

    return () => {
      es.close();
    };
  }, [dossierId]);

  const fetchDossier = useCallback(async () => {
    try {
      const res = await fetch(`/api/dossier/${dossierId}`);
      const data = await res.json();

      if (data.status === 'completed') {
        setDossier(data);
        setStatus('completed');
      } else if (data.status === 'failed') {
        setStatus('failed');
        setOverallMessage(data.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Failed to fetch dossier:', err);
    }
  }, [dossierId]);

  // Poll for dossier data if SSE drops
  useEffect(() => {
    if (status === 'completed' && !dossier) {
      fetchDossier();
    }
  }, [status, dossier, fetchDossier]);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'intel', label: '🏢 Company Intel' },
    { id: 'people', label: '👥 People' },
    { id: 'pain', label: '🔥 Pain & Signals' },
    { id: 'outreach', label: '✉️ Outreach' },
    { id: 'tech', label: '💻 Tech Stack' },
  ];

  return (
    <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="dossier-header">
        <div>
          <h1>{dossier?.input?.companyName || 'Generating Dossier...'}</h1>
          {dossier?.input?.domain && (
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
              {dossier.input.domain}
            </p>
          )}
        </div>
        <div className="flex items-center gap-sm">
          {status === 'completed' && (
            <ExportButton dossierId={dossierId} companyName={dossier?.input?.companyName} />
          )}
          <span className={`badge ${status === 'completed' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-accent'}`}>
            {status === 'researching' && '🔍 Researching'}
            {status === 'synthesizing' && '🤖 Synthesizing'}
            {status === 'completed' && '✓ Complete'}
            {status === 'failed' && '✗ Failed'}
            {status === 'loading' && '⏳ Loading'}
          </span>
        </div>
      </div>

      {/* Progress Tracker (shown while processing) */}
      {(status === 'researching' || status === 'synthesizing') && (
        <ProgressTracker sources={sources} overallMessage={overallMessage} />
      )}

      {/* Synthesizing indicator */}
      {status === 'synthesizing' && (
        <div className="card text-center fade-in" style={{ padding: 'var(--space-2xl)' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-lg)', borderWidth: '3px' }} />
          <h3>Synthesizing Intelligence</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>
            AI is analyzing research data and generating your dossier...
          </p>
        </div>
      )}

      {/* Failed state */}
      {status === 'failed' && (
        <div className="card text-center" style={{ padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚠️</div>
          <h3>Generation Failed</h3>
          <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>{overallMessage}</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
            ← Try Again
          </a>
        </div>
      )}

      {/* Completed Dossier */}
      {status === 'completed' && dossier && (
        <>
          {/* Tabs */}
          <div className="tabs mb-xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="dossier-content">
            {activeTab === 'overview' && (
              <>
                {dossier.score && <BuyNowScore score={dossier.score} />}
                {dossier.synthesis?.companyIntel && <CompanyIntel data={dossier.synthesis.companyIntel} />}
              </>
            )}

            {activeTab === 'intel' && (
              <CompanyIntel data={dossier.synthesis?.companyIntel} />
            )}

            {activeTab === 'people' && (
              <PeopleMap data={dossier.synthesis?.leadership} />
            )}

            {activeTab === 'pain' && (
              <>
                <PainAnalysis data={dossier.synthesis?.painPoints} />
                {dossier.score && <BuyNowScore score={dossier.score} />}
              </>
            )}

            {activeTab === 'outreach' && (
              <>
                <EmailVariants data={dossier.synthesis?.emails} />
                <CallBrief data={dossier.synthesis?.callBrief} />
              </>
            )}

            {activeTab === 'tech' && (
              <TechFingerprint data={dossier.synthesis?.techStack} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
