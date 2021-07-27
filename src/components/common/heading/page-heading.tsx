import {
  Split, SplitItem, Breadcrumb, BreadcrumbItem,
} from '@patternfly/react-core';
import classNames from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';

import { Link } from 'react-router-dom';

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
  children?: React.ReactChildren;
  style?: object;
  title?: string | JSX.Element;
  badge?: React.ReactNode;
  className?: string;
};

const PageHeading: React.FC<PageHeadingProps> = (props) => {
  const {
    title, breadcrumbs, style, badge, className,
  } = props;
  const resourceTitle = title;
  const showBreadcrumbs = !!breadcrumbs;
  return (
    <div
      className={classNames(
        'co-m-nav-title',
        'co-m-nav-title--detail',
        { 'co-m-nav-title--breadcrumbs': showBreadcrumbs },
        className,
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
      <h1 className="co-m-pane__heading">
        <div className="co-m-pane__name co-resource-item">
          <span
            data-test-id="resource-title"
            className="co-resource-item__resource-name"
          >
            {resourceTitle}
          </span>
        </div>
      </h1>
      {props.children}
    </div>
  );
};

export default PageHeading;
