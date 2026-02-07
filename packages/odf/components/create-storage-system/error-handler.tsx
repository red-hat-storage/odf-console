import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Bullseye,
  Spinner,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import './create-storage-system.scss';

export const ErrorHandler: React.FC<WizardStepProps> = ({
  children,
  error,
  loaded,
  loadingMessage,
  errorMessage,
}) => {
  const { t } = useCustomTranslation();

  if (!loaded && !error) {
    return (
      <Bullseye className="odf-create-storage-system-wizard-body">
        <Flex direction={{ default: 'column' }}>
          <FlexItem alignSelf={{ default: 'alignSelfCenter' }}>
            <Spinner />
          </FlexItem>
          <FlexItem>
            {loadingMessage && (
              <Content>
                <Content>{loadingMessage}</Content>
              </Content>
            )}
          </FlexItem>
        </Flex>
      </Bullseye>
    );
  }

  if (error) {
    return (
      <Bullseye className="odf-create-storage-system-wizard-body">
        <Content>
          <Content
            className="odf-create-storage-system-wizard-body__error"
            component={ContentVariants.p}
          >
            {errorMessage ||
              t('An error has occurred: {{error}}', { error: error?.message })}
          </Content>
        </Content>
      </Bullseye>
    );
  }

  return children;
};

type WizardStepProps = {
  children: React.ReactElement;
  loaded: boolean;
  error: any;
  loadingMessage?: string;
  errorMessage?: React.ReactElement;
};
