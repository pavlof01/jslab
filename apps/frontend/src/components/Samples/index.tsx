"use client";

import { Button } from "@chakra-ui/react";
import { useCallback, useState } from "react";

import type { CustomSample } from "@/lib/customSamples";

import DeleteSampleDialog from "./DeleteSampleDialog";
import SampleBrowseDialog from "./SampleBrowseDialog";
import SampleLibrary from "./SampleLibrary";
import SampleNameDialog from "./SampleNameDialog";
import { useCustomSamples } from "./useCustomSamples";
import V8SampleLibrary from "./V8SampleLibrary";

type Props = {
  currentCode: string;
  onSelectSample: (code: string) => void;
};

const Samples: React.FC<Props> = ({ currentCode, onSelectSample }) => {
  const { samples: custom, add, rename, remove } = useCustomSamples();

  const [saveOpen, setSaveOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CustomSample | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomSample | null>(null);

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [loadedCode, setLoadedCode] = useState(currentCode);

  const load = useCallback(
    (code: string, id: string) => {
      setLoadedCode(code);
      setLoadedId(id);
      onSelectSample(code);
    },
    [onSelectSample],
  );

  const canSave = currentCode.trim().length > 0 && currentCode !== loadedCode;

  return (
    <>
      <SampleBrowseDialog
        triggerLabel="samples"
        triggerLabelForScreenReader="Browse code samples"
        title="Select a sample"
      >
        {(close) => (
          <SampleLibrary
            custom={custom}
            loadedId={loadedId}
            onLoad={(code, id) => {
              load(code, id);
              close();
            }}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </SampleBrowseDialog>

      <SampleBrowseDialog
        triggerLabel="v8 internals"
        triggerLabelForScreenReader="Browse V8 internals samples"
        title="V8 internals"
      >
        {(close) => (
          <V8SampleLibrary
            loadedId={loadedId}
            onLoad={(code, id) => {
              load(code, id);
              close();
            }}
          />
        )}
      </SampleBrowseDialog>

      {canSave ? (
        <Button size="sm" onClick={() => setSaveOpen(true)} aria-label="Save the current snippet">
          save
        </Button>
      ) : null}

      <SampleNameDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save current snippet"
        confirmLabel="Save"
        samples={custom}
        onConfirm={(name) => {
          const created = add({ name, code: currentCode }, crypto.randomUUID(), Date.now());
          setLoadedCode(currentCode);
          setLoadedId(created.id);
        }}
      />

      <SampleNameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename snippet"
        confirmLabel="Save"
        samples={custom}
        editing={renameTarget ?? undefined}
        withDescription
        onConfirm={(name, description) => {
          if (renameTarget) rename(renameTarget.id, name, description);
          setRenameTarget(null);
        }}
      />

      <DeleteSampleDialog
        target={deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={(sample) => {
          remove(sample.id);
          if (loadedId === sample.id) setLoadedId(null);
          setDeleteTarget(null);
        }}
      />
    </>
  );
};

export default Samples;
