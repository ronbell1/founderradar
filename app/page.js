'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!target.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start research');
      }

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
        Turn any company into a<br />
        <span className="text-gradient">sales-ready dossier</span>
      </h1>

      <p className="hero-subtitle slide-up" style={{ animationDelay: '0.1s' }}>
        Enter a company name, domain, or LinkedIn URL. FounderRadar researches 8+ sources in parallel and delivers a complete intelligence package in under 60 seconds.
      </p>

      <form onSubmit={handleSubmit} className="hero-input-wrapper slide-up" style={{ animationDelay: '0.2s' }}>
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
          disabled={loading || !target.trim()}
          id="generate-btn"
        >
          {loading ? (
            <>
              <span className="spinner" />
              Launching...
            </>
          ) : (
            <>🚀 Generate</>
          )}
        </button>
      </form>

      {error && (
        <p style={{ color: 'var(--danger)', marginTop: 'var(--space-md)', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}

      <div className="features container slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="card feature-card">
          <div className="feature-icon">🔍</div>
          <h3>8+ Data Sources</h3>
          <p>LinkedIn, Glassdoor, GitHub, Google Trends, Reddit, Hacker News, website crawl, and AI research — all in parallel.</p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Buy Now Score</h3>
          <p>0-100 composite score based on funding, hiring velocity, leadership changes, and pain signals.</p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">✉️</div>
          <h3>Ready-to-Send Emails</h3>
          <p>Three personalized email variants with subject lines — problem-first, social proof, and insight-led angles.</p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">📞</div>
          <h3>Call Prep Brief</h3>
          <p>One-minute call brief with hook, discovery questions, objection handling, and outreach strategy.</p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">🔥</div>
          <h3>Pain Heatmap</h3>
          <p>Aggregated pain signals from reviews, forums, and community discussions. Mirror their own words in outreach.</p>
        </div>

        <div className="card feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Live Progress</h3>
          <p>Watch each data source complete in real-time. From company name to full dossier in under 60 seconds.</p>
        </div>
      </div>
    </div>
  );
}
