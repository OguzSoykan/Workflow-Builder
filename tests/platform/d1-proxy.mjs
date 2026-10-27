// Starts an in-memory local D1 (miniflare) and applies the repository migrations.
import { readFileSync, readdirSync } from 'node:fs';
import { getPlatformProxy } from 'wrangler';

export async function startD1() {
  const proxy = await getPlatformProxy({
    configPath: new URL('./d1.wrangler.jsonc', import.meta.url).pathname,
    persist: false,
  });
  const dir = new URL('../../infra/migrations/', import.meta.url);
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const statements = readFileSync(new URL(file, dir), 'utf8')
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    for (const statement of statements) await proxy.env.DB.prepare(statement).run();
  }
  return { db: proxy.env.DB, dispose: () => proxy.dispose() };
}
