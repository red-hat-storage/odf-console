import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

export const SetCephRBDStorageClassDefault: React.FC<SetCephRBDStorageClassDefaultProps> =
  ({ dispatch, isRBDStorageClassDefault, doesDefaultSCAlreadyExists }) => {
    const { t } = useCustomTranslation();

    // for infra with already existing "default" SC (eg: say gp3-csi): option should be default unchecked.
    // for infra with no "default" SC (BM here): option should be default checked.
    React.useEffect(() => {
      // do not reset state once value is already set to either "true" or "false".
      // needed when user navigates back to this step and the FC gets mounted again.
      if (isRBDStorageClassDefault === null && !doesDefaultSCAlreadyExists) {
        dispatch({
          type: 'backingStorage/setIsRBDStorageClassDefault',
          payload: true,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <FormGroup>
        <Checkbox
          id="set-rbd-sc-default"
          data-test="set-rbd-sc-default"
          label={t('Use Ceph RBD as the default StorageClass')}
          description={t(
            'Configure default RBD StorageClass to avoid adding manual annotations within a StorageClass and selecting a specific StorageClass when making storage requests or provisions in your PVCs.'
          )}
          isChecked={isRBDStorageClassDefault || false}
          onChange={() =>
            dispatch({
              type: 'backingStorage/setIsRBDStorageClassDefault',
              payload: !isRBDStorageClassDefault,
            })
          }
          className="odf-backing-store__radio--margin-bottom"
        />
      </FormGroup>
    );
  };

type SetCephRBDStorageClassDefaultProps = {
  dispatch: WizardDispatch;
  isRBDStorageClassDefault: WizardState['backingStorage']['isRBDStorageClassDefault'];
  doesDefaultSCAlreadyExists: boolean | null;
};
