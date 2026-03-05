import * as React from 'react';
import { getName } from '@odf/shared';
import {
  Content,
  ContentVariants,
  CardBody,
  Card,
} from '@patternfly/react-core';
import { BackingStoreKind, NamespaceStoreKind } from '../../types';

export const StoreCard: React.FC<StoreCardProp> = ({ resources }) =>
  !!resources.length && (
    <Card isCompact component="div">
      <CardBody isFilled>
        <Content>
          {resources.map((res) => (
            <Content key={getName(res)} component={ContentVariants.small}>
              {getName(res)}
            </Content>
          ))}
        </Content>
      </CardBody>
    </Card>
  );

type StoreCardProp = {
  resources: (NamespaceStoreKind | BackingStoreKind)[];
};
