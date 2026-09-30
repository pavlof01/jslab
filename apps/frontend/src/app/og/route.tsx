import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { engineLabel } from "@/lib/engines";
import { OG_CARD, SITE_HOST } from "@/lib/site";
import { isEngineKey } from "@/lib/types";

const MAX_TITLE = 72;
const MAX_SUBTITLE = 168;

function oneLine(raw: string | null, max: number): string {
  if (!raw) return "";
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;

  const clipped = collapsed.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const cut = lastSpace > max / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${cut.trimEnd()}…`;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const title = oneLine(params.get("title"), MAX_TITLE) || "Explore JS Engines";
  const subtitle = oneLine(params.get("subtitle"), MAX_SUBTITLE);

  const engineParam = params.get("engine");
  const engine = engineParam !== null && isEngineKey(engineParam) ? engineLabel(engineParam) : null;

  const lineCount = Number(params.get("lines"));
  const lines = Number.isFinite(lineCount) && lineCount > 0 ? Math.floor(lineCount) : null;

  const badges = [engine, lines === null ? null : `${lines} lines`].filter(
    (label): label is string => label !== null,
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0C0D0E",
        borderTop: "10px solid #F9E31A",
        padding: "76px 80px 68px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", width: 22, height: 22, backgroundColor: "#F9E31A" }} />
          <div
            style={{
              display: "flex",
              marginLeft: 18,
              fontSize: 32,
              letterSpacing: 8,
              color: "#F9E31A",
            }}
          >
            JSLAB
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 74, color: "#E8E9E7", lineHeight: 1.12 }}>
          {title}
        </div>

        {subtitle === "" ? null : (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 31,
              color: "#9BA09D",
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {badges.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                marginRight: 16,
                padding: "10px 22px",
                fontSize: 27,
                color: "#E8E9E7",
                backgroundColor: "#121416",
                border: "1px solid #24272A",
                borderRadius: 999,
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 27, color: "#6B6F6D" }}>{SITE_HOST}</div>
      </div>
    </div>,
    {
      width: OG_CARD.width,
      height: OG_CARD.height,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
