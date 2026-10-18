# Spec Delta

## ADDED Requirements

### Requirement: Annotated stage listings

The AST, Bytecode, Sparkplug, Maglev and TurboFan listings SHALL apply the annotations of the code of the last run, as the `output-annotations` capability specifies.

#### Scenario: Annotated bytecode

- **WHEN** the code annotates `Return` and the Bytecode stage lists a `Return`
- **THEN** that `Return` is framed and opens the explanation

### Requirement: Annotated deopt events

In the Deopts stage each event row SHALL show, below its details, one control per annotation of the run's code that matches the event's own trace line, opening the explanation as the `output-annotations` capability specifies. Directive warnings are shown above the summary.

#### Scenario: Deopt reason annotated

- **WHEN** the code annotates `not a Smi` and a deoptimization line carries `reason: not a Smi`
- **THEN** that event's row offers `not a Smi`, which opens the explanation

### Requirement: Pane layout

At and above the `md` breakpoint (48em) the editor and the stages SHALL sit side by side; below it they are stacked. The page MUST arrive from the server in the orientation it keeps after loading: a request whose `Sec-CH-UA-Mobile` header is `?1`, or that has no such header and a phone's user agent, is rendered stacked, any other request side by side.

#### Scenario: Desktop browser

- **WHEN** `/v8-pipeline` is opened in a 1440 px wide desktop browser
- **THEN** the editor and the stages are side by side in the server's HTML and stay so after loading

#### Scenario: Phone

- **WHEN** `/v8-pipeline` is opened on a phone
- **THEN** the editor and the stages are stacked in the server's HTML and stay so after loading
