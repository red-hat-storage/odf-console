import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
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
  return (
    <div className="mco-empty-page__background">
      <EmptyState variant={EmptyStateVariant.large}>
        <EmptyStateIcon icon={EmptyPageIcon} />
        <Title headingLevel="h4" size="lg">
          {props.title}
        </Title>
        <EmptyStateBody>{props.children}</EmptyStateBody>
        <Button
          variant="primary"
          onClick={props.onClick}
          data-test="create-button"
        >
          {props.buttonText}
        </Button>
      </EmptyState>
    </div>
  );
};

type EmptyPageProps = {
  title: string;
  children?: any;
  buttonText: string;
  onClick: () => void;
};

export default EmptyPage;
