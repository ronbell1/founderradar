'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PURPOSES = [
  {
    id: 'job_hunt',
    icon: '🎯',
    label: 'Job Hunt',
    tagline: 'I want to work here',
    description: 'Research companies, find hiring managers, prep for interviews, craft outreach',
    color: '#6c5ce7',
  },
  {
    id: 'founder',
    icon: '🚀',
    label: 'Founder Mode',
    tagline: 'Competitive intel & partnerships',
    description: 'Analyze competitors, find investors, explore partnerships, map market position',
    color: '#00cec9',
  },
  {
    id: 'networking',
    icon: '🤝',
    label: 'Networking',
    tagline: 'Connect with the right people',
    description: 'Find key contacts, generate connection requests, build conversation starters',
    color: '#fdcb6e',
  },
  {
    id: 'lead_gen',
    icon: '📊',
    label: 'Lead Gen',
    tagline: 'Sell to this company',
    description: 'Identify pain points, map decision makers, generate personalized outreach',
    color: '#ff6b6b',
  },
];

export default function HomePage() {
  const [target, setTarget] = useState('');
  const [purpose, setPurpose] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!target.trim() || !purpose || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim(), purpose }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start research');

      router.push(`/dossier/${data.dossierId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="hero">
      <div className="hero-badge fade-in">
        <span className="badge badge-accent">⚡ Powered by Anakin Wire</span>
      </div>

      <h1 className="slide-up">
        Research any company.<br />
        <span className="text-gradient">Connect with anyone.</span>
      </h1>

      <p className="hero-subtitle slide-up" style={{ animationDelay: '0.1s' }}>
        Enter a company name or domain, pick your purpose, and get a complete intelligence
        package — key people, outreach templates, and actionable insights in under 60 seconds.
      </p>

      {/* Purpose Selector */}
      <div className="purpose-grid slide-up" style={{ animationDelay: '0.15s' }}>
        {PURPOSES.map((p) => (
          <button
            key={p.id}
            id={`purpose-${p.id}`}
            className={`purpose-card ${purpose === p.id ? 'selected' : ''}`}
            onClick={() => setPurpose(p.id)}
            style={{ '--purpose-color': p.color }}
          >
            <div className="purpose-icon">{p.icon}</div>
            <div className="purpose-label">{p.label}</div>
            <div className="purpose-tagline">{p.tagline}</div>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="hero-input-wrapper slide-up" style={{ animationDelay: '0.25s' }}>
        <input
          id="company-input"
          type="text"
          className="input input-lg"
          placeholder="e.g. Stripe, notion.so, or LinkedIn URL..."
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={loading}
          autoFocus
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !target.trim() || !purpose}
          id="generate-btn"
        >
          {loading ? (
            <><span className="spinner" /> Researching...</>
          ) : (
            <>🔍 Research</>
          )}
        </button>
      </form>

      {!purpose && target.trim() && (
        <p className="text-muted slide-up" style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem' }}>
          ↑ Pick a purpose to continue
        </p>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', marginTop: 'var(--space-md)', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}

      {/* What You Get */}
      <div className="container" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 className="text-center slide-up" style={{ animationDelay: '0.3s', marginBottom: 'var(--space-xl)' }}>
          What you get
        </h2>
        <div className="features slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="card feature-card">
            <div className="feature-icon">👥</div>
            <h3>Key People Map</h3>
            <p>Find the right contacts — hiring managers, founders, VPs — with context on who to reach first and why.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon">✉️</div>
            <h3>Ready-to-Send Outreach</h3>
            <p>Personalized emails, LinkedIn messages, and connection requests tailored to your purpose.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon">📰</div>
            <h3>Latest Intel</h3>
            <p>Recent news, funding rounds, product launches, and hiring activity — all auto-aggregated.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon">💡</div>
            <h3>Smart Insights</h3>
            <p>Culture signals, tech stack, growth trajectory, and pain points extracted from 10+ sources.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon">📈</div>
            <h3>Opportunity Score</h3>
            <p>0-100 score based on timing signals — is this the right moment to reach out?</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Progress</h3>
            <p>Watch each source complete live. From company name to full report in under 60 seconds.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
