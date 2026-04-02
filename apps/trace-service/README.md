# Trace Service README

The Trace Service is a Node.js HTTP service that executes ECMA262 abstract operations and returns execution traces with step-by-step information.

## Overview

**Purpose**: Execute ECMA262 type conversion functions (ToNumber, ToString, ToBoolean, etc.) and return detailed trace information showing the internal steps of conversion.

**Pattern**: Follows the JSLab engine service pattern (like engine-v8, engine-hermes, etc.)

## Architecture

### Local Development

```bash
npm run dev  # Runs on localhost:8080
```

### Production

```bash
npm run build  # Compile TypeScript
npm start      # Run compiled server
```

### Kubernetes

The service is deployed as part of the JSLab cluster:

```bash
kubectl apply -k infra/k8s/base/  # Production
skaffold dev                       # Development with live reload
```

Port forwarding (dev):

```bash
skaffold dev --port-forward  # Exposes trace-service on localhost:8081
```

## API

### Health Check

```bash
curl http://localhost:8080/healthz
# { "ok": true }
```

### Get Available Functions

```bash
curl http://localhost:8080/functions
```

Response:

```json
{
  "available_functions": ["ToNumber", "ToString", ...],
  "description": "POST to /execute with { functionName, input, preferredType? }",
  "note": "Mock data currently. Real ECMA262 execution coming soon."
}
```

### Execute Function with Trace

```bash
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "ToNumber",
    "input": "\"42\"",
    "preferredType": "number"
  }'
```

Response:

```json
{
  "success": true,
  "functionName": "ToNumber",
  "resultValue": "42",
  "resultType": "number",
  "trace": [
    {
      "step": 1,
      "depth": 0,
      "kind": "operation",
      "hint": "Input string conversion",
      "value": "\"42\"",
      "type": "string"
    },
    {
      "step": 2,
      "depth": 1,
      "kind": "coercion",
      "hint": "Parse as numeric string",
      "value": "42",
      "type": "number"
    },
    {
      "step": 3,
      "depth": 0,
      "kind": "result",
      "hint": "Return numeric value",
      "value": "42",
      "type": "number"
    }
  ],
  "stepCount": 3
}
```

## Configuration

Environment variables (see `src/config.ts`):

| Variable           | Default | Description                 |
| ------------------ | ------- | --------------------------- |
| PORT               | 8080    | HTTP server port            |
| HOST               | 0.0.0.0 | HTTP server binding address |
| MAX_TIMEOUT_MS     | 5000    | Maximum execution timeout   |
| DEFAULT_TIMEOUT_MS | 2000    | Default execution timeout   |
| MAX_SOURCE_LENGTH  | 20000   | Maximum input length        |
| LOG_LEVEL          | info    | Pino log level              |

## Integration

### Frontend Integration

The Next.js frontend calls this service via `/api/trace/execute`:

```typescript
// apps/frontend/src/app/api/trace/execute/route.ts
const response = await fetch("http://trace-service:8080/execute", {
  method: "POST",
  body: JSON.stringify({ functionName, input, preferredType }),
});
```

Service URL is configurable via `TRACE_SERVICE_URL` environment variable (defaults to `http://localhost:8080` for local dev).

### Network Policy

In Kubernetes, the trace-service is allowed to receive requests from:

- Traefik ingress controller
- Next.js frontend API routes

See `infra/k8s/base/networkpolicy.yaml` for details.

## Current Status

⚠️ **Currently using mock data** - Returns hardcoded example traces

### Roadmap to Real Execution

1. **Integrate abstract-ops module**
   - Load ECMA262 function implementations
   - Enable real execution tracing
   - Return actual conversion results

2. **Performance optimizations**
   - Cache compiled functions
   - Connection pooling if needed
   - Request batching support

3. **Enhanced tracing**
   - Capture variable state at each step
   - Memory usage tracking
   - Performance analytics

## Development Tips

### Adding a New ECMA262 Function

1. Add to `AVAILABLE_FUNCTIONS` array in `src/server.ts`
2. Add mock trace example to `SAMPLE_TRACES` for testing
3. When real execution is enabled, add function import

### Testing

```bash
# Local testing
npm run dev

# In another terminal
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d '{"functionName": "ToNumber", "input": "\"42\"", "preferredType": null}'
```

### Debugging

```bash
# Set log level
LOG_LEVEL=debug npm run dev

# Check compiled output
npm run build
cat dist/server.js
```

## File Structure

```
apps/trace-service/
├── src/
│   ├── server.ts       # Main HTTP server
│   ├── config.ts       # Configuration & env validation
│   └── types.ts        # (Future) TypeScript interfaces
├── Dockerfile          # Multi-stage Docker build
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── README.md           # This file
```

## See Also

- [JSLab Architecture](../../docs/infra.md)
- [Engine Services](../engine-v8/)
- [Frontend Integration](../frontend/src/app/api/trace/execute/)
