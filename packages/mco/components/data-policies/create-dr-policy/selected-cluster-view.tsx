import * as React from 'react';
import * as _ from 'lodash';
import {
  Text,
  Badge,
  TextContent,
  TextVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { Cluster, DRPolicyAction } from './reducer';
import './create-dr-policy.scss';

type SelectedClusterProps = {
  id: number;
  cluster: Cluster;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  dispatch,
}) => {
  const { name, region, storageSystemName } = cluster;
  return (
    <Flex
      display={{ default: 'inlineFlex' }}
      className="mco-create-data-policy__flex"
    >
      <FlexItem>
        <Badge key={id} isRead>
          {id}
        </Badge>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.p}>{name}</Text>
          <Text component={TextVariants.small}>{region}</Text>
          <Text component={TextVariants.small}>{storageSystemName}</Text>
        </TextContent>
      </FlexItem>
    </Flex>
  );
};
