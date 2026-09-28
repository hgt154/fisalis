import { describe, expect, it } from 'vitest'
import { filterTheories, parseTheory } from './theories'

const raw = `---
title: Realismo
subjects: [politica, seguranca]
authors: [Hans Morgenthau]
summary: Poder e anarquia.
key_concepts: [anarquia, poder]
---

## Ideia central

Texto.`

describe('parseTheory', () => {
  const t = parseTheory('../content/theories/realismo.md', raw)
  it('reads the frontmatter', () => {
    expect(t.title).toBe('Realismo')
    expect(t.subjects).toEqual(['politica', 'seguranca'])
  })
  it('takes the slug from the file name', () => {
    expect(t.slug).toBe('realismo')
  })
  it('keeps the Markdown body and fills missing fields', () => {
    expect(t.body.startsWith('## Ideia central')).toBe(true)
    expect(t.references).toEqual([])
  })
})

describe('filterTheories', () => {
  const list = [
    parseTheory('a/realismo.md', raw),
    parseTheory('a/liberalismo.md', raw.replace('Realismo', 'Liberalismo').replace('politica, seguranca', 'economica')),
  ]
  it('filters by subject', () => {
    expect(filterTheories(list, 'seguranca', '').map((t) => t.slug)).toEqual(['realismo'])
  })
  it('searches title, summary, authors and concepts, ignoring case', () => {
    expect(filterTheories(list, null, 'LIBERAL').map((t) => t.slug)).toEqual(['liberalismo'])
    expect(filterTheories(list, null, 'morgenthau anarquia')).toHaveLength(2)
  })
})