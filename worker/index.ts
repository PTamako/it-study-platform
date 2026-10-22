export interface Env {
  DB: D1Database
  APP_ENV?: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'allow': 'GET, OPTIONS' } })
    }
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

    if (url.pathname === '/api/health') {
      try {
        await env.DB.prepare('SELECT 1 AS ok').first()
        return json({ ok: true, service: 'it-study-platform-api', database: 'connected' })
      } catch {
        return json({ ok: false, service: 'it-study-platform-api', database: 'unavailable' }, 503)
      }
    }

    if (url.pathname === '/api/tracks') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, kind, title, subtitle FROM study_tracks WHERE enabled = 1 ORDER BY kind, title',
        ).all()
        return json({ items: results })
      } catch {
        return json({ error: 'Database is not initialized. Apply the D1 migration first.' }, 503)
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}