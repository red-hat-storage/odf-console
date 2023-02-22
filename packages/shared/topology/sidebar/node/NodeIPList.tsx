import * as React from 'react';
import DetailPropertyList from '@odf/shared/components/list/DetailPropertyList';
import DetailPropertyListItem from '@odf/shared/components/list/DetailPropertyListItem';
import { NodeAddress } from '@odf/shared/types';
import * as _ from 'lodash-es';

type NodeIPListProps = {
  ips: NodeAddress[];
  expand?: boolean;
};

const NodeIPList: React.FC<NodeIPListProps> = ({ ips, expand = false }) => (
  <DetailPropertyList>
    {_.sortBy(ips, ['type']).map(
      ({ type, address }) =>
        address &&
        (expand || type === 'InternalIP') && (
          <DetailPropertyListItem
            key={`{${type}/${address}`}
            title={type.replace(/([a-z])([A-Z])/g, '$1 $2')}
          >
            {address}
          </DetailPropertyListItem>
        )
    )}
  </DetailPropertyList>
);

export default NodeIPList;
