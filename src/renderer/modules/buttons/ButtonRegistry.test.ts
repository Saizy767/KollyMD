import { describe, it, expect, vi } from 'vitest'
import { ButtonRegistry } from './ButtonRegistry'
import { ButtonAlreadyRegisteredError, ButtonNotFoundError } from '../../../shared/domain/errors/ButtonError'
import type { ButtonModule } from '../../../shared/domain/buttons/ButtonModule'
import { DomainError } from '../../../shared/domain/errors/DomainError'

function makeModule(id: string, order = 0, hooks?: Partial<Pick<ButtonModule, 'onRegister' | 'onActivate' | 'onDeactivate'>>): ButtonModule {
  return {
    manifest: { id, label: id, order },
    onRegister: hooks?.onRegister,
    onActivate: hooks?.onActivate,
    onDeactivate: hooks?.onDeactivate,
  }
}

describe('ButtonRegistry', () => {
  it('starts empty', () => {
    const r = new ButtonRegistry()
    expect(r.getRegisteredModules()).toEqual([])
    expect(r.getActiveModule()).toBeNull()
  })

  it('register adds module and calls onRegister', () => {
    const onRegister = vi.fn()
    const r = new ButtonRegistry()
    r.register(makeModule('a', 1, { onRegister }))
    expect(r.getRegisteredModules()).toHaveLength(1)
    expect(onRegister).toHaveBeenCalledTimes(1)
  })

  it('register throws ButtonAlreadyRegisteredError on duplicate id', () => {
    const r = new ButtonRegistry()
    r.register(makeModule('a'))
    expect(() => r.register(makeModule('a'))).toThrow(ButtonAlreadyRegisteredError)
    try {
      r.register(makeModule('a'))
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError)
      expect((e as ButtonAlreadyRegisteredError).code).toBe('BUTTON_ALREADY_REGISTERED')
    }
  })

  it('setActive throws ButtonNotFoundError for unknown id', () => {
    const r = new ButtonRegistry()
    expect(() => r.setActive('nope')).toThrow(ButtonNotFoundError)
    try {
      r.setActive('nope')
    } catch (e) {
      expect((e as ButtonNotFoundError).code).toBe('BUTTON_NOT_FOUND')
    }
  })

  it('setActive activates module and calls onActivate', () => {
    const onActivate = vi.fn()
    const r = new ButtonRegistry()
    r.register(makeModule('a', 0, { onActivate }))
    r.setActive('a')
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(r.getActiveModule()?.manifest.id).toBe('a')
  })

  it('setActive with same id is a no-op', () => {
    const onActivate = vi.fn()
    const r = new ButtonRegistry()
    r.register(makeModule('a', 0, { onActivate }))
    r.setActive('a')
    r.setActive('a')
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('setActive deactivates previous module before activating next', () => {
    const onDeactivateA = vi.fn()
    const onActivateB = vi.fn()
    const r = new ButtonRegistry()
    r.register(makeModule('a', 0, { onDeactivate: onDeactivateA }))
    r.register(makeModule('b', 1, { onActivate: onActivateB }))
    r.setActive('a')
    r.setActive('b')
    expect(onDeactivateA).toHaveBeenCalledTimes(1)
    expect(onActivateB).toHaveBeenCalledTimes(1)
    expect(r.getActiveModule()?.manifest.id).toBe('b')
  })

  it('setActive(null) deactivates current and clears active', () => {
    const onDeactivate = vi.fn()
    const r = new ButtonRegistry()
    r.register(makeModule('a', 0, { onDeactivate }))
    r.setActive('a')
    r.setActive(null)
    expect(onDeactivate).toHaveBeenCalledTimes(1)
    expect(r.getActiveModule()).toBeNull()
  })

  it('setActive(null) with no active module is a no-op', () => {
    const r = new ButtonRegistry()
    expect(() => r.setActive(null)).not.toThrow()
    expect(r.getActiveModule()).toBeNull()
  })

  it('getRegisteredModules returns modules sorted by manifest.order', () => {
    const r = new ButtonRegistry()
    r.register(makeModule('c', 3))
    r.register(makeModule('a', 1))
    r.register(makeModule('b', 2))
    const ids = r.getRegisteredModules().map((m) => m.manifest.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})
