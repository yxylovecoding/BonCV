import { Redis } from '@upstash/redis';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.argv[2] || path.join('private', 'boncv.json'));
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
}

const state = JSON.parse(await readFile(source, 'utf8'));
if (state?.schemaVersion !== 1 || !state.profile || !Array.isArray(state.sections) || !Array.isArray(state.presets)) {
  throw new Error('The source file is not a valid BonCV v1 state');
}

state.builds = [];
state.integrationKeys = [];
state.revision = Number.isInteger(state.revision) ? state.revision : 1;
state.updatedAt = new Date().toISOString();
await Redis.fromEnv().set('boncv:state:v1', state);
console.log(`Imported BonCV v1 state: ${state.sections.length} sections, ${state.sections.flatMap((section) => section.entries || []).length} entries.`);
