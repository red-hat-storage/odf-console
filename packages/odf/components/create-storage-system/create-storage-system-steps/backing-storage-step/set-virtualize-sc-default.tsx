import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

type SetVirtualizeSCDefaultProps = {
  dispatch: WizardDispatch;
  isVirtualizeStorageClassDefault: WizardState['advancedSettings']['isVirtualizeStorageClassDefault'];
};

const SetVirtualizeSCDefault: React.FC<SetVirtualizeSCDefaultProps> = ({
  dispatch,
  isVirtualizeStorageClassDefault,
}) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup>
      <Checkbox
        id="set-virtualize-sc-default"
        data-test="set-virtualize-sc-default"
        label={t('Set default StorageClass for virtualization')}
        description={t(
          'If enabled, RBD virtualization StorageClass will be marked as the default for KubeVirt VM disks (persistent volumes) upon installation.'
        )}
        isChecked={isVirtualizeStorageClassDefault || false}
        onChange={() =>
          dispatch({
            type: 'advancedSettings/setIsVirtualizeStorageClassDefault',
            payload: !isVirtualizeStorageClassDefault,
          })
        }
        className="odf-backing-store__radio--margin-bottom"
      />
    </FormGroup>
  );
};

export default SetVirtualizeSCDefault;
