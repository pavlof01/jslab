import { trimSlash } from "@/lib/server/upstream";

const SKAFFOLD_FORWARDED = "http://localhost:8085";

export const traceServiceUrl = (): string =>
  trimSlash(process.env.TRACE_SERVICE_URL ?? SKAFFOLD_FORWARDED);

export const remoteSiteUrl = (): string | undefined => {
  const configured = process.env.JSLAB_REMOTE_SITE;
  return configured ? trimSlash(configured) : undefined;
};

export function traceServiceEndpoint(servicePath: string, remotePath: string): string {
  const remote = remoteSiteUrl();
  return remote ? `${remote}${remotePath}` : `${traceServiceUrl()}${servicePath}`;
}
