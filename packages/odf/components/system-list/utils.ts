import { referenceForModel } from '@odf/shared/utils';
import { Kebab } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { TFunction } from 'i18next';
import { addSSCapacityModal } from '../../modals/add-capacity/add-capacity-modal';
import { OCSStorageClusterModel } from '../../models';
import { StorageSystemKind } from '../../types';

const addStorage = (kind, resource: StorageSystemKind, _, customData) => {
    const t: TFunction = customData?.tFunction;
    return {
        labelKey: t('plugin__odf-console~Add Capacity'),
        callback: () => addSSCapacityModal({ storageSystem: resource }),
    };
};

const getGenericActions = () => [...Kebab.factory.common];

const getActionsForOCS = () => [addStorage, ...getGenericActions()];

export const getActions = (kind: string) => {
    if (referenceForModel(OCSStorageClusterModel).toLowerCase() === kind.toLowerCase())
        return getActionsForOCS();
    return getGenericActions();
};
