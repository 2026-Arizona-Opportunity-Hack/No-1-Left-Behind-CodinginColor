import { describe, expect, it } from "vitest";
import { displayLabels, parseRosterCsv } from "./roster-csv";

describe("privacy-preserving roster import", () => {
  it("handles BOM, CRLF, quoted commas, escaped quotes and blank lines", () => {
    const result = parseRosterCsv('\uFEFFNAME,School\r\n"Rivera, Alex",Maryvale\r\n\r\n"Jo ""JJ"" Smith",Maryvale\r\n');
    expect(result).toEqual({ rows: [{ name: "Rivera, Alex", school: "Maryvale" }, { name: 'Jo "JJ" Smith', school: "Maryvale" }], warnings: [], errors: [] });
  });
  it.each(["name", "Student", "STUDENT NAME"])("accepts %s and discards extra data with one warning", (header) => {
    const result = parseRosterCsv(`${header},email,birthday,class\nAlex,private@example.com,2009-01-01,P3`);
    expect(result.rows).toEqual([{ name: "Alex" }]);
    expect(result.warnings).toEqual(["We only keep each student's name and school. Other columns were ignored."]);
    expect(JSON.stringify(result)).not.toContain("private@example.com");
  });
  it("accepts split names, retaining distinct students with duplicate names", () => {
    const result = parseRosterCsv("First Name,Last Name\nAlex,Rivera\nAlex,Rivera");
    expect(result.rows).toEqual([{ name: "Alex Rivera" }, { name: "Alex Rivera" }]);
    expect(result.errors).toEqual([]);
  });
  it("reports physical lines for missing names, bad rows and multiline fields", () => {
    const result = parseRosterCsv('name,school\n"Alex\nRivera",Mary\n,Mary\nToo,many,columns\n"open');
    expect(result.rows[0]).toEqual({ name: "Alex Rivera", school: "Mary" });
    expect(result.errors.map((e) => e.line).sort()).toEqual([4, 5, 6]);
    expect(parseRosterCsv('name\n"closed"junk').errors[0].line).toBe(2);
  });
  it("requires unambiguous name headers", () => {
    expect(parseRosterCsv("email\na@b.com").errors).toHaveLength(1);
    expect(parseRosterCsv("name,name\nA,B").errors).toHaveLength(1);
    expect(parseRosterCsv("first,last\nAlex,").errors[0].line).toBe(2);
  });
  it("enforces the 200 student limit", () => {
    const result = parseRosterCsv("name\n" + Array.from({ length: 201 }, (_, i) => `Student ${i}`).join("\n"));
    expect(result.rows).toHaveLength(200);
    expect(result.errors[0].line).toBe(202);
  });
  it("creates distinct presentation labels without merging duplicate names", () => {
    expect(displayLabels(["Alex Rivera", "Alex Morales", "Alex Rivera", "Sam", "Sam"])).toEqual(["Alex R.", "Alex M.", "Alex R. (2)", "Sam", "Sam (2)"]);
  });
});
