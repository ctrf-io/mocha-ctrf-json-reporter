import { createRequire } from "node:module";
import type { Runner } from "mocha";
import {
	createTestRuntime,
	setGlobalTestRuntime,
	type RuntimeMessage,
} from "./runtime";
import { CTRF_MOCHA_MESSAGES_KEY } from "./worker-messages";

const require = createRequire(import.meta.url);
// Mocha 12 renamed this CommonJS module; older parallel-capable versions use .js.
let bufferedReporterPath: string;
try {
	bufferedReporterPath = require.resolve(
		"mocha/lib/nodejs/reporters/parallel-buffered.cjs",
	);
} catch {
	bufferedReporterPath = require.resolve(
		"mocha/lib/nodejs/reporters/parallel-buffered.js",
	);
}

interface Runnable {
	type?: string;
	serialize?: () => Record<string, unknown>;
}
type Listener = (runnable?: Runnable, error?: Error) => void;
const BufferedReporter = require(bufferedReporterPath) as new (
	runner: Runner,
	options: Mocha.MochaOptions,
) => {
	listeners: Map<string, Listener>;
	createListener(eventName: string): Listener;
};

/** Preserve Mocha's buffered events and attach metadata only to completed attempts. */
export default class WorkerReporter extends BufferedReporter {
	private testActive = false;
	private retryPending = false;
	private messages: RuntimeMessage[] = [];

	constructor(runner: Runner, options: Mocha.MochaOptions) {
		super(runner, options);
		setGlobalTestRuntime(
			createTestRuntime((message) => {
				if (this.testActive) this.messages.push(message);
			}),
		);
	}

	createListener(eventName: string): Listener {
		const buffer = super.createListener(eventName);
		const listener: Listener = (runnable, error) => {
			if (eventName === "test") {
				this.testActive = true;
				if (!this.retryPending) this.messages = [];
				this.retryPending = false;
			}
			// Like serial mode, retain queued metadata through retries and their hooks.
			if (eventName === "retry") this.retryPending = true;
			if (["pass", "fail", "pending"].includes(eventName)) {
				this.testActive = false;
				this.retryPending = false;
				if (runnable?.type === "test") {
					// Snapshot now: another test may mutate objects supplied to extra().
					const encoded = this.messages.length
						? JSON.stringify(this.messages)
						: undefined;
					this.messages = [];
					// Wrap this event's value, without patching Test or its prototype.
					buffer(
						{
							serialize: () => ({
								...runnable.serialize?.(),
								// Keep user keys opaque to Mocha's object/function deserializer.
								...(encoded !== undefined
									? { [CTRF_MOCHA_MESSAGES_KEY]: encoded }
									: {}),
							}),
						},
						error,
					);
					return;
				}
				this.messages = [];
			}
			buffer(runnable, error);
		};
		this.listeners.set(eventName, listener);
		return listener;
	}
}
