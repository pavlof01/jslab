"use client";

import { Box, Button, SimpleGrid, Text } from "@chakra-ui/react";

import type { CustomSample } from "@/lib/customSamples";
import { sampleCatalog, type SampleKey, samples } from "@/lib/samples";

import SampleCard from "./SampleCard";

type Props = {
  custom: CustomSample[];
  loadedId: string | null;
  onLoad: (code: string, id: string) => void;
  onRename: (sample: CustomSample) => void;
  onDelete: (sample: CustomSample) => void;
};

const SampleLibrary: React.FC<Props> = ({ custom, loadedId, onLoad, onRename, onDelete }) => {
  return (
    <>
      {custom.length > 0 ? (
        <Box>
          <SectionLabel>Saved samples</SectionLabel>
          <SampleGrid>
            {custom.map((sample) => (
              <SampleCard
                key={sample.id}
                id={sample.id}
                title={sample.name}
                description={sample.description?.trim() || "Custom snippet"}
                snippet={sample.code}
                active={loadedId === sample.id}
                onSelect={() => onLoad(sample.code, sample.id)}
                actions={
                  <>
                    <CardAction onClick={() => onRename(sample)}>Rename</CardAction>
                    <CardAction onClick={() => onDelete(sample)}>Delete</CardAction>
                  </>
                }
              />
            ))}
          </SampleGrid>
        </Box>
      ) : null}

      <Box>
        <SectionLabel>Default samples</SectionLabel>
        <SampleGrid>
          {sampleCatalog.map(({ key, label, description }) => (
            <SampleCard
              key={key}
              id={`default:${key}`}
              title={label}
              description={description}
              snippet={samples[key as SampleKey]}
              active={loadedId === `default:${key}`}
              onSelect={() => onLoad(samples[key as SampleKey], `default:${key}`)}
            />
          ))}
        </SampleGrid>
      </Box>

      {custom.length === 0 ? (
        <Text fontSize="sm" color="ink.2">
          Save your own snippets to access them here quickly.
        </Text>
      ) : null}
    </>
  );
};

type SampleGridProps = { children: React.ReactNode };

export const SampleGrid: React.FC<SampleGridProps> = ({ children }) => {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
      {children}
    </SimpleGrid>
  );
};

type CardActionProps = { onClick: () => void; children: React.ReactNode };

const CardAction: React.FC<CardActionProps> = ({ onClick, children }) => {
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

type SectionLabelProps = { children: React.ReactNode };

export const SectionLabel: React.FC<SectionLabelProps> = ({ children }) => {
  return (
    <Text textStyle="labelSm" color="ink.label" mb={2}>
      {children}
    </Text>
  );
};

export default SampleLibrary;
