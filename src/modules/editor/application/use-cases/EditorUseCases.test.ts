import { describe, it, expect, beforeEach } from 'vitest'
import { NewDocument } from './NewDocument'
import { OpenDocument } from './OpenDocument'
import { SaveDocument } from './SaveDocument'
import { CloseDocument } from './CloseDocument'
import { SwitchDocument } from './SwitchDocument'
import { MarkDirty } from './MarkDirty'
import { Document } from '@editor/domain/entities/Document'
import { NoDocumentOpenError, DocumentHasNoPathError, TabNotFoundError } from '@editor/domain/errors/EditorErrors'
import type { DocumentRepository } from '@editor/domain/interfaces/DocumentRepository'
import type { NoteRepository } from '@vault'

class FakeDocRepo implements DocumentRepository {
  docs: Document[] = []
  activeId: string | null = null
  openDocument(doc: Document): void { this.docs.push(doc); this.activeId = doc.id }
  getOpenDocuments(): Document[] { return this.docs }
  getActiveDocument(): Document | null {
    return this.docs.find(d => d.id === this.activeId) ?? null
  }
  closeDocument(id: string): void {
    this.docs = this.docs.filter(d => d.id !== id)
    if (this.activeId === id) {
      this.activeId = this.docs[0]?.id ?? null
    }
  }
  setActive(id: string): void { this.activeId = id }
  markDirty(id: string, dirty: boolean): void {
    const doc = this.docs.find(d => d.id === id)
    if (doc) this.docs = this.docs.map(d => d.id === id ? new Document(d.id, d.path, dirty) : d)
  }
  setPath(id: string, path: string): void {
    const doc = this.docs.find(d => d.id === id)
    if (doc) this.docs = this.docs.map(d => d.id === id ? new Document(d.id, path, d.dirty) : d)
  }
  reorder(_ids: string[]): void {}
}

class FakeNoteRepo implements NoteRepository {
  noteContent = 'content'
  written: { path: string; content: string } | null = null
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return this.noteContent }
  writeNote(path: string, content: string) { this.written = { path, content } }
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('editor use cases', () => {
  let docRepo: FakeDocRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    docRepo = new FakeDocRepo()
    noteRepo = new FakeNoteRepo()
  })

  describe('NewDocument', () => {
    it('creates a new document with null path', () => {
      const dto = new NewDocument(docRepo).execute()
      expect(dto.docId).toBeTruthy()
      const doc = docRepo.getActiveDocument()
      expect(doc).not.toBeNull()
      expect(doc!.path).toBeNull()
      expect(doc!.dirty).toBe(false)
    })
  })

  describe('OpenDocument', () => {
    it('opens new document and returns content', () => {
      noteRepo.noteContent = 'hello'
      const dto = new OpenDocument(docRepo, noteRepo).execute('/vault/n.md')
      expect(dto.path).toBe('/vault/n.md')
      expect(dto.content).toBe('hello')
      expect(dto.alreadyOpen).toBe(false)
    })

    it('returns alreadyOpen=true for existing document', () => {
      noteRepo.noteContent = 'hello'
      const uc = new OpenDocument(docRepo, noteRepo)
      uc.execute('/vault/n.md')
      noteRepo.noteContent = 'updated'
      const dto = uc.execute('/vault/n.md')
      expect(dto.alreadyOpen).toBe(true)
      expect(dto.content).toBe('updated')
    })
  })

  describe('SaveDocument', () => {
    it('throws NoDocumentOpenError when no active document', () => {
      expect(() => new SaveDocument(docRepo, noteRepo).execute('content')).toThrow(NoDocumentOpenError)
    })

    it('throws DocumentHasNoPathError for untitled document', () => {
      new NewDocument(docRepo).execute()
      expect(() => new SaveDocument(docRepo, noteRepo).execute('content')).toThrow(DocumentHasNoPathError)
    })

    it('writes content and clears dirty flag', () => {
      new OpenDocument(docRepo, noteRepo).execute('/vault/n.md')
      docRepo.markDirty(docRepo.activeId!, true)
      new SaveDocument(docRepo, noteRepo).execute('saved content')
      expect(noteRepo.written).toEqual({ path: '/vault/n.md', content: 'saved content' })
      expect(docRepo.getActiveDocument()!.dirty).toBe(false)
    })
  })

  describe('CloseDocument', () => {
    it('throws TabNotFoundError for unknown id', () => {
      expect(() => new CloseDocument(docRepo).execute('unknown')).toThrow(TabNotFoundError)
    })

    it('closes document and returns new active id', () => {
      const id1 = new NewDocument(docRepo).execute().docId
      const id2 = new NewDocument(docRepo).execute().docId
      docRepo.setActive(id1)
      const dto = new CloseDocument(docRepo).execute(id1)
      expect(dto.newActiveId).toBe(id2)
    })

    it('returns null newActiveId when closing last document', () => {
      const id = new NewDocument(docRepo).execute().docId
      const dto = new CloseDocument(docRepo).execute(id)
      expect(dto.newActiveId).toBeNull()
    })
  })

  describe('SwitchDocument', () => {
    it('throws TabNotFoundError for unknown id', () => {
      expect(() => new SwitchDocument(docRepo).execute('unknown')).toThrow(TabNotFoundError)
    })

    it('sets active document', () => {
      const id1 = new NewDocument(docRepo).execute().docId
      const id2 = new NewDocument(docRepo).execute().docId
      new SwitchDocument(docRepo).execute(id1)
      expect(docRepo.activeId).toBe(id1)
      new SwitchDocument(docRepo).execute(id2)
      expect(docRepo.activeId).toBe(id2)
    })
  })

  describe('MarkDirty', () => {
    it('marks document as dirty', () => {
      const id = new NewDocument(docRepo).execute().docId
      new MarkDirty(docRepo).execute(id, true)
      expect(docRepo.getActiveDocument()!.dirty).toBe(true)
    })

    it('marks document as clean', () => {
      const id = new NewDocument(docRepo).execute().docId
      new MarkDirty(docRepo).execute(id, true)
      new MarkDirty(docRepo).execute(id, false)
      expect(docRepo.getActiveDocument()!.dirty).toBe(false)
    })
  })
})
