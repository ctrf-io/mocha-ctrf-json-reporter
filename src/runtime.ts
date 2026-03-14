/**
 * CTRF Runtime API for Mocha
 *
 * The reporter sets a global runtime interface that forwards metadata to the reporter.
 *
 * ## Usage
 *
 * ```ts
 * import { extra } from 'mocha-ctrf-json-reporter/runtime'
 *
 * it('should do something', () => {
 *   extra({ priority: 'high', owner: 'team-a' })
 *   // test code...
 * })
 * ```
 */

export const CTRF_MOCHA_RUNTIME_KEY = '__ctrfMochaRuntime__'

export type MessageProcessor = (message: RuntimeMessage) => void

export interface RuntimeMessage {
  type: 'extra'
  data: Record<string, any>
}

/**
 * MochaTestRuntime interface for type exports
 */
export interface MochaTestRuntime {
  extra(data: Record<string, any>): void
}

/**
 * Internal MochaTestRuntime implementation - forwards extra() calls to the reporter
 */
class MochaTestRuntimeImpl implements MochaTestRuntime {
  private messageProcessor: MessageProcessor

  constructor(messageProcessor: MessageProcessor) {
    this.messageProcessor = messageProcessor
  }

  extra(data: Record<string, any>): void {
    this.messageProcessor({
      type: 'extra',
      data,
    })
  }
}

/**
 * Set the global runtime (called by reporter)
 */
export function setGlobalTestRuntime(runtime: MochaTestRuntime): void {
  ;(globalThis as any)[CTRF_MOCHA_RUNTIME_KEY] = runtime
}

/**
 * Get the global runtime (internal use)
 */
function getGlobalTestRuntime(): MochaTestRuntime | undefined {
  return (globalThis as any)[CTRF_MOCHA_RUNTIME_KEY]
}

/**
 * Create a runtime instance with a message processor
 */
export function createTestRuntime(
  messageProcessor: MessageProcessor
): MochaTestRuntime {
  return new MochaTestRuntimeImpl(messageProcessor)
}

/**
 * Add extra data to the current test's CTRF output.
 * Call this from within test code to attach custom metadata.
 *
 * @example
 * ```ts
 * import { extra } from 'mocha-ctrf-json-reporter/runtime'
 *
 * it('should do something', () => {
 *   extra({ priority: 'high', owner: 'team-a' })
 *   // test code...
 * })
 * ```
 *
 * Multiple calls are deep-merged:
 * - Arrays are concatenated
 * - Nested objects are recursively merged
 * - Primitives are overwritten by later calls
 */
export function extra(data: Record<string, any>): void {
  const runtime = getGlobalTestRuntime()
  if (runtime) {
    runtime.extra(data)
  } else {
    if (process.env.DEBUG) {
      console.warn(
        '[CTRF] Runtime not available - extra() called outside of test context'
      )
    }
  }
}

/** CTRF runtime API namespace */
export const ctrf = { extra } as const
