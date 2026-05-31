'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PURPOSES = [
  {
    id: 'job_hunt',
    icon: '🎯',
    label: 'Job Hunt',
    tagline: 'I want to work here',
    description: 'Find hiring managers, prep for interviews, understand company culture, and craft personalized outreach messages.',
    color: '#6c5ce7',
  },
  {
    id: 'founder',
    icon: '🚀',
    label: 'Founder Mode',
    tagline: 'Competitive intel & partnerships',
    description: 'Analyze funding history, map competitors, identify partnership angles, and research key decision makers.',
    color: '#00cec9',
  },
  {
    id: 'networking',
    icon: '🤝',
    label: 'Networking',
    tagline: 'Connect with the right people',
    description: 'Find key contacts with LinkedIn profiles, generate conversation starters, and build a connection strategy.',
    color: '#fdcb6e',
  },
  {
    id: 'lead_gen',
    icon: '📊',
    label: 'Lead Gen',
    tagline: 'Sell to this company',
    description: 'Map decision makers, identify pain points and buy signals, and generate personalized sales outreach.',
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
        package — key people with contact info, outreach templates, and actionable insights in under 90 seconds.
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

    </div>
  );
}
