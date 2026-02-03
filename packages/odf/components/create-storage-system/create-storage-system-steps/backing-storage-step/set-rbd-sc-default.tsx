import * as React from 'react';
import {
  useK8sGet,
  ListKind,
  StorageClassResourceKind,
  StorageClassModel,
} from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isDefaultClass } from '@odf/shared/utils';
import classNames from 'classnames';
import { FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './backing-storage-step.scss';

export const SetCephRBDStorageClassDefault: React.FC<
  SetCephRBDStorageClassDefaultProps
> = ({ dispatch, isRBDStorageClassDefault, className }) => {
  const { t } = useCustomTranslation();
  const [sc, scLoaded] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);

  // "null" signifies that we don't know value of "doesDefaultSCAlreadyExists" yet
  const doesDefaultSCAlreadyExists = scLoaded
    ? sc?.items?.some((item) => isDefaultClass(item)) || false
    : null;

  // for infra with already existing "default" SC (eg: say gp3-csi): option should be default unchecked.
  // for infra with no "default" SC (BM here): option should be default checked.
  React.useEffect(() => {
    // do not reset state once value is already set to either "true" or "false".
    // needed when user navigates back to this step and the FC gets mounted again.
    if (
      isRBDStorageClassDefault === null &&
      doesDefaultSCAlreadyExists !== null &&
      !doesDefaultSCAlreadyExists
    ) {
      dispatch({
        type: 'advancedSettings/setIsRBDStorageClassDefault',
        payload: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doesDefaultSCAlreadyExists]);

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
            type: 'advancedSettings/setIsRBDStorageClassDefault',
            payload: !isRBDStorageClassDefault,
          })
        }
        className={classNames(
          'odf-backing-store__radio--margin-bottom',
          className
        )}
        isDisabled={!scLoaded}
      />
    </FormGroup>
  );
};

type SetCephRBDStorageClassDefaultProps = {
  dispatch: WizardDispatch;
  isRBDStorageClassDefault: WizardState['advancedSettings']['isRBDStorageClassDefault'];
  className?: string;
};
