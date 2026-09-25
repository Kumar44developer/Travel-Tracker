import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool, ensureSchema } from "./db.mjs";
import { lookupCode } from "./countries.data.js";


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


async function resolveCountryCode(name) {
  return lookupCode(name);
}


function renderHome(res, { countries = [], error = null, dbOffline = false } = {}) {
  res.status(200).render("index", {
    countries,
    total: countries.length,
    error,
    dbOffline,
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
      return renderHome(res, {
        countries: [],
        dbOffline: true,
        error: "Database offline. Start PostgreSQL and restart the server.",
      });
    }
    if (err.code === "28P01" || isSaslOrPasswordConfigError(err)) {
      return renderHome(res, {
        countries: [],
        error:
          "PostgreSQL login failed. Check PGPASSWORD or DATABASE_URL in .env next to index.js, then restart the server.",
      });
    }
    if (err.code === "3D000") {
      return renderHome(res, {
        countries: [],
        error: `Database does not exist. Create it or set PGDATABASE in .env.`,
      });
    }
    if (isMissingRelationError(err)) {
      try {
        await ensureSchema();
        return renderHome(res, { countries: [] });
      } catch (schemaErr) {
        return next(schemaErr);
      }
    }
    return next(err);
  }
});

app.post("/add", async (req, res, next) => {
  const name = (req.body.country || "").trim();

  let existing = [];
  try {
    existing = await getVisitedCountryCodes();
  } catch (err) {
    if (isConnectionError(err)) {
      return renderHome(res, {
        countries: [],
        dbOffline: true,
        error: "Database offline. Start PostgreSQL and restart the server.",
      });
    }
    if (err.code === "28P01" || isSaslOrPasswordConfigError(err)) {
      return renderHome(res, {
        countries: [],
        error:
          "PostgreSQL login failed. Check PGPASSWORD or DATABASE_URL in .env next to index.js, then restart the server.",
      });
    }
    if (err.code === "3D000") {
      return renderHome(res, {
        countries: [],
        error: `Database does not exist. Create it or set PGDATABASE in .env.`,
      });
    }
    if (isMissingRelationError(err)) {
      try {
        await ensureSchema();
      } catch (schemaErr) {
        return next(schemaErr);
      }
    } else {
      return next(err);
    }
  }

  if (!name) {
    return renderHome(res, {
      countries: existing,
      error: "Please enter a country name.",
    });
  }

  try {
    const code = await resolveCountryCode(name);

    if (!code) {
      return renderHome(res, {
        countries: existing,
        error: `"${name}" is not a recognized country.`,
      });
    }

    if (existing.includes(code)) {
      return renderHome(res, {
        countries: existing,
        error: `You have already added country with code ${code}.`,
      });
    }

    await pool.query(
      "INSERT INTO visited_countries (country_code) VALUES ($1)",
      [code]
    );

    return res.redirect("/");
  } catch (err) {
    if (isConnectionError(err)) {
      return renderHome(res, {
        countries: existing,
        dbOffline: true,
        error: "Database offline. Start PostgreSQL and restart the server.",
      });
    }
    return next(err);
  }
});


app.use((_req, res) => {
  res.status(404).render("error", { message: "Route not found." });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).render("error", {
    message: err.message || "Something went wrong.",
  });
});

ensureSchema().catch((err) => {
  if (isConnectionError(err)) {
    console.error(
      "Database unreachable at startup. The map will run in offline mode until PostgreSQL is available."
    );
  } else {
    console.error("Schema check failed:", err.message);
  }
});

app.listen(port, () => {
  console.log(`Travel Tracker listening on http://localhost:${port}`);
});
