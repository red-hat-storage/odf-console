import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { TextVariants, Text, TextContent } from '@patternfly/react-core';
import { WizardState } from './reducer';
import './create-storage-system.scss';

export const CreateStorageSystemHeader: React.FC<
  CreateStorageSystemHeaderProps
> = ({ state }) => {
  const { t } = useCustomTranslation();
  const { systemNamespace } = state?.backingStorage || {};

  return (
    <div className="odf-create-storage-system__header">
      <TextContent>
        <Text component={TextVariants.h1}>{t('Create StorageSystem')}</Text>
        <Text component={TextVariants.small}>
          {t(
            'Create a StorageSystem to represent your Data Foundation system and all its required storage and computing resources.'
          )}
        </Text>
        {!!systemNamespace && (
          <Text
            component={TextVariants.small}
            className="pf-v5-u-text-align-right pf-v5-u-mr-xl"
          >
            <Trans t={t} values={{ systemNamespace }}>
              Namespace:{' '}
              <span className="pf-v5-u-font-weight-bold">
                {{ systemNamespace }}
              </span>
            </Trans>
          </Text>
        )}
      </TextContent>
    </div>
  );
};

type CreateStorageSystemHeaderProps = {
  state: WizardState;
};
