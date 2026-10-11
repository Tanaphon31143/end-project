import https from "node:https";
import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";

const base = new URL(process.argv[2]);
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error("Provide an HTTP(S) deployment URL without credentials");
}
const paths = process.argv.slice(3);
if (!paths.length) paths.push("/", "/api/db-health");
const client = base.protocol === "https:" ? https : http;
const agent = new client.Agent({ keepAlive: true, maxSockets: 1 });

function sample(path) {
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error("Benchmark paths must use the deployment origin");
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let firstByteMs;
    const request = client.get(url, { agent, headers: { "User-Agent": "SchoolOS-Performance-Check/1.0" } }, (response) => {
      firstByteMs = performance.now() - started;
      let bytes = 0;
      // Drain HTML/JSON without saving application data, cookies or credentials.
      response.on("data", (chunk) => { bytes += chunk.length; });
      response.on("error", reject);
      response.on("end", () => {
        let redirect = null;
        if (response.headers.location) {
          const target = new URL(response.headers.location, url);
          redirect = `${target.origin}${target.pathname}`;
        }
        resolve({ status: response.statusCode, firstByteMs: Math.round(firstByteMs),
          totalMs: Math.round(performance.now() - started), bytes, redirect,
          reusedConnection: request.reusedSocket,
          vercelId: response.headers["x-vercel-id"] ?? null,
          functionRegion: response.headers["x-app-region"] ?? null,
          serverTiming: response.headers["server-timing"] ?? null,
          cache: response.headers["x-vercel-cache"] ?? null });
      });
    });
    request.setTimeout(20000, () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
  });
}

const report = { origin: base.origin, measuredAt: new Date().toISOString(),
  scope: "Unauthenticated HTTP responses; excludes browser rendering and authenticated data pages", routes: [] };
try {
  for (const path of paths) {
    const samples = [];
    for (let attempt = 0; attempt < 5; attempt++) samples.push(await sample(path));
    const successful = samples.filter((result) => result.status === 200 && !result.redirect);
    const sorted = successful.map((result) => result.firstByteMs).sort((a, b) => a - b);
    const result = { path, samples, medianFirstByteMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      slowestFirstByteMs: sorted.length ? sorted.at(-1) : null,
      successfulResponses: successful.length };
    report.routes.push(result);
    console.log(JSON.stringify(result));
  }
  await mkdir("outputs", { recursive: true });
  const output = `outputs/deployment-performance-${Date.now()}.json`;
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(`Report: ${output}`);
} finally {
  agent.destroy();
}
