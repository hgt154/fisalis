import { createContext, useContext } from 'react'
import type { Lang } from '../lib/types'
import type { Messages } from './pt'

export interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages          // all texts of the interface, in the current language
}

export const LangContext = createContext<LangContextValue | null>(null)

// In any component:  const { t, lang } = useLang()   ->   <h1>{t.map.title}</h1>
export function useLang(): LangContextValue {
  const value = useContext(LangContext)
  if (!value) throw new Error('useLang() must be used inside <LanguageProvider>')
  return value
}
