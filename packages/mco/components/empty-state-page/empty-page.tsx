import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import {
  Button,
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  Tooltip,
} from '@patternfly/react-core';
import './empty-page.scss';

const EmptyPageIcon: React.FC = () => {
  const { t } = useCustomTranslation();
  const image = require('../../assets/EmptyPageIcon.png');
  return (
    <img
      src={image}
      className="mco-empty-page__icon"
      alt={t('Empty page logo')}
    />
  );
};

const EmptyPage: React.FC<EmptyPageProps> = (props) => {
  const { t, title, children, buttonText, canAccess, onClick } = props;
  return (
    <div className="mco-empty-page__background">
      <EmptyState variant={EmptyStateVariant.large}>
        <EmptyStateIcon icon={EmptyPageIcon} />
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
        >
          {
            <Button
              variant="primary"
              onClick={onClick}
              isAriaDisabled={!canAccess}
              data-test="create-button"
            >
              {buttonText}
            </Button>
          }
        </Tooltip>
      </EmptyState>
    </div>
  );
};

type EmptyPageProps = {
  title: string;
  children?: any;
  buttonText: string;
  canAccess?: boolean;
  t: TFunction;
  onClick: () => void;
};

export default EmptyPage;
