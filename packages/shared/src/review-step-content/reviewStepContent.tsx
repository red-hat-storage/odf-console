import * as React from 'react';
import {
    TextContent,
    Text,
    TextVariants,
    List,
    ListItem
} from '@patternfly/react-core';
import './reviewStepContent.scss';

export const ReviewStepContent: React.FC<ReviewStepContentProps> = ({ children, title }) => (
    <div className="odf-review-step__content">
      <TextContent>
        <Text component={TextVariants.h4}>{title}</Text>
      </TextContent>
      <List isPlain>{children}</List>
    </div>
);

export const ReviewStepContentItem: React.FC = ({ children }) => (
  <ListItem>
    {children}
  </ListItem>
);

export type ReviewStepContentProps = {
  title: string;
  children: React.ReactNode;
};

export type ReviewStepContentItemProps = {
  children: React.ReactNode;
}

