import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ModalBody,
  ModalFooter,
  CommonModalProps,
} from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { ListKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  Alert,
  Text,
  Modal,
  Button,
  ButtonVariant,
  TextVariants,
  AlertVariant,
  TextContent,
} from '@patternfly/react-core';
import { HUB_CLUSTER_NAME, APPLICATION_TYPE } from '../../../constants';
import { DRPlacementControlModel } from '../../../models';
import {
  DRPlacementControlKind,
  PlacementToDrpcMap,
  PlacementToAppSets,
} from '../../../types';
import { DRPolicyKind } from '../../../types';
import { useAppSetTypeResources } from './applicationset-handler';
import { ApplyPolicyDualListSelector } from './apply-policy-dual-list-selector';
import {
  ApplyPolicyReducer,
  applyPolicyInitialState,
  ApplyPolicyType,
} from './reducer';
import {
  getAvailablePanelPromises,
  getProtectedPanelPromises,
  areLabelsDifferent,
  getUpdatedDRPCPromise,
} from './utils';
import './apply-policy-modal.scss';
import '../../../style.scss';

type ApplyModalExtraProps = {
  resource: DRPolicyKind;
  resourceModel: K8sModel;
};

const ApplyDRPolicyModal: React.FC<CommonModalProps<ApplyModalExtraProps>> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { closeModal, isOpen, extraProps } = props;
  const { resource } = extraProps;

  const drPolicyName = getName(resource);
  const drClusterNames = React.useMemo(
    () => resource?.spec?.drClusters ?? [],
    [resource?.spec?.drClusters]
  );

  const [state, dispatch] = React.useReducer(
    ApplyPolicyReducer,
    applyPolicyInitialState
  );

  const [drpcs, drpcsLoaded, drpcsError] = useK8sGet<
    ListKind<DRPlacementControlKind>
  >(DRPlacementControlModel, null, null, HUB_CLUSTER_NAME);

  const [appSetResourcesLoaded, appSetResourcesError] = useAppSetTypeResources(
    drpcs?.items,
    drClusterNames,
    dispatch
  );

  const isSubmitDisabled: boolean = React.useMemo(() => {
    let disableSubmit = false;
    const availableResources: PlacementToAppSets[] =
      state.availableResources[state.appType];
    const protectedResources: PlacementToAppSets[] =
      state.protectedResources[state.appType];
    const drpcPvcLabels: PlacementToDrpcMap =
      state.drpcPvcLabels[state.appType];

    // if any protected resource present on available panel => we need to delete DRPC, enable "Save changes" in this case
    disableSubmit = !availableResources.some(
      (availableResource: PlacementToAppSets) =>
        availableResource.isAlreadyProtected
    );

    if (!state.message.text && !disableSubmit)
      dispatch({
        type: ApplyPolicyType.SET_MESSAGE,
        payload: {
          text: t(
            'Disabling DR protection for applications will no longer protect the underlying PVCs. You must reapply the policy in order to enable DR protection for your application.'
          ),
          type: AlertVariant.warning,
        },
      });
    if (disableSubmit === false) return disableSubmit;

    // if any non-protected resource present on protected panel => we need to create DRPC, enable "Save changes" in this case
    // if any new PVC label added to any resource => we need to update DRPC, enable "Save changes" in this case
    disableSubmit = !protectedResources.some(
      (protectedResource: PlacementToAppSets) => {
        const existingLabels =
          drpcPvcLabels?.[protectedResource.namespace]?.[
            protectedResource.placement
          ]?.existingLabels || [];
        const updateLabels =
          drpcPvcLabels?.[protectedResource.namespace]?.[
            protectedResource.placement
          ]?.updateLabels || [];
        return (
          !protectedResource.isAlreadyProtected ||
          areLabelsDifferent(existingLabels, updateLabels)
        );
      }
    );

    return disableSubmit;
  }, [state, dispatch, t]);

  const allLoaded = drpcsLoaded && appSetResourcesLoaded;
  const anyError = drpcsError || appSetResourcesError;

  const setLoading = (isLoading: boolean) =>
    dispatch({
      type: ApplyPolicyType.SET_LOADING,
      payload: isLoading,
    });
  const setError = (errorMsg: string) =>
    dispatch({
      type: ApplyPolicyType.SET_MESSAGE,
      payload: {
        text: errorMsg,
        type: AlertVariant.danger,
      },
    });

  const submit = (_event: React.FormEvent<EventTarget>) => {
    setLoading(true);
    const promises: Promise<K8sResourceKind>[] = [];

    _.forEach(APPLICATION_TYPE, (type) => {
      const placementsSet: Set<string> = new Set();
      const availableResources: PlacementToAppSets[] =
        state.availableResources[type];
      const protectedResources: PlacementToAppSets[] =
        state.protectedResources[type];
      const drpcPvcLabels: PlacementToDrpcMap = state.drpcPvcLabels[type];

      /** available panel -- 1. remove annotation from Placement and delete existing DRPC */
      availableResources.forEach((availableResource: PlacementToAppSets) => {
        // 1. patching Placement and deleting DRPC
        if (
          availableResource.isAlreadyProtected &&
          !placementsSet.has(
            availableResource.namespace + '%#%' + availableResource.placement
          )
        ) {
          placementsSet.add(
            availableResource.namespace + '%#%' + availableResource.placement
          );
          promises.push(
            ...getAvailablePanelPromises(availableResource, drpcPvcLabels)
          );
        }
      });

      /** protected panel -- 1. add annotation to Placement and create new DRPC
                          -- 2. patch existing DRPC with edited/updated PVC labels */
      protectedResources.forEach((protectedResource: PlacementToAppSets) => {
        // 1. patching Placement and creating DRPC
        if (
          !protectedResource.isAlreadyProtected &&
          !placementsSet.has(
            protectedResource.namespace + '%#%' + protectedResource.placement
          )
        ) {
          placementsSet.add(
            protectedResource.namespace + '%#%' + protectedResource.placement
          );
          promises.push(
            ...getProtectedPanelPromises(
              drPolicyName,
              drClusterNames,
              protectedResource,
              drpcPvcLabels
            )
          );
        }

        // 2. updating PVC labels only if: DRPC is neither deleted nor created in previous steps
        if (
          protectedResource.isAlreadyProtected &&
          !placementsSet.has(
            protectedResource.namespace + '%#%' + protectedResource.placement
          )
        ) {
          const existingLabels =
            drpcPvcLabels?.[protectedResource.namespace]?.[
              protectedResource.placement
            ]?.existingLabels || [];
          const updateLabels =
            drpcPvcLabels?.[protectedResource.namespace]?.[
              protectedResource.placement
            ]?.updateLabels || [];
          // update only if original and updated labels are different
          areLabelsDifferent(existingLabels, updateLabels) &&
            promises.push(
              ...getUpdatedDRPCPromise(protectedResource, drpcPvcLabels)
            );
        }
      });
    });

    Promise.all(promises)
      .then(() => {
        closeModal();
      })
      .catch((error) => {
        setError(error?.message);
        setLoading(false);
      });
  };

  return (
    <Modal
      description={drPolicyName}
      title={t('Apply DRPolicy')}
      isOpen={isOpen}
      onClose={closeModal}
      className="mco-apply-policy-modal__modal"
    >
      {!allLoaded || anyError ? (
        <StatusBox loadError={anyError} loaded={allLoaded} />
      ) : (
        <>
          <ModalBody>
            <TextContent>
              <Text component={TextVariants.small}>
                {t('Select apps and create labels to apply the policy')}
              </Text>
            </TextContent>
            <ApplyPolicyDualListSelector state={state} dispatch={dispatch} />
            {!!state.message.text && (
              <Alert
                isInline
                variant={state.message.type}
                title={state.message.text}
                className="odf-alert odf-alert--margin-top"
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              data-test="cancel-button"
              key="cancel"
              variant={ButtonVariant.secondary}
              onClick={closeModal}
            >
              {t('Cancel')}
            </Button>
            {!state.loading ? (
              <Button
                data-test="apply-button"
                key="apply"
                variant={ButtonVariant.primary}
                onClick={submit}
                isDisabled={isSubmitDisabled}
              >
                {t('Save changes')}
              </Button>
            ) : (
              <LoadingInline />
            )}
          </ModalFooter>
        </>
      )}
    </Modal>
  );
};

export default ApplyDRPolicyModal;
