import { describe, it, expect } from 'vitest'
import { DomainError } from './DomainError'

class TestError extends DomainError {
  readonly code = 'TEST_ERROR'
  constructor() { super('test message') }
}

describe('DomainError', () => {
  it('sets message from constructor', () => {
    const err = new TestError()
    expect(err.message).toBe('test message')
  })

  it('sets name to constructor name', () => {
    const err = new TestError()
    expect(err.name).toBe('TestError')
  })

  it('is an instance of Error', () => {
    const err = new TestError()
    expect(err).toBeInstanceOf(Error)
  })

  it('is an instance of DomainError', () => {
    const err = new TestError()
    expect(err).toBeInstanceOf(DomainError)
  })

  it('preserves instanceof after rethrow', () => {
    function rethrow(): void {
      throw new TestError()
    }
    try {
      rethrow()
    } catch (e) {
      expect(e).toBeInstanceOf(TestError)
      expect(e).toBeInstanceOf(DomainError)
    }
  })
})
