import * as React from 'react';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import * as _ from 'lodash';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { K8sResourceKind } from '../types/k8s';
import './page-heading.scss';

type BreadCrumbsProps = {
  breadcrumbs: { name: string; path: string }[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ breadcrumbs }) => (
  <Breadcrumb>
    {breadcrumbs.map((crumb, i, { length }) => {
      const isLast = i === length - 1;

      return (
        <BreadcrumbItem key={i} isActive={isLast}>
          {isLast ? (
            crumb.name
          ) : (
            <Link
              className="pf-c-breadcrumb__link"
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
  actions?: any;
  resource?: K8sResourceKind;
  centerText?: boolean;
};

const getResourceStatus = (resource: K8sResourceKind): string =>
  _.get(resource, ['status', 'phase'], null);

const PageHeading: React.FC<PageHeadingProps> = (props) => {
  const {
    title,
    breadcrumbs,
    style,
    badge,
    className,
    actions,
    resource,
    centerText,
  } = props;
  const resourceTitle = title;
  const showBreadcrumbs = !!breadcrumbs;
  const showActions = !!actions;

  const resourceStatus = resource ? getResourceStatus(resource) : null;
  return (
    <div
      className={classNames(
        'odf-title',
        'co-m-nav-title',
        'co-m-nav-title--detail',
        { 'co-m-nav-title--breadcrumbs': showBreadcrumbs },
        className
      )}
      style={style}
    >
      {showBreadcrumbs && (
        <Split style={{ alignItems: 'baseline' }}>
          <SplitItem isFilled>
            <BreadCrumbs breadcrumbs={breadcrumbs} />
          </SplitItem>
          {badge && (
            <SplitItem>
              <span className="co-m-pane__heading-badge">{badge}</span>
            </SplitItem>
          )}
        </Split>
      )}
      <div className="odf-title-details">
        <h1
          className={classNames({ 'co-m-pane__heading--center': centerText })}
        >
          <div className="co-m-pane__name co-resource-item">
            <span
              data-test-id="resource-title"
              className="co-resource-item__resource-name"
            >
              {resourceTitle}
              {resourceStatus && (
                <ResourceStatus additionalClassNames="hidden-xs">
                  <Status status={resourceStatus} />
                </ResourceStatus>
              )}
            </span>
          </div>
        </h1>
        {showActions && (
          <div className="co-actions" data-test-id="details-actions">
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
  <h2
    className="co-section-heading"
    style={style}
    data-test-section-heading={text}
    id={id}
  >
    <span
      className={classNames({
        'co-required': required,
      })}
    >
      {text}
    </span>
    {children}
  </h2>
);
