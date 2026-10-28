export interface AuthEnv {
  DB: D1Database
  AUTH_PASSWORD?: string
  AUTH_SESSION_SECRET?: string
}

const COOKIE_NAME = '__Host-study_session'
const SESSION_SECONDS = 12 * 60 * 60
const LOGIN_WINDOW_SECONDS = 15 * 60
const LOGIN_MAX_FAILURES = 5
const encoder = new TextEncoder()

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  })

function configured(env: AuthEnv): boolean {
  return Boolean(env.AUTH_PASSWORD && env.AUTH_PASSWORD.length >= 16 &&
    env.AUTH_SESSION_SECRET && env.AUTH_SESSION_SECRET.length >= 32)
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function decodeBase64url(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
    return Uint8Array.from(binary, char => char.charCodeAt(0))
  } catch {
    return null
  }
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) difference |= (a[i] || 0) ^ (b[i] || 0)
  return difference === 0
}

function cookieValue(request: Request): string {
  const cookie = request.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === COOKIE_NAME) return value.join('=')
  }
  return ''
}

function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === url.origin
  } catch {
    return false
  }
}

async function sessionValid(request: Request, env: AuthEnv): Promise<boolean> {
  if (!configured(env)) return false
  const token = cookieValue(request)
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  const payloadBytes = decodeBase64url(payload)
  const signatureBytes = decodeBase64url(signature)
  if (!payloadBytes || !signatureBytes) return false
  let claims: { exp?: number; v?: number }
  try {
    claims = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return false
  }
  if (claims.v !== 1 || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return false
  const expected = await hmac(env.AUTH_SESSION_SECRET!, payload)
  return constantTimeEqual(expected, signatureBytes)
}

function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`
}

async function clientBucket(request: Request, secret: string, nowSeconds: number): Promise<{ key: string; expires: number }> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown-client'
  const windowStart = Math.floor(nowSeconds / LOGIN_WINDOW_SECONDS)
  const digest = await hmac(secret, `${ip}:${windowStart}`)
  return { key: base64url(digest), expires: (windowStart + 1) * LOGIN_WINDOW_SECONDS }
}

async function login(request: Request, env: AuthEnv, url: URL): Promise<Response> {
  if (!sameOrigin(request, url)) return json({ error: '请求来源验证失败。请刷新页面后重试。' }, 403)
  if (!configured(env)) return json({ error: '登录尚未配置。请在 Cloudflare Worker Secrets 中设置 AUTH_PASSWORD（至少 16 位）和 AUTH_SESSION_SECRET（至少 32 位随机字符）。' }, 503)
  // Enforce an actual byte limit, including for chunked requests or misleading headers.
  let body: { password?: unknown }
  try {
    const reader = request.body?.getReader()
    if (!reader) return json({ error: '请求格式不正确。' }, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        void reader.cancel().catch(() => {})
        return json({ error: '请求内容过大。' }, 413)
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as { password?: unknown }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: '请求格式不正确。' }, 400)
  } catch {
    return json({ error: '请求格式不正确。' }, 400)
  }
  if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 256) {
    return json({ error: '请输入有效密码。' }, 400)
  }

  const now = Math.floor(Date.now() / 1000)
  const bucket = await clientBucket(request, env.AUTH_SESSION_SECRET!, now)
  try {
    // Opportunistically remove expired buckets so the tiny D1 limiter tables stay bounded.
    await env.DB.prepare('DELETE FROM auth_login_rate_limits WHERE expires_at <= ?').bind(now).run()
    await env.DB.prepare('DELETE FROM auth_write_rate_limits WHERE expires_at <= ?').bind(now).run()
    // Reserve an attempt atomically before checking the password. Parallel requests
    // cannot all pass a separate read before any of them increments the counter.
    const row = await env.DB.prepare(`INSERT INTO auth_login_rate_limits (bucket_key, failures, expires_at)
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        failures = CASE WHEN failures >= 6 THEN 6 ELSE failures + 1 END,
        expires_at = excluded.expires_at
      RETURNING failures`).bind(bucket.key, bucket.expires).first<{ failures: number }>()
    if (!row) throw new Error('Login limiter returned no count')
    if (Number(row.failures) > LOGIN_MAX_FAILURES) {
      return json({ error: '尝试次数过多，请 15 分钟后再试。' }, 429, { 'retry-after': String(Math.max(1, bucket.expires - now)) })
    }
  } catch {
    return json({ error: '登录安全检查暂不可用，请稍后重试。' }, 503)
  }

  const supplied = await crypto.subtle.digest('SHA-256', encoder.encode(body.password))
  const expected = await crypto.subtle.digest('SHA-256', encoder.encode(env.AUTH_PASSWORD))
  if (!constantTimeEqual(new Uint8Array(supplied), new Uint8Array(expected))) {
    return json({ error: '密码不正确。' }, 401)
  }

  try {
    await env.DB.prepare('DELETE FROM auth_login_rate_limits WHERE bucket_key = ?').bind(bucket.key).run()
  } catch {
    // Successful authentication does not depend on deleting the old rate-limit bucket.
  }
  const payload = base64url(encoder.encode(JSON.stringify({ v: 1, exp: now + SESSION_SECONDS })))
  const signature = base64url(await hmac(env.AUTH_SESSION_SECRET!, payload))
  return json({ authenticated: true }, 200, { 'set-cookie': sessionCookie(`${payload}.${signature}`, SESSION_SECONDS) })
}

export async function handleAuthRequest(request: Request, env: AuthEnv): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    return json({ authenticated: await sessionValid(request, env), configured: configured(env) })
  }
  if (url.pathname === '/api/auth/login') {
    if (request.method !== 'POST') return json({ error: '不支持此请求方法' }, 405, { allow: 'POST' })
    return login(request, env, url)
  }
  if (url.pathname === '/api/auth/logout') {
    if (request.method !== 'POST') return json({ error: '不支持此请求方法' }, 405, { allow: 'POST' })
    if (!sameOrigin(request, url)) return json({ error: '请求来源验证失败。' }, 403)
    return json({ authenticated: false }, 200, { 'set-cookie': sessionCookie('', 0) })
  }
  return null
}

export async function requireAuth(request: Request, env: AuthEnv): Promise<Response | null> {
  return await sessionValid(request, env)
    ? null
    : json({ error: '请先登录后再访问个人学习数据。', code: 'AUTH_REQUIRED' }, 401)
}

// Durable write throttling: at most 60 state-changing personal API requests per client per minute.
export async function checkWriteRateLimit(request: Request, env: AuthEnv): Promise<Response | null> {
  if (!configured(env)) return json({ error: '认证配置缺失。' }, 503)
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / 60)
  const ip = request.headers.get('cf-connecting-ip') || 'unknown-client'
  const key = base64url(await hmac(env.AUTH_SESSION_SECRET!, `write:${ip}:${windowStart}`))
  try {
    // Prune expired write buckets during normal authenticated writes as well as logins.
    await env.DB.prepare('DELETE FROM auth_write_rate_limits WHERE expires_at <= ?').bind(now).run()
    const row = await env.DB.prepare(`INSERT INTO auth_write_rate_limits (bucket_key, requests, expires_at)
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        requests = CASE WHEN requests >= 61 THEN 61 ELSE requests + 1 END,
        expires_at = excluded.expires_at
      RETURNING requests`).bind(key, (windowStart + 1) * 60).first<{ requests: number }>()
    if (Number(row?.requests || 0) > 60) {
      return json({ error: '操作过于频繁，请稍后再试。' }, 429, { 'retry-after': String(Math.max(1, (windowStart + 1) * 60 - now)) })
    }
    return null
  } catch {
    // Fail closed: do not allow writes if the persistent limiter is unavailable.
    return json({ error: '写入安全检查暂不可用，请稍后重试。' }, 503)
  }
}
