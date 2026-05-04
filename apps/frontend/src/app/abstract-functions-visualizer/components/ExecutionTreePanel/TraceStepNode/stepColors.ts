const DEPTH_COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24"] as const;

export function getDepthColor(depth: number): string {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}
