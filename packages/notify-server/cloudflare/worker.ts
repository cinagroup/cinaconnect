/**
 * Cinacoin Notify Server — Cloudflare Worker
 *
 * Notification delivery service supporting push, email, and webhook channels.
 */

import { NotifyServer } from '../dist/NotifyServer.js';

const server = new NotifyServer();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health') {
        return Response.json({ status: 'ok', timestamp: Date.now() }, { headers: corsHeaders });
      }

      // Send notification
      if (path === '/send' && request.method === 'POST') {
        const body = await request.json() as { address: string; payload: any };
        const result = await server.sendNotification(body.address, body.payload);
        return Response.json(result, { headers: corsHeaders });
      }

      // Subscribe
      if (path === '/subscribe' && request.method === 'POST') {
        const body = await request.json() as { address: string; channels: string[] };
        const result = await server.subscribe(body.address, body.channels as any[]);
        return Response.json(result, { headers: corsHeaders });
      }

      // Unsubscribe
      if (path === '/unsubscribe' && request.method === 'POST') {
        const body = await request.json() as { address: string };
        const result = await server.unsubscribe(body.address);
        return Response.json(result, { headers: corsHeaders });
      }

      // Get subscriptions
      if (path === '/subscriptions' && request.method === 'GET') {
        const address = url.searchParams.get('address');
        if (!address) {
          return Response.json({ error: 'Missing address parameter' }, { status: 400, headers: corsHeaders });
        }
        const result = await server.getSubscriptions(address);
        return Response.json(result, { headers: corsHeaders });
      }

      // Metrics
      if (path === '/metrics' && request.method === 'GET') {
        const result = server.getMetrics();
        return Response.json(result, { headers: corsHeaders });
      }

      // 404
      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
  },
};

interface Env {
  LOG_LEVEL?: string;
  MAX_SUBSCRIPTIONS_PER_USER?: string;
  DEFAULT_RETENTION_DAYS?: string;
}