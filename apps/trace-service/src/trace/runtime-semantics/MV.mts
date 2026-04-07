import { F } from '../index.mts';
import { createTraceEntryFromValue } from '../trace-builder.mts';
import type { Value } from '../value.mts';

/** https://tc39.es/ecma262/#sec-runtime-semantics-mv-s */
//   StringNumericLiteral :::
//     [empty]
//     StrWhiteSpace
//     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
export function MV_StringNumericLiteral(StringNumericLiteral: string, traceSource?: Value) {
  const numericValue = Number(StringNumericLiteral);
  const result = F(numericValue);

  if (traceSource) {
    result.trace = traceSource.trace;
    const traceEntry = createTraceEntryFromValue({
      argument: result,
      algoId: 'StringToNumber',
      inputs: [`"${StringNumericLiteral}"`],
    });

    traceEntry({ kind: 'operation', hint: `Step 1: Let text be StringToCodePoints("${StringNumericLiteral}").`, specOrder: 1 });
    traceEntry({ kind: 'operation', hint: `Step 2: Let literal be ParseText(text, |StringNumericLiteral|).`, specOrder: 2 });

    if (isNaN(numericValue)) {
      traceEntry({ kind: 'if', hint: `Step 3: literal is a List of errors — "${StringNumericLiteral}" cannot be parsed as a numeric literal.`, specOrder: 3, taken: true });
      traceEntry({ kind: 'return', hint: `Step 3: Return *NaN*.`, specOrder: 3 }, result);
    } else {
      traceEntry({ kind: 'if', hint: `Step 3: literal is not a List of errors — string parsed successfully.`, specOrder: 3, taken: false });
      traceEntry({ kind: 'operation', hint: `Step 4: Let mv be the MV of literal = ${numericValue}.`, specOrder: 4 });
      const mvStr = isFinite(numericValue) ? String(numericValue) : (numericValue > 0 ? '+∞' : '-∞');
      traceEntry({ kind: 'note', hint: `Step 5: Assert: mv (${mvStr}) is a finite Mathematical value or +∞ or -∞.`, specOrder: 5 });
      traceEntry({ kind: 'return', hint: `Step 6: Return 𝔽(mv) = ${mvStr}.`, specOrder: 6 }, result);
    }
  }

  return result;
}
