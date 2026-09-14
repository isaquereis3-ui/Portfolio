import { useEffect, useRef, useState } from "react";
import {
  getContentOverrides,
  LINK_KEY_PREFIX,
  saveContentOverrides,
} from "@/lib/contentStore";

export type EditLinkDetail = {
  linkKey: string;
  label: string;
  currentHref: string;
  defaultHref: string;
};

function applyLinkHref(linkKey: string, href: string) {
  document
    .querySelectorAll<HTMLAnchorElement>(`[data-editable-link="${linkKey}"]`)
    .forEach((link) => {
      link.href = href;
    });
}

function removeSavedLinkOverride(linkKey: string) {
  const overrides = getContentOverrides();
  delete overrides[`${LINK_KEY_PREFIX}${linkKey}`];
  saveContentOverrides(overrides);
  window.dispatchEvent(new CustomEvent("content-overrides-applied"));
}

export default function EditLinkModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<EditLinkDetail | null>(null);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const { detail } = event as CustomEvent<EditLinkDetail>;
      setDetail(detail);
      setUrl(detail.currentHref);
      setOpen(true);
    };

    window.addEventListener("edit-link-request", handleOpen);
    return () => window.removeEventListener("edit-link-request", handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();
    inputRef.current?.select();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setDetail(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setDetail(null);
  };

  const handleSave = () => {
    if (!detail) return;

    const trimmed = url.trim();
    if (!trimmed) return;

    applyLinkHref(detail.linkKey, trimmed);
    close();
  };

  const handleRestore = () => {
    if (!detail) return;

    applyLinkHref(detail.linkKey, detail.defaultHref);
    removeSavedLinkOverride(detail.linkKey);
    close();
  };

  if (!open || !detail) return null;

  const isDefault = url.trim() === detail.defaultHref;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-base-950/50 backdrop-blur-[2px]"
        aria-label="Fechar modal"
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-link-title"
        className="relative w-full max-w-md rounded-2xl border border-base-200 bg-white p-6 shadow-xl dark:border-base-800 dark:bg-base-900"
      >
        <p
          id="edit-link-title"
          className="text-xs uppercase tracking-tight text-base-500 dark:text-base-400"
        >
          Editar link
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-base-900 dark:text-white">
          {detail.label}
        </h2>

        <label className="mt-5 block">
          <span className="text-xs tracking-tight text-base-600 dark:text-base-300">
            URL
          </span>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSave();
            }}
            placeholder="https://"
            className="mt-2 w-full rounded-xl border border-base-200 bg-base-50 px-4 py-3 text-sm tracking-tight text-base-900 outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:border-base-700 dark:bg-base-950 dark:text-white dark:focus:border-accent-400"
          />
        </label>

        <p className="mt-2 text-[11px] tracking-tight text-base-500 dark:text-base-400">
          Padrão:{" "}
          <span className="break-all text-base-600 dark:text-base-300">
            {detail.defaultHref || "—"}
          </span>
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-base-300 px-5 py-2.5 text-xs tracking-tight text-base-900 transition-colors hover:border-base-400 dark:border-base-700 dark:text-white dark:hover:border-base-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isDefault}
            className="rounded-full border border-base-300 px-5 py-2.5 text-xs tracking-tight text-base-600 transition-colors hover:border-base-400 hover:text-base-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-base-700 dark:text-base-300 dark:hover:text-white"
          >
            Restaurar padrão
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!url.trim()}
            className="rounded-full bg-accent-600 px-5 py-2.5 text-xs tracking-tight text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
