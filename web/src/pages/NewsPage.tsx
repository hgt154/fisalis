import { useLang } from '../i18n/context'

export default function NewsPage() {
  const { t } = useLang()
  return (
    <>
      <h1>{t.news.title}</h1>
      <p>{t.news.text}</p>
    </>
  )
}
