import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import {
  ModalBody,
  ModalFooter,
  CommonModalProps,
} from '@odf/shared/modals/Modal';
import { SelectorInput } from '@odf/shared/modals/Selector';
import { getName, getNamespace } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  k8sPatch,
  k8sCreate,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  Alert,
  Text,
  Modal,
  Button,
  ButtonVariant,
  TextVariants,
  TextContent,
  TreeViewDataItem,
  Form,
  FormGroup,
  Checkbox,
} from '@patternfly/react-core';
import {
  getApplicationResourceObj,
  useSubscriptionAppInfoParser,
  useDisasterRecoveryinfoParser,
  PlacementInfoType,
  SubscriptionInfoType,
  getSubscriptionResourceObj,
  getPlacementResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementRuleResourceObj,
  getDRPlacementControlResourceObj,
} from '../../../../hooks';
import {
  DRPolicyKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
  DRPlacementControlKind,
  AppToPlacementMap,
  ACMPlacementKind,
  ACMPlacementDecisionKind,
  PlacementToSubscriptionInfo,
} from '../../../../types';
import { getPlacementUniqueId } from '../../../../utils';
import { ApplicationSelector } from './application-selector';
import { getDRPCCrateObject, getPlacementPatchObj } from './utils';
import './apply-policy-modal.scss';
import '../../../../style.scss';

const resources = {
  applications: getApplicationResourceObj(),
  subscriptions: getSubscriptionResourceObj(),
  placementRules: getPlacementRuleResourceObj(),
  placements: getPlacementResourceObj(),
  placementDecisions: getPlacementDecisionsResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj(),
};

const getDeploymentClusterName = (
  placementInfo: PlacementInfoType,
  drClusters: string[]
) =>
  placementInfo?.deploymentClusters?.find((clusterName) =>
    drClusters?.includes(clusterName)
  );

const getSelectedPlacements = (
  selectedApps: TreeViewDataItem[]
): TreeViewDataItem[] => selectedApps.filter((app) => !app.children);

const filterSelectedPlacements = (
  checkedItems: TreeViewDataItem[],
  appToPlacementMap: AppToPlacementMap
): PlacementToSubscriptionInfo => {
  // Remove duplicate placement when it is used under more than one apps
  const placements: PlacementToSubscriptionInfo = {};
  checkedItems?.forEach((app) => {
    const appId = app.id.split(':')[0];
    if (Object.keys(appToPlacementMap).includes(appId) && !app?.children) {
      const placementId = app.id.split(':')[1];
      if (!Object.keys(placements).includes(placementId)) {
        const appToPlsMap = appToPlacementMap?.[appId];
        const placementInfo = appToPlsMap?.placements?.[placementId];
        placements[placementId] = placementInfo;
      }
    }
  });
  return placements;
};

const updateAppToPlsMap = (
  appName: string,
  appNamespace: string,
  subscriptionInfo: SubscriptionInfoType,
  appToPlsMap: AppToPlacementMap,
  isClusterMatched: boolean,
  isDRProtected: boolean
) => {
  if (isClusterMatched && !isDRProtected) {
    const { placementInfo } = subscriptionInfo;
    // appUniqueName will handle the corner case of same app name used across namespaces.
    const appUniqueName = `${appName}%${appNamespace}`;
    // placementUniqueName is used to group the multiple subscription set under the same app.
    const placementUniqueName = `${appUniqueName}%${getPlacementUniqueId(
      getName(placementInfo),
      getNamespace(placementInfo),
      placementInfo?.kind
    )}`;
    if (appUniqueName in appToPlsMap) {
      let placements = appToPlsMap[appUniqueName]?.placements;
      placements[placementUniqueName] = subscriptionInfo;
    } else {
      // app to placement rule map
      appToPlsMap[appUniqueName] = {
        application: {
          appName,
          appNamespace,
        },
        placements: {
          [placementUniqueName]: subscriptionInfo,
        },
      };
    }
  }
};

const ApplyDRPolicyModal: React.FC<CommonModalProps<ApplyModalExtraProps>> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { closeModal, isOpen, extraProps } = props;
  const { resource } = extraProps;
  const { drClusters } = resource?.spec;

  const [labels, setLabels] = React.useState<string[]>([]);
  const [isProtectAllPVCChecked, setProtectAllPVC] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [selectedApps, setSelectedApps] = React.useState<{
    checkedItems: TreeViewDataItem[];
  }>({ checkedItems: [] });

  const response =
    useK8sWatchResources<ApplicationWatchResourceType>(resources);
  const {
    data: apps,
    loaded: appsLoaded,
    loadError: appsLoadError,
  } = response?.applications;
  const {
    data: subs,
    loaded: subsLoaded,
    loadError: subsLoadError,
  } = response?.subscriptions;
  const {
    data: plsRules,
    loaded: plsRulesLoaded,
    loadError: plsRulesLoadError,
  } = response?.placementRules;
  const {
    data: pls,
    loaded: plsLoaded,
    loadError: plsLoadError,
  } = response?.placements;
  const {
    data: plsDecisions,
    loaded: plsDecisionLoaded,
    loadError: plsDecisionLoadError,
  } = response?.placementDecisions;
  const {
    data: drpcs,
    loaded: drpcsLoaded,
    loadError: drpcsLoadError,
  } = response?.drPlacementControls;
  const loaded =
    appsLoaded &&
    subsLoaded &&
    plsRulesLoaded &&
    plsLoaded &&
    plsDecisionLoaded &&
    drpcsLoaded;
  const loadError =
    appsLoadError ||
    subsLoadError ||
    plsRulesLoadError ||
    plsLoadError ||
    plsDecisionLoadError ||
    drpcsLoadError;
  const disasterRecoveryInfo = useDisasterRecoveryinfoParser({
    drPlacementControls: drpcs,
    loaded: drpcsLoaded,
    loadError: drpcsLoadError,
  });
  const subscriptionAppInfo = useSubscriptionAppInfoParser({
    applications: apps,
    subscriptions: subs,
    placementRules: plsRules,
    placements: pls,
    placementDecisions: plsDecisions,
    disasterRecoveryInfo,
    loaded:
      appsLoaded &&
      subsLoaded &&
      plsRulesLoaded &&
      plsLoaded &&
      plsDecisionLoaded &&
      drpcsLoaded,
    loadError:
      appsLoadError ||
      subsLoadError ||
      plsRulesLoadError ||
      plsLoadError ||
      plsDecisionLoadError ||
      drpcsLoadError,
  });
  const appToPlsMap: AppToPlacementMap = React.useMemo(() => {
    let appToPlsMap: AppToPlacementMap = {};
    if (loaded && !loadError) {
      subscriptionAppInfo?.forEach((appInfo) => {
        appInfo?.subscriptionInfo?.forEach((subsInfo) => {
          const isClusterMatched = !!getDeploymentClusterName(
            subsInfo?.placementInfo,
            drClusters
          );
          const isDREnabled = !_.isEmpty(subsInfo?.disasterRecoveryInfo);
          updateAppToPlsMap(
            getName(appInfo?.applicationInfo),
            getNamespace(appInfo?.applicationInfo),
            subsInfo,
            appToPlsMap,
            isClusterMatched,
            isDREnabled
          );
        });
      });
    } else {
      !!loadError && setError(loadError?.message);
    }
    return appToPlsMap;
  }, [subscriptionAppInfo, drClusters, loaded, loadError, setError]);

  const selectedPlacements = React.useMemo(
    () => getSelectedPlacements(selectedApps.checkedItems),
    [selectedApps]
  );

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setLoading(true);
    const filteredPlacements: PlacementToSubscriptionInfo =
      filterSelectedPlacements(selectedApps?.checkedItems, appToPlsMap);
    const promises: Promise<K8sResourceKind>[] = [];
    Object.values(filteredPlacements)?.forEach((plsInfo) => {
      const placement = plsInfo?.placementInfo;
      promises.push(k8sPatch(getPlacementPatchObj(placement)));
      promises.push(
        k8sCreate(
          getDRPCCrateObject(
            placement,
            getDeploymentClusterName(placement, drClusters),
            getName(resource),
            Object.keys(filteredPlacements)?.length <= 1 ? labels : []
          )
        )
      );
    });
    Promise.all(promises)
      .then(() => {
        closeModal();
      })
      .catch((resourceError) => {
        setError(resourceError?.message);
        setLoading(false);
      });
  };

  return (
    <Modal
      width="650px"
      description={
        <TextContent className="mco-subs-apply-policy-modal__description">
          <Text component={TextVariants.small}>
            {t('Select the applications for assigning the DRPolicy')}
          </Text>
          <Text component={TextVariants.h6}>{getName(resource)}</Text>
        </TextContent>
      }
      title={t('Assign policy to Subscriptions')}
      isOpen={isOpen}
      onClose={closeModal}
      className="mco-subs-apply-policy-modal__form"
    >
      <ModalBody className="modalBody modalInput--lowHeight">
        <ApplicationSelector
          appToPlacementMap={appToPlsMap}
          selectedNames={selectedApps}
          setSelectedNames={setSelectedApps}
        />
        <Form className="mco-subs-apply-policy-modal__pvcselector">
          {selectedPlacements?.length <= 1 ? (
            <FormGroup
              fieldId="pvc-selector"
              label={t('PVC label')}
              helperText={t(
                'A selector label to DR protect only specific PVCs within an application.'
              )}
              isRequired
            >
              <SelectorInput onChange={(l) => setLabels(l)} tags={labels} />
            </FormGroup>
          ) : (
            <>
              <Alert
                className="odf-alert mco-subs-apply-policy-modal__alert"
                variant="warning"
                title={t(
                  "When multiple applications are selected, DR protection will be applied for all the PVCs under the application's namespace."
                )}
                isInline
              />
              <FormGroup fieldId="all-pvc">
                <Checkbox
                  id="user-agreement"
                  label={
                    <>
                      {t("Protect all PVCs within the application's namespace")}
                      <span className="pf-c-form__label-required">*</span>
                    </>
                  }
                  isChecked={isProtectAllPVCChecked}
                  onChange={() => setProtectAllPVC(!isProtectAllPVCChecked)}
                />
              </FormGroup>
            </>
          )}
        </Form>
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('An error occurred')}
            className="odf-alert mco-subs-apply-policy-modal__alert"
          >
            {error}
          </Alert>
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
        {!loading ? (
          <Button
            data-test="apply-button"
            key="apply"
            variant={ButtonVariant.primary}
            onClick={submit}
            isDisabled={
              !!selectedPlacements?.length
                ? selectedPlacements?.length <= 1
                  ? !labels.length
                  : !isProtectAllPVCChecked
                : true
            }
          >
            {t('Assign')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

type ApplicationWatchResourceType = {
  applications: ApplicationKind[];
  subscriptions: ACMSubscriptionKind[];
  placementRules: ACMPlacementRuleKind[];
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

type ApplyModalExtraProps = {
  resource: DRPolicyKind;
  resourceModel: K8sModel;
};

export default ApplyDRPolicyModal;
