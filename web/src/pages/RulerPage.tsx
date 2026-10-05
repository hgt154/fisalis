import { Children, isValidElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router'
import HistoryTimeline from '../components/history/HistoryTimeline'
import TermConflicts from '../components/history/TermConflicts'
import TermNumbers from '../components/history/TermNumbers'
import { useDurationLabel } from '../components/history/useDurationLabel'
import { useLang } from '../i18n/context'
import { useJson } from '../lib/data'
import { formatDate } from '../lib/format'
import { historyOf, regimeColor, termYears, yearsLabel, yearsTouched } from '../lib/history'
import { countryName } from '../lib/names'
import { slugify } from '../lib/theories'
import type { Country, Series } from '../lib/types'
import './TheoryPage.css'
import './HistoryPage.css'

// The plain text inside a heading, even when part of it is bold or italic
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child)
      : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : ''))
    .join('')
}

// One government: facts, the four-part text, the numbers of the term and its conflicts
export default function RulerPage() {
  const { iso3 = '', slug } = useParams()
  const { t, lang } = useLang()
  const r = t.ruler
  const h = t.history
  const durationLabel = useDurationLabel()
  const countries = useJson<Country[]>('countries.json')
  const series = useJson<Series>(`series/${iso3}.json`)

  const history = historyOf(iso3, lang)
  const index = history?.rulers.findIndex((x) => x.slug === slug) ?? -1
  const ruler = index >= 0 ? history!.rulers[index] : null

  if (!history || !ruler) return <p>{r.notFound} <Link to="/historia">{r.seeAll}</Link></p>

  const nameOf = (code: string) => {
    const c = countries.data?.find((x) => x.iso3 === code)
    return c ? countryName(c, lang) : code
  }
  const previous = history.rulers[index - 1]
  const next = history.rulers[index + 1]
  const article = ruler.article
  const otherLanguage = article && article.lang !== lang ? (lang === 'pt' ? r.englishOnly : r.portugueseOnly) : ''
  const countryLink = `/historia${iso3 === 'BRA' ? '' : `?pais=${iso3}`}`

  return (
    <article className="theory ruler">
      <nav className="breadcrumb" aria-label={t.common.youAreHere}>
        <Link to="/historia">{r.breadcrumb}</Link> / <Link to={countryLink}>{nameOf(iso3)}</Link>
      </nav>

      {otherLanguage && <p className="note theory-fallback">{otherLanguage}</p>}

      {/* ---------- Head ---------- */}
      <header className="theory-head">
        <div>
          <p className="kicker ruler-kicker">
            <i style={{ background: regimeColor(ruler.regime) }} aria-hidden="true" />
            {nameOf(iso3)} · {yearsLabel(ruler)}
          </p>
          <h1>{ruler.name}</h1>
          <p className="theory-lead">{article?.summary ?? ruler.note}</p>
        </div>
        <dl className="theory-facts">
          <div><dt>{r.term}</dt><dd>{formatDate(ruler.start)} – {ruler.end ? formatDate(ruler.end) : h.inOffice}</dd></div>
          <div><dt>{r.duration}</dt><dd>{durationLabel(ruler)}</dd></div>
          {ruler.party && <div><dt>{r.party}</dt><dd>{ruler.party}</dd></div>}
          <div><dt>{r.access}</dt><dd>{h.access[ruler.access]}</dd></div>
          <div><dt>{r.regime}</dt><dd>{h.regimes[ruler.regime]}</dd></div>
          {article && <div><dt>{r.reading}</dt><dd>{t.theory.minutes(article.minutes)}</dd></div>}
        </dl>
      </header>

      <div className="ruler-timeline">
        <HistoryTimeline rulers={history.rulers} eras={history.eras} current={ruler.slug} />
      </div>

      <div className="theory-layout">
        {/* ---------- Contents ---------- */}
        <nav className="theory-toc" aria-label={r.contents}>
          <p className="kicker">{r.contents}</p>
          <ol>
            {article?.headings.map((x) => <li key={x.id}><a href={`#${x.id}`}>{x.text}</a></li>)}
            <li><a href="#numeros">{r.numbers}</a></li>
            <li><a href="#conflitos">{r.conflicts}</a></li>
            {article && article.references.length > 0 && <li><a href="#referencias">{r.references}</a></li>}
          </ol>
        </nav>

        {/* ---------- Text, numbers, conflicts ---------- */}
        <div className="theory-main">
          {article ? (
            <div className="theory-body" lang={article.lang === 'pt' ? 'pt-BR' : 'en'}>
              <Markdown components={{ h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2> }}>
                {article.body}
              </Markdown>
            </div>
          ) : (
            <p className="note">{r.textSoon}</p>
          )}

          <section id="numeros" className="ruler-section">
            <h2>{r.numbers}</h2>
            {series.loading ? <p className="muted">{t.common.loading}</p>
              : <TermNumbers series={series.data} years={termYears(ruler)} />}
          </section>

          <section id="conflitos" className="ruler-section">
            <h2>{r.conflicts}</h2>
            <TermConflicts iso3={iso3} years={yearsTouched(ruler)} nameOf={nameOf} />
          </section>

          {article && article.references.length > 0 && (
            <section id="referencias" className="theory-refs">
              <h2>{r.references}</h2>
              <ul>{article.references.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          )}

          <nav className="ruler-pager" aria-label={`${r.previous} / ${r.next}`}>
            {previous ? (
              <Link to={`/historia/${iso3}/${previous.slug}`} className="card">
                <span className="kicker">← {r.previous}</span>
                <strong>{previous.name}</strong>
                <span className="muted">{yearsLabel(previous)}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={`/historia/${iso3}/${next.slug}`} className="card next">
                <span className="kicker">{r.next} →</span>
                <strong>{next.name}</strong>
                <span className="muted">{yearsLabel(next)}</span>
              </Link>
            )}
          </nav>
        </div>

        {/* ---------- Side: key dates and terms ---------- */}
        <aside className="theory-side">
          {article && article.keyDates.length > 0 && (
            <section>
              <p className="kicker">{r.keyDates}</p>
              <ol className="ruler-dates">
                {article.keyDates.map((d) => (
                  <li key={d.date + d.text}><time dateTime={d.date}>{formatDate(d.date)}</time><span>{d.text}</span></li>
                ))}
              </ol>
            </section>
          )}
          {article && article.keyTerms.length > 0 && (
            <section>
              <p className="kicker">{r.keyTerms}</p>
              <dl className="side-concepts">
                {article.keyTerms.map((k) => (
                  <div key={k.name}><dt>{k.name}</dt>{k.description && <dd>{k.description}</dd>}</div>
                ))}
              </dl>
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}
