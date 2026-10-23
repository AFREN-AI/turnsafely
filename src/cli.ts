#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { createLeaderboard, evaluateFile, type Annotation } from "./index.js";

const args = process.argv.slice(2);
const input = args[0];
const outputIndex = args.indexOf("--output");
const leaderboard = args.includes("--leaderboard");
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
if (!input || (outputIndex >= 0 && !output) || args.some((arg, i) => arg === "--output" && i !== outputIndex) || args.some((arg) => ![input, "--leaderboard"].includes(arg) && arg !== "--output" && arg !== output)) {
  process.stderr.write("Usage: turnsafely <annotations.jsonl> [--leaderboard] [--output results.json]\n");
  process.exit(2);
}
try {
  let report: unknown;
  if (leaderboard) {
    const source = await readFile(input, "utf8");
    const rows: Annotation[] = source.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
      try { return JSON.parse(line) as Annotation; }
      catch { throw new SyntaxError(`Invalid JSON on line ${index + 1}`); }
    });
    report = { schema_version: "1.0", entries: createLeaderboard(rows) };
  } else report = await evaluateFile(input);
  const result = `${JSON.stringify(report, null, 2)}\n`;
  if (output) await writeFile(output, result, "utf8");
  else process.stdout.write(result);
} catch (error) {
  process.stderr.write(`turnsafely: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}
