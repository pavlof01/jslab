import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardedHeaders, proxyToGateway, readJsonBody } from "@/lib/server/gateway";

export interface ExecuteResponse {
  success: boolean;
  functionName: string;
  result?: { type: string; value?: unknown };
  root?: unknown;
  effectiveAlgoId?: string;
  detectedOperator?: string;
  error?: string;
}

const CATEGORIES = {
  equality: (fields: Record<string, unknown>) => {
    const { input } = fields;
    if (typeof input !== "string" || input.trim().length === 0) {
      return { error: "input must be a non-empty string expression" };
    }
    return { body: { input } };
  },

  "type-conversion": (fields: Record<string, unknown>) => {
    const { functionName, input, preferredType } = fields;
    if (!functionName || typeof functionName !== "string") {
      return { error: "functionName is required and must be a string" };
    }
    if (input === undefined) {
      return { error: "input is required" };
    }
    if (preferredType !== undefined && preferredType !== "string" && preferredType !== "number") {
      return { error: "preferredType must be 'string' or 'number'" };
    }
    return { body: { functionName, input, ...(preferredType ? { preferredType } : {}) } };
  },
} satisfies Record<
  string,
  (fields: Record<string, unknown>) => { body: unknown } | { error: string }
>;

type Category = keyof typeof CATEGORIES;

const isCategory = (value: string): value is Category => value in CATEGORIES;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  if (!isCategory(category)) {
    return NextResponse.json({ error: `Unknown trace category "${category}"` }, { status: 404 });
  }

  const parsed = await readJsonBody(req);
  if ("error" in parsed) return parsed.error;

  if (!parsed.body || typeof parsed.body !== "object") {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const validated = CATEGORIES[category](parsed.body as Record<string, unknown>);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  return proxyToGateway(`/api/trace/execute/${category}`, {
    kind: "trace",
    headers: forwardedHeaders(req),
    body: JSON.stringify(validated.body),
  });
}
