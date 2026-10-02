import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DEFAULT_ADAPTERS = ['slack', 'gitlab'];
export const FIRST_SWEEP_LOOKBACK_MS = 72 * 60 * 60 * 1000;
export const MIN_SWEEP_LOOKBACK_MS = 24 * 60 * 60 * 1000;

const DURATION_UNITS_MS = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

export function parseSince(value, now = new Date()) {
  const duration = /^(\d+)([mhd])$/.exec(String(value));
  if (duration) {
    return new Date(now.getTime() - Number(duration[1]) * DURATION_UNITS_MS[duration[2]]);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid --since value: ${value}. Use an ISO-8601 timestamp or a duration like 24h or 3d.`,
    );
  }
  return date;
}

export function resolveSweepSince({ lastSweepAt, now = new Date() }) {
  if (!lastSweepAt) {
    return new Date(now.getTime() - FIRST_SWEEP_LOOKBACK_MS);
  }
  const minimumLookback = now.getTime() - MIN_SWEEP_LOOKBACK_MS;
  return new Date(Math.min(new Date(lastSweepAt).getTime(), minimumLookback));
}

export async function runAdapterSnapshot(adapter, since) {
  const { stdout } = await execFileAsync(adapter, ['snapshot', '--since', since.toISOString()], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120 * 1000,
  });
  return JSON.parse(stdout);
}

export function mergeItemsByUrn(items) {
  const itemsByKey = new Map();
  for (const item of items) {
    const key = item.urn || item.id;
    const existing = itemsByKey.get(key);
    if (!existing) {
      itemsByKey.set(key, item);
      continue;
    }
    const reasons = new Set([...(existing.snapshot?.reasons || []), ...(item.snapshot?.reasons || [])]);
    existing.snapshot = { ...(existing.snapshot || {}), reasons: Array.from(reasons) };
  }
  return Array.from(itemsByKey.values()).sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp)),
  );
}

export async function runSweep({ adapters = DEFAULT_ADAPTERS, since, snapshotRunner = runAdapterSnapshot }) {
  const startedAt = new Date().toISOString();
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const snapshot = await snapshotRunner(adapter, since);
        return { adapter, snapshot };
      } catch (err) {
        return { adapter, error: err.message };
      }
    }),
  );

  const sources = [];
  const errors = [];
  const items = [];
  for (const result of results) {
    if (result.error) {
      sources.push({ adapter: result.adapter, ok: false, items: 0 });
      errors.push({ source: result.adapter, error: result.error });
      continue;
    }
    const snapshotItems = Array.isArray(result.snapshot?.items) ? result.snapshot.items : [];
    sources.push({
      adapter: result.adapter,
      ok: true,
      items: snapshotItems.length,
      instance: result.snapshot?.instance || null,
      actor: result.snapshot?.actor || null,
    });
    items.push(...snapshotItems);
    for (const error of result.snapshot?.errors || []) {
      errors.push({ source: `${result.adapter}:${error.source}`, error: error.error });
    }
  }

  return {
    protocol: 'paseo-fleet/v1',
    kind: 'sweep',
    started_at: startedAt,
    since: since.toISOString(),
    sources,
    items: mergeItemsByUrn(items),
    errors,
  };
}
