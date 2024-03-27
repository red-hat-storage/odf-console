import * as React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';

export const Labels: React.FC<LabelsProps> = ({
  labels,
  labelClassName,
  ...props
}) => {
  return (
    <LabelGroup {...props}>
      {labels.map((label) => (
        <Label key={label} className={labelClassName}>
          {label}
        </Label>
      ))}
    </LabelGroup>
  );
};

export type LabelGroupProps = {
  /** Customizable "Show Less" text string */
  collapsedText?: string;
  /** Customizeable template string. Use variable "${remaining}" for the overflow label count. */
  expandedText?: string;
  /** Set number of labels to show before overflow */
  numLabels?: number;
};

export type LabelsProps = LabelGroupProps & {
  labels: string[];
  labelClassName?: string;
};

export default Labels;
