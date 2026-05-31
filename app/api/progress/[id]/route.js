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
      // Send any existing events first
      const existingEvents = getProgressEvents(id);
      for (const event of existingEvents) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // If already completed, send final event and close
      if (dossier.status === 'completed') {
        const data = `data: ${JSON.stringify({ type: 'dossier_ready', dossierId: id, message: 'Dossier is ready!' })}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
        return;
      }

      if (dossier.status === 'failed') {
        const data = `data: ${JSON.stringify({ type: 'error', message: dossier.error || 'Generation failed' })}\n\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
        return;
      }

      // Listen for new events
      const removeListener = addListener(id, (event) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Close stream when dossier is ready or failed
          if (event.type === 'dossier_ready' || event.type === 'error') {
            setTimeout(() => {
              removeListener();
              controller.close();
            }, 100);
          }
        } catch (e) {
          removeListener();
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeat);
          removeListener();
        }
      }, 15000);

      // Cleanup after 5 minutes max
      setTimeout(() => {
        clearInterval(heartbeat);
        removeListener();
        try { controller.close(); } catch (e) { /* ignore */ }
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
