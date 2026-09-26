const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

for (const page of ['travel-os-ui.js', 'travel-os/travel-os-ui.js']) {
  const source = readFileSync(path.join(__dirname, '..', page), 'utf8');
  const instrumented = source.replace(
    /  setupDashboard\(\);\r?\n  setupToday\(\);/,
    '  globalThis.uiUnderTest = { nextInfoHtml, destinationMapsUrl, mapsUrl };'
  );
  if (instrumented === source) throw new Error(`Could not load UI helpers from ${page}`);
  const context = { URL };
  vm.runInNewContext(instrumented, context, { filename: page });
  const { nextInfoHtml, destinationMapsUrl, mapsUrl } = context.uiUnderTest;

  test(`${page}: next stop shows escaped note and primary/backup parking for selected group`, () => {
    const item = {
      type: 'meal', name: 'Example café', city: 'Sample City', travelGroup: 'all',
      note: 'Meet at entrance\n<script>alert(1)</script>',
      parking: {
        mode: 'split',
        carA: { primary: { name: 'Lot A', walkMin: 4 }, backup: { name: 'Lot A backup', fee: 500 } },
        carB: { primary: { name: 'Lot B' } }
      }
    };
    const html = nextInfoHtml(item, 'carA');
    assert.match(html, /Meet at entrance/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /Lot A backup/);
    assert.match(html, /步行 4 分/);
    assert.doesNotMatch(html, /Lot B/);
  });

  test(`${page}: destination map stays separate from parking navigation`, () => {
    const item = {
      type: 'spot', name: 'Sample Museum', city: 'Sample City', googlePlaceId: 'example-id',
      parking: { mode: 'shared', shared: { primary: { name: 'Sample garage', mapsUrl: 'https://maps.google.com/?q=garage' } } }
    };
    assert.match(destinationMapsUrl(item), /query_place_id=example-id/);
    assert.doesNotMatch(destinationMapsUrl(item), /garage/);
    assert.match(mapsUrl(item), /garage/);
  });

  test(`${page}: unsafe parking URL falls back to a search link`, () => {
    const item = { type: 'meal', name: 'Sample café', parking: { mode: 'shared', shared: { primary: { name: 'Lot', mapsUrl: 'javascript:alert(1)' } } } };
    const html = nextInfoHtml(item);
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /https:\/\/www\.google\.com\/maps\/search/);
    assert.match(nextInfoHtml({ type: 'spot' }), /停車資訊未設定/);
  });
}
