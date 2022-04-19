import * as React from 'react';
import { ODFStorageSystem } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { Link } from 'react-router-dom';

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
  const path = `/odf/system/${kind}/${providerName}/overview`;
  return (
    <span>
      <ResourceIcon resourceModel={ODFStorageSystem} />
      <Link to={path}>{systemName}</Link>
    </span>
  );
};

export default ODFSystemLink;
