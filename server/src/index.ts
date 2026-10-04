import { loadListenConfig, loadLocalEnv } from './startup.ts';

loadLocalEnv(new URL('../.env', import.meta.url));

const { buildServer } = await import('./server.ts');

const server = buildServer();
const listenConfig = loadListenConfig();

server.listen(listenConfig).catch((error) => {
  server.log.error(error);
  process.exit(1);
});

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  try {
    await server.close();
    const { prisma } = await import('./prisma.ts');
    await prisma.$disconnect();
  } catch (error) {
    server.log.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
