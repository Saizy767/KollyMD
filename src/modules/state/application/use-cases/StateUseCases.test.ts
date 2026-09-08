import { describe, it, expect, beforeEach } from 'vitest'
import { GetLastVault } from './GetLastVault'
import { SetLastVault } from './SetLastVault'
import { GetOpenTabs } from './GetOpenTabs'
import { SetOpenTabs } from './SetOpenTabs'
import { GetActiveTabPath } from './GetActiveTabPath'
import { SetActiveTabPath } from './SetActiveTabPath'
import { GetExpandedFolders } from './GetExpandedFolders'
import { SetExpandedFolders } from './SetExpandedFolders'
import { GetSidebarWidth } from './GetSidebarWidth'
import { SetSidebarWidth } from './SetSidebarWidth'
import { WorkspaceState } from '../../domain/entities/WorkspaceState'
import type { StateRepository } from '../../domain/interfaces/StateRepository'

class FakeStateRepo implements StateRepository {
  state = new WorkspaceState()
  load(): WorkspaceState { return this.state }
  save(state: WorkspaceState): void { this.state = state }
}

describe('state use cases', () => {
  let repo: FakeStateRepo

  beforeEach(() => {
    repo = new FakeStateRepo()
  })

  describe('GetLastVault / SetLastVault', () => {
    it('returns null by default', () => {
      expect(new GetLastVault(repo).execute()).toBeNull()
    })

    it('sets and gets vault path', () => {
      new SetLastVault(repo).execute('/vault')
      expect(new GetLastVault(repo).execute()).toBe('/vault')
    })
  })

  describe('GetOpenTabs / SetOpenTabs', () => {
    it('returns empty array by default', () => {
      expect(new GetOpenTabs(repo).execute()).toEqual([])
    })

    it('sets and gets open tabs', () => {
      new SetOpenTabs(repo).execute(['/a.md', '/b.md'])
      expect(new GetOpenTabs(repo).execute()).toEqual(['/a.md', '/b.md'])
    })
  })

  describe('GetActiveTabPath / SetActiveTabPath', () => {
    it('returns null by default', () => {
      expect(new GetActiveTabPath(repo).execute()).toBeNull()
    })

    it('sets and gets active tab path', () => {
      new SetActiveTabPath(repo).execute('/vault/n.md')
      expect(new GetActiveTabPath(repo).execute()).toBe('/vault/n.md')
    })

    it('can set to null', () => {
      new SetActiveTabPath(repo).execute('/vault/n.md')
      new SetActiveTabPath(repo).execute(null)
      expect(new GetActiveTabPath(repo).execute()).toBeNull()
    })
  })

  describe('GetExpandedFolders / SetExpandedFolders', () => {
    it('returns empty array by default', () => {
      expect(new GetExpandedFolders(repo).execute()).toEqual([])
    })

    it('sets and gets expanded folders', () => {
      new SetExpandedFolders(repo).execute(['/vault/a', '/vault/b'])
      expect(new GetExpandedFolders(repo).execute()).toEqual(['/vault/a', '/vault/b'])
    })
  })

  describe('GetSidebarWidth / SetSidebarWidth', () => {
    it('returns null by default', () => {
      expect(new GetSidebarWidth(repo).execute()).toBeNull()
    })

    it('sets and gets sidebar width', () => {
      new SetSidebarWidth(repo).execute(350)
      expect(new GetSidebarWidth(repo).execute()).toBe(350)
    })
  })
})
