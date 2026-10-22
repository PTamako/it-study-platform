export interface Env {
  DB: D1Database
  APP_ENV?: string
}

// 统一返回 JSON，并添加基础安全响应头。
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

    // 初始版本只提供只读接口；未开放写入，减少误操作与安全风险。
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'allow': 'GET, OPTIONS' } })
    }
    if (request.method !== 'GET') return json({ error: '不支持此请求方法' }, 405)

    // 健康检查同时检查 D1 是否能正常查询。
    if (url.pathname === '/api/health') {
      try {
        await env.DB.prepare('SELECT 1 AS ok').first()
        return json({ ok: true, service: 'it-study-platform-api', database: '已连接' })
      } catch {
        return json({ ok: false, service: 'it-study-platform-api', database: '暂不可用' }, 503)
      }
    }

    // 返回已启用的学习模块；数据库迁移完成后才可使用。
    if (url.pathname === '/api/tracks') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, kind, title, subtitle FROM study_tracks WHERE enabled = 1 ORDER BY kind, title',
        ).all()
        return json({ items: results })
      } catch {
        return json({ error: '数据库尚未初始化，请先执行 D1 迁移。' }, 503)
      }
    }


    // 返回指定考试的练习题。source_type 会明确标记自编练习题，不冒充官方真题。
    if (url.pathname === '/api/questions') {
      const trackId = url.searchParams.get('track') || 'exam-sg'
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)))
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, track_id, topic, difficulty, question_type, prompt,
                  options_json, answer_json, explanation, source_type, source_reference, language
           FROM questions WHERE track_id = ? ORDER BY id LIMIT ?`,
        ).bind(trackId, limit).all()
        return json({
          items: results.map((row: Record<string, unknown>) => ({
            ...row,
            options: JSON.parse(String(row.options_json || '[]')),
            answer: JSON.parse(String(row.answer_json || 'null')),
            options_json: undefined,
            answer_json: undefined,
          })),
        })
      } catch {
        return json({ error: '题库暂不可用，请确认已执行最新的 D1 迁移。' }, 503)
      }
    }

    // 学习记录写入接口暂不开放；完成 Cloudflare Access 访问保护后再启用。

    return json({ error: '未找到对应接口' }, 404)
  },
}
