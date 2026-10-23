import type { Annotation } from "./index.js";

type DatasetRow = { audio_id: string; transcript: string; accent: string; split: string; domain?: string };
type HypothesisRow = { audio_id: string; hypothesis: string };

function parseJsonl<T>(source: string, label: string): T[] {
  return source.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as T]; }
    catch { throw new SyntaxError(`${label}: invalid JSON on line ${index + 1}`); }
  });
}

/** Join a publisher-authorized local manifest and model outputs without copying audio or speaker IDs. */
export function importAfriSpeechAnnotations(
  manifestJsonl: string,
  hypothesesJsonl: string,
  metadata: { system_id: string; system_version: string; dataset_revision: string; split: string },
): Annotation[] {
  for (const [name, value] of Object.entries(metadata)) {
    if (!value.trim()) throw new TypeError(`${name} must be non-empty`);
  }
  const dataset = parseJsonl<DatasetRow>(manifestJsonl, "manifest");
  const hypotheses = parseJsonl<HypothesisRow>(hypothesesJsonl, "hypotheses");
  const samples = new Map<string, DatasetRow>();
  for (const [index, row] of dataset.entries()) {
    if (!row || typeof row.audio_id !== "string" || !row.audio_id || typeof row.transcript !== "string" || typeof row.accent !== "string" || !row.accent || typeof row.split !== "string") {
      throw new TypeError(`manifest row ${index + 1} is missing required audio_id, transcript, accent, or split`);
    }
    if (row.split !== metadata.split) continue;
    if (samples.has(row.audio_id)) throw new TypeError(`duplicate audio_id in manifest: ${row.audio_id}`);
    samples.set(row.audio_id, row);
  }
  const seen = new Set<string>();
  const output: Annotation[] = [];
  for (const [index, row] of hypotheses.entries()) {
    if (!row || typeof row.audio_id !== "string" || !row.audio_id || typeof row.hypothesis !== "string") {
      throw new TypeError(`hypothesis row ${index + 1} is missing audio_id or hypothesis`);
    }
    if (seen.has(row.audio_id)) throw new TypeError(`duplicate audio_id in hypotheses: ${row.audio_id}`);
    seen.add(row.audio_id);
    const reference = samples.get(row.audio_id);
    if (!reference) throw new TypeError(`hypothesis has no matching manifest sample in split ${metadata.split}: ${row.audio_id}`);
    output.push({
      reference: reference.transcript,
      hypothesis: row.hypothesis,
      accent: reference.accent,
      condition: reference.domain ?? "speech",
      system_id: metadata.system_id,
      system_version: metadata.system_version,
      dataset_id: "intronhealth/afrispeech-200",
      dataset_revision: metadata.dataset_revision,
      split: metadata.split,
    });
  }
  if (output.length === 0) throw new TypeError(`no matched samples for split ${metadata.split}`);
  return output;
}
