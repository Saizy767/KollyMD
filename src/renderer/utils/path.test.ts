import { describe, it, expect } from 'vitest'
import { basename, pathDirname, pathBasename, ensureMdExtension, docName } from './path'

describe('basename', () => {
  it('extracts filename from unix path', () => {
    expect(basename('/vault/notes/foo.md')).toBe('foo.md')
  })

  it('extracts filename from windows path', () => {
    expect(basename('C:\\vault\\foo.md')).toBe('foo.md')
  })

  it('returns the name itself for no directory', () => {
    expect(basename('foo.md')).toBe('foo.md')
  })

  it('handles trailing slash', () => {
    expect(basename('/vault/')).toBe('vault')
  })
})

describe('pathDirname', () => {
  it('returns parent dir for unix path', () => {
    expect(pathDirname('/vault/notes/foo.md')).toBe('/vault/notes')
  })

  it('returns parent dir for windows path', () => {
    expect(pathDirname('C:\\vault\\foo.md')).toBe('C:\\vault')
  })

  it('returns empty string for no directory', () => {
    expect(pathDirname('foo.md')).toBe('')
  })
})

describe('pathBasename', () => {
  it('extracts filename from unix path', () => {
    expect(pathBasename('/vault/foo.md')).toBe('foo.md')
  })

  it('extracts filename from windows path', () => {
    expect(pathBasename('C:\\vault\\foo.md')).toBe('foo.md')
  })

  it('returns the name itself for no directory', () => {
    expect(pathBasename('foo.md')).toBe('foo.md')
  })
})

describe('ensureMdExtension', () => {
  it('appends .md if missing', () => {
    expect(ensureMdExtension('note')).toBe('note.md')
  })

  it('does not append if .md already present', () => {
    expect(ensureMdExtension('note.md')).toBe('note.md')
  })

  it('does not append if .MD already present (case-insensitive)', () => {
    expect(ensureMdExtension('note.MD')).toBe('note.MD')
  })
})

describe('docName', () => {
  it('returns filename from path', () => {
    expect(docName('/vault/foo.md')).toBe('foo.md')
  })

  it('returns untitled for null', () => {
    expect(docName(null)).toBe('untitled')
  })

  it('returns untitled for undefined path', () => {
    expect(docName(null)).toBe('untitled')
  })

  it('handles bare filename', () => {
    expect(docName('foo.md')).toBe('foo.md')
  })
})
