import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Trans } from 'react-i18next';
import { ContentVariants, Content } from '@patternfly/react-core';
import { WizardState } from './reducer';
import './create-storage-system.scss';

export const CreateStorageSystemHeader: React.FC<
  CreateStorageSystemHeaderProps
> = ({ state }) => {
  const { t } = useCustomTranslation();
  const { systemNamespace } = state?.backingStorage || {};

  return (
    <div className="odf-create-storage-system__header">
      <Content>
        <Content component={ContentVariants.h1}>
          {t('Create storage system')}
        </Content>
        <Content component={ContentVariants.small}>
          {t(
            'Create a storage cluster using local devices on your OpenShift nodes. Deploys Data Foundation with block, shared filesystem, and object services.'
          )}
        </Content>
        {!!systemNamespace && (
          <Content
            component={ContentVariants.small}
            className="pf-v6-u-text-align-right pf-v6-u-mr-xl"
          >
            <Trans t={t} values={{ systemNamespace }}>
              Namespace:{' '}
              <span className="pf-v6-u-font-weight-bold">
                {{ systemNamespace }}
              </span>
            </Trans>
          </Content>
        )}
      </Content>
    </div>
  );
};

type CreateStorageSystemHeaderProps = {
  state: WizardState;
};
