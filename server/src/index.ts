import { buildServer } from './server.ts';

const server = buildServer();
const port = Number(process.env.PORT ?? 4000);

server.listen({ host: '0.0.0.0', port }).catch((error) => {
  server.log.error(error);
  process.exit(1);
});

