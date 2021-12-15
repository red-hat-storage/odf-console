import * as React from 'react';
import { referenceForModel } from '@odf/shared/utils';
import { ResourceIcon } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { Link } from 'react-router-dom';
import { ODFStorageSystem } from '../../models';

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
      <ResourceIcon kind={referenceForModel(ODFStorageSystem)} />
      <Link to={path}>{systemName}</Link>
    </span>
  );
};

export default ODFSystemLink;
