import * as React from 'react';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import classNames from 'classnames';
import { Link } from 'react-router-dom-v5-compat';
import '../style.scss';

type ResourceLinkProps = {
  resourceModel: K8sKind;
  resourceName: string;
  link: string;
  isExternalLink?: boolean;
  hideIcon?: boolean;
  className?: string;
};

type ResourceNameWIconProps = {
  resourceModel: K8sKind;
  resourceName: string;
  className?: string;
};

type ResourceIconProps = {
  resourceModel: K8sKind;
  className?: string;
};

export const ResourceIcon: React.FC<ResourceIconProps> = ({
  resourceModel,
  className,
}) => (
  <>
    <span className="sr-only">{resourceModel.abbr.toLocaleUpperCase()}</span>
    <span
      className={classNames('odf-m-resource-icon', className)}
      title={resourceModel.kind}
    >
      {resourceModel.abbr.toLocaleUpperCase()}
    </span>
  </>
);

export const ResourceNameWIcon: React.FC<ResourceNameWIconProps> = ({
  resourceModel,
  resourceName,
  className,
}) => {
  return (
    <span className="odf-resource-item">
      <ResourceIcon resourceModel={resourceModel} className={className} />
      {resourceName}
    </span>
  );
};

const ResourceLink: React.FC<ResourceLinkProps> = ({
  resourceModel,
  resourceName,
  link,
  isExternalLink,
  hideIcon,
  className,
}) => {
  return (
    <span className="odf-resource-item">
      {!hideIcon && (
        <>
          <span className="sr-only">
            {resourceModel.abbr.toLocaleUpperCase()}
          </span>
          <span className="odf-m-resource-icon" title={resourceModel.kind}>
            {resourceModel.abbr.toLocaleUpperCase()}
          </span>
        </>
      )}
      {isExternalLink ? (
        <a
          className={className}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {resourceName}
        </a>
      ) : (
        <Link
          to={link}
          className={className}
          data-test={`resource-link-${resourceName}`}
        >
          {resourceName}
        </Link>
      )}
    </span>
  );
};

export default ResourceLink;
