const { Pool } = require('pg');

// Usa DATABASE_URL, se existir; senão lê PGHOST, PGUSER, PGPASSWORD, PGDATABASE e PGPORT
const pool = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});

pool.on('error', (err) => console.error('Erro inesperado no banco:', err.message));

module.exports = pool;
