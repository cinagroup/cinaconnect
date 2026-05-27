/**
 * Cinacoin Push Server — Cloudflare Worker
 *
 * Push notification delivery via APNs (iOS) and FCM (Android).
 */

import { PushServer } from '../dist/PushServer.js';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize PushServer with configuration from env
    const server = new PushServer({
      timeoutMs: parseInt(env.DEFAULT_TIMEOUT_MS || '5000'),
    });

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

      // Send single notification
      if (path === '/send' && request.method === 'POST') {
        const body = await request.json() as any;
        const result = await server.send(body);
        return Response.json(result, { headers: corsHeaders });
      }

      // Send batch notifications
      if (path === '/send-batch' && request.method === 'POST') {
        const body = await request.json() as { notifications: any[] };
        const result = await server.sendBatch(body.notifications);
        return Response.json(result, { headers: corsHeaders });
      }

      // Register device token
      if (path === '/register' && request.method === 'POST') {
        const body = await request.json() as any;
        const result = await server.registerDevice(body);
        return Response.json(result, { headers: corsHeaders });
      }

      // Unregister device token
      if (path === '/unregister' && request.method === 'POST') {
        const body = await request.json() as { deviceToken: string };
        const result = await server.unregisterDevice(body.deviceToken);
        return Response.json(result, { headers: corsHeaders });
      }

      // Get delivery logs
      if (path === '/logs' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const result = server.getDeliveryLog(limit, offset);
        return Response.json(result, { headers: corsHeaders });
      }

      // Get metrics
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
  MAX_QUEUE_SIZE?: string;
  DEFAULT_RETRY_ATTEMPTS?: string;
  DEFAULT_TIMEOUT_MS?: string;
}