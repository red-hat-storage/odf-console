import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import './plain-resource-link.scss';

type PlainResourceNameProps = {
  resourceName: string;
};

const PlainResourceName: React.FC<PlainResourceNameProps> = ({
  resourceName,
}) => (
  <Tooltip content={resourceName}>
    <div className="plainResource--overflow">{resourceName}</div>
  </Tooltip>
);

export default PlainResourceName;
