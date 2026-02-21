# Быстрый старт для UI разработчика

## 🚀 За 5 минут до первого результата

### 1. Получи trace для значения

```typescript
import { executeAlgorithm } from "./algorithms/executor-usage-examples";

// Правая кнопка отправляет запрос
const trace = executeAlgorithm({
  algorithm: "toNumber",
  input: 42,
});

console.log(trace);
// {
//   algorithmId: 'toNumber',
//   algorithmName: 'ToNumber',
//   output: 42,
//   steps: [...]
// }
```

### 2. Отправь на UI через JSON

```typescript
app.post("/api/coerce", (req, res) => {
  const trace = executeAlgorithm(req.body);
  res.json(trace); // UI получит полный trace
});
```

### 3. Отрисуй на UI

```tsx
function TraceViewer({ trace }) {
  return (
    <div className="trace">
      <h2>{trace.algorithmName}</h2>
      <div>
        Input: <code>{JSON.stringify(trace.input)}</code>
      </div>
      <div>
        Output: <code>{JSON.stringify(trace.output)}</code>
      </div>

      <div className="steps">
        {trace.steps.map((step, i) => (
          <div key={i} className={`step step-${step.kind}`}>
            <strong>{step.kind}</strong>: {step.description}
            {step.result && <div>→ {JSON.stringify(step.result)}</div>}
            {step.nestedTrace && <TraceViewer trace={step.nestedTrace} />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 📦 Доступные алгоритмы

```typescript
const algorithms = ["toNumber", "stringToNumber", "toPrimitive", "ordinaryToPrimitive"];

for (const algo of algorithms) {
  const trace = executeAlgorithm({
    algorithm: algo,
    input: myValue,
    hint: "number", // опционально для toPrimitive/ordinaryToPrimitive
  });
}
```

## 📊 Примеры результатов

### Пример 1: Число (простой случай)

```json
{
  "algorithmId": "toNumber",
  "algorithmName": "ToNumber",
  "input": 42,
  "output": 42,
  "success": true,
  "steps": [
    {
      "number": 1,
      "kind": "return",
      "description": "If argument is a Number, return argument.",
      "result": 42
    }
  ],
  "finalValue": 42
}
```

### Пример 2: Объект (со вложениями)

```json
{
  "algorithmId": "toNumber",
  "algorithmName": "ToNumber",
  "input": { "valueOf": "function" },
  "output": 42,
  "success": true,
  "steps": [
    {
      "number": 8,
      "kind": "assignment",
      "description": "Let primValue be ? ToPrimitive(...)",
      "nestedTrace": {
        "algorithmId": "toPrimitive",
        "steps": [...],
        "finalValue": 42
      }
    },
    {
      "number": 10,
      "kind": "return",
      "description": "Return ? ToNumber(primValue)",
      "nestedTrace": {
        "algorithmId": "toNumber",
        "steps": [...],
        "finalValue": 42
      }
    }
  ],
  "finalValue": 42
}
```

## 🎯 Основные поля trace

| Поле            | Описание                                        |
| --------------- | ----------------------------------------------- |
| `algorithmId`   | ID алгоритма: 'toNumber', 'stringToNumber', ... |
| `algorithmName` | Название: 'ToNumber', 'StringToNumber', ...     |
| `input`         | Входное значение                                |
| `output`        | Выходное значение (если успешно)                |
| `success`       | boolean - успешно ли                            |
| `steps`         | Массив шагов выполнения                         |
| `finalValue`    | Финальный результат                             |
| `error`         | Сообщение об ошибке (если была)                 |

## 📋 Структура шага (ExecutedStep)

| Поле          | Описание                                  |
| ------------- | ----------------------------------------- |
| `kind`        | Тип: 'return', 'assignment', 'throw', ... |
| `description` | Текст из спеки ECMA-262                   |
| `number`      | Номер шага (1, 2, 3)                      |
| `letter`      | Буква подшага (a, b, c)                   |
| `roman`       | Римская цифра (i, ii, iii)                |
| `executed`    | Был ли выполнен                           |
| `result`      | Результат этого шага                      |
| `reason`      | Причина ошибки                            |
| `subSteps`    | Вложенные шаги (для условност и циклов)   |
| `nestedTrace` | Трассировка вложенного алгоритма          |

## 🧪 Тестово-готовые примеры

```typescript
import { getAllExamples } from "./algorithms/executor-output-examples";

const examples = getAllExamples();
// 8 готовых примеров результатов для тестирования UI
```

## 🔌 API для backend

```typescript
// Request
interface CoercionRequest {
  algorithm: "toNumber" | "stringToNumber" | "toPrimitive" | "ordinaryToPrimitive";
  input: unknown;
  hint?: "string" | "number" | "default"; // Опционально
}

// Response
type CoercionResponse = TraceResult;

// Endpoint
POST / api / coerce;
Body: CoercionRequest;
Response: CoercionResponse(JSON);
```

## 💡 Полезные утилиты

```typescript
// Сравнить несколько входов на одном алгоритме
import { compareInputs } from "./algorithms/executor-usage-examples";

const results = compareInputs("toNumber", [42, true, null, undefined, "42"]);

// Получить статистику trace
import { getTraceStatistics } from "./algorithms/executor-usage-examples";

const stats = getTraceStatistics(trace);
// { totalSteps: 5, algorithms: ['toNumber', 'toPrimitive'], success: true, ... }

// Получить примеры для каждого алгоритма
import { EXAMPLES } from "./algorithms/executor-usage-examples";

EXAMPLES.toNumber.map((ex) => console.log(ex.input, ex.description));
```

## 🎨 CSS для стилизации

```css
/* Разные типы шагов */
.step-return {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
}
.step-assignment {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
}
.step-throw {
  background: #ffebee;
  border-left: 4px solid #f44336;
}
.step-conditional {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}
.step-assertion {
  background: #f3e5f5;
  border-left: 4px solid #9c27b0;
}

.nested-trace {
  margin-left: 20px;
  border-left: 2px dashed #ccc;
  padding-left: 10px;
}

.step-result {
  font-family: "Courier New", monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 3px;
  margin: 4px 0;
}
```

## 🐛 Отладка

```typescript
// Посмотри полный trace в консоли
const trace = executeAlgorithm({ algorithm: "toNumber", input: myValue });
console.log(JSON.stringify(trace, null, 2));

// Посчитай все вложенные шаги
function countSteps(trace) {
  let count = trace.steps.length;
  for (const step of trace.steps) {
    if (step.nestedTrace) count += countSteps(step.nestedTrace);
    if (step.subSteps) count += step.subSteps.length;
  }
  return count;
}

// Какие алгоритмы использованы
function getAllAlgorithms(trace, result = []) {
  result.push(trace.algorithmId);
  for (const step of trace.steps) {
    if (step.nestedTrace) getAllAlgorithms(step.nestedTrace, result);
  }
  return result;
}
```

## 🧩 Типы TypeScript

```typescript
import type { TraceResult, ExecutedStep, JSValue, AlgorithmSpec, AlgorithmStep } from "./coercion-visualizer";

// Используй в своих типах
interface CoercionState {
  trace: TraceResult | null;
  loading: boolean;
  error: string | null;
}
```

## 📚 Документация

- 👉 [Подробная README](./README.md)
- 👉 [Документация EXECUTORS.md](./EXECUTORS.md)
- 👉 [Примеры использования](./executor-usage-examples.ts)
- 👉 [Примеры JSON](./executor-output-examples.ts)

## ⚡ Производительность

- **Синхронное выполнение** - мгновенно
- **Малый overhead** - только необходимая инструментация
- **Масштабируемость** - работает с любой глубиной вложений

## ✅ Готово!

Все компоненты готовы к использованию. Просто импортируй `executeAlgorithm` и начинай использовать трассировку! 🚀
