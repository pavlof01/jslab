import { useEffect, useState } from "react";

import {
  hasAnnotationDirectives,
  isAnnotationParserLoaded,
  loadAnnotationParser,
} from "@/lib/annotations";

export function useAnnotationParser(source: string): boolean {
  const needed = hasAnnotationDirectives(source);
  const [, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needed || isAnnotationParserLoaded()) return;
    let active = true;
    loadAnnotationParser().then(
      () => active && setLoaded(true),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [needed]);

  return !needed || failed || isAnnotationParserLoaded();
}
