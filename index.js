import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./db.mjs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
const port = Number(process.env.PORT) || 3000;

function isConnectionError(err) {
  const code = err && err.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  );
}

function isSaslOrPasswordConfigError(err) {
  const msg = err && err.message;
  if (typeof msg !== "string") return false;
  return (
    msg.includes("SCRAM-SERVER-FIRST-MESSAGE") ||
    msg.includes("client password must be")
  );
}


function isMissingRelationError(err) {
  return err && err.code === "42P01";
}


app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

async function getVisitedCountryCodes() {
  const result = await pool.query(
    "SELECT country_code FROM visited_countries ORDER BY country_code"
  );
  return result.rows.map((row) => row.country_code);
}


function renderHome(res, { countries, formError, inputError, dbOffline } = {}) {
  res.status(200).render("index", {
    countries,
    total: countries.length,
    formError: formError ?? null,
    inputError: !!inputError,
    dbOffline: !!dbOffline,
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "travel-tracker" });
});

app.get("/", async (_req, res, next) => {
  try {
    const countries = await getVisitedCountryCodes();
    renderHome(res, { countries });
  } catch (err) {
    if (isConnectionError(err)) {
      console.error("Database unreachable:", err.message);
      return renderHome(res, { countries: [], dbOffline: true });
    }
    if (err.code === "28P01") {
      return renderHome(res, {
        countries: [],
        formError:
          "PostgreSQL login failed. Check PGPASSWORD or DATABASE_URL in .env next to index.js, then restart the server.",
      });








