import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { objectify } from '@odf/shared/modals/EditLabelModal';
import {
  ModalBody,
  ModalFooter,
  CommonModalProps,
} from '@odf/shared/modals/Modal';
import { SelectorInput } from '@odf/shared/modals/Selector';
import {
  getName,
  getNamespace,
  getLabels,
  getAnnotations,
} from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel } from '@odf/shared/utils';
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
  DR_SECHEDULER_NAME,
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
  PROTECTED_APP_ANNOTATION,
} from '../../../../constants';
import {
  getApplicationResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
} from '../../../../hooks';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '../../../../models';
import {
  DRPolicyKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
  DRPlacementControlKind,
  AppToPlacementType,
  ACMPlacementKind,
  ACMPlacementDecisionKind,
  PlacementInfoType,
  ACMPlacementType,
} from '../../../../types';
import {
  matchApplicationToSubscription,
  getPlacementUniqueId,
  findPlacementDecisionUsingPlacement,
  isPlacementModel,
} from '../../../../utils';
import { ApplicationSelector } from './application-selector';
import './apply-policy-modal.scss';
import '../../../../style.scss';

const resources = {
  applications: getApplicationResourceObj(),
  subscriptions: getSubscriptionResourceObj(),
  placementRules: getPlacementRuleResourceObj(),
  placements: getPlacementResourceObj(),
  placementDecisions: getPlacementDecisionsResourceObj(),
};

const getDRPlacementControlKindObj = (
  pls: ACMPlacementType,
  resource: DRPolicyKind,
  deploymentClusterName: string,
  pvcSelectors: string[]
): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${getName(pls)}-drpc`,
    namespace: getNamespace(pls),
    labels: getLabels(pls),
  },
  spec: {
    drPolicyRef: {
      name: getName(resource),
      kind: DRPolicyModel.kind,
      apiVersion: getAPIVersionForModel(DRPolicyModel),
    },
    placementRef: {
      name: getName(pls),
      kind: pls?.kind,
      namespace: getNamespace(pls),
      apiVersion: getAPIVersionForModel(ACMPlacementRuleModel),
    },
    preferredCluster: deploymentClusterName,
    pvcSelector: {
      matchLabels: objectify(pvcSelectors),
    },
  },
});

const clusterMatch = (
  decisions: { clusterName?: string }[],
  managedClusterNames: string[]
) =>
  decisions?.find((decision) =>
    managedClusterNames?.includes(decision?.clusterName)
  ) || {};

const appFilter = (application: ApplicationKind) =>
  application?.spec?.componentKinds?.some(
    (componentKind) =>
      componentKind?.group === ACMSubscriptionModel?.apiGroup &&
      componentKind?.kind === ACMSubscriptionModel?.kind
  );

const getSelectedPlacementRules = (
  selectedApps: TreeViewDataItem[]
): TreeViewDataItem[] => selectedApps.filter((app) => !app.children);

const filterSelectedPlacements = (
  checkedItems: TreeViewDataItem[],
  appToPlacementRuleMap: AppToPlacementType
): PlacementInfoType => {
  // Remove duplicate placement rules when it is used under more than one apps
  const placements: PlacementInfoType = {};
  checkedItems?.forEach((app) => {
    const appId = app.id.split(':')[0];
    if (appToPlacementRuleMap?.hasOwnProperty(appId) && !app?.children) {
      const placementId = app.id.split(':')[1];
      if (!placements?.hasOwnProperty(placementId)) {
        const appToPlsMap = appToPlacementRuleMap?.[appId];
        const pls = appToPlsMap?.placements?.[placementId];
        placements[placementId] = pls;
      }
    }
  });
  return placements;
};

const generateApplicationToPlacementMap = (
  app: ApplicationKind,
  subsMap: SubscriptionMap,
  plsRuleMap: PlacementRuleMap,
  plsMap: PlacementMap,
  plsDecisionMap: PlacementDecisionMap,
  managedClusterNames: string[]
): AppToPlacementType => {
  let appToPlsMap: AppToPlacementType = {};
  const appName = getName(app);
  const appNamespace = getNamespace(app);
  const namespcedSubscriptions = subsMap?.[appNamespace] ?? {};

  Object.values(namespcedSubscriptions).forEach((subs) => {
    // applying subscription filter from application
    const valid = matchApplicationToSubscription(subs, app);
    if (valid) {
      const placementRefKind = subs?.spec?.placement?.placementRef?.kind;
      const placementRefName = subs?.spec?.placement?.placementRef?.name;
      const placement: PlacementInfoType = {};
      let placementUniqueId = '';
      if (placementRefKind === ACMPlacementRuleModel?.kind) {
        // fetch placement rule using placement ref
        const plsRule = plsRuleMap?.[appNamespace]?.[placementRefName];
        const matchedCluster = clusterMatch(
          plsRule?.status?.decisions,
          managedClusterNames
        );
        if (
          !_.isEmpty(matchedCluster) &&
          plsRule?.spec?.schedulerName !== DR_SECHEDULER_NAME
        ) {
          // placementUniqueId is used to group the multiple subscription set under the same app.
          placementUniqueId = getPlacementUniqueId(
            getName(plsRule),
            getNamespace(plsRule),
            plsRule?.kind
          );
          // generating application to placement rule map
          placement[placementUniqueId] = {
            placement: plsRule,
            subscriptions: [subs],
            deploymentClusterName: matchedCluster?.clusterName,
          };
        }
      } else if (placementRefKind === ACMPlacementModel?.kind) {
        // fetch placement using placement ref
        const pls = plsMap?.[appNamespace]?.[placementRefName];
        const plsDecisions = plsDecisionMap?.[appNamespace];
        const plsDecision = findPlacementDecisionUsingPlacement(
          pls,
          plsDecisions
        );
        const matchedCluster = clusterMatch(
          plsDecision?.status?.decisions,
          managedClusterNames
        );
        if (
          !_.isEmpty(matchedCluster) &&
          !getAnnotations(pls)?.[PROTECTED_APP_ANNOTATION]
        ) {
          // placementUniqueId is used to group the multiple subscription set under the same app.
          placementUniqueId = getPlacementUniqueId(
            getName(pls),
            getNamespace(pls),
            pls?.kind
          );
          // generating application to placement map
          placement[placementUniqueId] = {
            placement: pls,
            subscriptions: [subs],
            deploymentClusterName: matchedCluster?.clusterName,
          };
        }
      }

      if (!_.isEmpty(placement)) {
        // appUniqueName will handle the corner case of same app name used across namespaces.
        const appUniqueName = `${appName}%${appNamespace}`;

        if (appUniqueName in appToPlsMap) {
          let placements = appToPlsMap[appUniqueName]?.placements || {};
          if (placementUniqueId in placements) {
            // same placement rule is present for more than on subscription
            placements?.[placementUniqueId]?.subscriptions.push(subs);
          } else {
            placements[placementUniqueId] = placement[placementUniqueId];
          }
        } else {
          // app to placement rule map
          appToPlsMap[appUniqueName] = {
            application: app,
            placements: placement,
          };
        }
      }
    }
  });

  return appToPlsMap;
};

const ApplyDRPolicyModal: React.FC<CommonModalProps<ApplyModalExtraProps>> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { closeModal, isOpen, extraProps } = props;
  const { resource } = extraProps;
  const { drClusters: managedClusterNames } = resource?.spec || {};
  const [labels, setLabels] = React.useState<string[]>([]);
  const [isProtectAllPVCChecked, setProtectAllPVC] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [selectedApps, setSelectedApps] = React.useState<{
    checkedItems: TreeViewDataItem[];
  }>({ checkedItems: [] });
  const [appToPlacementMap, setAppToPlacementMap] =
    React.useState<AppToPlacementType>({});
  const response =
    useK8sWatchResources<ApplyDRPolicyWatchResourceType>(resources);
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
    loaded: plsDecisionsLoaded,
    loadError: plsDecisionsLoadError,
  } = response?.placementDecisions;

  const loaded =
    appsLoaded &&
    subsLoaded &&
    plsRulesLoaded &&
    plsLoaded &&
    plsDecisionsLoaded;
  const loadError =
    appsLoadError ||
    subsLoadError ||
    plsRulesLoadError ||
    plsLoadError ||
    plsDecisionsLoadError;

  React.useEffect(() => {
    if (loaded && !loadError) {
      // namespace wise application object
      const appsMap: ApplicationMap = apps?.reduce(
        (arr, application) =>
          appFilter(application)
            ? {
                ...arr,
                [getNamespace(application)]: {
                  ...arr[getNamespace(application)],
                  [getName(application)]: application,
                },
              }
            : arr,
        {}
      );

      // namespace wise subscription object
      const subsMap: SubscriptionMap = subs?.reduce(
        (arr, subscription) =>
          isPlacementModel(subscription)
            ? {
                ...arr,
                [getNamespace(subscription)]: {
                  ...arr[getNamespace(subscription)],
                  [getName(subscription)]: subscription,
                },
              }
            : arr,
        {}
      );

      // namespace wise placementrule object
      const plsRuleMap: PlacementRuleMap = plsRules?.reduce(
        (arr, placementRule) => ({
          ...arr,
          [getNamespace(placementRule)]: {
            ...arr[getNamespace(placementRule)],
            [getName(placementRule)]: placementRule,
          },
        }),
        {}
      );

      // namespace wise Placement object
      const plsMap: PlacementMap = pls?.reduce(
        (arr, placement) => ({
          ...arr,
          [getNamespace(placement)]: {
            ...arr[getNamespace(placement)],
            [getName(placement)]: placement,
          },
        }),
        {}
      );

      // namespace wise PlacementDecision object
      const plsDecisionMap: PlacementDecisionMap = plsDecisions?.reduce(
        (arr, plDecision) => ({
          ...arr,
          [getNamespace(plDecision)]: [
            ...(arr[getNamespace(plDecision)] || []),
            plDecision,
          ],
        }),
        {}
      );

      if (
        !_.isEmpty(appsMap) &&
        !_.isEmpty(subsMap) &&
        (!_.isEmpty(plsRuleMap) || !_.isEmpty(plsMap))
      ) {
        let appToPlsMap: AppToPlacementType = {};
        Object.keys(appsMap).forEach((namespace) => {
          Object.keys(appsMap[namespace]).forEach((name) => {
            appToPlsMap = {
              ...appToPlsMap,
              ...generateApplicationToPlacementMap(
                appsMap[namespace][name],
                subsMap,
                plsRuleMap,
                plsMap,
                plsDecisionMap,
                managedClusterNames
              ),
            };
          });
        });
        setAppToPlacementMap(appToPlsMap);
      }
    } else {
      setError(!!loadError ? loadError?.message : '');
    }
  }, [
    apps,
    subs,
    plsRules,
    pls,
    plsDecisions,
    loaded,
    loadError,
    managedClusterNames,
    setError,
  ]);

  const selectedPlacementRules = React.useMemo(
    () => getSelectedPlacementRules(selectedApps.checkedItems),
    [selectedApps]
  );

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setLoading(true);
    const selectedPlacements: PlacementInfoType = filterSelectedPlacements(
      selectedApps?.checkedItems,
      appToPlacementMap
    );
    const promises: Promise<K8sResourceKind>[] = [];
    Object.values(selectedPlacements)?.forEach((placementInfo) => {
      const { placement, deploymentClusterName } = placementInfo;
      const patch = [];
      if (placement?.kind === ACMPlacementRuleModel.kind) {
        patch.push({
          op: 'replace',
          path: '/spec/schedulerName',
          value: DR_SECHEDULER_NAME,
        });
      } else {
        _.isEmpty(getAnnotations(placement)) &&
          // will give error otherwise, case when Placement does not have any annotations
          patch.push({ op: 'add', path: '/metadata/annotations', value: {} });
        patch.push({
          op: 'add',
          path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
          value: 'true',
        });
      }
      promises.push(
        k8sPatch({
          model:
            placement?.kind === ACMPlacementRuleModel.kind
              ? ACMPlacementRuleModel
              : ACMPlacementModel,
          resource: placement,
          data: patch,
          cluster: HUB_CLUSTER_NAME,
        })
      );
      promises.push(
        k8sCreate({
          model: DRPlacementControlModel,
          data: getDRPlacementControlKindObj(
            placement,
            resource,
            deploymentClusterName,
            _.size(selectedPlacements) === 1 ? labels : []
          ),
          cluster: HUB_CLUSTER_NAME,
        })
      );
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
          applicationToPlacementMap={appToPlacementMap}
          selectedNames={selectedApps}
          setSelectedNames={setSelectedApps}
        />
        <Form className="mco-subs-apply-policy-modal__pvcselector">
          {selectedPlacementRules?.length <= 1 ? (
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
              !!selectedPlacementRules?.length
                ? selectedPlacementRules?.length <= 1
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

type ApplyModalExtraProps = {
  resource: DRPolicyKind;
  resourceModel: K8sModel;
};

type ApplicationMap = {
  [namespace in string]: {
    [app in string]: ApplicationKind;
  };
};

type SubscriptionMap = {
  [namespace in string]: {
    [sub in string]: ACMSubscriptionKind;
  };
};

type PlacementRuleMap = {
  [namespace in string]: {
    [plsRule in string]: ACMPlacementRuleKind;
  };
};

type PlacementMap = {
  [namespace in string]: {
    [pls in string]: ACMPlacementKind;
  };
};

type PlacementDecisionMap = {
  [namespace in string]: ACMPlacementDecisionKind[];
};

type ApplyDRPolicyWatchResourceType = {
  applications: ApplicationKind[];
  subscriptions: ACMSubscriptionKind[];
  placementRules: ACMPlacementRuleKind[];
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
};

export default ApplyDRPolicyModal;
