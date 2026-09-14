import { describe, it, expect } from 'vitest'
import { ParseNote } from './ParseNote'

describe('ParseNote', () => {
  describe('extractEmbeddedImages', () => {
    it('returns empty for content without embeds', () => {
      const parser = new ParseNote()
      expect(parser.extractEmbeddedImages('no images here')).toEqual([])
    })

    it('parses a single embed', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[photo.png]]')
      expect(images).toEqual(['photo.png'])
    })

    it('parses embed with width modifier', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[photo.png|300]]')
      expect(images).toEqual(['photo.png'])
    })

    it('parses embed with inline modifier', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[photo.png|inline]]')
      expect(images).toEqual(['photo.png'])
    })

    it('parses multiple embeds', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[a.png]] and ![[b.jpg|100]] and ![[c.gif]]')
      expect(images).toEqual(['a.png', 'b.jpg', 'c.gif'])
    })

    it('deduplicates embeds', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[photo.png]] and ![[photo.png|200]]')
      expect(images).toEqual(['photo.png'])
    })

    it('trims and lowercases filenames', () => {
      const parser = new ParseNote()
      const images = parser.extractEmbeddedImages('![[  Photo.PNG  ]]')
      expect(images).toEqual(['photo.png'])
    })

    it('does not match plain wiki-links without !', () => {
      const parser = new ParseNote()
      expect(parser.extractEmbeddedImages('[[Note]]')).toEqual([])
    })

    it('handles empty content', () => {
      const parser = new ParseNote()
      expect(parser.extractEmbeddedImages('')).toEqual([])
    })
  })

  describe('execute', () => {
    it('returns NoteMetadata with embedded images', () => {
      const parser = new ParseNote()
      const meta = parser.execute('![[a.png]] ![[b.jpg|300]]')
      expect(meta.embeddedImages).toEqual(['a.png', 'b.jpg'])
    })

    it('returns empty metadata for content without embeds', () => {
      const parser = new ParseNote()
      const meta = parser.execute('plain text')
      expect(meta.embeddedImages).toEqual([])
    })
  })
})
