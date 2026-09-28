// Theory logic

import { parse } from 'yaml'

export interface Theory {
  slug: string            // from the file name: realismo.md -> "realismo"
  title: string
  subjects: string[]
  authors: string[]
  period: string
  summary: string
  key_concepts: string[]
  related: string[]
  references: string[]
  body: string            // the Markdown text after the frontmatter
}

// Subject codes used in the files -> labels shown on the page
export const SUBJECTS: Record<string, string> = {
  politica: 'Teoria política',
  economica: 'Teoria econômica',
  seguranca: 'Segurança',
  filosofica: 'Filosófica',
  sociologica: 'Sociológica',
}

// Split "---\n<yaml>\n---\n<markdown>" into data + body
export function parseTheory(path: string, raw: string): Theory {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) throw new Error(`Missing frontmatter in ${path}`)
  const data = (parse(match[1]) ?? {}) as Partial<Theory>
  const slug = path.split('/').pop()!.replace(/\.md$/, '')

  return {
    slug,
    title: data.title ?? slug,
    subjects: data.subjects ?? [],
    authors: data.authors ?? [],
    period: data.period ?? '',
    summary: data.summary ?? '',
    key_concepts: data.key_concepts ?? [],
    related: data.related ?? [],
    references: data.references ?? [],
    body: match[2].trim(),
  }
}

// Keep theories that match the subject (if any) and whose text contains the search words (if any)
export function filterTheories(list: Theory[], subject: string | null, query: string): Theory[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return list.filter((t) => {
    if (subject && !t.subjects.includes(subject)) return false
    const text = [t.title, t.summary, ...t.authors, ...t.key_concepts].join(' ').toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

// Every .md file in src/content/theories is bundled into the site at build time
const files = import.meta.glob('../content/theories/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const THEORIES: Theory[] = Object.entries(files)
  .map(([path, raw]) => parseTheory(path, raw))
  .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))