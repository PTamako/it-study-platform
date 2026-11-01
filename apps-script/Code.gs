/**
 * 知学平台私人翻译接口
 * 复制到 Google Apps Script -> Code.gs，部署为 Web App。
 *
 * 安全配置：Project Settings -> Script Properties:
 *   TRANSLATOR_SHARED_SECRET = 您自行生成的随机长字符串（建议 32 字节以上）
 * Cloudflare Workers Secrets:
 *   GAS_TRANSLATOR_URL   = 部署所得 https://script.google.com/macros/s/.../exec
 *   GAS_TRANSLATOR_TOKEN = 同一个 TRANSLATOR_SHARED_SECRET
 *
 * 仅使用内置 LanguageApp；不启用 Google Cloud Translation API / 付费项目。
 * 部署为 Execute as: Me; Who has access: Anyone.
 * Anyone 仅是让 Worker 能访问；实际翻译必须先通过共享密钥验证。
 */

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeSecretEquals_(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string') return false;
  // Constant-work string comparison for typical bounded tokens.
  var max = Math.max(given.length, expected.length);
  if (max > 256) return false;
  var diff = given.length ^ expected.length;
  for (var i = 0; i < max; i++) {
    diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function normalizeLanguage_(value) {
  if (value === 'zh' || value === 'zh-CN') return 'zh-CN';
  if (value === 'ja' || value === 'en') return value;
  return '';
}

function doPost(e) {
  try {
    // A GET request never translates, and malformed/oversize POST never calls LanguageApp.
    if (!e || !e.postData || !e.postData.contents ||
        e.postData.contents.length > 12000) {
      return jsonResponse_({ ok: false, error: 'bad_request' });
    }
    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return jsonResponse_({ ok: false, error: 'bad_request' });
    }
    var expected = PropertiesService.getScriptProperties()
      .getProperty('TRANSLATOR_SHARED_SECRET');
    if (!expected || expected.length < 32 ||
        !safeSecretEquals_(data.token, expected)) {
      return jsonResponse_({ ok: false, error: 'unauthorized' });
    }
    var text = data.text;
    var source = normalizeLanguage_(data.source);
    var target = normalizeLanguage_(data.target);
    if (typeof text !== 'string' || !text.trim() ||
        text.length > 1800 || !source || !target || source === target) {
      return jsonResponse_({ ok: false, error: 'invalid_input' });
    }

    // Translate calls count toward the executing owner's Google Apps Script quota.
    // When quota is exhausted Google throws; this script never calls a paid API.
    var translated = LanguageApp.translate(text, source, target);
    if (typeof translated !== 'string' || !translated.trim()) {
      return jsonResponse_({ ok: false, error: 'empty_translation' });
    }
    return jsonResponse_({ ok: true, translation: translated.trim() });
  } catch (err) {
    // Do not return stack traces, account identifiers, or the shared secret.
    return jsonResponse_({ ok: false, error: 'provider_unavailable' });
  }
}

function doGet() {
  return jsonResponse_({ ok: false, error: 'post_only' });
}
