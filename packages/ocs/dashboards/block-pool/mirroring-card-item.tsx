import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

/**
 * A wrapper around PatternFly's description group. This component's parent must
 * be a PatternFly DescriptionList.
 */
export const MirroringCardItem: React.FC<MirroringCardItemProps> = React.memo(
  ({
    title,
    isLoading = false,
    children,
    error = false,
    valueClassName,
    errorMessage,
  }) => {
    const { t } = useCustomTranslation();

    let status: React.ReactNode;

    if (error) {
      status = (
        <span className="text-secondary">
          {errorMessage || t('Not available')}
        </span>
      );
    } else if (isLoading) {
      status = <div className="skeleton-text" />;
    } else {
      status = children;
    }
    return (
      <DescriptionListGroup>
        {title && (
          <DescriptionListTerm data-test="mirroring-card-item-title">
            {title}
          </DescriptionListTerm>
        )}
        <DescriptionListDescription
          className={valueClassName}
          data-test="mirroring-card-item-value"
        >
          {status}
        </DescriptionListDescription>
      </DescriptionListGroup>
    );
  }
);

MirroringCardItem.displayName = 'MirroringCardItem';

type MirroringCardItemProps = {
  children: React.ReactNode;
  title?: string;
  isLoading?: boolean;
  error?: boolean;
  valueClassName?: string;
  errorMessage?: string;
};
