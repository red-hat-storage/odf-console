import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
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
import { getAvailablePanelPromises, getProtectedPanelPromises } from './utils';
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
  const drClusterNames = useDeepCompareMemoize(
    resource?.spec?.drClusters ?? []
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
    drPolicyName,
    dispatch
  );

  const isSubmitDisabled: boolean = React.useMemo(() => {
    const availableResources: PlacementToAppSets[] =
      state.availableResources[state.appType];
    const protectedResources: PlacementToAppSets[] =
      state.protectedResources[state.appType];
    const drpcPvcLabels: PlacementToDrpcMap =
      state.drpcPvcLabels[state.appType];

    // if any protected resource present on available panel => we need to delete DRPC, enable "Save changes" in this case
    const applicationsToDisable = availableResources.some(
      (availableResource: PlacementToAppSets) =>
        availableResource.isAlreadyProtected
    );

    // if any non-protected resource present on protected panel => we need to create DRPC, enable "Save" in this
    const [applicationsToEnable, isLablesAreNotEmpty] =
      protectedResources.reduce(
        (acc, protectedResource: PlacementToAppSets) => {
          const [applications, isLabelFound] = acc;
          const updateLabels =
            drpcPvcLabels?.[protectedResource.namespace]?.[
              protectedResource.placement
            ]?.updateLabels || [];
          acc = !protectedResource.isAlreadyProtected
            ? [
                [...applications, protectedResource],
                isLabelFound && !!updateLabels.length,
              ]
            : acc;
          return acc;
        },
        [[], true]
      );

    const changesFoundOnRightSide = !!applicationsToEnable.length;
    const noIssuesFoundOnRightSide = isLablesAreNotEmpty;
    const changesFoundOnLeftSide = !!applicationsToDisable;
    // we dont have any left side check, By default keeping it as true
    const noIssuesFoundOnLeftSide = true;

    if (!state.message.text && !!changesFoundOnLeftSide)
      dispatch({
        type: ApplyPolicyType.SET_MESSAGE,
        payload: {
          text: t(
            'Disabling DR protection for applications will no longer protect the underlying PVCs. You must reapply the policy in order to enable DR protection for your application.'
          ),
          variant: AlertVariant.warning,
        },
      });

    return !(
      (changesFoundOnRightSide || changesFoundOnLeftSide) &&
      noIssuesFoundOnRightSide &&
      noIssuesFoundOnLeftSide
    );
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
        variant: AlertVariant.danger,
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

        // TODO: Allow PVC selector update when the ramen is supporting
        /* // 2. updating PVC labels only if: DRPC is neither deleted nor created in previous steps
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
        } */
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
      description={
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Assign policy to protect critical applications and ensure quick recovery. Unassign policy from an application when they no longer require to be managed.'
            )}
          </Text>
          <Text component={TextVariants.h6}>{drPolicyName}</Text>
        </TextContent>
      }
      title={t('Manage policy for ApplicationSets')}
      isOpen={isOpen}
      onClose={closeModal}
      className="mco-apply-policy-modal__modal"
    >
      {!allLoaded || anyError ? (
        <StatusBox loadError={anyError} loaded={allLoaded} />
      ) : (
        <>
          <ModalBody>
            <ApplyPolicyDualListSelector state={state} dispatch={dispatch} />
            {!!state.message.text && (
              <Alert
                isInline
                variant={state.message.variant}
                title={state.message.text}
                className="odf-alert odf-alert--margin-top"
              >
                {state.message?.description}
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              data-test="cancel-button"
              data-testid="cancel-button"
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
                {t('Save')}
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
