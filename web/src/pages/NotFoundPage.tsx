import { Link } from 'react-router'
import { useLang } from '../i18n/context'

export default function NotFoundPage() {
  const { t } = useLang()
  return (
    <>
      <h1>{t.notFound.title}</h1>
      <p><Link to="/">{t.notFound.back}</Link></p>
    </>
  )
}
