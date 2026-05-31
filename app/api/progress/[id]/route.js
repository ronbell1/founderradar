// GET /api/progress/[id] — Server-Sent Events for real-time progress
import { addListener, getDossier, getProgressEvents } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = await params;

  const dossier = getDossier(id);
  if (!dossier) {
    return new Response(JSON.stringify({ error: 'Dossier not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function safeEnqueue(text) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch (e) {
          closed = true;
        }
      }

      function safeClose() {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch (e) { /* already closed */ }
      }

      // Send any existing events first
      const existingEvents = getProgressEvents(id);
      for (const event of existingEvents) {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      }

      // If already completed, send final event and close
      if (dossier.status === 'completed') {
        safeEnqueue(`data: ${JSON.stringify({ type: 'dossier_ready', dossierId: id, message: 'Dossier is ready!' })}\n\n`);
        safeClose();
        return;
      }

      if (dossier.status === 'failed') {
        safeEnqueue(`data: ${JSON.stringify({ type: 'error', message: dossier.error || 'Generation failed' })}\n\n`);
        safeClose();
        return;
      }

      // Listen for new events
      let heartbeat;
      const removeListener = addListener(id, (event) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);

        // Close stream when dossier is ready or failed
        if (event.type === 'dossier_ready' || event.type === 'error') {
          if (heartbeat) clearInterval(heartbeat);
          removeListener();
          setTimeout(() => safeClose(), 200);
        }
      });

      // Heartbeat to keep connection alive
      heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          removeListener();
          return;
        }
        safeEnqueue(': heartbeat\n\n');
      }, 15000);

      // Cleanup after 5 minutes max
      setTimeout(() => {
        clearInterval(heartbeat);
        removeListener();
        safeClose();
      }, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
