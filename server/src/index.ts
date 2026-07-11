import { readFileSync } from 'node:fs';

loadLocalEnv(new URL('../.env', import.meta.url));

const { buildServer } = await import('./server.ts');

const server = buildServer();
const port = Number(process.env.PORT ?? 4000);

server.listen({ host: '0.0.0.0', port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});

function loadLocalEnv(fileUrl: URL) {
  const env = readFileSync(fileUrl, 'utf8');

  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^"(.*)"$/, '$1');
    process.env[key] = value;
  }
}
