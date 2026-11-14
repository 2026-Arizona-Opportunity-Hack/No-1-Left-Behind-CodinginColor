// Runs Python in the browser (Pyodide in a Web Worker, see public/python-worker.js).
// No student code ever reaches our server. A run that takes longer than the time
// limit gets its worker killed, so an endless loop can't freeze a Chromebook.

export type PythonError = {
  type: string; // e.g. "NameError"
  summary: string; // last line of the traceback, e.g. "NameError: name 'x' is not defined"
  traceback: string;
  line: number | null; // line in the student's code, when Python reports one
};

export type RunResult = {
  output: string;
  truncated: boolean;
  error: PythonError | null;
  checkError: PythonError | null;
  timedOut: boolean;
  durationMs: number;
};

// One hidden test for a code exercise. Authored by CIC staff (stored in activities.content.tests).
export type CodeCheck = {
  label: string; // what students see, e.g. "Stops at 5"
  stdin?: string; // lines typed into input(), one per line
  expectedOutput?: string; // exact printed output (trailing spaces ignored)
  assert?: string; // Python run after the student's code; can read __output__
  hint?: string; // shown when this check fails
};

export type CheckResult = { label: string; passed: boolean; message?: string };

export type CheckSummary = {
  passed: number;
  total: number;
  results: CheckResult[];
  run: RunResult | null; // the first failing run (or the last run), for showing output
};

export const DEFAULT_TIMEOUT_MS = 5000;
const WORKER_URL = "/python-worker.js";

export class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private nextId = 1;

  constructor(private timeoutMs = DEFAULT_TIMEOUT_MS) {}

  /** Start loading Python early (takes a few seconds the first time). */
  warmUp(): Promise<void> {
    return this.ensureWorker();
  }

  /** Runs one program. Runs are queued, so they never overlap. */
  run(code: string, stdin = "", assertCode?: string): Promise<RunResult> {
    const job = this.queue.then(() => this.runNow(code, stdin, assertCode));
    this.queue = job.catch(() => undefined);
    return job;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  private ensureWorker(): Promise<void> {
    if (this.worker && this.ready) return this.ready;
    const worker = new Worker(WORKER_URL, { type: "module" });
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      const fail = () => {
        cleanup();
        if (this.worker === worker) this.dispose();
        reject(new Error("Python couldn't load. Check your internet connection and try again."));
      };
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === "ready") {
          cleanup();
          resolve();
        } else if (event.data?.type === "load-error") {
          fail();
        }
      };
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", fail);
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", fail);
    });
    return this.ready;
  }

  private async runNow(code: string, stdin: string, assertCode?: string): Promise<RunResult> {
    await this.ensureWorker(); // loading time doesn't count against the time limit
    const worker = this.worker!;
    const id = this.nextId++;
    const started = performance.now();

    return new Promise<RunResult>((resolve) => {
      const finish = (result: Omit<RunResult, "durationMs">) => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onCrash);
        resolve({ ...result, durationMs: Math.round(performance.now() - started) });
      };
      const timer = setTimeout(() => {
        this.dispose(); // kill the stuck worker; the next run starts a fresh one
        finish({ output: "", truncated: false, error: null, checkError: null, timedOut: true });
      }, this.timeoutMs);
      const onMessage = (event: MessageEvent) => {
        const data = event.data;
        if (data?.type !== "result" || data.id !== id) return;
        finish({
          output: data.output,
          truncated: data.truncated,
          error: data.error,
          checkError: data.checkError,
          timedOut: false,
        });
      };
      const onCrash = () => {
        this.dispose();
        finish({
          output: "",
          truncated: false,
          error: { type: "Error", summary: "Python stopped unexpectedly.", traceback: "", line: null },
          checkError: null,
          timedOut: false,
        });
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onCrash);
      worker.postMessage({ id, code, stdin, assertCode });
    });
  }
}

/** Trailing spaces and blank lines at the end don't count as a wrong answer. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

/** Runs every check against the student's code: "2 of 3 checks passed". */
export async function checkCode(
  runner: PythonRunner,
  code: string,
  checks: CodeCheck[],
): Promise<CheckSummary> {
  const results: CheckResult[] = [];
  let shownRun: RunResult | null = null;

  for (const check of checks) {
    const run = await runner.run(code, check.stdin ?? "", check.assert);
    let passed = !run.timedOut && !run.error && !run.checkError;
    if (passed && check.expectedOutput !== undefined) {
      passed = normalizeOutput(run.output) === normalizeOutput(check.expectedOutput);
    }
    const message = passed ? undefined : (run.error || run.timedOut ? friendlyError(run) : check.hint);
    results.push({ label: check.label, passed, message });
    if (!passed && !shownRun) shownRun = run;

    // A crash or endless loop fails every check the same way; don't make the student wait for each.
    if (run.timedOut || run.error) {
      for (const rest of checks.slice(results.length)) {
        results.push({ label: rest.label, passed: false, message });
      }
      break;
    }
    if (!shownRun && results.length === checks.length) shownRun = run;
  }

  return { passed: results.filter((r) => r.passed).length, total: checks.length, results, run: shownRun };
}

/** Plain-language explanation of what went wrong, for 14–18 year old beginners. */
export function friendlyError(run: Pick<RunResult, "error" | "timedOut">): string {
  if (run.timedOut) {
    return "Your code ran for more than 5 seconds, so we stopped it. Is there a loop that never ends?";
  }
  const err = run.error;
  if (!err) return "";
  const where = err.line ? `line ${err.line}` : "your code";
  switch (err.type) {
    case "SyntaxError":
      return `Python couldn't read ${where}. Check for a missing colon (:), bracket or quote mark.`;
    case "IndentationError":
    case "TabError":
      return `The spacing at the start of ${where} is off. Lines inside a loop or an if need the same indent.`;
    case "NameError":
      return `${capitalize(where)} uses a name Python doesn't know yet. Check the spelling, or create it before you use it.`;
    case "TypeError":
      return `${capitalize(where)} mixes types that don't go together, like adding a number to text. Try str() or int().`;
    case "ValueError":
      return `${capitalize(where)} got a value it can't use, like turning "hello" into a number.`;
    case "ZeroDivisionError":
      return `${capitalize(where)} divides by zero, which isn't allowed.`;
    case "IndexError":
      return `${capitalize(where)} asks for a position that isn't in the list. Lists start counting at 0.`;
    case "EOFError":
      return "Your code asked for input, but there wasn't any. Type it in the Input box first.";
    default:
      return `Something went wrong on ${where}: ${err.summary}`;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
