# Algorithm Executors - Документация

## Обзор

**Algorithm Executors** - это реализация 4 основных алгоритмов преобразования типов согласно спецификации ECMAScript (ECMA-262):

1. **StringToNumberExecutor** - преобразует строку в число
2. **OrdinaryToPrimitiveExecutor** - преобразует объект в примитив обычным способом
3. **ToPrimitiveExecutor** - главный алгоритм преобразования в примитив
4. **ToNumberExecutor** - преобразует любое значение в число

Каждый executor выполняет алгоритм **со скотолкой шагов**, которая содержит информацию о каждом этапе выполнения для отображения на UI.

## Структура результата

Все executors возвращают `TraceResult`:

```typescript
interface TraceResult {
  algorithmId: string; // уникальный идентификатор алгоритма
  algorithmName: string; // имя алгоритма
  algorithmDescription: string; // описание из спеки
  algorithmSection?: string; // раздел в спеке
  algorithmUrl?: string; // URL на спеку
  input: unknown; // входные данные
  output?: unknown; // выходные данные
  success: boolean; // успешно ли выполнен
  steps: ExecutedStep[]; // все шаги выполнения
  finalValue?: unknown; // финальное значение (для успешного выполнения)
  error?: string; // ошибка (если была)
}
```

## ExecutedStep структура

Каждый шаг содержит:

```typescript
interface ExecutedStep {
  number?: number | string; // номер шага (1, 2, 3...)
  letter?: string; // буква подшага (a, b, c...)
  roman?: string; // римская цифра (i, ii, iii...)
  kind: string; // тип шага (return, assignment, conditional...)
  description: string; // описание шага из спеки
  executed: boolean; // был ли шаг выполнен
  result?: unknown; // результат этого шага
  reason?: string; // причина/ошибка (если есть)
  subSteps?: ExecutedStep[]; // вложенные шаги
  nestedTrace?: TraceResult; // трассировка вложенного алгоритма
}
```

## Примеры использования

### Пример 1: StringToNumber

```typescript
import { StringToNumberExecutor } from "./algorithms/executors";

const result = StringToNumberExecutor.execute("42");
console.log(result.finalValue); // 42
console.log(result.steps); // Все шаги выполнения

// JSON структура для отправки на UI
const json = JSON.stringify(result, null, 2);
```

### Пример 2: ToNumber с разными типами

```typescript
import { ToNumberExecutor } from "./algorithms/executors";

// Число
const resultNum = ToNumberExecutor.execute(42);
// finalValue: 42, steps: [{ kind: 'return', description: 'If argument is a Number, return argument.' }]

// Undefined
const resultUndef = ToNumberExecutor.execute(undefined);
// finalValue: NaN

// Строка
const resultStr = ToNumberExecutor.execute("42");
// finalValue: 42, с вложенной трассировкой StringToNumber

// Объект
const resultObj = ToNumberExecutor.execute({ valueOf: () => 42 });
// finalValue: 42, с вложенной трассировкой ToPrimitive и OrdinaryToPrimitive
```

### Пример 3: OrdinaryToPrimitive с разными hints

```typescript
import { OrdinaryToPrimitiveExecutor } from "./algorithms/executors";

const obj = {
  valueOf: () => 42,
  toString: () => "42",
};

// Для NUMBER hint используется порядок: valueOf, потом toString
const resultNum = OrdinaryToPrimitiveExecutor.execute(obj, "number");
// finalValue: 42

// Для STRING hint используется порядок: toString, потом valueOf
const resultStr = OrdinaryToPrimitiveExecutor.execute(obj, "string");
// finalValue: '42'
```

### Пример 4: ToPrimitive с Symbol.toPrimitive

```typescript
import { ToPrimitiveExecutor } from "./algorithms/executors";

const objWithToPrimitive = {
  [Symbol.toPrimitive]: (hint) => {
    console.log("ToPrimitive hint:", hint);
    return "custom result";
  },
  valueOf: () => 42, // не будет использован
};

const result = ToPrimitiveExecutor.execute(objWithToPrimitive, "number");
// finalValue: 'custom result'
// steps содержит вызов Symbol.toPrimitive
```

## Трассировка вложенных алгоритмов

Когда один алгоритм вызывает другой, в trace'е создается вложенная трассировка:

```typescript
const result = ToNumberExecutor.execute({ toString: () => "42" });

// Шаги ToNumber включают:
// 1. Вызов ToPrimitive (вложенная трассировка)
// 2. ToNumber от результата ToPrimitive

// Можно получить вложенную трассировку:
const toPrimitivStep = result.steps.find((s) => s.nestedTrace?.algorithmId === "toPrimitive");
console.log(toPrimitivStep.nestedTrace); // TraceResult для ToPrimitive
```

## Вспомогательные классы

### TypeChecker

Утилиты для проверки типов значений:

```typescript
import { TypeChecker } from "./algorithms/executors";

TypeChecker.getType(42); // 'number'
TypeChecker.getType("hello"); // 'string'
TypeChecker.getType({}); // 'object'
TypeChecker.isObject({}); // true
TypeChecker.isPrimitive(42); // true
TypeChecker.isCallable(() => {}); // true
TypeChecker.isSymbolOrBigInt(Symbol("x")); // true
```

### StepBuilder

Утилиты для создания ExecutedStep:

```typescript
import { StepBuilder } from "./algorithms/executors";

const returnStep = StepBuilder.returnStep("description", result);
const assignmentStep = StepBuilder.assignment("description", result);
const conditionalStep = StepBuilder.conditional("description", subSteps);
const throwStep = StepBuilder.throw("description", errorMessage);
```

## Интеграция с UI

Для отображения trace на UI можно:

1. **Отправить весь `TraceResult` на UI**:

```typescript
const trace = ToNumberExecutor.execute(input);
return res.json(trace); // ВесьTrace в JSON
```

2. **Рекурсивно обойти все шаги**:

```typescript
function renderSteps(steps: ExecutedStep[], level = 0) {
  return steps.map(step => (
    <>
      <div style={{ marginLeft: `${level * 20}px` }}>
        {step.description}
        {step.result && <span> → {JSON.stringify(step.result)}</span>}
      </div>
      {step.nestedTrace && (
        <NestedAlgorithmTrace trace={step.nestedTrace} level={level + 1} />
      )}
      {step.subSteps && renderSteps(step.subSteps, level + 1)}
    </>
  ));
}
```

3. **Визуализировать дерево вызовов**:

```typescript
// Каждый nestedTrace показывает вызов другого алгоритма
// Можно построить граф вызовов и отобразить на диаграмме
```

## Тестирование

Все executors имеют полное покрытие тестами:

```bash
npm test -- --testPathPatterns="executors"
```

## Производительность

- Executors выполняются **синхронно**
- Нет асинхронных операций
- Трассировка не требует больших объемов памяти (даже для глубоких вложений)
- Логирование в trace не влияет на производительность выполнения алгоритма

## Расширение

Чтобы добавить новый executor:

1. Создайте класс наследующей от одного из существующих или создайте новый
2. Используйте `StepBuilder` для создания шагов
3. Возвращайте `TraceResult` с информацией о выполнении
4. Напишите тесты в `executors.test.ts`

## Связанные файлы

- [executors.ts](./executors.ts) - реализация всех executors
- [executors.test.ts](./executors.test.ts) - тесты (38 успешных тестов)
- [to-primitive.ts](./to-primitive.ts) - спека для ToPrimitive
- [to-number.ts](./to-number.ts) - спека для ToNumber
- [ordinary-to-primitive.ts](./ordinary-to-primitive.ts) - спека для OrdinaryToPrimitive
- [string-to-number.ts](./string-to-number.ts) - спека для StringToNumber
