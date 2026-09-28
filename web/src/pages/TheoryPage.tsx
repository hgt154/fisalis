import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router'
import { SUBJECTS, THEORIES } from '../lib/theories'

export default function TheoryPage() {
  const { slug } = useParams()
  const theory = THEORIES.find((t) => t.slug === slug)

  if (!theory) return <p>Teoria não encontrada. <Link to="/teorias">Ver todas as teorias</Link></p>

  const related = theory.related.map((s) => THEORIES.find((t) => t.slug === s)).filter((t) => t !== undefined)

  return (
    <article style={{ maxWidth: 720 }}>
      <p><Link to="/teorias">← Todas as teorias</Link></p>
      <h1>{theory.title}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {theory.subjects.map((s) => SUBJECTS[s] ?? s).join(' · ')}{theory.period && ` · ${theory.period}`}
      </p>
      <p style={{ fontSize: '1.15em' }}>{theory.summary}</p>

      {theory.authors.length > 0 && <p><strong>Principais autores:</strong> {theory.authors.join(', ')}</p>}
      {theory.key_concepts.length > 0 && <p><strong>Conceitos-chave:</strong> {theory.key_concepts.join(' · ')}</p>}

      <Markdown>{theory.body}</Markdown>

      {related.length > 0 && (
        <>
          <h2>Teorias relacionadas</h2>
          <ul>{related.map((t) => <li key={t.slug}><Link to={`/teorias/${t.slug}`}>{t.title}</Link></li>)}</ul>
        </>
      )}

      {theory.references.length > 0 && (
        <>
          <h2>Referências</h2>
          <ul>{theory.references.map((r) => <li key={r}>{r}</li>)}</ul>
        </>
      )}
    </article>
  )
}