import { Link, useSearchParams } from 'react-router'
import { SUBJECTS, THEORIES, filterTheories } from '../lib/theories'

export default function TheoriesPage() {
  const [params, setParams] = useSearchParams()
  const subject = params.get('materia')   // ?materia=seguranca
  const query = params.get('q') ?? ''     // ?q=anarquia

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = filterTheories(THEORIES, subject, query)

  return (
    <>
      <h1>Teorias</h1>
      <p>Teorias políticas, econômicas, de segurança, filosóficas e sociológicas relevantes para as Relações Internacionais.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', margin: 'var(--space-md) 0' }}>
        <label>
          Matéria{' '}
          <select value={subject ?? ''} onChange={(e) => setParam('materia', e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(SUBJECTS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        <label>
          Buscar{' '}
          <input type="search" value={query} placeholder="Título, autor, conceito…" onChange={(e) => setParam('q', e.target.value)} />
        </label>
      </div>

      <p style={{ color: 'var(--color-text-muted)' }}>{results.length} de {THEORIES.length} teorias</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
        {results.map((t) => (
          <article key={t.slug} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-md)' }}>
            <h2 style={{ marginTop: 0 }}><Link to={`/teorias/${t.slug}`}>{t.title}</Link></h2>
            <p style={{ color: 'var(--color-text-muted)' }}>{t.subjects.map((s) => SUBJECTS[s] ?? s).join(' · ')}{t.period && ` · ${t.period}`}</p>
            <p>{t.summary}</p>
            {t.authors.length > 0 && <p style={{ fontSize: '0.9em' }}>Autores: {t.authors.join(', ')}</p>}
          </article>
        ))}
      </div>
      {results.length === 0 && <p>Nenhuma teoria encontrada. Tente outra matéria ou outra busca.</p>}
    </>
  )
}