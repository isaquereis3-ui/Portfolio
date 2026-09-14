import { useEffect, useState } from "react";
import {
  applyContentOverrides,
  clearPersistedContent,
  collectEditableContent,
  getContentOverrides,
  loadContentOverrides,
  persistContentOverrides,
  setCachedContentOverrides,
  setEditMode,
} from "@/lib/contentStore";

export default function EditModeButton() {
  const [isEditing, setIsEditing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);

  useEffect(() => {
    loadContentOverrides().then((overrides) => {
      setHasOverrides(Object.keys(overrides).length > 0);
    });

    return () => setEditMode(false);
  }, []);

  if (import.meta.env.PROD) {
    return null;
  }

  const enterEditMode = () => {
    setEditMode(true);
    setIsEditing(true);
    setSavedAt(null);
    setError(null);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setIsEditing(false);
    applyContentOverrides(getContentOverrides());
    window.dispatchEvent(new CustomEvent("content-overrides-applied"));
  };

  const saveChanges = async () => {
    setSaving(true);
    setError(null);

    try {
      const overrides = {
        ...getContentOverrides(),
        ...collectEditableContent(),
      };
      const saved = await persistContentOverrides(overrides);

      setCachedContentOverrides(saved);
      setEditMode(false);
      setIsEditing(false);
      setHasOverrides(Object.keys(saved).length > 0);
      setSavedAt(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      window.dispatchEvent(new CustomEvent("content-overrides-applied"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar. Use npm run dev e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = async () => {
    if (
      !window.confirm(
        "Restaurar todos os textos, imagens e links para o padrão original? Suas edições salvas serão removidas do projeto.",
      )
    ) {
      return;
    }

    try {
      await clearPersistedContent();
      window.location.reload();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Erro ao restaurar o conteúdo padrão.",
      );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[10001] flex flex-col items-end gap-3">
      {error && (
        <span className="max-w-xs rounded-xl bg-red-600 px-3 py-2 text-[11px] tracking-tight text-white">
          {error}
        </span>
      )}

      {savedAt && !isEditing && (
        <span className="max-w-xs rounded-full bg-base-900 px-3 py-1.5 text-[11px] tracking-tight text-white dark:bg-white dark:text-base-900">
          Salvo no projeto às {savedAt}
        </span>
      )}

      {isEditing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={cancelEditMode}
            disabled={saving}
            className="rounded-full border border-base-300 bg-white px-5 py-2.5 text-xs tracking-tight text-base-900 transition-colors hover:border-base-400 disabled:opacity-50 dark:border-base-700 dark:bg-base-900 dark:text-white dark:hover:border-base-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-full bg-accent-600 px-5 py-2.5 text-xs tracking-tight text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar no projeto"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {hasOverrides && (
            <button
              type="button"
              onClick={resetChanges}
              className="rounded-full border border-base-300 bg-white px-5 py-2.5 text-xs tracking-tight text-base-600 transition-colors hover:border-base-400 hover:text-base-900 dark:border-base-700 dark:bg-base-950 dark:text-base-300 dark:hover:text-white"
            >
              Restaurar padrão
            </button>
          )}
          <button
            type="button"
            onClick={enterEditMode}
            className="rounded-full bg-base-900 px-5 py-2.5 text-xs tracking-tight text-white transition-colors hover:bg-base-800 dark:bg-white dark:text-base-900 dark:hover:bg-base-100"
          >
            Editar conteúdo
          </button>
        </div>
      )}
    </div>
  );
}
