# Tasks

## 1. Parser and matcher

- [x] 1.1 Read `@annotation` directives from block, JSDoc and line comments with acorn's tokenizer, ignoring literals and keeping directives before a syntax error; verify with `lib/annotations.test.ts`
- [x] 1.2 Validate fields and report directive warnings with their source line; verify with the warning cases in `lib/annotations.test.ts`
- [x] 1.3 Match rules literally per output, honour `occurrence`, drop overlaps and cap at 200 with a warning; verify with `lib/annotations.test.ts`
- [x] 1.4 Load acorn on demand, only for code containing `@annotation`, and render without annotations if the import fails; verify in a browser that a plain run loads no acorn chunk and an annotated run does

## 2. Rendering

- [x] 2.1 Frame matched fragments in listing rows and open the explanation on click or Enter, close on Escape and scroll, never on hover; verify with `CodeAnnotations.test.tsx`
- [x] 2.2 Keep the opcode reference outside annotated fragments and skip rows that exist only in the previous run; verify with `CodeAnnotations.test.tsx`
- [x] 2.3 Show directive warnings next to the stdout listing only; verify with `AnnotationAlerts.test.tsx` and `CodeAnnotations.test.tsx`
- [x] 2.4 Leave the listing text and Copy byte-identical to the engine output; verify with the Copy test in `CodeAnnotations.test.tsx`

## 3. Where output is shown

- [x] 3.1 Apply the last run's code in the playground panes and the playground embed; verify with `PlaygroundClient.test.tsx` and `e2e/tests/output-annotations.spec.ts`
- [x] 3.2 Capture the run's code and flags in the snapshot link; verify with `ShareButton.test.tsx`
- [x] 3.3 Apply the snapshot's source in the bytecode embed, with a plain-text fallback until highlighted; verify with `EmbedBytecodeClient.test.tsx` and the embed cases in `e2e/tests/output-annotations.spec.ts`
- [x] 3.4 Apply the run's code to pipeline stage listings and deopt event rows; verify with `StageContent.test.tsx`

## 4. Playground footer, samples and layout

- [x] 4.1 Move the run summary into the pane footer; verify with the `runSummary` cases in `lib/runAggregate.test.ts` and `e2e/tests/playground-run.spec.ts`
- [x] 4.2 Store each V8 internals sample's flags in the catalog and apply them on load, restoring the default flags for default samples; verify with `lib/samples.test.ts` and `PlaygroundClient.test.tsx`
- [x] 4.3 Rewrite the V8 internals samples so each runs on d8 and every annotation matches; verify with `SAMPLES_RUN_URL=<run endpoint> npx jest lib/samples.engine.test.ts`
- [x] 4.4 Pass a device hint from request headers as the split's first-render orientation on the four split pages; verify with `lib/device.test.ts` and a browser comparison of the server HTML with the loaded page on desktop and phone

## 5. Documentation and monitoring

- [x] 5.1 Run every sample on a real d8 in `nightly-engines` and fail on an unmatched annotation or a d8 crash; verify by breaking one annotation locally and seeing `lib/samples.engine.test.ts` fail
- [x] 5.2 Describe annotations in CLAUDE.md (module, directive format, where they apply, the nightly check); verify the section names files that exist
- [x] 5.3 Rewrite the wiki page `Output-Annotations` without the removed help popover and editor snippet; verify it mentions no control the playground lacks

## 6. Verification

- [x] 6.1 Run `npm run ci` at the repo root and `npm run lint`, `npm test` and `npx tsc --noEmit -p tsconfig.json` in `apps/frontend/src`; all pass
- [x] 6.2 Run `npm run specs:check`; the change and every spec validate
- [ ] 6.3 Run the e2e suites `output-annotations`, `playground-*`, `embed` and `pipeline` against the compose stack; all pass
