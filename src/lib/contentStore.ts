export const CONTENT_STORAGE_KEY = "portfolio-content-overrides";

export type ContentOverrides = Record<string, string>;

const IMAGE_KEY_PREFIX = "image.";
export const LINK_KEY_PREFIX = "link.";

let cachedOverrides: ContentOverrides | null = null;

let imageInput: HTMLInputElement | null = null;
let activeImageTarget: HTMLImageElement | null = null;
let imageClickHandler: ((event: MouseEvent) => void) | null = null;
let linkTriggerHandler: ((event: MouseEvent) => void) | null = null;
let linkNavigationHandler: ((event: MouseEvent) => void) | null = null;

function readLegacyLocalStorage(): ContentOverrides {
  try {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContentOverrides) : {};
  } catch {
    return {};
  }
}

export function setCachedContentOverrides(overrides: ContentOverrides) {
  cachedOverrides = overrides;
  window.__CONTENT_OVERRIDES__ = overrides;
}

export function getContentOverrides(): ContentOverrides {
  if (cachedOverrides) return cachedOverrides;

  if (typeof window !== "undefined" && window.__CONTENT_OVERRIDES__) {
    cachedOverrides = window.__CONTENT_OVERRIDES__;
    return cachedOverrides;
  }

  return {};
}

export async function loadContentOverrides(): Promise<ContentOverrides> {
  if (typeof window === "undefined") return {};

  if (window.__CONTENT_OVERRIDES__) {
    setCachedContentOverrides(window.__CONTENT_OVERRIDES__);
    return cachedOverrides!;
  }

  if (import.meta.env.DEV) {
    try {
      const response = await fetch("/api/content");
      if (response.ok) {
        const overrides = (await response.json()) as ContentOverrides;
        setCachedContentOverrides(overrides);
        return overrides;
      }
    } catch {
      // fall through to legacy storage
    }
  }

  const legacy = readLegacyLocalStorage();
  setCachedContentOverrides(legacy);
  return legacy;
}

export async function persistContentOverrides(
  overrides: ContentOverrides,
): Promise<ContentOverrides> {
  const response = await fetch("/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overrides }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Não foi possível salvar as alterações.");
  }

  const data = (await response.json()) as { overrides?: ContentOverrides };
  const saved = data.overrides ?? overrides;

  setCachedContentOverrides(saved);
  window.localStorage.removeItem(CONTENT_STORAGE_KEY);

  return saved;
}

export async function clearPersistedContent(): Promise<void> {
  const response = await fetch("/api/content", { method: "DELETE" });

  if (!response.ok) {
    throw new Error("Não foi possível restaurar o conteúdo padrão.");
  }

  setCachedContentOverrides({});
  window.localStorage.removeItem(CONTENT_STORAGE_KEY);
}

export function saveContentOverrides(overrides: ContentOverrides) {
  setCachedContentOverrides(overrides);
}

export function initEditableImageDefaults() {
  document.querySelectorAll<HTMLImageElement>("[data-editable-image]").forEach((image) => {
    if (!image.dataset.defaultSrc) {
      image.dataset.defaultSrc = image.currentSrc || image.src;
    }
  });
}

export function initEditableLinkDefaults() {
  document.querySelectorAll<HTMLAnchorElement>("[data-editable-link]").forEach((link) => {
    if (!link.dataset.defaultHref) {
      link.dataset.defaultHref = link.getAttribute("href") ?? "";
    }
  });
}

export function getEditablePlainText(element: HTMLElement) {
  const words = element.querySelectorAll<HTMLElement>(".scroll-word");

  if (words.length > 0) {
    return Array.from(words)
      .map((word) => word.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
  }

  return element.innerText.replace(/\s+/g, " ").trim();
}

export function restoreEditablePlainText(element: HTMLElement) {
  const words = element.querySelectorAll<HTMLElement>(".scroll-word");

  if (words.length > 0) {
    element.textContent = getEditablePlainText(element);
    delete element.dataset.scrollSplit;
  }
}

function applyImageOverride(imageKey: string, value: string) {
  document
    .querySelectorAll<HTMLImageElement>(`[data-editable-image="${imageKey}"]`)
    .forEach((image) => {
      image.src = value;
    });
}

function applyLinkOverride(linkKey: string, value: string) {
  document
    .querySelectorAll<HTMLAnchorElement>(`[data-editable-link="${linkKey}"]`)
    .forEach((link) => {
      link.href = value;
    });
}

export function applyContentOverrides(overrides: ContentOverrides = getContentOverrides()) {
  initEditableImageDefaults();
  initEditableLinkDefaults();

  Object.entries(overrides).forEach(([key, value]) => {
    if (key.startsWith(IMAGE_KEY_PREFIX)) {
      applyImageOverride(key.slice(IMAGE_KEY_PREFIX.length), value);
      return;
    }

    if (key.startsWith(LINK_KEY_PREFIX)) {
      applyLinkOverride(key.slice(LINK_KEY_PREFIX.length), value);
      return;
    }

    document.querySelectorAll<HTMLElement>(`[data-editable="${key}"]`).forEach((element) => {
      restoreEditablePlainText(element);
      element.textContent = value;
    });
  });
}

export function collectEditableContent(): ContentOverrides {
  const overrides: ContentOverrides = {};

  document.querySelectorAll<HTMLElement>("[data-editable]").forEach((element) => {
    const key = element.dataset.editable;
    if (!key) return;
    overrides[key] = getEditablePlainText(element);
  });

  document.querySelectorAll<HTMLImageElement>("[data-editable-image]").forEach((image) => {
    const key = image.dataset.editableImage;
    if (!key) return;

    const src = image.currentSrc || image.src;
    const defaultSrc = image.dataset.defaultSrc;

    if (defaultSrc && src === defaultSrc) return;

    overrides[`${IMAGE_KEY_PREFIX}${key}`] = src;
  });

  document.querySelectorAll<HTMLAnchorElement>("[data-editable-link]").forEach((link) => {
    const key = link.dataset.editableLink;
    if (!key) return;

    const href = link.getAttribute("href") ?? "";
    const defaultHref = link.dataset.defaultHref;

    if (defaultHref && href === defaultHref) return;

    overrides[`${LINK_KEY_PREFIX}${key}`] = href;
  });

  return overrides;
}

function ensureImageInput() {
  if (imageInput) return;

  imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/*";
  imageInput.hidden = true;

  imageInput.addEventListener("change", () => {
    const file = imageInput?.files?.[0];
    if (!file || !activeImageTarget) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        activeImageTarget!.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  });

  document.body.appendChild(imageInput);
}

function setupEditableImageInteractions() {
  ensureImageInput();

  imageClickHandler = (event: MouseEvent) => {
    if (!document.body.classList.contains("edit-mode-active")) return;

    const target = (event.target as HTMLElement).closest<HTMLImageElement>(
      "[data-editable-image]",
    );

    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    activeImageTarget = target;
    imageInput!.value = "";
    imageInput!.click();
  };

  document.addEventListener("click", imageClickHandler, true);
}

function teardownEditableImageInteractions() {
  if (imageClickHandler) {
    document.removeEventListener("click", imageClickHandler, true);
    imageClickHandler = null;
  }

  activeImageTarget = null;
}

function setupEditableLinkInteractions() {
  initEditableLinkDefaults();

  linkTriggerHandler = (event: MouseEvent) => {
    if (!document.body.classList.contains("edit-mode-active")) return;

    const trigger = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-edit-link-trigger]",
    );

    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();

    const linkKey = trigger.dataset.editLinkTrigger;
    if (!linkKey) return;

    const link = document.querySelector<HTMLAnchorElement>(
      `[data-editable-link="${linkKey}"]`,
    );

    if (!link) return;

    const label =
      link.querySelector<HTMLElement>("[data-editable]")?.innerText.trim() ||
      linkKey;

    window.dispatchEvent(
      new CustomEvent("edit-link-request", {
        detail: {
          linkKey,
          label,
          currentHref: link.getAttribute("href") ?? "",
          defaultHref: link.dataset.defaultHref ?? "",
        },
      }),
    );
  };

  linkNavigationHandler = (event: MouseEvent) => {
    if (!document.body.classList.contains("edit-mode-active")) return;

    const target = event.target as HTMLElement;

    if (target.closest("[data-edit-link-trigger]")) return;
    if (target.closest("[data-editable]")) return;

    const link = target.closest<HTMLAnchorElement>("[data-editable-link]");
    if (!link) return;

    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener("click", linkTriggerHandler);
  document.addEventListener("click", linkNavigationHandler, true);
}

function teardownEditableLinkInteractions() {
  if (linkTriggerHandler) {
    document.removeEventListener("click", linkTriggerHandler);
    linkTriggerHandler = null;
  }

  if (linkNavigationHandler) {
    document.removeEventListener("click", linkNavigationHandler, true);
    linkNavigationHandler = null;
  }
}

export function resetEditableElements() {
  document.querySelectorAll<HTMLElement>("[data-editable]").forEach((element) => {
    restoreEditablePlainText(element);
    element.contentEditable = "false";
  });
}

export function setEditMode(enabled: boolean) {
  document.body.classList.toggle("edit-mode-active", enabled);

  document.querySelectorAll<HTMLElement>("[data-editable]").forEach((element) => {
    if (enabled) {
      restoreEditablePlainText(element);
      element.contentEditable = "true";
      element.spellcheck = false;
    } else {
      element.contentEditable = "false";
    }
  });

  if (enabled) {
    initEditableImageDefaults();
    initEditableLinkDefaults();
    setupEditableImageInteractions();
    setupEditableLinkInteractions();
  } else {
    teardownEditableImageInteractions();
    teardownEditableLinkInteractions();
  }
}
