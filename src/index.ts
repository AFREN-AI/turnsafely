import { readFile } from "node:fs/promises";

export type Annotation = {
  reference: string;
  hypothesis: string;
  accent?: string;
  condition?: string;
  hallucinated_text?: boolean;
  reference_speaker?: string;
  predicted_speaker?: string;
  decision_critical_error?: boolean;
};

type EditCounts = { substitutions: number; deletions: number; insertions: number };
type Aggregate = {
  samples: number;
  reference_words: number;
  word_errors: number;
  wer: number | null;
  cer: number | null;
};

function tokens(text: string): string[] {
  const normalized = text.normalize("NFKC").toLocaleLowerCase("und");
  const segmenter = new Intl.Segmenter("und", { granularity: "word" });
  return [...segmenter.segment(normalized)]
    .filter((part) => part.isWordLike)
    .map((part) => part.segment);
}

function editCounts(reference: string[], hypothesis: string[]): EditCounts {
  const rows = reference.length + 1;
  const cols = hypothesis.length + 1;
  const cost = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  const op = Array.from({ length: rows }, () => Array<string>(cols).fill("match"));
  for (let i = 1; i < rows; i++) { cost[i]![0] = i; op[i]![0] = "deletion"; }
  for (let j = 1; j < cols; j++) { cost[0]![j] = j; op[0]![j] = "insertion"; }
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    const same = reference[i - 1] === hypothesis[j - 1];
    const choices: [number, string][] = [
      [cost[i - 1]![j - 1]! + (same ? 0 : 1), same ? "match" : "substitution"],
      [cost[i - 1]![j]! + 1, "deletion"],
      [cost[i]![j - 1]! + 1, "insertion"],
    ];
    choices.sort((a, b) => a[0] - b[0]);
    cost[i]![j] = choices[0]![0]; op[i]![j] = choices[0]![1];
  }
  let substitutions = 0, deletions = 0, insertions = 0;
  let i = reference.length, j = hypothesis.length;
  while (i || j) {
    const action = op[i]![j]!;
    if (action === "substitution") { substitutions++; i--; j--; }
    else if (action === "deletion") { deletions++; i--; }
    else if (action === "insertion") { insertions++; j--; }
    else { i--; j--; }
  }
  return { substitutions, deletions, insertions };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator ? numerator / denominator : null;
}

export function wordErrorCounts(reference: string, hypothesis: string) {
  const ref = tokens(reference), hyp = tokens(hypothesis);
  const edits = editCounts(ref, hyp);
  const errors = edits.substitutions + edits.deletions + edits.insertions;
  return { reference_words: ref.length, ...edits, errors, wer: ratio(errors, ref.length) };
}

function aggregate(rows: Annotation[]): Aggregate {
  let refWords = 0, errors = 0, charErrors = 0, refChars = 0;
  for (const row of rows) {
    const ref = tokens(row.reference), hyp = tokens(row.hypothesis);
    const word = editCounts(ref, hyp);
    refWords += ref.length;
    errors += word.substitutions + word.deletions + word.insertions;
    const refText = [...ref.join(" ")], hypText = [...hyp.join(" ")];
    charErrors += editCounts(refText, hypText).substitutions + editCounts(refText, hypText).deletions + editCounts(refText, hypText).insertions;
    refChars += refText.length;
  }
  return { samples: rows.length, reference_words: refWords, word_errors: errors, wer: ratio(errors, refWords), cer: ratio(charErrors, refChars) };
}

function hallucinationRate(rows: Annotation[], conditionFilter: (row: Annotation) => boolean) {
  const annotated = rows.filter((row) => conditionFilter(row) && typeof row.hallucinated_text === "boolean");
  const flagged = annotated.filter((row) => row.hallucinated_text).length;
  return { samples: annotated.length, flagged_samples: flagged, rate: ratio(flagged, annotated.length) };
}

export function evaluate(rows: unknown[]): Record<string, unknown> {
  rows.forEach((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`Row ${index} must be a JSON object`);
    const row = value as Record<string, unknown>;
    if (typeof row.reference !== "string" || typeof row.hypothesis !== "string") throw new TypeError(`Row ${index} needs string 'reference' and 'hypothesis' values`);
    for (const key of ["hallucinated_text", "decision_critical_error"]) {
      if (key in row && typeof row[key] !== "boolean") throw new TypeError(`Row ${index} field '${key}' must be true or false`);
    }
  });
  const data = rows as Annotation[];
  const byAccent = new Map<string, Annotation[]>(), byCondition = new Map<string, Annotation[]>();
  for (const row of data) {
    const accent = row.accent || "unreported", condition = row.condition || "unspecified";
    byAccent.set(accent, [...(byAccent.get(accent) ?? []), row]);
    byCondition.set(condition, [...(byCondition.get(condition) ?? []), row]);
  }
  const candidate = data.filter((row) => row.reference_speaker === "candidate");
  const critical = data.filter((row) => typeof row.decision_critical_error === "boolean");
  const attributionErrors = candidate.filter((row) => row.predicted_speaker !== "candidate").length;
  const criticalErrors = critical.filter((row) => row.decision_critical_error).length;
  return {
    schema_version: "1.0", samples: data.length, transcription: aggregate(data),
    by_accent: Object.fromEntries([...byAccent].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, aggregate(v)])),
    by_condition: Object.fromEntries([...byCondition].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, aggregate(v)])),
    pause_silence_hallucination: hallucinationRate(data, (row) => ["pause", "silence"].includes((row.condition ?? "").toLowerCase())),
    candidate_attribution_error: { samples: candidate.length, errors: attributionErrors, rate: ratio(attributionErrors, candidate.length) },
    decision_critical_error: { samples: critical.length, errors: criticalErrors, rate: ratio(criticalErrors, critical.length) },
    annotation_note: "Hallucination and decision-critical metrics use reviewer-supplied labels; they are not inferred from text.",
  };
}

export async function evaluateFile(path: string): Promise<Record<string, unknown>> {
  const source = await readFile(path, "utf8");
  const rows: unknown[] = [];
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch { throw new SyntaxError(`Invalid JSON on line ${index + 1}`); }
  }
  return evaluate(rows);
}
