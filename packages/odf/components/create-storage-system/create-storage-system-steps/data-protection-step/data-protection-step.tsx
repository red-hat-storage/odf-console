import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Form, Checkbox } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';

export const DataProtection: React.FC<DataProtectionProps> = ({
  dataProtection,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Form>
      <Checkbox
        id="region-DR-preparation"
        isChecked={dataProtection.enableRDRPreparation}
        data-checked-state={dataProtection.enableRDRPreparation}
        label={t('Prepare cluster for disaster recovery (Regional-DR only)')}
        description={t(
          'Set up the storage system for disaster recovery service with the essential configurations in place. This will subsequently allows seamless implementation of the disaster recovery strategies for your workloads.'
        )}
        onChange={() =>
          dispatch({
            type: 'dataProtection/enableRDRPreparation',
            payload: !dataProtection.enableRDRPreparation,
          })
        }
      />
    </Form>
  );
};

type DataProtectionProps = {
  dataProtection: WizardState['dataProtection'];
  dispatch: WizardDispatch;
};
