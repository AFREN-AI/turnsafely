import assert from "node:assert/strict";
import test from "node:test";
import { createLeaderboard, importAfriSpeechAnnotations } from "../src/index.js";

const metadata = { system_id: "example-asr", system_version: "1.2.0", dataset_revision: "abc123", split: "test" };

test("joins local AfriSpeech manifests to hypotheses without copying speaker identifiers", () => {
  const rows = importAfriSpeechAnnotations(
    '{"audio_id":"a1","transcript":"hello","accent":"English-NG","split":"test","speaker_id":"private"}\n{"audio_id":"a2","transcript":"skip","accent":"English-GH","split":"train"}',
    '{"audio_id":"a1","hypothesis":"hello there"}', metadata,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.dataset_id, "intronhealth/afrispeech-200");
  assert.equal(rows[0]?.reference_speaker, undefined);
  assert.equal(rows[0]?.system_version, "1.2.0");
});

test("rejects unmatched or duplicate dataset sample IDs", () => {
  assert.throws(() => importAfriSpeechAnnotations('{"audio_id":"a","transcript":"x","accent":"en","split":"test"}', '{"audio_id":"b","hypothesis":"x"}', metadata), /no matching manifest/);
  assert.throws(() => importAfriSpeechAnnotations('{"audio_id":"a","transcript":"x","accent":"en","split":"test"}\n{"audio_id":"a","transcript":"y","accent":"en","split":"test"}', '{"audio_id":"a","hypothesis":"x"}', metadata), /duplicate audio_id/);
});

test("creates reproducible leaderboard entries and requires run provenance", () => {
  const rows = [{ reference: "hello", hypothesis: "hello", ...metadata, dataset_id: "dataset" }];
  const result = createLeaderboard(rows);
  assert.equal(result[0]?.evaluated_samples, 1);
  assert.throws(() => createLeaderboard([{ reference: "x", hypothesis: "x" }]), /needs system_id/);
});
