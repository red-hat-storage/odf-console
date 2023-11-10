import * as React from 'react';
import {
  Form,
  FormGroup,
  DescriptionListGroup,
  DescriptionList,
  DescriptionListDescription,
} from '@patternfly/react-core';

export const ReviewAndCreateStep: React.FC<ReviewAndCreateStep> = ({
  className,
  children,
}) => (
  <div className={className}>
    <Form>{children}</Form>
  </div>
);

export const ReviewAndCreationGroup: React.FC<ReviewAndCreationStepProps> = ({
  title,
  description,
  className,
  children,
}) => (
  <FormGroup label={title} helperText={description} className={className}>
    <DescriptionList isFluid isCompact isHorizontal>
      {children}
    </DescriptionList>
  </FormGroup>
);

export const ReviewAndCreationItem: React.FC<ReviewAndCreationItemProps> = ({
  label,
  children,
}) => (
  <DescriptionListGroup>
    <DescriptionListDescription>{label}</DescriptionListDescription>
    <DescriptionListDescription>{children}</DescriptionListDescription>
  </DescriptionListGroup>
);

type ReviewAndCreateStep = {
  className?: string;
  children?: React.ReactNode;
};

type ReviewAndCreationStepProps = ReviewAndCreateStep & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

type ReviewAndCreationItemProps = ReviewAndCreateStep & {
  label: string;
};
