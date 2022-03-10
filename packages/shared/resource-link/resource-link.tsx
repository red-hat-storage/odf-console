import * as React from 'react';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Link } from 'react-router-dom';

type ResourceLinkProps = {
  resourceModel: K8sKind;
  resourceName: string;
  link: string;
  hideIcon?: boolean;
  className?: string;
};

type ResourceIconProps = {
  resourceModel: K8sKind;
};

export const ResourceIcon: React.FC<ResourceIconProps> = ({ resourceModel }) => (
  <>
    <span className="sr-only">{resourceModel.abbr.toLocaleUpperCase()}</span>
    <span className="co-m-resource-icon" title={resourceModel.kind}>
      {resourceModel.abbr.toLocaleUpperCase()}
    </span>
  </>
);

const ResourceLink: React.FC<ResourceLinkProps> = ({
  resourceModel,
  resourceName,
  link,
  hideIcon,
  className,
}) => {
  return (
    <span className="co-resource-item">
      {!hideIcon && (
        <>
          <span className="sr-only">
            {resourceModel.abbr.toLocaleUpperCase()}
          </span>
          <span className="co-m-resource-icon" title={resourceModel.kind}>
            {resourceModel.abbr.toLocaleUpperCase()}
          </span>
        </>
      )}
      <Link to={link} className={className}>
        {resourceName}
      </Link>
    </span>
  );
};

export default ResourceLink;
