import { Redis } from '@upstash/redis';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { demoState } from './fixtures';
import { normalizeHeadlineItems } from './profile';
import type { AdminState, BonCvState, IntegrationKey, ResumeBuild } from './types';

const STATE_KEY = 'boncv:state:v1';
const LOCAL_STATE_PATH = path.join(process.cwd(), 'private', 'boncv.json');

function hasRedis() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function redis() {
  return Redis.fromEnv();
}

async function readLocal(): Promise<BonCvState> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_STATE_PATH, 'utf8')) as BonCvState;
  } catch {
    await fs.mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
    await fs.writeFile(LOCAL_STATE_PATH, JSON.stringify(demoState, null, 2));
    return structuredClone(demoState);
  }
}

async function writeLocal(state: BonCvState) {
  await fs.mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  await fs.writeFile(LOCAL_STATE_PATH, JSON.stringify(state, null, 2));
}

function normalizeState(state: BonCvState): BonCvState {
  const iterationByBuild = new Map<string, number>();
  const latestIteration = new Map<string, number>();
  [...state.builds].reverse().forEach((build) => {
    const previous = latestIteration.get(build.presetId) ?? 0;
    const iteration = build.iteration ?? previous + 1;
    latestIteration.set(build.presetId, Math.max(previous, iteration));
    iterationByBuild.set(build.id, iteration);
  });
  return {
    ...state,
    profile: { ...state.profile, headline: normalizeHeadlineItems(state.profile.headline) },
    presets: state.presets.map((preset) => ({ ...preset, entryOverrides: preset.entryOverrides ?? {} })),
    builds: state.builds.map((build): ResumeBuild => ({ ...build, iteration: iterationByBuild.get(build.id) ?? 1 })),
  };
}

export async function getState(): Promise<BonCvState> {
  if (!hasRedis()) return normalizeState(await readLocal());
  const stored = await redis().get<BonCvState>(STATE_KEY);
  if (stored) {
    const keys = stored.integrationKeys.map((key) => `boncv:key-used:${key.id}`);
    if (keys.length) {
      const usedAt = await redis().mget<Array<string | null>>(...keys);
      stored.integrationKeys.forEach((key, index) => { key.lastUsedAt = usedAt[index] ?? key.lastUsedAt; });
    }
    return normalizeState(stored);
  }
  await redis().set(STATE_KEY, demoState, { nx: true });
  return normalizeState((await redis().get<BonCvState>(STATE_KEY)) ?? structuredClone(demoState));
}

export async function replaceState(next: BonCvState) {
  if (!hasRedis()) return writeLocal(next);
  await redis().set(STATE_KEY, next);
}

export async function updateState(
  mutate: (state: BonCvState) => BonCvState,
  expectedRevision?: number,
): Promise<BonCvState> {
  const current = await getState();
  if (expectedRevision !== undefined && current.revision !== expectedRevision) {
    throw Object.assign(new Error('REVISION_CONFLICT'), { current });
  }
  const next = mutate(structuredClone(current));
  next.revision = current.revision + 1;
  next.updatedAt = new Date().toISOString();
  await replaceState(next);
  return next;
}

export function toAdminState(state: BonCvState): AdminState {
  return {
    ...state,
    integrationKeys: state.integrationKeys.map(({ secretHash: _secretHash, ...key }) => key),
  };
}

export async function findIntegrationKey(hash: string): Promise<IntegrationKey | null> {
  return (await getState()).integrationKeys.find((key) => key.secretHash === hash) ?? null;
}

export async function markKeyUsed(id: string) {
  const usedAt = new Date().toISOString();
  if (hasRedis()) {
    await redis().set(`boncv:key-used:${id}`, usedAt);
    return;
  }
  const state = await getState();
  const key = state.integrationKeys.find((item) => item.id === id);
  if (!key) return;
  key.lastUsedAt = usedAt;
  await replaceState(state);
}

export async function takeRateLimit(keyId: string, limit = 60): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  if (!hasRedis()) return true;
  const key = `boncv:rate:${keyId}:${minute}`;
  const count = await redis().incr(key);
  if (count === 1) await redis().expire(key, 90);
  return count <= limit;
}
