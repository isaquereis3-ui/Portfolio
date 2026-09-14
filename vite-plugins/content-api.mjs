import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const OVERRIDES_PATH = path.join(rootDir, "src/data/content-overrides.json");
const UPLOADS_DIR = path.join(rootDir, "public/uploads");

function getExtensionFromDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  if (!match) return "png";

  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function sanitizeFileName(key) {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

async function readContentOverrides() {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeContentOverrides(overrides) {
  const processed = { ...overrides };

  for (const [key, value] of Object.entries(processed)) {
    if (!key.startsWith("image.") || !value.startsWith("data:")) continue;

    const imageKey = key.slice("image.".length);
    const ext = getExtensionFromDataUrl(value);
    const filename = `${sanitizeFileName(imageKey)}.${ext}`;

    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const base64 = value.split(",")[1];
    if (!base64) continue;

    await fs.writeFile(
      path.join(UPLOADS_DIR, filename),
      Buffer.from(base64, "base64"),
    );
    processed[key] = `/uploads/${filename}`;
  }

  await fs.mkdir(path.dirname(OVERRIDES_PATH), { recursive: true });
  await fs.writeFile(OVERRIDES_PATH, `${JSON.stringify(processed, null, 2)}\n`);

  return processed;
}

async function clearContentOverrides() {
  await fs.writeFile(OVERRIDES_PATH, "{}\n");

  try {
    const files = await fs.readdir(UPLOADS_DIR);
    await Promise.all(
      files
        .filter((file) => file !== ".gitkeep")
        .map((file) => fs.unlink(path.join(UPLOADS_DIR, file))),
    );
  } catch {
    // uploads dir may not exist yet
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

export function contentApiPlugin() {
  return {
    name: "portfolio-content-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];

        if (pathname !== "/api/content") {
          next();
          return;
        }

        try {
          if (req.method === "GET") {
            const overrides = await readContentOverrides();
            sendJson(res, 200, overrides);
            return;
          }

          if (req.method === "POST") {
            const body = await readRequestBody(req);
            const overrides = body.overrides ?? body;
            const saved = await writeContentOverrides(overrides);
            sendJson(res, 200, { ok: true, overrides: saved });
            return;
          }

          if (req.method === "DELETE") {
            await clearContentOverrides();
            sendJson(res, 200, { ok: true });
            return;
          }

          sendJson(res, 405, { ok: false, error: "Method not allowed" });
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error instanceof Error ? error.message : "Erro ao salvar conteúdo",
          });
        }
      });
    },
  };
}
