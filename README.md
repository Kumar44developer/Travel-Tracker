# Travel Tracker

> An interactive world map that highlights every country you have visited. Type a country name, and it is resolved to its ISO code, stored in PostgreSQL, and colored on the map — no external API required.

<p>
  <img alt="node" src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white"/>
  <img alt="express" src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white"/>
  <img alt="postgres" src="https://img.shields.io/badge/PostgreSQL-12%2B-336791?style=flat-square&logo=postgresql&logoColor=white"/>
  <img alt="ejs" src="https://img.shields.io/badge/Views-EJS-b4dd17?style=flat-square"/>
  <img alt="license" src="https://img.shields.io/badge/license-ISC-green?style=flat-square"/>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Travel Tracker is a small full-stack application for recording the countries you have been to. The interface is a hand-drawn SVG world map; each country is an individual path keyed by its ISO 3166-1 alpha-2 code. When you submit a country name, the server resolves it to that code, persists it, and the map fills the matching region in teal.

Country resolution runs entirely against a bundled dataset, so the app has no runtime dependency on third-party services and works fully offline apart from the database.

---

## Features

- **Interactive SVG world map** with per-country highlighting.
- **Name to ISO code resolution** using a bundled country dataset (no external API calls).
- **Accepts full names, common aliases, and 2-letter codes** (for example `United States`, `usa`, or `US`).
- **Duplicate protection** so a country is only ever recorded once.
- **Graceful database degradation** with clear on-screen messages when PostgreSQL is unreachable, unauthenticated, or missing.
- **Automatic schema creation** on first run.
- **Express + EJS** server-rendered frontend with a single stylesheet.

---

## Tech Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js (ES modules) |
| Web framework | Express 4 |
| Templating | EJS |
| Database | PostgreSQL via `pg` |
| Form parsing | body-parser |
| Configuration | dotenv |

---

## How It Works

```
Browser
  |  POST /add  (country name)
  v
index.js
  |  lookupCode(name) -> ISO alpha-2 code   (countries.data.js)
  |  INSERT INTO visited_countries          (db.mjs -> PostgreSQL)
  v
GET /
  |  SELECT country_code FROM visited_countries
  v
views/index.ejs
     renders codes into the page, inline script fills each matching SVG path teal
```

The database table is intentionally minimal:

```
visited_countries
  id            serial primary key
  country_code  varchar(2) unique not null
```

---

## Prerequisites

- **Node.js 18 or newer**
- **PostgreSQL** running and reachable
- A PostgreSQL role able to create a database and a table

---

## Getting Started

Install dependencies.

```bash
npm install
```

Create the database once.

```bash
createdb travel_tracker
```

Start the server.

```bash
npm start
```

Open the app.

```
http://localhost:3000
```

---

## Environment Variables

The server reads configuration from a `.env` file placed next to `index.js`. A sample is provided in `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `PGHOST` | `localhost` | Database host |
| `PGPORT` | `5432` | Database port |
| `PGUSER` | `postgres` | Database user |
| `PGPASSWORD` | _(none)_ | Database password |
| `PGDATABASE` | `travel_tracker` | Database name |
| `DATABASE_URL` | _(none)_ | Full connection string; overrides the `PG*` values when set |

Copy the example and fill in your password.

```bash
cp .env.example .env
```

---

## Database Setup

The application creates the `visited_countries` table automatically on startup. To create the database itself, use either command.

```bash
createdb travel_tracker
```

```bash
psql -U postgres -c "CREATE DATABASE travel_tracker"
```

For a managed or remote database, set `DATABASE_URL` instead of the individual `PG*` variables.

```
DATABASE_URL=postgres://user:password@host:5432/travel_tracker
```

---

## Usage

Type a country name into the box and submit.

```
India        -> highlights IN
France       -> highlights FR
usa          -> highlights US (alias supported)
JP           -> highlights JP (2-letter code supported)
```

Submitting an unrecognized name, an empty value, or an already-added country re-renders the map with an explanatory message in the input placeholder instead of changing the data.

---

## API Reference

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| GET | `/` | Render the map and totals | 200 HTML |
| GET | `/health` | Liveness probe | 200 JSON |
| POST | `/add` | Add a visited country by `country` form field | 302 redirect to `/`, or 200 with a message |

Health check example.

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "service": "travel-tracker" }
```

Add a country example.

```bash
curl -i -X POST http://localhost:3000/add -d "country=India"
```

---

## Project Structure

```
.
|-- public
|   `-- styles
|       `-- main.css
|-- views
|   |-- error.ejs
|   `-- index.ejs
|-- .env.example
|-- .gitignore
|-- countries.data.js
|-- db.mjs
|-- index.js
|-- package.json
`-- README.md
```

---

## Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Banner: "PostgreSQL login failed" | Wrong `PGPASSWORD` or `DATABASE_URL` | Fix the credentials in `.env` and restart |
| Banner: "Database does not exist" | Missing `travel_tracker` database | Run `createdb travel_tracker` |
| Banner: "Database offline" | PostgreSQL not running | Start the PostgreSQL service |
| Map shows no highlights | No rows yet or codes not in the SVG | Add countries; some micro-states are absent from the map |
| `EADDRINUSE` on start | Port already taken | Set a different `PORT` in `.env` |

---

## License

Distributed under the ISC License. See [LICENSE](LICENSE) for details.
