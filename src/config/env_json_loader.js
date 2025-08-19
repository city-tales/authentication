/**
 * env_json_loader
 * ---------------------------------
 * Lightweight helper that loads an `env.json` file (if present) and merges its
 * key/values into `process.env` without overriding variables that are already set.
 *
 * Behavior
 * - If an env.json file is found in any of the candidate paths, its JSON content
 *   is parsed and each key is added to `process.env` only when the key is not
 *   already defined. Existing environment values always take precedence.
 * - If no env.json is found, it no-ops (useful when vars are injected by CI/CD,
 *   Docker, or Cloud Run).
 * - Any filesystem or JSON parse errors are swallowed so the process can continue
 *   with existing environment variables.
 *
 * Typical Use Cases
 * - Local development: keep a checked-in or generated `env.json` for easy boot.
 * - CI: a pipeline step generates `env.json` from a secret manager (e.g. Doppler)
 *   before starting the app; this loader bridges variables into `process.env`.
 *
 * Usage
 * - This module has side effects: simply importing it attempts a one-time load.
 *   Example: `import "./config/env_json_loader.js"` early in your startup path.
 *
 * Security Note
 * - Do not commit real secrets to the repo. Prefer generating `env.json` from a
 *   secret manager in CI, or maintain a local untracked file for development.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate locations for env.json depending on execution location (src vs dist vs container)
//
// Resolution order:
// 1) When running from sources: search up from `src/` to repo root
// 2) When running compiled output: look relative to compiled directory
// 3) When running in Docker: check the WORKDIR path used in the Dockerfile
const candidates = [
    // When running from src
    path.resolve(__dirname, "../env.json"),
    path.resolve(__dirname, "../../env.json"),

    // When running from dist
    path.resolve(__dirname, "../../env.json"),
    path.resolve(process.cwd(), "env.json"),

    // Dockerfile WORKDIR
    "/home/authentication/env.json",
];

/**
 * Attempt to load env.json from known locations and merge into process.env once.
 *
 * Returns true if a file was found and parsed successfully; false otherwise.
 * Errors are intentionally swallowed to avoid breaking process start-up.
 */
function loadEnvJsonOnce() {
    for (const p of candidates) {
        try {
            if (!fs.existsSync(p)) continue;
            const raw = fs.readFileSync(p, { encoding: "utf-8" });
            const data = JSON.parse(raw);
            if (data && typeof data === "object") {
                for (const [k, v] of Object.entries(data)) {
                    if (process.env[k] == null) {
                        // Preserve existing env vars, only fill missing ones
                        process.env[k] = String(v);
                    }
                }
            }
            // Loaded successfully; stop searching further
            return true;
        } catch (_) {
            // Ignore parse or fs errors and try next candidate
        }
    }
    return false;
}

loadEnvJsonOnce();
