/* Runs student Python with Pyodide, off the main thread.
 * The page kills this worker if a run takes too long (see src/lib/python/runner.ts),
 * so an infinite loop can never freeze the browser.
 * Messages in:  { id, code, stdin, assertCode }
 * Messages out: { type: "ready" } | { type: "load-error", message }
 *               | { type: "result", id, output, truncated, error, checkError }
 */
// Loaded as a module worker: Pyodide 314 can't be loaded with importScripts().
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

const INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const MAX_OUTPUT_CHARS = 20000;

const pyodideReady = loadPyodide({ indexURL: INDEX_URL }).then(
  (pyodide) => {
    self.postMessage({ type: "ready" });
    return pyodide;
  },
  (err) => {
    self.postMessage({ type: "load-error", message: String(err) });
    throw err;
  },
);

// Turns a Pyodide PythonError into { type, summary, traceback, line } about the student's file.
function toError(err, filename) {
  const message = String((err && err.message) || err).trim();
  const lines = message.split("\n");
  const start = lines.findIndex((l) => l.includes(`File "${filename}"`));
  const traceback =
    start >= 0
      ? ["Traceback (most recent call last):", ...lines.slice(start)].join("\n")
      : message;
  const lineNumbers = [...message.matchAll(new RegExp(`File "${filename}", line (\\d+)`, "g"))];
  const summary = lines[lines.length - 1];
  const type =
    (err && err.type) || (summary.match(/^(\w+)(:|$)/) || [])[1] || "Error";
  return {
    type,
    summary,
    traceback,
    line: lineNumbers.length ? Number(lineNumbers[lineNumbers.length - 1][1]) : null,
  };
}

self.onmessage = async (event) => {
  const { id, code, stdin = "", assertCode } = event.data;
  const pyodide = await pyodideReady;

  let output = "";
  let truncated = false;
  const decoder = new TextDecoder();
  const writer = {
    write(buffer) {
      if (output.length < MAX_OUTPUT_CHARS) {
        output += decoder.decode(buffer, { stream: true });
      } else {
        truncated = true;
      }
      return buffer.length;
    },
  };
  pyodide.setStdout(writer);
  pyodide.setStderr(writer);

  // input() reads one line per call from the Input box; running out raises EOFError.
  const inputLines = stdin === "" ? [] : stdin.replace(/\r\n/g, "\n").split("\n");
  let next = 0;
  pyodide.setStdin({
    stdin: () => (next < inputLines.length ? inputLines[next++] + "\n" : null),
  });

  // Fresh variables for every run, so one run can't leak into the next.
  const globals = pyodide.globals.get("dict")();
  let error = null;
  let checkError = null;
  try {
    await pyodide.runPythonAsync(code, { globals, filename: "main.py" });
  } catch (err) {
    error = toError(err, "main.py");
  }

  if (!error && assertCode) {
    // Check code can read what the student's program printed as __output__.
    globals.set("__output__", output);
    try {
      await pyodide.runPythonAsync(assertCode, { globals, filename: "check.py" });
    } catch (err) {
      checkError = toError(err, "check.py");
    }
  }
  globals.destroy();

  if (output.length > MAX_OUTPUT_CHARS) output = output.slice(0, MAX_OUTPUT_CHARS);
  self.postMessage({ type: "result", id, output, truncated, error, checkError });
};
