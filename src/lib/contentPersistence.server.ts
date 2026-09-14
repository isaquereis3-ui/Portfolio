import fs from "node:fs/promises";
import path from "node:path";
import type { ContentOverrides } from "./getContent";

export const OVERRIDES_PATH = path.join(process.cwd(), "src/data/content-overrides.json");
export const UPLOADS_DIR = path.join(process.cwd(), "public/uploads");

function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  if (!match) return "png";

  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function sanitizeFileName(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

export async function readContentOverrides(): Promise<ContentOverrides> {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(raw) as ContentOverrides;
  } catch {
    return {};
  }
}

export async function writeContentOverrides(
  overrides: ContentOverrides,
): Promise<ContentOverrides> {
  const processed: ContentOverrides = { ...overrides };

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

export async function clearContentOverrides(): Promise<void> {
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
