/**
 * 【预检】TMDB 凭证与网络连通性
 *
 * 确认 .env.local 中 TMDB_READ_ACCESS_TOKEN 或 TMDB_API_KEY 可用。
 *
 * npm run check:tmdb
 *
 * sync:movies 与 bulk-ingest 的 resolve/sync 步骤都依赖 TMDB。
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const clean = (value = "") => value.trim().replace(/^['"]|['"]$/g, "").trim();
const token = clean(process.env.TMDB_READ_ACCESS_TOKEN).replace(/^Bearer\s+/i, "").trim();
const apiKey = clean(process.env.TMDB_API_KEY);
const baseUrl = clean(process.env.TMDB_API_BASE_URL) || "https://api.themoviedb.org/3";
const curlFallback = clean(process.env.TMDB_CURL_FALLBACK).toLowerCase() !== "false";

console.log("TMDB env:", {
  hasReadAccessToken: Boolean(token),
  apiKeyLength: apiKey.length,
  baseUrl,
  curlFallback,
});

if (!token && !apiKey) {
  console.error("Missing TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY.");
  process.exit(1);
}

const url = `${baseUrl}/configuration${apiKey && !token ? `?api_key=${encodeURIComponent(apiKey)}` : ""}`;
const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

try {
  const response = await fetch(url, { headers });

  console.log("Node fetch HTTP status:", response.status);
  if (!response.ok) {
    console.log(await response.text());
    process.exit(1);
  }

  const data = await response.json();
  console.log("TMDB OK via Node fetch:", data.images?.secure_base_url ?? "configuration loaded");
} catch (error) {
  console.error("Node fetch failed:", error);

  if (!curlFallback) {
    process.exit(1);
  }

  const args = ["--silent", "--show-error", "--fail", "--location", "--max-time", clean(process.env.TMDB_CURL_TIMEOUT) || "12"];

  if (token) {
    args.push("--header", `Authorization: Bearer ${token}`);
  }

  args.push(url);

  try {
    const { stdout } = await execFileAsync("curl", args, { maxBuffer: 1024 * 1024 * 4 });
    const data = JSON.parse(stdout);
    console.log("TMDB OK via curl fallback:", data.images?.secure_base_url ?? "configuration loaded");
  } catch (curlError) {
    console.error("curl fallback failed:", sanitizeCurlError(curlError));
    process.exit(1);
  }
}

function sanitizeCurlError(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message.replaceAll(token, "[redacted-token]").replaceAll(apiKey, "[redacted-api-key]"),
    code: error.code,
    signal: error.signal,
    stderr: typeof error.stderr === "string" ? error.stderr.replaceAll(token, "[redacted-token]").replaceAll(apiKey, "[redacted-api-key]") : error.stderr,
  };
}
