// POST /api/dossier — Start dossier generation
import { NextResponse } from 'next/server';
import { createDossier, updateDossier, setDossierSynthesis, setDossierScore, notifyListeners } from '@/lib/store';
import { runResearch } from '@/lib/research-engine';
import { synthesizeAll } from '@/lib/synthesis';
import { calculateBuyNowScore } from '@/lib/scoring';

export async function POST(request) {
  try {
    const body = await request.json();
    const { target } = body;

    if (!target || typeof target !== 'string' || target.trim().length === 0) {
      return NextResponse.json({ error: 'Target company is required' }, { status: 400 });
    }

    // Parse the input to determine type
    const input = parseInput(target.trim());

    // Generate dossier ID
    const dossierId = crypto.randomUUID();

    // Create dossier in store
    createDossier(dossierId, input);
    updateDossier(dossierId, { status: 'researching' });

    // Kick off research pipeline (don't await — let it run in background)
    processInBackground(dossierId, input);

    return NextResponse.json({
      dossierId,
      status: 'researching',
      input,
    });
  } catch (err) {
    console.error('[API /dossier] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processInBackground(dossierId, input) {
  try {
    // Phase 1: Research
    const rawData = await runResearch(dossierId, input);

    updateDossier(dossierId, { status: 'synthesizing', rawData });

    notifyListeners(dossierId, {
      type: 'synthesis_started',
      message: 'Synthesizing intelligence from research data...',
    });

    // Phase 2: Calculate Buy Now Score
    const score = calculateBuyNowScore(rawData);
    setDossierScore(dossierId, score);

    notifyListeners(dossierId, {
      type: 'score_ready',
      message: `Buy Now Score: ${score.score}/100 — ${score.tierLabel}`,
      score: score.score,
      tier: score.tier,
    });

    // Phase 3: AI Synthesis
    const synthesis = await synthesizeAll(input.companyName, rawData);
    setDossierSynthesis(dossierId, synthesis);

    notifyListeners(dossierId, {
      type: 'synthesis_completed',
      message: 'AI synthesis complete',
    });

    // Phase 4: Mark as done
    updateDossier(dossierId, { status: 'completed' });

    notifyListeners(dossierId, {
      type: 'dossier_ready',
      message: 'Dossier is ready!',
      dossierId,
    });
  } catch (err) {
    console.error('[Background] Dossier generation failed:', err);
    updateDossier(dossierId, { status: 'failed', error: err.message });

    notifyListeners(dossierId, {
      type: 'error',
      message: `Generation failed: ${err.message}`,
    });
  }
}

function parseInput(target) {
  const input = { companyName: target, domain: null, linkedinUrl: null, jobPostingUrl: null };

  // Check if it's a LinkedIn URL
  if (target.includes('linkedin.com')) {
    input.linkedinUrl = target;
    // Extract company name from LinkedIn URL
    const match = target.match(/company\/([^/?]+)/);
    if (match) input.companyName = match[1].replace(/-/g, ' ');
    return input;
  }

  // Check if it's a URL/domain
  if (target.includes('.') && !target.includes(' ')) {
    const domain = target.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    input.domain = domain;
    input.companyName = domain.split('.')[0];
    // Capitalize first letter
    input.companyName = input.companyName.charAt(0).toUpperCase() + input.companyName.slice(1);
    return input;
  }

  // It's a company name — try to infer domain
  input.domain = target.toLowerCase().replace(/\s+/g, '') + '.com';

  return input;
}
