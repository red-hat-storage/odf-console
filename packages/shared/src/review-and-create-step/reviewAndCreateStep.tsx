import * as React from 'react';
import {
  Form,
  FormGroup,
  DescriptionListGroup,
  DescriptionList,
  DescriptionListDescription,
} from '@patternfly/react-core';

export const ReviewAndCreateStep: React.FC<ReviewAndCreateStepProps> = ({
  className,
  children,
}) => (
  <div className={className}>
    <Form>{children}</Form>
  </div>
);

export const ReviewAndCreationGroup: React.FC<ReviewAndCreationGroupProps> = ({
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

type ReviewAndCreateStepProps = {
  children: React.ReactNode;
  className?: string;
};

type ReviewAndCreationGroupProps = ReviewAndCreateStepProps & {
  title: React.ReactNode;
  description?: React.ReactNode;
};

type ReviewAndCreationItemProps = ReviewAndCreateStepProps & {
  label: string;
};
