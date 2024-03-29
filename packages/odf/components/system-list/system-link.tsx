import * as React from 'react';
import { ODFStorageSystem } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { Link } from 'react-router-dom-v5-compat';

type ODFSystemLinkProps = {
  kind: string;
  providerName: string;
  systemName: string;
  systemNamespace: string;
};

const ODFSystemLink: React.FC<ODFSystemLinkProps> = ({
  kind,
  systemName,
  providerName,
  systemNamespace,
}) => {
  const path = `/odf/system/ns/${systemNamespace}/${kind}/${providerName}/overview`;
  return (
    <span>
      <ResourceIcon resourceModel={ODFStorageSystem} />
      <Link to={path}>{systemName}</Link>
    </span>
  );
};

export default ODFSystemLink;
