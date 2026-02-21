import type { AlgorithmSpec } from "../abstract-operations-tracer";

export class StringToNumberAlgorithm {
  static getSpec(): AlgorithmSpec {
    return {
      id: "stringToNumber",
      name: "StringToNumber",
      section: "7.1.4.1.1",
      url: "https://262.ecma-international.org/#sec-stringtonumber",
      description: "The abstract operation StringToNumber takes argument str (a String) and returns a Number.",
      steps: [
        {
          number: 1,
          kind: "assignment",
          description: "Let literal be ParseText(str, StringNumericLiteral).",
        },
        {
          number: 2,
          kind: "return",
          description: "If literal is a List of errors, return NaN.",
        },
        {
          number: 3,
          kind: "return",
          description: "Return the StringNumericValue of literal.",
        },
      ],
    };
  }

  /**
   * Simple execute method for test compatibility
   */
  static execute(str: string): number {
    const trimmed = String(str).trim();
    if (trimmed === '') return 0;
    if (trimmed === 'Infinity') return Infinity;
    if (trimmed === '+Infinity') return Infinity;
    if (trimmed === '-Infinity') return -Infinity;
    const parsed = Number(trimmed);
    return parsed;
  }

  /**
   * Execute with trace for test compatibility
   */
  static executeWithTrace(str: string) {
    const trimmed = String(str).trim();
    let literal: number | null = null;
    let value = NaN;

    if (trimmed === '') {
      literal = 0;
      value = 0;
    } else if (trimmed === 'Infinity') {
      literal = Infinity;
      value = Infinity;
    } else if (trimmed === '+Infinity') {
      literal = Infinity;
      value = Infinity;
    } else if (trimmed === '-Infinity') {
      literal = -Infinity;
      value = -Infinity;
    } else {
      const parsed = Number(trimmed);
      if (!isNaN(parsed)) {
        literal = parsed;
      }
      value = parsed;
    }

    return {
      steps: literal === null ? [{ number: 1 }, { number: 2 }] : [{ number: 1 }, { number: 3 }],
      literal,
      value,
      scriptResult: value,
      runtimeSteps: [
        {
          operation: 'Number(str)',
          description: 'Runtime execution in JS/V8 model: Number(str).',
          result: value,
        },
      ],
      specSteps: this.getSpec().steps,
    };
  }
}

// class ToPrimitiveTracer {
//   constructor() {
//     this.steps = []; // Хранит шаги ToPrimitive
//   }

//   // Главный метод
//   run(input, preferredType) {
//     const result = this.#toPrimitive(input, preferredType);
//     return {
//       result,
//       trace: this.steps,
//     };
//   }

//   // Приватный метод ToPrimitive
//   #toPrimitive(input, preferredType) {
//     const stepNode = {
//       value: input,
//       preferredType: preferredType || "none",
//       result: null,
//       stepDescription: "",
//     };

//     // Добавляем шаг в трейс
//     this.steps.push(stepNode);

//     // Шаг 1. Если input не объект, возвращаем его как есть
//     if (typeof input !== "object" || input === null) {
//       stepNode.result = input;
//       stepNode.stepDescription = `Значение не является объектом: возвращаем его как есть (${input}).`;
//       return input;
//     }

//     // Шаг 2. Пытаемся привести к примитиву через valueOf или toString
//     let methodNames =
//       preferredType === "string"
//         ? ["toString", "valueOf"]
//         : preferredType === "number"
//           ? ["valueOf", "toString"]
//           : ["valueOf", "toString"]; // По умолчанию пытаемся так же

//     for (const method of methodNames) {
//       if (typeof input[method] === "function") {
//         try {
//           const result = input[method]();
//           if (typeof result !== "object") {
//             stepNode.result = result;
//             stepNode.stepDescription = `"${method}" успешно преобразовало объект в ${typeof result}: ${result}`;
//             return result; // Преобразование успешно
//           }
//         } catch (error) {
//           stepNode.stepDescription = `"${method}" вызвало ошибку: ${error}`;
//         }
//       }
//     }

//     // Шаг 3. Если приведение невозможно, выбрасываем ошибку
//     stepNode.result = null;
//     stepNode.stepDescription = "Не удалось привести объект к примитиву, выбрасываем ошибку.";
//     throw new TypeError("Cannot convert object to primitive value");
//   }

//   // Возвращает трейс шагов
//   getTrace() {
//     return this.steps;
//   }
// }

// class ToNumberTracer {
//   constructor(inputValue) {
//     this.inputValue = inputValue;
//     this.steps = []; // Хранит шаги для трейса ToNumber
//     this.primitiveTracer = new ToPrimitiveTracer(); // Экземпляр ToPrimitive для внутреннего использования
//   }

//   run() {
//     this.tree = this.#toNumber(this.inputValue);
//     return this.tree;
//   }

//   #toNumber(value) {
//     const stepNode = {
//       value,
//       type: typeof value,
//       result: null,
//       stepDescription: "",
//       children: [],
//     };

//     this.steps.push(stepNode);

//     if (typeof value === "number") {
//       stepNode.result = value;
//       stepNode.stepDescription = "Значение — это число, возвращаем его как есть.";
//       return stepNode;
//     }

//     if (value === undefined) {
//       stepNode.result = NaN;
//       stepNode.stepDescription = "Значение undefined, возвращаем NaN.";
//       return stepNode;
//     }

//     if (value === null) {
//       stepNode.result = 0;
//       stepNode.stepDescription = "Значение null, возвращаем 0.";
//       return stepNode;
//     }

//     if (typeof value === "string") {
//       const parsed = parseFloat(value);
//       stepNode.result = isNaN(parsed) ? NaN : parsed;
//       stepNode.stepDescription = `Значение строка, предпринята попытка парсинга. Результат: ${stepNode.result}.`;
//       return stepNode;
//     }

//     if (typeof value === "object") {
//       stepNode.stepDescription = "Значение объект, используем алгоритм ToPrimitive.";

//       // Запускаем ToPrimitiveTracer
//       try {
//         const { result, trace } = this.primitiveTracer.run(value);
//         stepNode.stepDescription += " Преобразование прошло успешно.";
//         const childNode = this.#toNumber(result); // Рекурсивный вызов ToNumber на примитиве
//         stepNode.children.push(childNode);
//         stepNode.result = childNode.result;
//       } catch (error) {
//         stepNode.result = NaN;
//         stepNode.stepDescription += ` Ошибка при преобразовании: ${error.message}`;
//       }

//       return stepNode;
//     }

//     if (typeof value === "boolean") {
//       stepNode.result = value ? 1 : 0;
//       stepNode.stepDescription = `Значение boolean, преобразуется в ${stepNode.result}.`;
//       return stepNode;
//     }

//     stepNode.result = NaN;
//     stepNode.stepDescription = "Тип значения неизвестен, возвращаем NaN.";
//     return stepNode;
//   }

//   // Возвращает трейс шагов
//   getTrace() {
//     return {
//       toNumberSteps: this.steps,
//       toPrimitiveSteps: this.primitiveTracer.getTrace(),
//     };
//   }
// }
