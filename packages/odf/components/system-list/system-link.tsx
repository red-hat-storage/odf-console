import * as React from 'react';
import { ODFStorageSystem } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { Link } from 'react-router-dom-v5-compat';

type ODFSystemLinkProps = {
  kind: string;
  providerName: string;
  systemName: string;
};

const ODFSystemLink: React.FC<ODFSystemLinkProps> = ({
  kind,
  systemName,
  providerName,
}) => {
  const path = `/odf/external-systems/${kind}/${providerName}`;
  return (
    <span>
      <ResourceIcon resourceModel={ODFStorageSystem} />
      <Link to={path}>{systemName}</Link>
    </span>
  );
};

export default ODFSystemLink;
