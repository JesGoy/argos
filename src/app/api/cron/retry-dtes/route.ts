import { makeRetryPendingDtes } from '@/infra/container/dte';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/retry-dtes — invoked by Vercel Cron every 5 minutes (see
 * vercel.json) to keep the DTE outbox within the SII's one-hour transmission
 * window. Protected by CRON_SECRET, which Vercel Cron sends automatically as
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response('CRON_SECRET no configurado', { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('No autorizado', { status: 401 });
  }

  const result = await makeRetryPendingDtes().execute();
  return Response.json(result);
}
