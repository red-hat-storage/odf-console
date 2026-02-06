import * as React from 'react';
import { resourceStatus as getDefaultResourceStatus } from '@odf/shared/status/Resource';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import { Link } from 'react-router-dom-v5-compat';
import {
  Breadcrumb,
  BreadcrumbItem,
  Split,
  SplitItem,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { K8sResourceKind } from '../types/k8s';
import './page-heading.scss';
import '../style.scss';

type BreadCrumbsProps = {
  breadcrumbs: { name: string; path: string }[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ breadcrumbs }) => (
  <Breadcrumb className="odf-breadcrumbs-link">
    {breadcrumbs.map((crumb, i, { length }) => {
      const isLast = i === length - 1;

      return (
        <BreadcrumbItem key={i} isActive={isLast}>
          {isLast ? (
            crumb.name
          ) : (
            <Link
              className="pf-v5-c-breadcrumb__link"
              to={crumb.path}
              data-test-id={`breadcrumb-link-${i}`}
            >
              {crumb.name}
            </Link>
          )}
        </BreadcrumbItem>
      );
    })}
  </Breadcrumb>
);

type PageHeadingProps = {
  breadcrumbs?: { name: string; path: string }[];
  style?: object;
  title?: string | JSX.Element;
  badge?: React.ReactNode;
  className?: string;
  actions?: Function;
  resource?: K8sResourceKind;
  getResourceStatus?: (resource: K8sResourceKind) => string;
  centerText?: boolean;
  hasUnderline?: boolean;
};

const PageHeading: React.FC<PageHeadingProps> = (props) => {
  const {
    title,
    breadcrumbs,
    style,
    badge,
    className,
    actions,
    resource,
    getResourceStatus,
    centerText,
    hasUnderline = true,
  } = props;
  const resourceTitle = title;
  const showBreadcrumbs = !!breadcrumbs;
  const showActions = !!actions;

  const resourceStatus = resource
    ? getResourceStatus
      ? getResourceStatus(resource)
      : getDefaultResourceStatus(resource)
    : null;
  return (
    <div
      className={classNames(
        'odf-title',
        'odf-m-nav-title',
        hasUnderline && 'odf-m-nav-title--detail',
        { 'odf-m-nav-title--breadcrumbs': showBreadcrumbs },
        className
      )}
      style={style}
    >
      {showBreadcrumbs && (
        <Split style={{ alignItems: 'baseline' }} className="odf-breadcrumbs">
          <SplitItem isFilled>
            <BreadCrumbs breadcrumbs={breadcrumbs} />
          </SplitItem>
          {badge && (
            <SplitItem>
              <span className="odf-m-pane__heading-badge">{badge}</span>
            </SplitItem>
          )}
        </Split>
      )}
      <div className="odf-title-details">
        <Content
          className={classNames({ 'odf-m-pane__heading--center': centerText })}
        >
          <Content component={ContentVariants.h1} className="odf-resource-item">
            <span
              data-test-id="resource-title"
              className="odf-resource-item__resource-name odf-title-status"
            >
              {resourceTitle}
              {resourceStatus && (
                <ResourceStatus additionalClassNames="hidden-xs">
                  <Status status={resourceStatus} />
                </ResourceStatus>
              )}
            </span>
          </Content>
        </Content>
        {showActions && (
          <div className="odf-actions" data-test-id="details-actions">
            {actions()}
          </div>
        )}
      </div>
      {props.children}
    </div>
  );
};

export default PageHeading;

export type SectionHeadingProps = {
  children?: any;
  style?: any;
  text: string;
  required?: boolean;
  id?: string;
};

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  text,
  children,
  style,
  required,
  id,
}) => (
  <Content
    className="odf-section-heading"
    style={style}
    data-test-section-heading={text}
    id={id}
  >
    <Content component={ContentVariants.h2}>
      <span
        className={classNames({
          'odf-required': required,
        })}
      >
        {text}
      </span>
      {children}
    </Content>
  </Content>
);
