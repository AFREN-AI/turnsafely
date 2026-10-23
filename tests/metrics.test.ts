import assert from "node:assert/strict";
import test from "node:test";
import { evaluate, wordErrorCounts } from "../src/index.js";

test("word errors use deterministic counts", () => {
  assert.deepEqual(wordErrorCounts("we build software", "we make"), {
    reference_words: 3, substitutions: 1, deletions: 1, insertions: 0, errors: 2, wer: 2 / 3,
  });
});

test("empty references have undefined WER", () => {
  assert.equal(wordErrorCounts("", "invented words").wer, null);
});

test("reports stratified, annotation-driven safety rates", () => {
  const report = evaluate([
    { accent: "English-NG", condition: "pause", reference: "I led a team", hypothesis: "I led a team of ten", hallucinated_text: true, reference_speaker: "candidate", predicted_speaker: "interviewer", decision_critical_error: true },
    { accent: "English-GH", condition: "speech", reference: "I wrote tests", hypothesis: "I wrote tests", hallucinated_text: false, reference_speaker: "candidate", predicted_speaker: "candidate", decision_critical_error: false },
  ]) as any;
  assert.equal(report.by_accent["English-NG"].samples, 1);
  assert.equal(report.pause_silence_hallucination.rate, 1);
  assert.equal(report.candidate_attribution_error.rate, 0.5);
  assert.equal(report.decision_critical_error.rate, 0.5);
});

test("unlabelled pause rows are excluded from hallucination denominator", () => {
  const report = evaluate([{ condition: "pause", reference: "", hypothesis: "" }]) as any;
  assert.equal(report.pause_silence_hallucination.samples, 0);
  assert.equal(report.pause_silence_hallucination.rate, null);
});

test("rejects malformed annotations", () => {
  assert.throws(() => evaluate([{ reference: "hello" }]), /needs string/);
  assert.throws(() => evaluate([{ reference: "hi", hypothesis: "hi", hallucinated_text: "yes" }]), /must be true or false/);
});
