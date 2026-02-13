import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  Tooltip,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import './empty-page.scss';

const EmptyPage: React.FC<EmptyPageProps> = (props) => {
  const { t } = useCustomTranslation();

  const {
    title,
    children,
    buttonText,
    canAccess,
    isLoaded,
    onClick,
    ButtonComponent,
    isDisabled,
    EmptyIcon = CubesIcon,
  } = props;
  return !isLoaded ? (
    <div
      className="loading-skeleton--table mco-empty-page__skeleton"
      aria-label={t('Loading empty page')}
    />
  ) : (
    <EmptyState
      headingLevel="h4"
      icon={EmptyIcon}
      titleText={<>{title}</>}
      variant={EmptyStateVariant.lg}
    >
      <EmptyStateBody>{children}</EmptyStateBody>
      <EmptyStateFooter>
        <Tooltip
          content={
            !canAccess &&
            t(
              'You are not authorized to complete this action. See your cluster administrator for role-based access control information.'
            )
          }
          trigger={!canAccess ? 'mouseenter' : 'manual'}
          data-test="authorization-tooltip"
          aria-label={t('Not Authorized')}
        >
          {!!ButtonComponent ? (
            <ButtonComponent />
          ) : (
            <Button
              variant="primary"
              onClick={onClick}
              isAriaDisabled={!canAccess}
              data-test="create-button"
              aria-label={t('Empty Page')}
              isDisabled={isDisabled}
            >
              {buttonText}
            </Button>
          )}
        </Tooltip>
      </EmptyStateFooter>
    </EmptyState>
  );
};

type EmptyPageProps = {
  title: string;
  children?: any;
  buttonText?: string;
  canAccess?: boolean;
  isLoaded?: boolean;
  onClick?: () => void;
  ButtonComponent?: React.FC<unknown>;
  isDisabled?: boolean;
  EmptyIcon?: React.ComponentType<any>;
};

export default EmptyPage;
