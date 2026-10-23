#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { evaluateFile } from "./index.js";

const args = process.argv.slice(2);
const input = args[0];
const outputIndex = args.indexOf("--output");
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
if (!input || (outputIndex >= 0 && !output) || args.some((arg, i) => arg === "--output" && i !== outputIndex)) {
  process.stderr.write("Usage: turnsafely <annotations.jsonl> [--output results.json]\n");
  process.exit(2);
}
try {
  const result = `${JSON.stringify(await evaluateFile(input), null, 2)}\n`;
  if (output) await writeFile(output, result, "utf8");
  else process.stdout.write(result);
} catch (error) {
  process.stderr.write(`turnsafely: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(2);
}
