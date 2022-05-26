import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  ModalBody,
  ModalFooter,
  CommonModalProps,
} from '@odf/shared/modals/Modal';
import { ApplicationModel } from '@odf/shared/models/common';
import { getName, getNamespace, getLabels } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel, referenceForModel } from '@odf/shared/utils';
import {
  k8sPatch,
  k8sCreate,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import {
  Alert,
  Text,
  Modal,
  Button,
  ButtonVariant,
  TextVariants,
  TextContent,
  TreeViewDataItem,
} from '@patternfly/react-core';
import { DR_SECHEDULER_NAME, HUB_CLUSTER_NAME } from '../../../../constants';
import {
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
  DRPlacementControlModel,
} from '../../../../models';
import {
  DRPolicyKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
  DRPlacementControlKind,
  AppToPlacementRule,
} from '../../../../types';
import { matchApplicationsToSubstring } from '../../../../utils';
import { ApplicationSelector } from './application-selector';
import './apply-policy-modal.scss';

type ApplyModalExtraProps = {
  resource: DRPolicyKind;
  resourceModel: K8sModel;
};

type ApplicationMap = {
  [namespace in string]: {
    [app in string]: ApplicationKind;
  };
};

type SubcsriptionMap = {
  [namespace in string]: {
    [sub in string]: ACMSubscriptionKind;
  };
};

type PlacementRuleMap = {
  [namespace in string]: {
    [plsRule in string]: ACMPlacementRuleKind;
  };
};

const resources = {
  applications: {
    kind: referenceForModel(ApplicationModel),
    namespaced: false,
    isList: true,
    cluster: HUB_CLUSTER_NAME,
  },
  subscriptions: {
    kind: referenceForModel(ACMSubscriptionModel),
    namespaced: false,
    isList: true,
    cluster: HUB_CLUSTER_NAME,
  },
  placementRules: {
    kind: referenceForModel(ACMPlacementRuleModel),
    namespaced: false,
    isList: true,
    cluster: HUB_CLUSTER_NAME,
  },
};

const getDRPlacementControlKindObj = (
  plsRule: ACMPlacementRuleKind,
  resource,
  managedClusterNames
): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${getName(plsRule)}-drpc`,
    namespace: getNamespace(plsRule),
    labels: getLabels(plsRule),
  },
  spec: {
    drPolicyRef: {
      name: getName(resource),
    },
    placementRef: {
      name: getName(plsRule),
      kind: plsRule?.kind,
    },
    preferredCluster: clusterMatch(plsRule, managedClusterNames)?.[
      'clusterName'
    ],
    pvcSelector: {
      matchLabels: {},
    },
  },
});

const clusterMatch = (
  plsRule: ACMPlacementRuleKind,
  managedClusterNames: string[]
) =>
  plsRule?.status?.decisions.find(
    (decision) =>
      managedClusterNames?.includes(decision?.clusterName) &&
      managedClusterNames?.includes(decision?.clusterNamespace)
  ) || {};

const ApplyDRPolicyModal: React.FC<CommonModalProps<ApplyModalExtraProps>> = (
  props
) => {
  const { t } = useCustomTranslation();
  const { closeModal, isOpen, extraProps } = props;
  const { resource } = extraProps;
  const managedClusterNames = React.useMemo(
    () => resource?.spec?.drClusters ?? [],
    [resource?.spec?.drClusters]
  );

  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [selectedApps, setSelectedApps] = React.useState<{
    checkedItems: TreeViewDataItem[];
  }>({ checkedItems: [] });
  const [applicationMap, setApplicationMap] = React.useState<ApplicationMap>(
    {}
  );
  const [subscriptionMap, setSubscriptionMap] = React.useState<SubcsriptionMap>(
    {}
  );
  const [placementRuleMap, setPlacementRuleMap] =
    React.useState<PlacementRuleMap>({});
  const [appToPlacementRuleMap, setAppToPlacementRuleMap] =
    React.useState<AppToPlacementRule>({});

  const response = useK8sWatchResources(resources);

  const appFilter = (application: ApplicationKind) =>
    application?.spec?.componentKinds?.some(
      (componentKind) =>
        componentKind?.group === ACMSubscriptionModel?.apiGroup &&
        componentKind?.kind === ACMSubscriptionModel?.kind
    );
  const memoizedResponse = useDeepCompareMemoize(response, true);

  React.useEffect(() => {
    const applicationsLoaded = memoizedResponse?.applications?.loaded;
    const applicationsLoadError = memoizedResponse?.applications?.loadError;
    const applications = (memoizedResponse?.applications?.data ??
      []) as ApplicationKind[];

    const subscriptionsLoaded = memoizedResponse?.subscriptions?.loaded;
    const subscriptionsLoadError = memoizedResponse?.subscriptions?.loadError;
    const subscriptions = (memoizedResponse?.subscriptions?.data ??
      []) as ACMSubscriptionKind[];

    const placementRulesLoaded = memoizedResponse?.placementRules?.loaded;
    const placementRulesLoadError = memoizedResponse?.placementRules?.loadError;
    const placementRules = (memoizedResponse?.placementRules?.data ??
      []) as ACMPlacementRuleKind[];
    if (applicationsLoaded && !applicationsLoadError) {
      // namespace wise application object
      const appMap: ApplicationMap = applications?.reduce(
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
      setApplicationMap(appMap);
    }

    if (subscriptionsLoaded && !subscriptionsLoadError) {
      const isPlacementRuleModel = (subscription: ACMSubscriptionKind) =>
        subscription?.spec?.placement?.placementRef?.kind ===
        ACMPlacementRuleModel?.kind;
      // namespace wise subscription object
      const subsMap: SubcsriptionMap = subscriptions?.reduce(
        (arr, subscription) =>
          isPlacementRuleModel(subscription)
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
      setSubscriptionMap(subsMap);
    }

    if (placementRulesLoaded && !placementRulesLoadError) {
      // namespace wise placementrule object
      const plRuleMap: PlacementRuleMap = placementRules?.reduce(
        (arr, placementRule) => ({
          ...arr,
          [getNamespace(placementRule)]: {
            ...arr[getNamespace(placementRule)],
            [getName(placementRule)]: placementRule,
          },
        }),
        {}
      );
      setPlacementRuleMap(plRuleMap);
    }
  }, [memoizedResponse]);

  React.useEffect(() => {
    const generateApplicationToPlacementRuleMap = (
      app: ApplicationKind
    ): AppToPlacementRule => {
      let appToPlsRuleMap: AppToPlacementRule = {};
      const appName = getName(app);
      const appNamespace = getNamespace(app);
      const namespcedSubscriptions = subscriptionMap?.[appNamespace] ?? {};

      Object.values(namespcedSubscriptions).forEach((subs) => {
        // applying subscription filter from application
        const valid = matchApplicationsToSubstring(subs, app);
        if (valid) {
          // fetch placement rule using subscriptions
          const plsRule =
            placementRuleMap?.[appNamespace]?.[
              subs?.spec?.placement?.placementRef?.name
            ];
          const plsRuleName = getName(plsRule);

          // generating application to placement rule map
          const matchedCluster = clusterMatch(plsRule, managedClusterNames);
          if (
            Object.keys(matchedCluster).length &&
            plsRule?.spec?.schedulerName !== DR_SECHEDULER_NAME
          ) {
            // placementUniqueName is used to group the multiple subscription set under the same app.
            const placementUniqueName = `${appName}-${appNamespace}-${plsRuleName}`;
            // appUniqueName will handle the corner case of same app name used across namespaces.
            const appUniqueName = `${appName}-${appNamespace}`;
            const placement = {
              [placementUniqueName]: {
                placementRules: plsRule,
                subscriptions: [subs],
              },
            };
            if (appUniqueName in appToPlsRuleMap) {
              let placements = appToPlsRuleMap[appUniqueName]?.placements;
              if (
                placementUniqueName in appToPlsRuleMap[appUniqueName].placements
              ) {
                // same placement rule is present for more than on subscription
                placements?.[placementUniqueName]?.subscriptions.push(subs);
              } else {
                placements[placementUniqueName] =
                  placement[placementUniqueName];
              }
            } else {
              // app to placement rule map
              appToPlsRuleMap[appUniqueName] = {
                application: app,
                placements: placement,
              };
            }
          }
        }
      });

      return appToPlsRuleMap;
    };

    if (
      Object.keys(applicationMap).length > 0 &&
      Object.keys(subscriptionMap).length > 0 &&
      Object.keys(placementRuleMap).length > 0
    ) {
      let appToPlsRuleMap: AppToPlacementRule = {};
      Object.keys(applicationMap).forEach((namespace) => {
        Object.keys(applicationMap[namespace]).forEach((name) => {
          appToPlsRuleMap = {
            ...appToPlsRuleMap,
            ...generateApplicationToPlacementRuleMap(
              applicationMap[namespace][name]
            ),
          };
        });
      });
      setAppToPlacementRuleMap(appToPlsRuleMap);
    }
  }, [applicationMap, subscriptionMap, placementRuleMap, managedClusterNames]);

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setLoading(true);
    const promises: Promise<K8sResourceKind>[] = [];
    selectedApps?.checkedItems?.forEach((app) => {
      if (Object.keys(appToPlacementRuleMap).includes(app?.id)) {
        app?.children?.forEach((placement) => {
          const appToPlsRuleMap = appToPlacementRuleMap?.[app?.id];
          const plsRule =
            appToPlsRuleMap?.placements?.[placement?.id]?.placementRules;
          const patch = [
            {
              op: 'replace',
              path: '/spec/schedulerName',
              value: DR_SECHEDULER_NAME,
            },
          ];
          promises.push(
            k8sPatch({
              model: ACMPlacementRuleModel,
              resource: plsRule,
              data: patch,
              cluster: HUB_CLUSTER_NAME,
            })
          );
          promises.push(
            k8sCreate({
              model: DRPlacementControlModel,
              data: getDRPlacementControlKindObj(
                plsRule,
                resource,
                managedClusterNames
              ),
              cluster: HUB_CLUSTER_NAME,
            })
          );
        });
      }
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
      description={getName(resource)}
      title={t('Apply DRPolicy')}
      isOpen={isOpen}
      onClose={closeModal}
      hasNoBodyWrapper={true}
      className="mco-apply-policy-modal__form"
    >
      <ModalBody className="mco-apply-policy-modal__body">
        <TextContent className="mco-apply-policy-modal__description">
          <Text component={TextVariants.small}>
            {t('Select the applications for applying the DRPolicy')}
          </Text>
        </TextContent>
        <ApplicationSelector
          applicationToPlacementRuleMap={appToPlacementRuleMap}
          selectedNames={selectedApps}
          setSelectedNames={setSelectedApps}
        />
        <Alert
          className="co-alert mco-apply-policy-modal__alert"
          variant="info"
          title={t(
            'Disaster recovery(DR) protection will be applied for all the persistent volume claims(PVCs) under the selected applications.'
          )}
          isInline
        />
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('An error occurred')}
            className="co-alert mco-apply-policy-modal__alert"
          >
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter className="mco-apply-policy-modal__body">
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
            isDisabled={!selectedApps?.checkedItems?.length}
          >
            {t('Apply')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ApplyDRPolicyModal;
