import { describe, it, expect } from 'vitest'
import { ParseWikiLinks } from './ParseWikiLinks'

describe('ParseWikiLinks', () => {
  it('returns empty for content without links', () => {
    const parser = new ParseWikiLinks()
    expect(parser.execute('no links here')).toEqual([])
  })

  it('parses a single link', () => {
    const parser = new ParseWikiLinks()
    const links = parser.execute('see [[Note A]] for details')
    expect(links).toHaveLength(1)
    expect(links[0].target).toBe('Note A')
  })

  it('parses multiple links', () => {
    const parser = new ParseWikiLinks()
    const links = parser.execute('[[A]] and [[B]] and [[C]]')
    expect(links.map(l => l.target)).toEqual(['A', 'B', 'C'])
  })

  it('trims whitespace inside brackets', () => {
    const parser = new ParseWikiLinks()
    const links = parser.execute('[[  spaced  ]]')
    expect(links[0].target).toBe('spaced')
  })

  it('handles empty content', () => {
    const parser = new ParseWikiLinks()
    expect(parser.execute('')).toEqual([])
  })

  it('does not match unclosed brackets', () => {
    const parser = new ParseWikiLinks()
    expect(parser.execute('[[unclosed')).toEqual([])
  })
})
