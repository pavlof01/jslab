import { Span } from "@chakra-ui/react";

type Props = { children: React.ReactNode };

const ShortcutHint: React.FC<Props> = ({ children }) => {
  return (
    <Span aria-hidden="true" fontSize="10px" letterSpacing="0.04em" opacity={0.6}>
      {children}
    </Span>
  );
};

export default ShortcutHint;
