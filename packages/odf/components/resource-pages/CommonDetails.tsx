import * as React from 'react';
import classNames from 'classnames';
import { Flex, FlexItem, Title } from '@patternfly/react-core';
import './common-details.scss';

type DetailsItemProps = {
  field: string;
  padChildElement?: boolean; // Add slight padding to the left for cascade effect
  showBorder?: boolean;
};

export const DetailsItem: React.FC<DetailsItemProps> = ({
  field,
  children,
  padChildElement = false,
  showBorder = false,
}) => (
  <Flex
    direction={{ default: 'column' }}
    className={classNames('details-item', {
      'details-item--border': showBorder,
    })}
  >
    <FlexItem>
      <Title headingLevel="h6" size="md">
        {field}
      </Title>
    </FlexItem>
    <FlexItem
      className={classNames({ 'details-item__child--pad': padChildElement })}
    >
      {children}
    </FlexItem>
  </Flex>
);
