export type RosterRow = { name: string; school?: string };
export type RosterCsv = { rows: RosterRow[]; warnings: string[]; errors: { line: number; message: string }[] };
export const MAX_ROSTER_SIZE = 200;
const PRIVACY_WARNING = "We only keep each student's name and school. Other columns were ignored.";

/** CSV scanner tracks physical source lines, including quoted multiline cells. */
export function parseRosterCsv(text: string): RosterCsv {
  const result: RosterCsv = { rows: [], warnings: [], errors: [] };
  const records: { cells: string[]; line: number; invalid: boolean }[] = [];
  let cells: string[] = [], cell = "", quoted = false, closed = false, invalid = false;
  let line = 1, startLine = 1;
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const finish = () => {
    cells.push(cell.trim());
    if (cells.some(Boolean) || invalid) records.push({ cells, line: startLine, invalid });
    cells = []; cell = ""; closed = false; invalid = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else { cell += char; if (char === "\n") line++; }
    } else if (char === "\n") { finish(); line++; startLine = line; }
    else if (char === ",") { cells.push(cell.trim()); cell = ""; closed = false; }
    else if (char === '"') {
      if (!cell.trim() && !closed) { cell = ""; quoted = true; }
      else invalid = true;
    } else if (closed && !/\s/.test(char)) { invalid = true; }
    else { cell += char; }
  }
  if (quoted) {
    result.errors.push({ line: startLine, message: "A quoted value is missing its closing quote." });
  } else finish();
  const header = records.shift();
  if (!header || header.invalid) {
    result.errors.push({ line: header?.line ?? 1, message: "Add a header row with a name column." });
    return result;
  }
  const headings = header.cells.map((h) => h.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim());
  const find = (...aliases: string[]) => headings.findIndex((h) => aliases.includes(h));
  const full = find("name", "student", "student name");
  const first = find("first", "first name"), last = find("last", "last name");
  const school = find("school");
  if (full < 0 && (first < 0 || last < 0)) {
    result.errors.push({ line: header.line, message: "Use a name column, or first name and last name columns." });
    return result;
  }
  const kept = new Set([...(full >= 0 ? [full] : [first, last]), school]);
  if (headings.some((_, i) => !kept.has(i))) result.warnings.push(PRIVACY_WARNING);
  if (new Set(headings).size !== headings.length) {
    result.errors.push({ line: header.line, message: "Each column needs a different heading." });
    return result;
  }
  for (const record of records) {
    if (record.invalid || record.cells.length !== headings.length) {
      result.errors.push({ line: record.line, message: "Check the quotes and number of columns in this row." });
      continue;
    }
    const name = (full >= 0 ? record.cells[full] : `${record.cells[first]} ${record.cells[last]}`).trim().replace(/\s+/g, " ");
    if (!name || name.length > 200 || (full < 0 && (!record.cells[first] || !record.cells[last]))) {
      result.errors.push({ line: record.line, message: "Enter a student name of 200 characters or fewer." });
      continue;
    }
    if (school >= 0 && record.cells[school].length > 200) {
      result.errors.push({ line: record.line, message: "School names must be 200 characters or fewer." });
      continue;
    }
    if (result.rows.length === MAX_ROSTER_SIZE) {
      result.errors.push({ line: record.line, message: "Import at most 200 students at a time." });
      break;
    }
    result.rows.push({ name, ...(school >= 0 && record.cells[school] ? { school: record.cells[school] } : {}) });
  }
  return result;
}

/** Labels are derived from the whole roster in stable order, never used as identity. */
export function displayLabels(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const parts = name.trim().split(/\s+/);
    const base = parts.length > 1 ? `${parts[0]} ${Array.from(parts.at(-1)!)[0]}.` : parts[0];
    let label = base, count = 1;
    while (used.has(label)) label = `${base} (${++count})`;
    used.add(label);
    return label;
  });
}
