"use client";

import { Box, Text } from "@chakra-ui/react";

import type { CustomSample } from "@/lib/customSamples";
import { sampleCatalog, type SampleKey, samples } from "@/lib/samples";
import { DEFAULT_V8_FLAGS } from "@/lib/v8Flags";

import SampleCard from "./SampleCard";
import SampleCardAction from "./SampleCardAction";
import SampleGrid from "./SampleGrid";
import SectionLabel from "./SectionLabel";

type Props = {
  custom: CustomSample[];
  loadedId: string | null;
  onLoad: (code: string, id: string, v8Flags?: readonly string[]) => void;
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
                    <SampleCardAction onClick={() => onRename(sample)}>Rename</SampleCardAction>
                    <SampleCardAction onClick={() => onDelete(sample)}>Delete</SampleCardAction>
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
              onSelect={() => onLoad(samples[key as SampleKey], `default:${key}`, DEFAULT_V8_FLAGS)}
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

export default SampleLibrary;
