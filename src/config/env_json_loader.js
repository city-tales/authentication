// Lightweight env.json loader
// - If env.json exists (in repo root), load it and set process.env for any keys not already set
// - If missing, do nothing (assume env provided by runtime like Docker/Cloud Run)
// - Never override existing process.env values

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate locations for env.json depending on execution location (src vs dist vs container)
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
