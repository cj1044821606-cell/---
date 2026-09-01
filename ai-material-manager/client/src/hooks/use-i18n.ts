import { useCallback, useEffect, useState } from "react";

import { dictionary, type DictEntry, type Language } from "@client/src/i18n/dictionary";

const STORAGE_KEY = "app.language";

function readStoredLanguage(): Language | null {
  try {
    const value: string | null = window.localStorage.getItem(STORAGE_KEY);
    if (value === "zh" || value === "en") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

let currentLanguage: Language = readStoredLanguage() ?? "zh";
const listeners: Array<(language: Language) => void> = [];

function setGlobalLanguage(language: Language): void {
  currentLanguage = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // localStorage 不可用时仅内存生效
  }
  listeners.forEach((listener: (language: Language) => void) =>
    listener(language),
  );
}

/** 身份解析完成后按市场默认语言初始化（用户手动切换过的选择优先保留）。 */
export function initLanguageByMarket(defaultLanguage: Language): void {
  if (readStoredLanguage() === null) {
    setGlobalLanguage(defaultLanguage);
  }
}

export interface UseI18nResult {
  language: Language;
  t: (key: string) => string;
  setLanguage: (language: Language) => void;
}

export function useI18n(): UseI18nResult {
  const [language, setLanguageState] = useState<Language>(currentLanguage);

  useEffect(() => {
    const listener: (next: Language) => void = (next: Language) =>
      setLanguageState(next);
    listeners.push(listener);
    return () => {
      const index: number = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const t: (key: string) => string = useCallback(
    (key: string) => {
      const entry: DictEntry | undefined = dictionary[key];
      if (!entry) {
        return key;
      }
      return entry[language];
    },
    [language],
  );

  const setLanguage: (language: Language) => void = useCallback(
    (next: Language) => setGlobalLanguage(next),
    [],
  );

  return { language, t, setLanguage };
}
