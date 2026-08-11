# Code review: js-engines

**Дата:** 2026-08-12 · **Ветка:** `main` · **Базовый коммит:** `dcf6fbe`

Ревью проведено в формате «senior engineer перед крупным рефакторингом»: поиск нарушений
SOLID, дублирования, архитектурных проблем, отклонений от best practices стека и
технического долга.

---

## Содержание

- [Что ревьюировалось](#что-ревьюировалось)
- [Как проверялось](#как-проверялось)
- [Главный вывод](#главный-вывод)
- [1. Высокая критичность](#1-высокая-критичность)
- [2. Средняя критичность](#2-средняя-критичность)
- [3. Низкая критичность](#3-низкая-критичность)
- [Топ-10 для старта рефакторинга](#топ-10-для-старта-рефакторинга)
- [Общая оценка архитектуры](#общая-оценка-архитектуры)
- [План действий](#план-действий)

---

## Что ревьюировалось

**Стек** (определён по репозиторию): TypeScript-монорепо, Node 22.

| Слой | Технологии |
|---|---|
| Фронтенд | Next.js 15 (App Router, Turbopack), Chakra UI v3, Zustand, Jest + jsdom |
| API-шлюз | Fastify, Zod, ioredis, undici, prom-client |
| Engine-сервисы (×4) | Fastify + общий пакет `packages/engine-runtime`, `child_process.spawn` |
| Trace-service | Fastify + engine262 в `worker_threads` |
| Инфраструктура | Docker, k8s (namespace `jslab`), skaffold, GitHub Actions |

**Объём первичного кода:** ~16 300 строк в ~120 файлах.

**Исключено из ревью:** `apps/trace-service/engine262` — вендоренный git-сабмодуль
(форк `pavlof01/engine262`, ветка `jslab/trace-instrumentation`), это сторонний код.

---

## Как проверялось

Все находки ниже подтверждены запуском инструментов, а не только чтением кода:

| Проверка | Команда | Результат |
|---|---|---|
| Типы, api | `npm run lint` (`tsc --noEmit`) | чисто |
| Типы, trace-service | `npm run lint` | чисто |
| Типы, фронтенд | `tsc --noEmit -p tsconfig.json` | чисто |
| Тесты, api | `npm test` (vitest) | 59 passed / 3 файла |
| Тесты, фронтенд | `npx jest` | 62 passed / 10 сьютов |
| Lint, фронтенд | `npx eslint .` | **19 warnings, 0 errors** |
| Циклические зависимости | `npx madge --circular` | **1 цикл** |

19 предупреждений eslint и единственный цикл разобраны ниже как отдельные находки
(H1, M12, M13, L3).

---

## Главный вывод

Бэкенд и `engine-runtime` — заметно выше среднего. Это не вежливость: там продуманные
инварианты (single-flight в [`server.ts:293`](../apps/api/src/server.ts#L293), честный
split байтового бюджета между stdout/stderr в
[`run.ts:41-48`](../packages/engine-runtime/src/run.ts#L41-L48), `#settle(id)` против
гонок в [`sandbox.ts:225`](../apps/trace-service/src/server/execute/sandbox.ts#L225)),
а комментарии объясняют *почему*, а не *что*. Придумывать там проблемы не нужно.

Практически весь технический долг сосредоточен во фронтенде — и это ожидаемо: там нет
тех же дисциплин (нет тестов компонентов, lint-гейт не блокирует сборку). Ниже 33 находки;
серьёзные — почти все на фронте.

---

## 1. Высокая критичность

### H1. Реальный баг: сниппеты не рендерятся в диалоге «V8 Internals»

**Файл:** [`apps/frontend/src/components/Samples/index.tsx:198-210`](../apps/frontend/src/components/Samples/index.tsx#L198-L210)
**Категория:** best practice / баг · **Критичность:** высокая

`useMemo` читает `browseOpen` **и** `v8BrowseOpen`, но в списке зависимостей только
`browseOpen`. Сценарий: открываем «V8 Internals», не открыв до этого «Browse Samples»
→ мемо не пересчитывается → `shikiAdapter` остаётся `null` → блок на
[строке 309](../apps/frontend/src/components/Samples/index.tsx#L309) не рендерится,
и карточки показываются без кода.

Eslint это ловит (`react-hooks/exhaustive-deps`), но предупреждение не блокирует CI —
см. [M13](#m13-lint-гейт-фронтенда-декоративный).

```ts
// было
  }, [browseOpen]);

// стало
  }, [browseOpen, v8BrowseOpen]);
```

---

### H2. Устаревший комментарий, который прямо вводит в заблуждение

**Файл:** [`packages/engine-runtime/src/flags.ts:1-11`](../packages/engine-runtime/src/flags.ts#L1-L11)
**Категория:** техдолг · **Критичность:** высокая

Шапка файла требует держать его байт-в-байт синхронным с `apps/api/src/flags.ts`
и утверждает, что api «не может взять `file:`-зависимость на этот пакет». Оба
утверждения неверны начиная с коммита `dcf6fbe`:

- файла `apps/api/src/flags.ts` не существует;
- [`schemas.ts:2`](../apps/api/src/schemas.ts#L2) импортирует напрямую из `@jslab/engine-runtime`;
- теста-зеркала `flags.test.ts` в `apps/api` тоже нет.

В [`CLAUDE.md`](../CLAUDE.md) осталась парная неточность: «`npm run test` # vitest
(includes the flag-catalog mirror test)».

Для публичного репозитория это худший вид долга: новый контрибьютор пойдёт создавать
копию, которую комментарий требует поддерживать.

**Исправление:** удалить блок про зеркалирование, оставив описание назначения каталога;
поправить строку в `CLAUDE.md`.

---

### H3. `fetch` внутри Zustand-стора + гонка ответов

**Файл:** [`apps/frontend/src/app/abstract-functions-visualizer/store.ts:164-203`](../apps/frontend/src/app/abstract-functions-visualizer/store.ts#L164-L203)
**Категория:** архитектура / DRY / баг · **Критичность:** высокая

Два дефекта в одном месте.

**1. Смешение слоёв.** Стор сам ходит в сеть и знает форму ответа (`data.success`,
`data.root`, `data.effectiveAlgoId`). Соседний стор устроен правильно — делегирует
в [`lib/api.ts`](../apps/frontend/src/lib/api.ts). Две разные архитектуры на один
и тот же тип задачи внутри одного приложения.

**2. Нет защиты от устаревших ответов.** В playground-сторе это решено монотонным
токеном ([`useEngineOutputs.ts:10`](../apps/frontend/src/store/useEngineOutputs.ts#L10),
проверка на [строке 166](../apps/frontend/src/store/useEngineOutputs.ts#L166)).
Здесь — нет. С учётом 150 мс дебаунса в
[`useVisualizerRuntime.ts:115`](../apps/frontend/src/app/abstract-functions-visualizer/useVisualizerRuntime.ts#L115)
два быстрых запуска легко приходят не по порядку, и старая трасса затирает новую.

**Исправление:** вынести вызов в `lib/traceApi.ts` (по образцу `runEngine`) и добавить
тот же токен свежести. Лучше — вынести токен в общий хелпер, раз он нужен обоим сторам.

---

### H4. God-компонент: `Samples`

**Файл:** [`apps/frontend/src/components/Samples/index.tsx`](../apps/frontend/src/components/Samples/index.tsx) (659 строк)
**Категория:** SOLID — Single Responsibility · **Критичность:** высокая

В одном компоненте: 12 `useState`, 4 диалога, CRUD пользовательских сниппетов,
персист в localStorage, сопоставление текущего кода с каталогом, настройка shiki
и вся вёрстка.

Отдельно — `renderSampleCard`
([строки 269-333](../apps/frontend/src/components/Samples/index.tsx#L269-L333)):
компонент, замаскированный под `useCallback`. React видит инлайн-элементы,
мемоизация не работает, хуки внутри использовать нельзя.

**Разбор:**

| Извлечь | Ответственность |
|---|---|
| `useCustomSamples()` | стейт + персист + валидация |
| `useActiveSample()` | сопоставление текущего кода с каталогом |
| `<SampleCard>` | настоящий `memo`-компонент вместо `renderSampleCard` |
| `<SampleDialog>` | три почти одинаковых диалога (save/rename — ~50 строк дубля каждый) |
| `<Samples>` | тонкая композиция |

---

### H5. God-хук: `useVisualizerRuntime`

**Файл:** [`apps/frontend/src/app/abstract-functions-visualizer/useVisualizerRuntime.ts`](../apps/frontend/src/app/abstract-functions-visualizer/useVisualizerRuntime.ts) (171 строка)
**Категория:** SOLID — SRP + DRY · **Критичность:** высокая

22 отдельные подписки на стор, 5 эффектов (гидратация, spec, trace, playback-интервал,
фолбэк каталога), два ref-«ключа» с ручным сбросом в `null` — паттерн
«запускать один раз, кроме случаев когда». В `return` 12 раз повторяется
`clientReady ? x : resolvedInitialData.y`.

**Разбор:** `useHydratedVisualizerState()` (SSR-зеркало; 12 тернарников заменяются одним
`clientReady ? storeSlice : initialSlice`), `useSpecHtml(selectedAlgo)`,
`useAutoRun(...)`, `usePlayback(...)`.

---

### H6. Один «толстый» селектор на весь стор

**Файл:** [`apps/frontend/src/store/useEngineOutputs.ts:217-233`](../apps/frontend/src/store/useEngineOutputs.ts#L217-L233)
**Категория:** SOLID — Interface Segregation / производительность · **Критичность:** высокая

`useEngineOutputsState()` возвращает **всё** состояние. `useShallow` сравнивает объект
целиком, поэтому любой потребитель перерисовывается на любое изменение.

Практический эффект:

- `setCode` на каждое нажатие клавиши в редакторе перерисовывает
  [`OutputsPanel`](../apps/frontend/src/components/OutputsPanel/index.tsx#L23)
  со всей подсветкой байткода;
- завершение прогона (`out`) перерисовывает
  [`PlaygroundClient`](../apps/frontend/src/app/_components/PlaygroundClient.tsx#L31),
  которому `out` не нужен вовсе.

Заменить на точечные селекторы — в соседнем сторе так и сделано
([`useVisualizerRuntime.ts:40-64`](../apps/frontend/src/app/abstract-functions-visualizer/useVisualizerRuntime.ts#L40-L64)):

```ts
// было
const { status, code } = useEngineOutputsState();

// стало
const status = useEngineOutputsStore((s) => s.status);
const code   = useEngineOutputsStore((s) => s.code);
```

---

### H7. Каталог spec-функций размазан по 4 несинхронизируемым спискам

**Файлы:** [`helpers.ts:42-54`](../apps/trace-service/src/server/execute/helpers.ts#L42-L54),
[`192-202`](../apps/trace-service/src/server/execute/helpers.ts#L192-L202),
[`207-252`](../apps/trace-service/src/server/execute/helpers.ts#L207-L252)
+ `FUNCTION_ALGOS` в [`spec-generator.ts`](../apps/trace-service/src/server/spec-generator.ts)
**Категория:** SOLID — Open/Closed + DRY · **Критичность:** высокая

`AVAILABLE_FUNCTIONS` — это буквально `Object.keys(FUNCTION_META)`, выписанный руками.
`callECMA262Function` — switch на 20 веток, из которых 11 недостижимы (их нет ни
в `FUNCTION_META`, ни в `AVAILABLE_FUNCTIONS`). Добавление функции требует правок
в 3-4 местах, и ничто не проверяет согласованность.

```ts
// стало: одна таблица — источник истины
const FUNCTIONS = {
  ToNumber: { category: "typeConversion", arity: "unary", call: ToNumber },
  ToString: { category: "typeConversion", arity: "unary", call: ToString },
  // ...
} as const satisfies Record<string, FunctionEntry>;

export const AVAILABLE_FUNCTIONS = Object.keys(FUNCTIONS);
export const FUNCTION_META = mapValues(FUNCTIONS, ({ call, ...meta }) => meta);
```

---

## 2. Средняя критичность

### M1. Пятикратный дубль блока проверки rate-limit

**Файл:** [`apps/api/src/server.ts`](../apps/api/src/server.ts) — строки
[141-148](../apps/api/src/server.ts#L141-L148),
[389-394](../apps/api/src/server.ts#L389-L394),
[416-421](../apps/api/src/server.ts#L416-L421),
[520-531](../apps/api/src/server.ts#L520-L531)
**Категория:** DRY

Блок «проверить лимит → inc метрику → отдать 429 с `retryAfter`» повторён 5 раз дословно.

**Исправление:** `async function checkBudget(redis, budget, kind, reply, log): Promise<boolean>`.

---

### M2. `any` в четырёх сигнатурах строго типизированного файла

**Файл:** [`apps/api/src/server.ts`](../apps/api/src/server.ts) — строки
[131](../apps/api/src/server.ts#L131), [450](../apps/api/src/server.ts#L450),
[517](../apps/api/src/server.ts#L517), [544](../apps/api/src/server.ts#L544)
**Категория:** типизация / DIP

`req: any, reply: any` в `resolveBudget`, `proxyToTraceService`,
`enforceTraceRateLimit`, `requireJsonContentType` — единственные `any` в файле,
который в остальном типизирован строго.

**Исправление:** `FastifyRequest` / `FastifyReply`, как уже сделано
в [`rateLimit.ts:67`](../apps/api/src/rateLimit.ts#L67).

---

### M3. Дублированный эпилог и сигнал ошибки через ложь-каст

**Файл:** [`apps/trace-service/src/server/execute/index.ts:54-81`](../apps/trace-service/src/server/execute/index.ts#L54-L81)
vs [`153-182`](../apps/trace-service/src/server/execute/index.ts#L153-L182)
**Категория:** DRY / типизация

~40 строк идентичного эпилога в двух функциях (проверки `ThrowCompletion`, извлечение
`rootNode`, `serializeNode`, `fromEngineValue`, форма ответа). Плюс ошибки парсинга
сигналятся через мутируемую переменную `parseError` в замыкании + `return null as unknown as Value`
(3 раза).

**Исправление:** общий `finishTrace(evalResult, inputTrace, functionName)`;
вместо ложь-каста — честный `{ ok: false, error }` в возвращаемом типе.

---

### M4. `v8-pipeline` обходит стор и дублирует логику прогона

**Файл:** [`apps/frontend/src/app/v8-pipeline/components/PipelineClient.tsx:129-167`](../apps/frontend/src/app/v8-pipeline/components/PipelineClient.tsx#L129-L167)
**Категория:** DRY / архитектура

Свои 7 `useState` + прямой вызов `runEngine`, минуя Zustand. Логика выбора приоритетной
ошибки `failures.find(f => f.status === 429) ?? failures[0]` скопирована из
[`useEngineOutputs.ts:186`](../apps/frontend/src/store/useEngineOutputs.ts#L186).

**Исправление:** вынести `pickPrimaryFailure(failures)` в `lib/api.ts`;
долгосрочно — общий `useEngineRun()`.

---

### M5. Четыре почти идентичных `config.ts`

**Файлы:** `apps/engine-{v8,hermes,jsc,spidermonkey}/src/config.ts`
**Категория:** DRY

11 общих полей (`PORT`, `HOST`, `MAX_TIMEOUT_MS`, `DEFAULT_TIMEOUT_MS`,
`MAX_OUTPUT_BYTES`, `MAX_FLAGS`, `MAX_SOURCE_LENGTH`, `MAX_CONCURRENCY`, `LOG_LEVEL`)
и дословно одинаковый `loadConfig()` в каждом.

**Исправление:** `createEngineConfig(extraFields)` в `engine-runtime`; каждый сервис
оставляет только своё (`D8_PATH`, `MAX_HEAP_MB`, `JSCSHELL_PATH`, …).

---

### M6. `LOCKDOWN_SHIM` продублирован в security-коде

**Файлы:** [`engine-v8/server.ts:14-24`](../apps/engine-v8/src/server.ts#L14-L24)
и [`engine-jsc/server.ts:43-53`](../apps/engine-jsc/src/server.ts#L43-L53)
**Категория:** DRY

Шим блокировки опасных глобалов скопирован дословно; различается только список имён.
Это код, изолирующий песочницу, — правка должна применяться в обоих местах.

**Исправление:** `buildLockdownShim(names: readonly string[])` в `engine-runtime`.

---

### M7. Мёртвые и разошедшиеся с контрактом типы

**Файл:** [`apps/frontend/src/lib/types/index.ts:14-27`](../apps/frontend/src/lib/types/index.ts#L14-L27)
**Категория:** техдолг

`ApiResponse`, `VersionInfo`, `VersionsResp` не используются нигде (проверено grep'ом
по всему фронтенду). При этом `ApiResponse` описывает контракт (`results`, `meta.ms`),
которого шлюз никогда не возвращал — реальная форма в
[`apps/api/src/types.ts:46-52`](../apps/api/src/types.ts#L46-L52). Эндпоинта `/versions`
в проекте нет вовсе.

Дополнительно: `EngineResult.exitCode` всегда `null`
([`useEngineOutputs.ts:162`](../apps/frontend/src/store/useEngineOutputs.ts#L162)),
нигде не читается.

**Исправление:** удалить мёртвые типы и поле `exitCode`.

---

### M8. Ручная валидация в прокси дублирует zod-схему шлюза

**Файл:** [`apps/frontend/src/app/api/trace/execute/type-conversion/route.ts:27-43`](../apps/frontend/src/app/api/trace/execute/type-conversion/route.ts#L27-L43)
**Категория:** DRY

Проверки повторяют `traceExecuteRequestSchema` из
[`apps/api/src/schemas.ts:60-64`](../apps/api/src/schemas.ts#L60-L64) — и уже разошлись
с ней: в прокси нет ограничения длины входа. Плюс третья копия `ExecuteResponse`
([строки 3-9](../apps/frontend/src/app/api/trace/execute/type-conversion/route.ts#L3-L9)).

**Исправление:** прокси не должен валидировать — шлюз всё равно вернёт 400 с внятным
сообщением. Общие типы — в общий пакет.

---

### M9. `useLocalStorage`: устаревшее замыкание и непроверенный `JSON.parse`

**Файл:** [`apps/frontend/src/hooks/useLocalStorage.ts:21-39`](../apps/frontend/src/hooks/useLocalStorage.ts#L21-L39)
**Категория:** best practice

`setValue` захватывает `storedValue` в замыкание вместо функционального апдейта →
два вызова в одном тике теряют первый. Отдельно: `JSON.parse` кастится в `T` без
валидации ([строка 59](../apps/frontend/src/hooks/useLocalStorage.ts#L59)) — испорченный
localStorage роняет `Splitter` в `PlaygroundClient`.

```ts
// было
const valueToStore = value instanceof Function ? value(storedValue) : value;
setStoredValue(valueToStore);
// deps: [key, storedValue]

// стало
setStoredValue((prev) => {
  const next = value instanceof Function ? value(prev) : value;
  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
});
// deps: [key]
```

---

### M10. Пользовательские сниппеты никогда не опознаются как активные

**Файл:** [`apps/frontend/src/components/Samples/index.tsx:91-117`](../apps/frontend/src/components/Samples/index.tsx#L91-L117)
**Категория:** баг

Эффект «определить активный сниппет» отрабатывает на маунте в том же коммите, что
и загрузка из localStorage ([строки 61-84](../apps/frontend/src/components/Samples/index.tsx#L61-L84)),
поэтому `customSamples` на момент проверки ещё `[]` → ветка `customMatch`
([строка 110](../apps/frontend/src/components/Samples/index.tsx#L110)) всегда ищет
в пустом массиве. `baselineInitialisedRef` гарантирует, что второго шанса не будет.

**Исправление:** читать localStorage синхронно в инициализаторе `useState`, а не в эффекте.

---

### M11. Чтение `const`, объявленного ниже по коду

**Файл:** [`apps/frontend/src/components/OutputsPanel/index.tsx:32-42`](../apps/frontend/src/components/OutputsPanel/index.tsx#L32-L42)
**Категория:** best practice

`handleTabChange` использует `activeKey`, объявленный `const`'ом на 9 строк ниже.
Работает только потому, что хендлер вызывается после завершения рендера.

**Исправление:** поднять `activeKey` выше объявления хендлера.

---

### M12. Циклическая зависимость

**Файл:** [`apps/frontend/src/app/v8-pipeline/components/Hint.tsx:2`](../apps/frontend/src/app/v8-pipeline/components/Hint.tsx#L2)
**Категория:** архитектура

`Hint → PipelineClient → Hint` — единственный цикл в репозитории (подтверждено `madge`).
Импорт `StageId` значимый, не `import type`, поэтому не гарантированно стирается
при компиляции.

**Исправление:** вынести `StageId` в `v8-pipeline/types.ts`.

---

### M13. Lint-гейт фронтенда декоративный

**Файл:** [`.github/workflows/ci.yml:29`](../.github/workflows/ci.yml#L29)
**Категория:** процесс

Матрица CI вызывает `npm run lint` → `eslint .` без `--max-warnings=0`. Eslint
завершается с кодом 0 при наличии предупреждений, поэтому все 19 текущих замечаний —
включая баг [H1](#h1-реальный-баг-сниппеты-не-рендерятся-в-диалоге-v8-internals) —
проходят CI зелёными.

**Исправление:** `"lint": "eslint . --max-warnings=0"` — но сначала расшить текущие 19.

Полный список предупреждений:

| Файл | Правило | Кол-во |
|---|---|---|
| `Samples/index.tsx` | `react-hooks/refs`, `set-state-in-effect`, `exhaustive-deps` | 9 |
| `useSharedStateRestore.ts` | `react-hooks/refs` | 2 |
| `useVisualizerRuntime.ts` | `react-hooks/set-state-in-effect` | 1 |
| `useLocalStorage.ts` | `react-hooks/set-state-in-effect` | 1 |
| `Code.tsx`, `CodeRow.tsx`, `TokensPane.tsx`, `DeoptView.tsx`, `ExecutionTreeHeader.tsx` | `react/no-array-index-key` | 5 |
| `layout.tsx` | `@next/next/no-page-custom-font` | 1 |

---

### M14. Дубль `createEngineSelection`

**Файлы:** [`PlaygroundClient.tsx:23-28`](../apps/frontend/src/app/_components/PlaygroundClient.tsx#L23-L28)
и [`useEngineOutputs.ts:38-43`](../apps/frontend/src/store/useEngineOutputs.ts#L38-L43)
**Категория:** DRY

Функция скопирована дословно.

**Исправление:** экспортировать из `lib/types`.

---

### M15. Пустой `catch {}` в паре с лишним `throw`

**Файлы:** [`PlaygroundClient.tsx:66`](../apps/frontend/src/app/_components/PlaygroundClient.tsx#L66),
[`useEngineOutputs.ts:212`](../apps/frontend/src/store/useEngineOutputs.ts#L212)
**Категория:** обработка ошибок

Стор уже записал ошибку в стейт и всё равно пробрасывает исключение; вызывающий
компонент вынужден глушить его пустым `catch` без комментария.

**Исправление:** убрать `throw` из стора — тогда `try/catch` в компоненте не нужен вовсе.

---

### M16. OpenAPI-документ — ручное зеркало zod-схем

**Файл:** [`apps/api/src/openapi.ts`](../apps/api/src/openapi.ts) (388 строк)
**Категория:** DRY

Схемы тел запросов выписаны руками и повторяют
[`schemas.ts`](../apps/api/src/schemas.ts). Ничто не проверяет, что они не разошлись —
ровно та ситуация, которая раньше была с каталогом флагов и решалась тестом-зеркалом.

**Исправление:** `zod-to-json-schema` для тел запросов либо тест на согласованность.

---

## 3. Низкая критичность

| # | Файл / место | Проблема |
|---|---|---|
| L1 | `apps/frontend/.DS_Store`, `engines/.DS_Store` | Закоммичены вопреки `.gitignore` — правило не расшивает уже отслеживаемые файлы. `git rm --cached` |
| L2 | `apps/frontend/src/` | Корень npm-проекта — сам каталог `src/` (в нём `package.json`, `node_modules`, `next.config.ts`). Во всех остальных приложениях `src/` — каталог исходников |
| L3 | [`Code.tsx:13`](../apps/frontend/src/components/OutputsPanel/components/Code.tsx#L13), [`CodeRow.tsx:49`](../apps/frontend/src/components/OutputsPanel/components/CodeRow.tsx#L49), [`TokensPane.tsx:53`](../apps/frontend/src/app/v8-pipeline/components/TokensPane.tsx#L53), [`DeoptView.tsx:58`](../apps/frontend/src/app/v8-pipeline/components/DeoptView.tsx#L58) | `react/no-array-index-key` |
| L4 | [`server.ts:2`](../apps/api/src/server.ts#L2) | Единственный `@ts-ignore` в бэкенде. Заменить на `@ts-expect-error` с причиной, чтобы он «протух» сам, когда пакет починит типы |
| L5 | [`Samples/index.tsx:72-75`](../apps/frontend/src/components/Samples/index.tsx#L72-L75) | 4× `(item as any)` в type guard. Достаточно `(item as Record<string, unknown>)` |
| L6 | [`Samples/index.tsx:178`](../apps/frontend/src/components/Samples/index.tsx#L178) | Id вида `custom-${Date.now()}` (коллизия при двух сохранениях в одну мс), тогда как в [`PlaygroundClient.tsx:63`](../apps/frontend/src/app/_components/PlaygroundClient.tsx#L63) уже используется `crypto.randomUUID()` |
| L7 | [`Samples/index.tsx:189-193`](../apps/frontend/src/components/Samples/index.tsx#L189-L193) | Эффект, сбрасывающий `saveError`, избыточен: `openSaveDialog` уже это делает |
| L8 | [`Samples/index.tsx:340-404`](../apps/frontend/src/components/Samples/index.tsx#L340-L404) | `Dialog.Root` для V8 вложен внутрь `Dialog.Root` для Browse, хотя это два независимых диалога. Работает случайно |
| L9 | [`PipelineClient.tsx:172-180`](../apps/frontend/src/app/v8-pipeline/components/PipelineClient.tsx#L172-L180) | `stageStatus` не мемоизирован и вызывает `stripDiagnostics` (split/filter/join) для 7 стадий на каждый рендер |
| L10 | [`execute/index.ts:26`](../apps/trace-service/src/server/execute/index.ts#L26), [`89`](../apps/trace-service/src/server/execute/index.ts#L89) | `async` без единого `await` — сигнатура обещает асинхронность, которой нет |
| L11 | [`server.ts:295-300`](../apps/api/src/server.ts#L295-L300) | `engineBaseByKind` хранит танки `() => config.X`, хотя `config` загружен на уровне модуля |
| L12 | — | Тестов компонентов ноль (все 10 фронтовых сьютов покрывают `lib/`, `store/`, `utils/`). На бэкенде не покрыты [`server.ts`](../apps/api/src/server.ts) (652 строки оркестрации) и [`rateLimit.ts`](../apps/api/src/rateLimit.ts); у engine-сервисов тестов нет вовсе (`test: ""` в CI-матрице) |
| L13 | [`Samples/index.tsx:86-89`](../apps/frontend/src/components/Samples/index.tsx#L86-L89) | Эффект записи срабатывает на маунте с пустым `[]` до применения стейта из эффекта чтения. Данные переживают за счёт синхронного чтения, но окно записи `"[]"` существует |
| L14 | [`PlaygroundClient.tsx:83`](../apps/frontend/src/app/_components/PlaygroundClient.tsx#L83) | `status === "running"` строкой вместо `RunStatus.running`, хотя enum импортирован в этом же дереве |
| L15 | [`helpers.ts:216`](../apps/trace-service/src/server/execute/helpers.ts#L216) | `preferredType as "string" \| "number" \| undefined` поверх параметра, уже имеющего ровно этот тип |
| L16 | [`useLocalStorage.ts`](../apps/frontend/src/hooks/useLocalStorage.ts) | Единственный файл фронтенда с одинарными кавычками (95 файлов против 1) и JSDoc-стилем `@param/@returns`. Prettier в проекте не настроен |

---

## Топ-10 для старта рефакторинга

| # | Что | Почему первым | Объём |
|---|---|---|---|
| 1 | **H1** — dep в `useMemo` | Живой баг, видимый пользователю, правка в одну строку | 1 мин |
| 2 | **H2** — удалить устаревшую шапку `flags.ts` + строку в `CLAUDE.md` | Публичный репозиторий; активно дезинформирует контрибьюторов | 10 мин |
| 3 | **M13** — `--max-warnings=0` в lint фронтенда | Гейт, который не даст п. 1 повториться. Ставить сразу после расшивки 19 предупреждений | 1 ч |
| 4 | **H6** — точечные селекторы вместо `useEngineOutputsState()` | Самая дешёвая крупная победа по производительности; правка механическая | 2 ч |
| 5 | **H3** — вынести `runNow` в `lib/traceApi.ts` + токен свежести | Чинит гонку и выравнивает архитектуру двух сторов | 3 ч |
| 6 | **M10 / M9** — localStorage читать в инициализаторе `useState` | Чинит реальный дефект восстановления и готовит почву для H4 | 2 ч |
| 7 | **H7** — единая таблица spec-функций | Разблокирует расширение trace-service без правок в 4 местах | 3 ч |
| 8 | **H4** — разбор `Samples` | Самый большой файл фронтенда; после п. 6 разбор заметно проще | 1 день |
| 9 | **M5 / M6** — общий конфиг и `buildLockdownShim` в `engine-runtime` | Дубли в security-коде; изолированно и безопасно | 3 ч |
| 10 | **H5** — разбор `useVisualizerRuntime` | Самый сложный; делать последним, опираясь на `traceApi` из п. 5 | 1-2 дня |

---

## Общая оценка архитектуры

**Бэкенд заслуживает высокой оценки, и это редкий случай.** Границы выбраны правильно
и соблюдаются: engine-сервисы действительно stateless, шлюз действительно единственный
оркестратор, `engine-runtime` действительно устраняет четырёхкратный дубль — четыре
`server.ts` сжаты до 6-46 строк каждый, и вся разница между движками честно выражена
через `EngineSpec`. Инварианты, которые обычно всплывают инцидентами в проде, здесь уже
закрыты и, что важнее, **задокументированы вместе с причиной**: почему 429 вместо 503
([`index.ts:127-130`](../packages/engine-runtime/src/index.ts#L127-L130)), почему
`trustProxy` — число, а не `true`
([`server.ts:36-42`](../apps/api/src/server.ts#L36-L42)), почему identity хешируется
перед превращением в имя Redis-ключа
([`rateLimit.ts:11-20`](../apps/api/src/rateLimit.ts#L11-L20)), почему воркер-тред —
единственный надёжный бюджет для engine262
([`sandbox.ts:1-13`](../apps/trace-service/src/server/execute/sandbox.ts#L1-L13)).
Это не комментарии-шум, это записанные решения — по ним видно, что многие вещи были
не угаданы, а отлажены. `TraceSandbox` — образцовый класс: приватные поля, один путь
изменения состояния через `#settle(id)`, явная обработка «воркер умер до готовности».

**Фронтенд заметно отстаёт, и разрыв структурный, а не стилистический.** Слои размыты
в конкретном месте — сеть внутри стора (H3) при том, что рядом в том же приложении есть
правильный клиент `lib/api.ts`. Одна и та же задача «запустить код и показать вывод»
решена трижды и по-разному: через стор (playground), через локальный стейт (v8-pipeline,
M4), через свой стор с `fetch` внутри (visualizer). Отсюда и повторы вроде
`createEngineSelection` (M14) или логики выбора ошибки (M4): это не лень, а следствие
того, что общей абстракции прогона просто не существует. Два самых проблемных файла —
`Samples` и `useVisualizerRuntime` — характерно «отлажены до работоспособности»:
ref-флаги, ключи-строки, эффекты со сбросом в `null`. Такой код работает, но каждое
следующее изменение в нём дороже предыдущего.

**Корень расхождения — в дисциплине, а не в навыке.** У бэкенда есть тесты на нетривиальные
инварианты (59 в api, включая свойства санитайзера флагов) и `tsc --noEmit` как жёсткий
гейт. У фронтенда 62 теста, но **ни одного на компонент**, а lint пропускает предупреждения —
включая то самое, что указывало на H1. Автор явно умеет писать код, который переживает
ревью; фронтенд просто не проходил через ту же воронку. Поэтому пункт 3 в плане
(`--max-warnings=0`) стоит выше большинства рефакторингов: он дешевле любой переписки
и предотвращает возврат долга.

---

## План действий

### Спринт 0 — за один вечер, без риска

H1, H2, L1, L4, L11, L15, M7 (мёртвые типы), M14.
Всё локальное, ревью не требует контекста.

### Спринт 1 — гейты и производительность (~1 неделя)

- Расшить 19 предупреждений eslint → включить `--max-warnings=0` (M13)
- Перевести потребителей на точечные селекторы (H6)
- Починить `useLocalStorage` (M9) и восстановление сниппетов (M10)
- Убрать `throw` из стора и пустой `catch` (M15)
- Развязать цикл `Hint ↔ PipelineClient` (M12)

### Спринт 2 — выравнивание слоёв (~1-2 недели)

- Ввести `lib/traceApi.ts` и перевести на него стор визуализатора вместе с токеном
  свежести (H3)
- Вынести `pickPrimaryFailure`; при возможности — общий `useEngineRun()` для playground
  и v8-pipeline (M4)
- Бэкенд: `checkBudget()` (M1), типы Fastify вместо `any` (M2), общий эпилог
  в trace-service (M3)

### Спринт 3 — крупные разборы (~2 недели)

- `Samples` (H4) → `useVisualizerRuntime` (H5) → единая таблица spec-функций (H7)
- Параллельно: общий конфиг движков и `buildLockdownShim` (M5, M6)
- Здесь же завести первые тесты компонентов: `Samples` и `OutputsPanel` — естественные
  первые кандидаты, потому что после разбора у них появятся тестируемые швы

### Отдельным решением (не рефакторинг)

Переезд корня фронтенд-проекта из `apps/frontend/src/` в `apps/frontend/` (L2). Правка
простая, но задевает `Dockerfile`, CI-матрицу и `skaffold.yaml` — делать отдельным PR,
когда очередь спринтов пуста.
