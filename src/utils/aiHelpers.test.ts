import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMapsSources,
  extractWebSources,
  isMapsQuotaErrorPayload,
  resolveAiMode,
  resolveRolePreset,
} from './aiHelpers';

test('resolveAiMode selects free-tier eligible models cleanly and falls back to general', () => {
  assert.equal(resolveAiMode('fast').model, 'gemini-3.1-flash-lite');
  assert.equal(resolveAiMode('general').model, 'gemini-4-hydrogen');
  assert.equal(resolveAiMode('planner').thinkingLevel, 'HIGH');
  assert.equal(resolveAiMode('reasoner').thinkingLevel, 'XHIGH');
  assert.equal(resolveAiMode('search').tool, 'googleSearch');
  assert.equal(resolveAiMode('maps').tool, 'googleMaps');
  assert.equal(resolveAiMode('unknown-mode').id, 'general');
});

test('resolveRolePreset returns valid preset and defaults to concierge', () => {
  assert.equal(resolveRolePreset('critic').id, 'critic');
  assert.equal(resolveRolePreset('missing').id, 'concierge');
});

test('extractWebSources deduplicates URIs and preserves titles', () => {
  const sources = extractWebSources([
    { web: { uri: 'https://example.com/a', title: 'Review A' } },
    { web: { uri: 'https://example.com/a', title: 'Duplicate A' } },
    { web: { uri: 'https://example.com/b', title: '' } },
    { other: true },
  ]);

  assert.deepEqual(sources, [
    { uri: 'https://example.com/a', title: 'Review A' },
    { uri: 'https://example.com/b', title: 'https://example.com/b' },
  ]);
});

test('extractMapsSources extracts URI, title, and review snippets', () => {
  const sources = extractMapsSources([
    {
      maps: {
        uri: 'https://maps.google.com/?cid=123',
        title: 'Prasads Multiplex',
        placeAnswerSources: {
          reviewSnippets: [{ content: 'Huge IMAX screen and ample parking.' }],
        },
      },
    },
    {
      maps: {
        uri: 'https://maps.google.com/?cid=123',
        title: 'Duplicate',
      },
    },
  ]);

  assert.deepEqual(sources, [
    {
      uri: 'https://maps.google.com/?cid=123',
      title: 'Prasads Multiplex',
      reviewSnippets: ['Huge IMAX screen and ample parking.'],
    },
  ]);
});

test('isMapsQuotaErrorPayload catches 429 and quota statuses without false positives', () => {
  assert.equal(isMapsQuotaErrorPayload(429, null), true);
  assert.equal(isMapsQuotaErrorPayload(200, { status: 'OVER_QUERY_LIMIT' }), true);
  assert.equal(isMapsQuotaErrorPayload(403, { error: { status: 'RESOURCE_EXHAUSTED' } }), true);
  assert.equal(isMapsQuotaErrorPayload(404, null), false);
  assert.equal(isMapsQuotaErrorPayload(200, { status: 'ZERO_RESULTS' }), false);
});
