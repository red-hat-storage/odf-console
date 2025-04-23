import * as React from 'react';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

import './OverviewDetailItem.scss';

export type OverviewDetailItemProps = {
  /** Details card title */
  title: string;
  children: React.ReactNode;
  /** Trigger skeleton loading component during the loading phase. */
  isLoading?: boolean;
  /** Value for a className */
  valueClassName?: string;
  /** Error message to display */
  error?: string;
};

/**
 * A wrapper around PatternFly's description group. This component's parent must
 * be a PatternFly DescriptionList.
 */
export const OverviewDetailItem: React.FC<OverviewDetailItemProps> = ({
  title,
  isLoading = false,
  children,
  error,
  valueClassName,
}) => {
  let status: React.ReactNode;

  if (error) {
    status = (
      <span className="odf-overview-details-card__text-secondary">{error}</span>
    );
  } else if (isLoading) {
    status = <div className="odf-overview-details-card__skeleton-text" />;
  } else {
    status = children;
  }
  return (
    <DescriptionListGroup>
      <DescriptionListTerm data-test="detail-item-title">
        {title}
      </DescriptionListTerm>
      <DescriptionListDescription
        className={valueClassName}
        data-test="detail-item-value"
      >
        {status}
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};
