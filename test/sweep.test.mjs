import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeItemsByUrn, parseSince, resolveSweepSince, runSweep } from '../src/sweep.js';

const now = new Date('2026-10-02T12:00:00Z');

describe('Fleet sweep', () => {
  it('parses durations and ISO timestamps for --since', () => {
    assert.equal(parseSince('24h', now).toISOString(), '2026-10-01T12:00:00.000Z');
    assert.equal(parseSince('3d', now).toISOString(), '2026-09-29T12:00:00.000Z');
    assert.equal(parseSince('2026-09-30T08:00:00Z', now).toISOString(), '2026-09-30T08:00:00.000Z');
    assert.throws(() => parseSince('yesterday', now), /Invalid --since/);
  });

  it('looks back at least 24 hours even when the last sweep was recent', () => {
    assert.equal(resolveSweepSince({ now }).toISOString(), '2026-09-29T12:00:00.000Z');
    assert.equal(
      resolveSweepSince({ lastSweepAt: '2026-10-02T11:00:00Z', now }).toISOString(),
      '2026-10-01T12:00:00.000Z',
    );
    assert.equal(
      resolveSweepSince({ lastSweepAt: '2026-09-25T00:00:00Z', now }).toISOString(),
      '2026-09-25T00:00:00.000Z',
    );
  });

  it('merges items with the same urn and keeps every reason', () => {
    const merged = mergeItemsByUrn([
      { urn: 'urn:x:1', timestamp: '2026-10-01T00:00:00Z', snapshot: { reasons: ['a'] } },
      { urn: 'urn:x:1', timestamp: '2026-10-01T00:00:00Z', snapshot: { reasons: ['b', 'a'] } },
      { urn: 'urn:x:2', timestamp: '2026-10-02T00:00:00Z', snapshot: { reasons: ['c'] } },
    ]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].urn, 'urn:x:2');
    assert.deepEqual(merged[1].snapshot.reasons, ['a', 'b']);
  });

  it('reports a failing adapter without losing the others', async () => {
    const calls = [];
    const sweep = await runSweep({
      adapters: ['chat', 'forge'],
      since: now,
      snapshotRunner: async (adapter, since) => {
        calls.push([adapter, since.toISOString()]);
        if (adapter === 'forge') throw new Error('command not found');
        return {
          instance: 'T1',
          actor: 'me',
          items: [{ urn: 'urn:chat:1', timestamp: '2026-10-02T00:00:00Z', snapshot: { reasons: ['dm'] } }],
          errors: [{ source: 'mentions', error: 'rate limited' }],
        };
      },
    });

    assert.deepEqual(calls, [
      ['chat', '2026-10-02T12:00:00.000Z'],
      ['forge', '2026-10-02T12:00:00.000Z'],
    ]);
    assert.equal(sweep.items.length, 1);
    assert.deepEqual(sweep.sources, [
      { adapter: 'chat', ok: true, items: 1, instance: 'T1', actor: 'me' },
      { adapter: 'forge', ok: false, items: 0 },
    ]);
    assert.deepEqual(sweep.errors, [
      { source: 'chat:mentions', error: 'rate limited' },
      { source: 'forge', error: 'command not found' },
    ]);
  });
});
