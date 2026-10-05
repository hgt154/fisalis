import { useLang } from '../../i18n/context'
import { duration, type Ruler } from '../../lib/history'

// "4,5 anos", "3 meses", "3 dias" — how long a government lasted, in the reader's language
export function useDurationLabel() {
  const { t } = useLang()
  return (r: Pick<Ruler, 'start' | 'end'>) => {
    const d = duration(r)
    return t.history[d.unit](d.n)
  }
}
