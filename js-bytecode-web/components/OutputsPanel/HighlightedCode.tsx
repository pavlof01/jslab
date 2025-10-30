import React, { JSX, useEffect, useState } from "react";
import DefaultEmptyCodeBlockState from "./components/DefaultEmptyCodeBlockState";

interface Props {
  out?: string;
  prev?: string;
  EmptyCodeBlockState?: () => JSX.Element;
}

export function HighlightedCode({ out = "", prev, EmptyCodeBlockState = DefaultEmptyCodeBlockState }: Props) {
  const [parsedOut, setParsedOut] = useState<JSX.Element>();

  useEffect(() => {
    if (out || prev) {
      //   void highlight(out, "v8bc", prev).then(setParsedOut);
    }
  }, [out, prev]);

  return parsedOut ?? <EmptyCodeBlockState />;
}
