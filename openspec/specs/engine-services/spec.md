# engine-services Specification

## Purpose

What each of the four engine services (v8, hermes, jsc, sm) does with a snippet on top of the shared engine-runtime contract: which binary it runs, how the command line is built, whether the snippet is executed or only compiled, which globals are blocked and how the binary's version is read.

## Requirements

### Requirement: Shared runtime contract

Each engine service SHALL expose the HTTP contract specified in engine-runtime under its own engine key: `v8`, `hermes`, `jsc` or `sm`. The key selects the service's section of the flag catalog and is reported in `meta.engine` and by `/healthz`.

#### Scenario: Health of the SpiderMonkey service

- **WHEN** `/healthz` is requested on the SpiderMonkey service
- **THEN** the response reports `engine` as `sm`

### Requirement: Service configuration

A service SHALL refuse to start when its environment does not parse, with an error that names the service. Each service adds only its own settings to the shared ones: the path of its binary and, for v8, the heap cap.

#### Scenario: Invalid environment

- **WHEN** the v8 service starts with `MAX_HEAP_MB` set to `-1`
- **THEN** startup fails with an error beginning `Invalid environment for engine-v8`

### Requirement: V8 invocation

The v8 service SHALL execute the snippet with the d8 binary at `D8_PATH` (default `/opt/v8/d8`), passing in order `--max-old-space-size=<MAX_HEAP_MB>` (default 1536), the accepted flags, the lockdown script and the snippet.

#### Scenario: Run with a flag

- **WHEN** a request sends the flag `--print-bytecode`
- **THEN** d8 is started with `--max-old-space-size=1536`, `--print-bytecode`, the lockdown script and the snippet, in that order

### Requirement: V8 blocked globals

The v8 service MUST block d8's file-reading globals `read`, `readbuffer` and `readline` before the snippet runs.

#### Scenario: Snippet reads a file

- **WHEN** a snippet calls `read("/etc/hostname")`
- **THEN** the call fails and the file's contents do not appear in the output

### Requirement: V8 version

The v8 service SHALL read its version by having d8 evaluate `print(version())` and taking the first output line that starts with a dotted number.

#### Scenario: Version preceded by another line

- **WHEN** d8 prints `V8 version` on one line and `13.1.0` on the next
- **THEN** the reported version is `13.1.0`

#### Scenario: Version with a suffix

- **WHEN** d8 prints `13.1.0 (candidate)`
- **THEN** the reported version is `13.1.0 (candidate)`

### Requirement: V8 OpenAPI document

Of the four services only v8 SHALL serve `/openapi.json`, under the title `engine-v8`.

#### Scenario: Document on the v8 service

- **WHEN** `/openapi.json` is requested on the v8 service
- **THEN** the response is 200 with the title `engine-v8`

#### Scenario: Document on another service

- **WHEN** `/openapi.json` is requested on the hermes, jsc or sm service
- **THEN** the response is 404

### Requirement: Hermes invocation

The hermes service SHALL compile the snippet without executing it, running the binary at `HERMES_PATH` (default `/usr/bin/hermes`) with `-dump-bytecode`, the accepted flags and the snippet, in that order. It declares no blocked globals.

#### Scenario: Run with a flag

- **WHEN** a request sends the flag `-O`
- **THEN** hermes is started with `-dump-bytecode`, `-O` and the snippet, in that order
- **AND** the workspace holds no lockdown script

### Requirement: Hermes version

The hermes service SHALL read its version from `hermes --version`, reporting the `Hermes release version` value followed by the `HBC bytecode version` value in parentheses when the banner carries one.

#### Scenario: Banner with both lines

- **WHEN** the banner contains `Hermes release version: 0.12.0` and `HBC bytecode version: 96`
- **THEN** the reported version is `0.12.0 (HBC 96)`

#### Scenario: Banner without the bytecode line

- **WHEN** the banner contains only `Hermes release version: 0.12.0`
- **THEN** the reported version is `0.12.0`

#### Scenario: Unrecognized banner

- **WHEN** the output is `some other tool v1`
- **THEN** the version stays `null`

### Requirement: JSC invocation

The jsc service SHALL execute the snippet with the shell at `JSCSHELL_PATH`, passing in order `-d`, the accepted flags in the order the caller sent them, the lockdown script, the console script and the snippet. `-d` is always passed, so every run dumps bytecode.

#### Scenario: Run without flags

- **WHEN** a request sends no flags
- **THEN** jsc is started with `-d`, the lockdown script, the console script and the snippet, in that order

#### Scenario: Caller also sends the dump flag

- **WHEN** a request sends the flag `-d`
- **THEN** jsc is started with `-d` twice

### Requirement: JSC binary path

The jsc service SHALL take its binary from `JSCSHELL_PATH`, falling back to `JSC_PATH` and then to `jsc` on the search path. `JSC_PATH` MUST NOT be present in the environment the binary runs with, because the shell reads `JSC_*` variables as VM options.

#### Scenario: Only the legacy variable is set

- **WHEN** `JSC_PATH` is `/legacy/jsc` and `JSCSHELL_PATH` is unset
- **THEN** the service runs `/legacy/jsc`
- **AND** the binary's environment has no `JSC_PATH`

#### Scenario: Both variables are set

- **WHEN** `JSCSHELL_PATH` is `/new/jsc` and `JSC_PATH` is `/legacy/jsc`
- **THEN** the service runs `/new/jsc`

### Requirement: JSC blocked globals

The jsc service MUST block the shell's file and code-loading globals `readFile`, `writeFile`, `openFile`, `load`, `run`, `runString`, `readline`, `checkSyntax` and `checkModuleSyntax` before the snippet runs.

#### Scenario: Snippet loads another script

- **WHEN** a snippet calls `load("/etc/hostname")`
- **THEN** the call fails and the file's contents do not appear in the output

### Requirement: JSC console

The jsc service SHALL give the snippet a `console` with `log`, `info`, `warn`, `error` and `debug`, each printing through the shell's `print`, when the shell provides none. It is installed after the lockdown script.

#### Scenario: Snippet logs

- **WHEN** a snippet calls `console.log("hi")` in a shell without a console
- **THEN** `hi` appears in `stdout`

### Requirement: JSC version

The jsc service SHALL declare no version probe, so its version is always `null`.

#### Scenario: Health of the jsc service

- **WHEN** `/healthz` is requested on the jsc service
- **THEN** `version` is `null`

### Requirement: SpiderMonkey invocation

The sm service SHALL disassemble the snippet without executing it: the shell at `SM_PATH` (default `js`) is started in the run's workspace with the accepted flags followed by a program that reads the snippet, compiles it as the body of a function and prints that function's bytecode. It declares no blocked globals.

#### Scenario: Run with a flag

- **WHEN** a request sends the flag `--ion-eager`
- **THEN** the shell is started with `--ion-eager` ahead of the disassembly program, with the workspace as its working directory

#### Scenario: Snippet does not compile

- **WHEN** the snippet has a syntax error
- **THEN** the output is `ERROR: compile failed` followed by the error, and the shell exits with status 1

#### Scenario: Shell cannot disassemble

- **WHEN** the shell offers no disassembler or no `read`
- **THEN** the output is a line beginning `ERROR: SpiderMonkey` and the shell exits with status 2

### Requirement: SpiderMonkey version

The sm service SHALL read its version from `js --version`, reporting what follows `JavaScript-C` on that line.

#### Scenario: Version banner

- **WHEN** the shell prints `JavaScript-C134.0`
- **THEN** the reported version is `134.0`

#### Scenario: Unrecognized banner

- **WHEN** the output is `nonsense`
- **THEN** the version stays `null`
