import { describe, expect, it } from 'vitest'
import { byPeriod, countBySubject, filterTheories, headingsOf, parseTheory, periodOf, slugify, theoriesFor } from './theories'

const raw = `---
title: Realismo
subjects: [politica, seguranca]
years: [-400, 1948]
authors:
  - { name: Hans Morgenthau, years: 1904–1980 }
  - Tucídides
summary: Poder e anarquia.
key_concepts:
  - anarquia
  - { name: Poder, description: Capacidade de influenciar. }
related: [liberalismo]
---

## Ideia central

Texto.

## Críticas e legado

Mais texto.`

describe('parseTheory', () => {
  const t = parseTheory('../content/theories/realismo.md', raw)
  it('reads the frontmatter and takes the slug from the file name', () => {
    expect(t.title).toBe('Realismo')
    expect(t.slug).toBe('realismo')
    expect(t.subjects).toEqual(['politica', 'seguranca'])
  })
  it('accepts plain names or objects for authors, concepts and related theories', () => {
    expect(t.authors).toEqual([{ name: 'Hans Morgenthau', years: '1904–1980' }, { name: 'Tucídides' }])
    expect(t.key_concepts).toEqual([{ name: 'anarquia' }, { name: 'Poder', description: 'Capacidade de influenciar.' }])
    expect(t.related).toEqual([{ slug: 'liberalismo' }])
  })
  it('builds the years label, including B.C. and open-ended ranges', () => {
    expect(t.yearsLabel).toBe('400 a.C. – 1948')
    expect(parseTheory('a/x.md', raw.replace('[-400, 1948]', '[1979]')).yearsLabel).toBe('1979 –')
  })
  it('lists the headings and fills missing fields', () => {
    expect(t.headings).toEqual([{ id: 'ideia-central', text: 'Ideia central' }, { id: 'criticas-e-legado', text: 'Críticas e legado' }])
    expect(t.references).toEqual([])
  })
})

describe('helpers', () => {
  it('slugify removes accents and spaces', () => {
    expect(slugify('Argumento Central: Ação')).toBe('argumento-central-acao')
  })
  it('headingsOf ignores ### subtitles', () => {
    expect(headingsOf('## A\n### B\n## C')).toEqual([{ id: 'a', text: 'A' }, { id: 'c', text: 'C' }])
  })
})

describe('filters', () => {
  const realismo = parseTheory('a/realismo.md', raw)
  const dependencia = parseTheory('a/dependencia.md', raw
    .replace('Realismo', 'Dependência').replace('politica, seguranca', 'economica, sociologica').replace('[-400, 1948]', '[1949, 1978]'))
  const construtivismo = parseTheory('a/construtivismo.md', raw
    .replace('Realismo', 'Construtivismo').replace('politica, seguranca', 'sociologica').replace('[-400, 1948]', '[1989]'))
  const list = [construtivismo, realismo, dependencia]
  const none = { subjects: [], period: null, query: '' }

  it('puts each theory in the period where it started', () => {
    expect([realismo, dependencia, construtivismo].map(periodOf)).toEqual(['classico', 'guerra-fria', 'guerra-fria'])
  })
  it('keeps theories with ANY of the chosen subjects', () => {
    expect(filterTheories(list, { ...none, subjects: ['seguranca', 'economica'] }).map((t) => t.slug)).toEqual(['realismo', 'dependencia'])
  })
  it('combines subjects, period and search', () => {
    expect(filterTheories(list, { subjects: ['sociologica'], period: 'guerra-fria', query: 'CONSTRU' }).map((t) => t.slug)).toEqual(['construtivismo'])
  })
  it('counts subjects within the current period and search', () => {
    expect(countBySubject(list, { ...none, period: 'guerra-fria' })).toMatchObject({ sociologica: 2, economica: 1, politica: 0 })
  })
  it('sorts by starting year', () => {
    expect([...list].sort(byPeriod).map((t) => t.slug)).toEqual(['realismo', 'dependencia', 'construtivismo'])
  })
})

describe('theoriesFor', () => {
  it('has the same entries in both languages', () => {
    const pt = theoriesFor('pt').map((t) => t.slug).sort()
    const en = theoriesFor('en').map((t) => t.slug).sort()
    expect(en).toEqual(pt)
  })
  it('uses the English file when there is one', () => {
    const realism = theoriesFor('en').find((t) => t.slug === 'realismo')
    expect(realism?.title).toBe('Realism')
    expect(realism?.fallback).toBeUndefined()
  })
})
