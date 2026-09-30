import { Children, isValidElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router'
import { useLang } from '../i18n/context'
import { slugify, subjectLabel, theoriesFor } from '../lib/theories'
import './TheoryPage.css'

// The plain text inside a heading, even when part of it is bold or italic
function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child)
      : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : ''))
    .join('')
}

export default function TheoryPage() {
  const { slug } = useParams()
  const { t, lang } = useLang()
  const tt = t.theory
  const all = theoriesFor(lang)
  const theory = all.find((x) => x.slug === slug)

  if (!theory) return <p>{tt.notFound} <Link to="/teorias">{tt.seeAll}</Link></p>

  const related = theory.related
    .map((r) => ({ ...r, theory: all.find((x) => x.slug === r.slug) }))
    .filter((r) => r.theory !== undefined)
  const mainSubject = theory.subjects[0]

  return (
    <article className="theory">
      <nav className="breadcrumb" aria-label={t.common.youAreHere}>
        <Link to="/teorias">{tt.breadcrumb}</Link>
        {mainSubject && <> / <Link to={`/teorias?assunto=${mainSubject}`}>{subjectLabel(mainSubject, lang)}</Link></>}
      </nav>

      {theory.fallback && tt.fallback && <p className="note theory-fallback">{tt.fallback}</p>}

      {/* ---------- Head: title and lead on the left, facts on the right ---------- */}
      <header className="theory-head">
        <div>
          <ul className="theory-tags">
            {theory.subjects.map((s) => <li key={s}><Link className="tag" to={`/teorias?assunto=${s}`}>{subjectLabel(s, lang)}</Link></li>)}
          </ul>
          <h1>{theory.title}</h1>
          <p className="theory-lead">{theory.summary}</p>
        </div>
        <dl className="theory-facts">
          {theory.period && <div><dt>{tt.period}</dt><dd>{theory.period}</dd></div>}
          {theory.origin && <div><dt>{tt.origin}</dt><dd>{theory.origin}</dd></div>}
          <div><dt>{tt.reading}</dt><dd>{tt.minutes(theory.minutes)}</dd></div>
        </dl>
      </header>

      <div className="theory-layout">
        {/* ---------- Table of contents, built from the ## headings ---------- */}
        <nav className="theory-toc" aria-label={tt.contents}>
          <p className="kicker">{tt.contents}</p>
          <ol>
            {theory.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}
            {theory.references.length > 0 && <li><a href="#referencias">{tt.references}</a></li>}
          </ol>
        </nav>

        {/* ---------- The text ---------- */}
        <div className="theory-main">
          <div className="theory-body">
            <Markdown components={{ h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2> }}>
              {theory.body}
            </Markdown>
          </div>

          {theory.references.length > 0 && (
            <section id="referencias" className="theory-refs">
              <h2>{tt.references}</h2>
              <ul>{theory.references.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          )}
        </div>

        {/* ---------- Side column: concepts, authors, related theories ---------- */}
        <aside className="theory-side">
          {theory.key_concepts.length > 0 && (
            <section>
              <p className="kicker">{tt.concepts}</p>
              <dl className="side-concepts">
                {theory.key_concepts.map((c) => (
                  <div key={c.name}><dt>{c.name}</dt>{c.description && <dd>{c.description}</dd>}</div>
                ))}
              </dl>
            </section>
          )}

          {theory.authors.length > 0 && (
            <section>
              <p className="kicker">{tt.authors}</p>
              <ul className="side-authors">
                {theory.authors.map((a) => (
                  <li key={a.name}><span>{a.name}</span>{a.years && <span className="muted num">{a.years}</span>}</li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <p className="kicker">{tt.related}</p>
              <div className="side-related">
                {related.map((r) => (
                  <Link key={r.slug} to={`/teorias/${r.slug}`} className="card">
                    <strong>{r.theory!.title} →</strong>
                    <span className="muted">{r.note ?? r.theory!.summary}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}
