const app = require('./app');
const pool = require('./db');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));

// Encerramento limpo quando o Docker manda parar o container
function shutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
