import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')

test('homepage omits decorative copy that repeats the page identity', () => {
  assert.doesNotMatch(app, /YOUR PERSONAL LEARNING SPACE/)
  assert.doesNotMatch(app, /今天也为自己留一点时间/)
  assert.doesNotMatch(styles, /\.eyebrow-dot|\.date-pill|\.date-dot/)
})

test('mobile navigation exposes expanded state and the controlled navigation region', () => {
  assert.match(app, /:aria-expanded="showMobileMenu"/)
  assert.match(app, /aria-controls="mobile-nav-list"/)
  assert.match(app, /id="mobile-nav-list" class="mobile-nav" aria-label="主导航"/)
  assert.match(app, /:aria-current="activeModule === item\.id \? 'page' : undefined"/)
})

test('selecting a mobile navigation item closes the menu through the shared navigation handler', () => {
  assert.match(app, /function navigate\(id: ModuleId\) \{[\s\S]*?activeModule\.value = id[\s\S]*?showMobileMenu\.value = false/)
})
