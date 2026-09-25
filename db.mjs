import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const sslRequired =
  process.env.PGSSLMODE === "require" ||
  (connectionString ? /sslmode=require/.test(connectionString) : false);

const sslRejectUnauthorized =
  process.env.PGSSLREJECTUNAUTHORIZED !== "false";

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: sslRequired ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "travel_tracker",
      }
);

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visited_countries (
      id SERIAL PRIMARY KEY,
      country_code VARCHAR(2) UNIQUE NOT NULL
    )
  `);
}
