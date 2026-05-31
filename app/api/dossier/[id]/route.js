// GET /api/dossier/[id] — Get dossier data
import { NextResponse } from 'next/server';
import { getDossier } from '@/lib/store';

export async function GET(request, { params }) {
  const { id } = await params;

  const dossier = getDossier(id);
  if (!dossier) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: dossier.id,
    status: dossier.status,
    input: dossier.input,
    score: dossier.score,
    synthesis: dossier.synthesis,
    rawData: dossier.status === 'completed' ? summarizeRawData(dossier.rawData) : null,
    error: dossier.error,
    createdAt: dossier.createdAt,
  });
}

function summarizeRawData(rawData) {
  if (!rawData) return null;

  const summary = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value && typeof value === 'object') {
      summary[key] = {
        hasData: Object.keys(value).length > 0,
        keys: Object.keys(value).slice(0, 10),
      };
    }
  }
  return summary;
}
