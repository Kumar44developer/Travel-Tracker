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
























