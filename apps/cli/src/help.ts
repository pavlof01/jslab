import { DEFAULT_API_URL } from "./options.js";

export const HELP = `jslab — run a snippet through V8, Hermes, SpiderMonkey and JavaScriptCore
from one terminal command and print what each engine has to say.

USAGE
  jslab [run] [file] [options]      run a snippet (stdin when no file is given)
  jslab flags [engine...]           list the flag catalog the servers accept
  jslab engines                     list the engines and how each dumps bytecode

RUN OPTIONS
  -e, --engine <list>   engines to run, comma-separated, or "all" (default: all)
                        v8 | hermes | sm | jsc, plus aliases (spidermonkey, jsc…)
  -c, --code <js>       run this source instead of a file
  -b, --bytecode        ask every selected engine for bytecode
                        (adds --print-bytecode for V8; the other three always dump)
  -f, --flag <flag>     extra engine flag; repeatable. Prefix with an engine to
                        scope it: -f v8:--trace-opt. Unscoped flags go to every
                        selected engine whose catalog accepts them.
  -t, --timeout <ms>    per-engine timeout (the gateway clamps it to its own range)
  -o, --out <dir>       also write <engine>.txt files into <dir>
      --api <url>       gateway or site to call (env JSLAB_API_URL, default ${DEFAULT_API_URL})
      --api-key <key>   API key for higher rate limits (env JSLAB_API_KEY)
      --json            print one JSON document instead of a report
  -q, --quiet           print only engine output, no headings
      --color/--no-color  force colour on or off (default: on when a TTY, off in pipes)
  -h, --help            show this help
  -V, --version         show the version

FLAGS OPTIONS
      --category <name> only flags in this category (bytecode, optimization, …)
      --json            print the catalog as JSON

EXAMPLES
  jslab -c "const add = (a, b) => a + b; add(1, 2)" --bytecode
  jslab snippet.js -e v8 -f --print-bytecode -f --trace-opt
  echo "1 + '1'" | jslab -e v8,jsc
  jslab bench.js --api http://localhost:8080 --json > run.json
  jslab flags v8 --category bytecode

EXIT CODES
  0  every selected engine answered
  1  at least one engine failed
  2  the command line was wrong
`;
