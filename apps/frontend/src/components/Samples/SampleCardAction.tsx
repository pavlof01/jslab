import { Button } from "@chakra-ui/react";

type Props = { onClick: () => void; children: React.ReactNode };

const SampleCardAction: React.FC<Props> = ({ onClick, children }) => {
  return (
    <Button
      size="xs"
      variant="ghost"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
};

export default SampleCardAction;
