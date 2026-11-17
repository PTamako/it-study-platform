import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const router=readFileSync(new URL('../worker/index.ts',import.meta.url),'utf8')
const config=readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8')

test('former family-approved personal study execution is HTTP 410 before any authorization',()=>{
  const start=router.indexOf("if (url.pathname === '/api/internal/document-study/execute'")
  const end=router.indexOf("if (url.pathname === '/api/bridge/document-assistant')",start)
  assert.ok(start>0&&end>start,'retired route must precede signed personal bridge')
  const route=router.slice(start,end)
  assert.match(route,/LEGACY_STUDY_APPROVAL_RETIRED/)
  assert.match(route,/bridgeJson\([\s\S]*?,410\)/)
  assert.doesNotMatch(route,/documentStudyExecution|env\.DB|await import/)
  assert.match(config,/DOCUMENT_STUDY_EXECUTION_ENABLED\s*=\s*"false"/)
})

test('personal study remains on the HMAC signed, actor-scoped direct document bridge',()=>{
  assert.match(router,/url\.pathname === '\/api\/bridge\/document-assistant'\) return documentAssistantBridge/)
  assert.match(router,/verifiedSsoActor\s*=\s*body\.identity_source==='homeflow_sso'/)
  assert.match(router,/homeflow_identity_links WHERE homeflow_user_id=\? AND role IN \('owner','member'\)/)
  assert.match(router,/env\.HOMEFLOW_STUDY_SSO_ENABLED==='true'/)
})
