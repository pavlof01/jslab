"use client";

import SampleNameForm, { type SampleNameFormProps } from "./SampleNameForm";

const SampleNameDialog: React.FC<SampleNameFormProps> = (props) => {
  return <SampleNameForm key={`${props.open}:${props.editing?.id ?? "new"}`} {...props} />;
};

export default SampleNameDialog;
