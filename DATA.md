# Data and annotation protocol

## What is in this repository

Only the scoring code and synthetic unit-test cases are included. No audio, participant information, transcripts from private interviews, or third-party dataset records are included.

## Using external datasets

Obtain each dataset from its publisher. Confirm its current licence, research ethics conditions, consent scope, and permitted publication and commercial uses before evaluation. In particular, AfriSpeech-200 is CC BY-NC-SA 4.0. Do not bundle copies, derived audio, or dataset transcripts in this repository.

The AfriSpeech adapter joins a local publisher-authorized manifest to hypothesis JSONL by `audio_id`. It emits reference text for evaluation but excludes speaker identifiers and does not fetch files. Confirm current publisher conditions before use; non-commercial terms may prohibit commercial evaluation.

## Reviewer annotations

The scorer reports only labels supplied in the input rows. Before using or publishing metrics, document:

1. Who reviewed each clip and what access they had to the audio.
2. The operational definition of `hallucinated_text` and how disagreement was adjudicated.
3. The `decision_critical_error` rubric, with examples that do not encode a candidate ranking or hiring recommendation.
4. How role labels and accent cohort labels were obtained, including consent and self-identification safeguards.
5. Sample counts, missing labels, exclusions, and confidence intervals in reported results.

Do not infer accent, identity, competence, or hiring suitability from a person's name or voice. Suppress small cohorts that could identify a speaker. Keep participant-level records access-controlled and publish only approved aggregate results.

