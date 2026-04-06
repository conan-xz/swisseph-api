const DATABASE_URL = process.env.DATABASE_URL || '';
const PGHOST = process.env.PGHOST || '';
const PGPORT = parseInt(process.env.PGPORT || '5432', 10);
const PGDATABASE = process.env.PGDATABASE || '';
const PGUSER = process.env.PGUSER || '';
const PGPASSWORD = process.env.PGPASSWORD || '';
const PGSSL = process.env.PGSSL === 'true' || process.env.PGSSL === '1';

module.exports = {
  connectionString: DATABASE_URL,
  host: PGHOST,
  port: Number.isNaN(PGPORT) ? 5432 : PGPORT,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  ssl: PGSSL
};
