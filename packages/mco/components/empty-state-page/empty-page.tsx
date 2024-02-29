import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  Tooltip,
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
  } = props;
  return !isLoaded ? (
    <div
      className="loading-skeleton--table mco-empty-page__skeleton"
      aria-label={t('Loading Empty Page')}
    />
  ) : (
    <EmptyState variant={EmptyStateVariant.large}>
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h4" size="lg">
        {title}
      </Title>
      <EmptyStateBody>{children}</EmptyStateBody>
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
            aria-label="Create DRPolicy"
          >
            {buttonText}
          </Button>
        )}
      </Tooltip>
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
};

export default EmptyPage;
