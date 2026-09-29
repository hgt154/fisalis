import { Children, isValidElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router'
import { SUBJECTS, THEORIES, slugify } from '../lib/theories'
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
  const theory = THEORIES.find((t) => t.slug === slug)

  if (!theory) return <p>Teoria não encontrada. <Link to="/teorias">Ver todas as teorias</Link></p>

  const related = theory.related
    .map((r) => ({ ...r, theory: THEORIES.find((t) => t.slug === r.slug) }))
    .filter((r) => r.theory !== undefined)
  const mainSubject = theory.subjects[0]

  return (
    <article className="theory">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link to="/teorias">Teorias</Link>
        {mainSubject && <> / <Link to={`/teorias?assunto=${mainSubject}`}>{SUBJECTS[mainSubject] ?? mainSubject}</Link></>}
      </nav>

      {/* ---------- Head: title and lead on the left, facts on the right ---------- */}
      <header className="theory-head">
        <div>
          <ul className="theory-tags">
            {theory.subjects.map((s) => <li key={s}><Link className="tag" to={`/teorias?assunto=${s}`}>{SUBJECTS[s] ?? s}</Link></li>)}
          </ul>
          <h1>{theory.title}</h1>
          <p className="theory-lead">{theory.summary}</p>
        </div>
        <dl className="theory-facts">
          {theory.period && <div><dt>Período</dt><dd>{theory.period}</dd></div>}
          {theory.origin && <div><dt>Origem</dt><dd>{theory.origin}</dd></div>}
          <div><dt>Leitura</dt><dd>{theory.minutes} {theory.minutes === 1 ? 'minuto' : 'minutos'}</dd></div>
        </dl>
      </header>

      <div className="theory-layout">
        {/* ---------- Table of contents, built from the ## headings ---------- */}
        <nav className="theory-toc" aria-label="Sumário">
          <p className="kicker">Sumário</p>
          <ol>
            {theory.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}
            {theory.references.length > 0 && <li><a href="#referencias">Referências</a></li>}
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
              <h2>Referências</h2>
              <ul>{theory.references.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          )}
        </div>

        {/* ---------- Side column: concepts, authors, related theories ---------- */}
        <aside className="theory-side">
          {theory.key_concepts.length > 0 && (
            <section>
              <p className="kicker">Conceitos-chave</p>
              <dl className="side-concepts">
                {theory.key_concepts.map((c) => (
                  <div key={c.name}><dt>{c.name}</dt>{c.description && <dd>{c.description}</dd>}</div>
                ))}
              </dl>
            </section>
          )}

          {theory.authors.length > 0 && (
            <section>
              <p className="kicker">Autores-chave</p>
              <ul className="side-authors">
                {theory.authors.map((a) => (
                  <li key={a.name}><span>{a.name}</span>{a.years && <span className="muted num">{a.years}</span>}</li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <p className="kicker">Teorias relacionadas</p>
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
