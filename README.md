# turnsafely

An annotation-driven evaluation adapter for measuring speech recognition risks in interview-style audio. It reports WER and CER overall and by accent and recording condition, plus rates for reviewer-labelled fabricated speech, candidate-speaker attribution errors, and reviewer-labelled errors that could change the meaning of an interview answer.

The project complements broad African-accented ASR benchmarks with interview-context safety reporting. It does not rank candidates, infer qualifications, recommend hiring decisions, or automatically decide whether text is fabricated. Those labels must come from a documented human review process.

## Install

```sh
git clone https://github.com/AFREN-AI/turnsafely.git
cd turnsafely
npm ci
npm run build
```

For local development:

```sh
npm install
npm run build
```

## Input

Provide UTF-8 JSON Lines. Each row is one utterance or annotated audio segment:

```json
{"sample_id":"clip-001","accent":"English-NG","condition":"pause","reference":"I led a team","hypothesis":"I led a team of ten","hallucinated_text":true,"reference_speaker":"candidate","predicted_speaker":"interviewer","decision_critical_error":true}
```

Required fields are `reference` and `hypothesis`. Optional fields:

- `accent`: an agreed label such as `English-NG`, or a non-identifying cohort label.
- `condition`: use `speech`, `pause`, `silence`, or a documented condition such as `code-switch`.
- `hallucinated_text`: reviewer label indicating whether the hypothesis includes speech not supported by the segment's audio.
- `reference_speaker` and `predicted_speaker`: role labels for attribution evaluation. The scorer uses `candidate` and `interviewer` as example values.
- `decision_critical_error`: reviewer label for an error that materially changes the meaning of an explicit candidate statement. Publish the annotation rubric and adjudication procedure with any result.

Do not put names or other identifying information in public evaluation files. Prefer aggregate results and de-identified labels.

## Run

```sh
node dist/src/cli.js annotations.jsonl --output results.json
node dist/src/cli.js annotations-with-run-metadata.jsonl --leaderboard --output leaderboard.json
```

Or call the library:

```ts
import { evaluateFile } from "turnsafely";

const results = await evaluateFile("annotations.jsonl");
console.log(results.by_accent);
```

WER and CER are aggregate error counts divided by total reference tokens or characters. Text is Unicode-normalized, case-folded, and tokenized into alphanumeric word sequences. Empty-reference segments have undefined WER and remain visible in pause/silence hallucination counts when they have reviewer labels. Unlabelled segments are excluded from annotation-driven rates.

## Dataset and licence boundaries

The package contains evaluation code and synthetic test fixtures only. It does not download or redistribute audio. AfriSpeech-200 is licensed CC BY-NC-SA 4.0, as stated in its paper. Anyone using that dataset must obtain it from the dataset publisher and comply with its terms. This project's Apache-2.0 licence applies to the code only. Dataset terms may restrict commercial evaluation use.

The local-manifest adapter joins publisher-authorized AfriSpeech metadata to hypotheses without copying audio or speaker IDs. It requires a caller-supplied dataset revision and split, and does not download files. Leaderboard output requires system ID/version, dataset ID/revision, and split on every row; it reports supplied runs and does not invent benchmark scores.

## Research context and scope

- Koenecke et al., “Racial disparities in automated speech recognition,” PNAS 2020, measured an average WER of 0.35 for Black speakers and 0.19 for White speakers across five systems on a US interview corpus. That result motivates subgroup measurement; it is not an estimate of African-accented ASR performance. [Paper](https://doi.org/10.1073/pnas.1915768117)
- Koenecke et al., “Careless Whisper,” FAccT 2024, found that roughly 1% of evaluated Whisper transcripts contained wholly invented phrases or sentences, and observed higher hallucination rates with longer non-vocal durations. [Paper](https://arxiv.org/abs/2402.08021)
- Olatunji et al., “AfriSpeech-200,” TACL 2023, describes 200.70 hours and 67,577 speech-transcript pairs across 120 accents from 13 countries. The audio is CC BY-NC-SA 4.0. [Paper](https://aclanthology.org/2023.tacl-1.93/)
- Sanni et al., “Afrispeech-Dialog,” NAACL 2025, evaluates long-form simulated conversations with African-accented English. [Paper](https://aclanthology.org/2025.naacl-long.426/)
- Ashungafac et al., “AfriSpeech-MultiBench,” IJCNLP-AACL 2025, reports accent-stratified results across domains and includes hallucination robustness tests. [Paper](https://aclanthology.org/2025.ijcnlp-long.190/)

The related benchmarks above cover substantial ground. This package focuses on transparent interview-specific annotations and aggregate safety summaries that can accompany an existing ASR evaluation. It does not claim to be the first African-accented ASR benchmark or to provide a representative interview dataset.

## Maintenance and contributing

Maintainer: Hadriel Wonda. See [CONTRIBUTORS.md](CONTRIBUTORS.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [DATA.md](DATA.md) before contributing or publishing a result.

