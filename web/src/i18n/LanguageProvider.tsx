import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { setLocale, type Locale } from '../lib/format'
import type { Lang } from '../lib/types'
import { LangContext } from './context'
import { en } from './en'
import { pt } from './pt'

const KEY = 'arco-lang'
const MESSAGES = { pt, en }
const LOCALES: Record<Lang, Locale> = { pt: 'pt-BR', en: 'en' }

// Saved choice, or the browser's language the first time (Portuguese browsers get PT, everyone else EN)
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'pt' || saved === 'en') return saved
  } catch {
    // storage blocked (private mode): fall through
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang)

  // Number and date formats follow the language. Set during render (not in an effect),
  // so the children below already format with the right locale on this same render.
  setLocale(LOCALES[lang])

  useEffect(() => {
    document.documentElement.lang = LOCALES[lang]   // screen readers and browser translation use this
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      // ignore
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: MESSAGES[lang] }), [lang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}
