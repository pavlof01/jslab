/**
 * Generates ecmarkup HTML for ECMAScript abstract operations.
 *
 * Source lives in ecma-spec.html — edit that file to add/update algorithms.
 * This module reads the file once, builds the full ecmarkup document, then
 * extracts individual <emu-clause> elements by id for per-function requests.
 */
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "ecmarkup";

const __dir = dirname(fileURLToPath(import.meta.url));
const SPEC_FILE = join(__dir, "ecma-spec.html");

// ── Spec URLs for each algorithm ─────────────────────────────────────────────

export const ALGO_SPEC_URL: Record<string, string> = {
  ToPrimitive: "https://262.ecma-international.org/#sec-toprimitive",
  OrdinaryToPrimitive: "https://262.ecma-international.org/#sec-ordinarytoprimitive",
  StringToNumber: "https://262.ecma-international.org/#sec-stringtonumber",
  StringNumericValue: "https://262.ecma-international.org/#sec-runtime-semantics-stringnumericvalue",
  ToNumber: "https://262.ecma-international.org/#sec-tonumber",
  ToString: "https://262.ecma-international.org/#sec-tostring",
  ToBoolean: "https://262.ecma-international.org/#sec-toboolean",
  ToNumeric: "https://262.ecma-international.org/#sec-tonumeric",
  ToObject: "https://262.ecma-international.org/#sec-toobject",
  ToPropertyKey: "https://262.ecma-international.org/#sec-topropertykey",
  ToLength: "https://262.ecma-international.org/#sec-tolength",
  ToIndex: "https://262.ecma-international.org/#sec-toindex",
  Get: "https://262.ecma-international.org/#sec-get-o-p",
  GetV: "https://262.ecma-international.org/#sec-getv",
  GetMethod: "https://262.ecma-international.org/#sec-getmethod",
  Call: "https://262.ecma-international.org/#sec-call",
  IsLooselyEqual: "https://262.ecma-international.org/#sec-islooselyequal",
  IsStrictlyEqual: "https://262.ecma-international.org/#sec-isstrictlyequal",
  AbstractRelationalComparison: "https://262.ecma-international.org/#sec-abstract-relational-comparison",
  SameType: "https://262.ecma-international.org/#sec-sametype",
  SameValueNonNumber: "https://262.ecma-international.org/#sec-samevaluenonnumber",
  "Number::equal": "https://262.ecma-international.org/#sec-numeric-types-number-equal",
  "Number::lessThan": "https://262.ecma-international.org/#sec-numeric-types-number-lessThan",
  "Number::sameValue": "https://262.ecma-international.org/#sec-numeric-types-number-sameValue",
  "Number::sameValueZero": "https://262.ecma-international.org/#sec-numeric-types-number-sameValueZero",
  "Number::unaryMinus": "https://262.ecma-international.org/#sec-numeric-types-number-unaryMinus",
  "Number::bitwiseNOT": "https://262.ecma-international.org/#sec-numeric-types-number-bitwiseNOT",
  "Number::exponentiate": "https://262.ecma-international.org/#sec-numeric-types-number-exponentiate",
  "Number::multiply": "https://262.ecma-international.org/#sec-numeric-types-number-multiply",
  "Number::divide": "https://262.ecma-international.org/#sec-numeric-types-number-divide",
  "Number::remainder": "https://262.ecma-international.org/#sec-numeric-types-number-remainder",
  "Number::add": "https://262.ecma-international.org/#sec-numeric-types-number-add",
  "Number::subtract": "https://262.ecma-international.org/#sec-numeric-types-number-subtract",
  "Number::leftShift": "https://262.ecma-international.org/#sec-numeric-types-number-leftShift",
  "Number::signedRightShift": "https://262.ecma-international.org/#sec-numeric-types-number-signedRightShift",
  "Number::unsignedRightShift": "https://262.ecma-international.org/#sec-numeric-types-number-unsignedRightShift",
  "Number::bitwiseAND": "https://262.ecma-international.org/#sec-numeric-types-number-bitwiseAND",
  "Number::bitwiseXOR": "https://262.ecma-international.org/#sec-numeric-types-number-bitwiseXOR",
  "Number::bitwiseOR": "https://262.ecma-international.org/#sec-numeric-types-number-bitwiseOR",
  NumberBitwiseOp: "https://262.ecma-international.org/#sec-numberbitwiseop",
  "Number::toString": "https://262.ecma-international.org/#sec-numeric-types-number-tostring",
};

// ── External-link SVG icon (inline, 11×11) ────────────────────────────────────

const LINK_ICON_SVG =
  `<svg class="spec-ext-link-icon" width="11" height="11" viewBox="0 0 24 24" ` +
  `fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true">` +
  `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>` +
  `<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>` +
  `</svg>`;

// ── Static map: which algorithms each top-level function can reach ────────────
// Ordered for display (spec reading order).

const FUNCTION_ALGOS: Record<string, string[]> = {
  ToNumber: [
    "ToNumber",
    "StringToNumber",
    "StringNumericValue",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
  ],
  ToString: ["ToString", "Number::toString", "ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToBoolean: ["ToBoolean"],
  ToNumeric: [
    "ToNumeric",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
    "ToNumber",
  ],
  ToPrimitive: ["ToPrimitive", "OrdinaryToPrimitive", "GetMethod", "GetV", "ToObject", "Get", "Call"],
  ToObject: ["ToObject"],
  ToPropertyKey: [
    "ToPropertyKey",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
    "ToString",
    "Number::toString",
  ],
  ToLength: [
    "ToLength",
    "ToNumber",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
  ],
  ToIndex: [
    "ToIndex",
    "ToNumber",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
  ],
  IsLooselyEqual: [
    "IsLooselyEqual",
    "IsStrictlyEqual",
    "SameValueNonNumber",
    "Number::equal",
    "ToNumber",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
  ],
  IsStrictlyEqual: ["IsStrictlyEqual", "SameValueNonNumber", "Number::equal"],
  AbstractRelationalComparison: [
    "AbstractRelationalComparison",
    "Number::lessThan",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
    "ToNumeric",
    "ToNumber",
  ],
  BinaryExpression: [
    "IsLooselyEqual",
    "IsStrictlyEqual",
    "AbstractRelationalComparison",
    "SameValueNonNumber",
    "Number::equal",
    "Number::lessThan",
    "Number::add",
    "Number::subtract",
    "Number::multiply",
    "Number::divide",
    "Number::remainder",
    "Number::exponentiate",
    "Number::leftShift",
    "Number::signedRightShift",
    "Number::unsignedRightShift",
    "Number::bitwiseAND",
    "Number::bitwiseXOR",
    "Number::bitwiseOR",
    "NumberBitwiseOp",
    "Number::toString",
    "ToPrimitive",
    "OrdinaryToPrimitive",
    "GetMethod",
    "GetV",
    "ToObject",
    "Get",
    "Call",
    "ToNumeric",
    "ToNumber",
    "ToString",
  ],
};

// ── Clause cache: id → rendered outerHTML ────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

let _clauseById: Map<string, string> | null = null;

async function getClauseById(): Promise<Map<string, string>> {
  if (_clauseById && !IS_DEV) return _clauseById;

  const source = await readFile(SPEC_FILE, "utf-8");

  const spec = await build("spec.html", async (path: string) => (path === "spec.html" ? source : ""), {
    assets: "none",
    toc: false,
    copyright: false,
  });

  const map = new Map<string, string>();
  for (const el of Array.from(spec.doc.querySelectorAll("emu-clause"))) {
    const id = (el as Element).getAttribute("id");
    if (!id) continue;

    // Inject spec link into the h1 title if we have a URL for this algo
    const specUrl = ALGO_SPEC_URL[id];
    if (specUrl) {
      const h1 = (el as Element).querySelector("h1");
      if (h1) {
        h1.insertAdjacentHTML(
          "beforeend",
          ` <a class="spec-ext-link" href="${specUrl}" target="_blank" rel="noopener noreferrer" ` +
            `aria-label="Open ${id} in ECMAScript specification">${LINK_ICON_SVG}</a>`,
        );
      }
    }

    map.set(id, (el as Element).outerHTML);
  }

  _clauseById = map;
  return map;
}

// ── Per-function HTML cache ───────────────────────────────────────────────────

const _cache = new Map<string, string>();

export async function buildSpecHtmlForFunction(functionName: string): Promise<string | null> {
  const algoIds = FUNCTION_ALGOS[functionName];
  if (!algoIds) return null;

  if (!IS_DEV && _cache.has(functionName)) return _cache.get(functionName)!;

  const clauses = await getClauseById();
  const html = algoIds
    .map((id) => clauses.get(id) ?? "")
    .filter(Boolean)
    .join("\n");

  if (!IS_DEV) _cache.set(functionName, html);
  return html || null;
}

export const SUPPORTED_SPEC_FUNCTIONS = Object.keys(FUNCTION_ALGOS);
