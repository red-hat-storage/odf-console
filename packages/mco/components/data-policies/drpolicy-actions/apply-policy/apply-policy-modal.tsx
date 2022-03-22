import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { ModalBody, ModalFooter, CommonModalProps } from '@odf/shared/modals/Modal';
import { ListKind, K8sResourceKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { k8sPatch, k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel, Operator } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { useTranslation } from 'react-i18next';
import { Alert, Text, Modal, Button, ButtonVariant, TextVariants, TextContent } from '@patternfly/react-core';
import { ApplicationModel, PlacementRuleModel, SubscriptionModel, DRPlacementControlModel } from '../../../../models';
import { DRPolicyKind, ManagedCluster, ApplicationKind, PlacementRuleKind, SubscriptionKind, DRPlacementControlKind} from '../../../../types';
import { DR_SECHEDULER_NAME } from '../../../../utils';
import { ApplicationSelector, ApplicationToPlacementRuleMap } from './application-selector';
import './apply-policy-modal.scss';


type ApplyModalExtraProps = {
    resource: DRPolicyKind;
    resourceModel: K8sModel;
  };


const ApplyDRPolicyModal: React.FC<CommonModalProps<ApplyModalExtraProps>> = (props) => {
    const { t } = useTranslation('plugin__odf-console');
    const {closeModal, isOpen, extraProps} = props;
    const {resource} = extraProps;
    const managedClusters: ManagedCluster[] = resource?.spec?.drClusterSet;;

    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
    const[applicationMapping, setApplicationMapping] = React.useState<ApplicationDict>({});
    const[subscriptionMapping, setSubscriptionMapping] = React.useState<SubcsriptionDict>({});
    const[placementRuleMapping, setPlacementRuleMapping] = React.useState<PlacementRuleDict>({});
    const[applicationToPlacementRuleMap, setApplicationToPlacementRuleMap] = React.useState<ApplicationToPlacementRuleMap>({});

    const [applications, applicationsLoaded, applicationsLoadError] = useK8sGet<ListKind<ApplicationKind>>(
        ApplicationModel
    );
    const [placementRules, placementRulesLoaded, placementRulesLoadError] = useK8sGet<ListKind<PlacementRuleKind>>(
        PlacementRuleModel
    );
    const [subscriptions, subscriptionsLoaded, subscriptionsLoadError] = useK8sGet<ListKind<SubscriptionKind>>(
        SubscriptionModel
    );

    const managedClusterNames: string[] = React.useMemo(() =>
        managedClusters?.map((cluster) => cluster.name), [managedClusters]);

    const clusterMatch = React.useCallback((plsRule: PlacementRuleKind) =>
        plsRule?.status?.decisions.find((decision) => 
            managedClusterNames?.includes(decision?.clusterName) &&
            managedClusterNames?.includes(decision?.clusterNamespace)
        ) || {},[managedClusterNames]);
    
    React.useEffect(() => {
        if(applicationsLoaded && !applicationsLoadError){
            const appFilter = (application: ApplicationKind) => (
                application?.spec?.componentKinds.some((componentKind) => 
                    componentKind?.group === SubscriptionModel?.apiGroup &&
                    componentKind?.kind === SubscriptionModel?.kind
                )
            );
            // namespace wise application object
            const appDict: ApplicationDict = applications?.items.reduce((arr, application) => appFilter(application) ? { ...arr, [application?.metadata?.namespace]: {...arr[application?.metadata?.namespace],  [application?.metadata?.name]: application}} : arr, {});
            setApplicationMapping(appDict);
        };
    }, [
        applications,
        applicationsLoaded,
        applicationsLoadError
    ]);

    React.useEffect(() => {
        if(subscriptionsLoaded && !subscriptionsLoadError){
            const subsFilter = (subscription: SubscriptionKind) => (
                subscription?.spec?.placement?.placementRef?.kind === PlacementRuleModel?.kind 
            );
            // namespace wise subscription object
            const subscDict: SubcsriptionDict = subscriptions?.items.reduce((arr, subscription) => (subsFilter(subscription)? { ...arr, [subscription?.metadata?.namespace]: {...arr[subscription?.metadata?.namespace],  [subscription?.metadata?.name]: subscription}} : arr), {});
            setSubscriptionMapping(subscDict);
        };
    }, [
        subscriptions,
        subscriptionsLoaded,
        subscriptionsLoadError
    ]);

    React.useEffect(() => {
        if(placementRulesLoaded && !placementRulesLoadError){
            // namespace wise placementrule object
            const plRuleDict: PlacementRuleDict = placementRules?.items.reduce((arr, placementRule) => ({ ...arr, [placementRule?.metadata?.namespace]: {...arr[placementRule?.metadata?.namespace],  [placementRule?.metadata?.name]: placementRule}}), {});
            setPlacementRuleMapping(plRuleDict);
        };
    }, [
        placementRules,
        placementRulesLoaded,
        placementRulesLoadError,
    ]);


    React.useEffect(() => {
        const applicationToPlacementRuleMapping = (app: ApplicationKind): ApplicationToPlacementRuleMap  => {
            let appToPlsRuleMap: ApplicationToPlacementRuleMap = {};
            const appName = app?.metadata?.name; 
            const appNamespace = app?.metadata?.namespace; 
            const namespcedSubscriptions = subscriptionMapping[appNamespace];
            
            Object.keys(namespcedSubscriptions).forEach((subsName) => {
                const subs = namespcedSubscriptions[subsName];
                
                // applying subscription filter from application
                let valid = true;
                app?.spec?.selector?.matchExpressions?.forEach((expr) => {
                    switch(expr?.operator) {
                       case Operator.In:
                            valid = valid && (expr?.values?.includes(subs?.metadata?.labels?.[expr?.key]));
                            break;
                       case Operator.NotIn:
                            valid = valid && !(expr?.values?.includes(subs?.metadata?.labels?.[expr?.key]));
                            break;
                       case Operator.Exists:
                            valid = valid && (Object.keys(subs?.metadata?.labels).includes(expr?.key)) && (!Array.isArray(expr?.values));
                            break;
                       case Operator.DoesNotExist:
                            valid = valid && !(Object.keys(subs?.metadata?.labels).includes(expr?.key)) && (!Array.isArray(expr?.values));
                            break;
                       default:
                           valid = false;
                           break;
                    };
                });
                if(valid) {
                    // fetch placement rule using subscriptions
                    const namespacedPlacementRule = placementRuleMapping[appNamespace][subs?.spec?.placement?.placementRef?.name];
                    const plsRuleName = namespacedPlacementRule?.metadata?.name;
                    
                    // generating application to placement rule map
                    const matchedCluster = clusterMatch(namespacedPlacementRule);
                    if (Object.keys(matchedCluster).length && namespacedPlacementRule?.spec?.schedulerName !== DR_SECHEDULER_NAME) {
                        const uniqueName = `${appName}-${appNamespace}-${plsRuleName}`;
                        if(uniqueName in appToPlsRuleMap){
                            // same placement rule is present for more than on subscription
                            appToPlsRuleMap[uniqueName]?.subscriptions.push(subsName);
                        } else if (Object.keys(appToPlsRuleMap).length == 0) {
                            // app to placement rule mapping
                            appToPlsRuleMap[uniqueName] = {
                                applicationName: appName,
                                placementRule: plsRuleName,
                                subscriptions: [subsName],
                                disable: false,
                                namespace: appNamespace,
                            };
                        } else {
                            // morethan one placements rule found for same app
                            appToPlsRuleMap[Object.keys(appToPlsRuleMap)[0]].disable = true;
                        };
                    };
                };
            });

            return appToPlsRuleMap;
        };

        if(Object.keys(applicationMapping).length !== 0 && Object.keys(subscriptionMapping).length !== 0 && Object.keys(placementRuleMapping).length !== 0) {
            let appToPlsRuleMap: ApplicationToPlacementRuleMap = {};
            
            Object.keys(applicationMapping).forEach((namespace) => {
                Object.keys(applicationMapping[namespace]).forEach((name) => {
                    appToPlsRuleMap = {...appToPlsRuleMap, ...applicationToPlacementRuleMapping(applicationMapping[namespace][name])};
                });
            });
            setApplicationToPlacementRuleMap(appToPlsRuleMap);
        };
    }, [applicationMapping, subscriptionMapping, placementRuleMapping, clusterMatch]);


    const getDRPlacementControlKindObj = (plsRule: PlacementRuleKind): DRPlacementControlKind => ({
        apiVersion: getAPIVersionForModel(DRPlacementControlModel),
        kind: DRPlacementControlModel.kind,
        metadata: {
          name: `${plsRule?.metadata?.name}-drpc`,
          namespace: plsRule?.metadata?.namespace,
          labels: plsRule?.metadata?.labels,
        },
        spec: {
            drPolicyRef: {
                name: resource?.metadata?.name,
            },
            placementRef: {
                name: plsRule?.metadata?.name,
                kind: plsRule?.kind,
            },
            preferredCluster: clusterMatch(plsRule)?.["clusterName"],
            pvcSelector: {
                matchLabels: {}
            },
        },
    });


    const submit = (event: React.FormEvent<EventTarget>) => {
        event.preventDefault();
        setLoading(true);
        const promises: Promise<K8sResourceKind>[] = [];
        selectedApps.forEach((uniqueName) => {
            const appToPlsRuleMap = applicationToPlacementRuleMap?.[uniqueName];
            const application = applicationMapping[appToPlsRuleMap?.namespace][appToPlsRuleMap?.applicationName];
            const plsRule = placementRuleMapping[application?.metadata?.namespace][appToPlsRuleMap?.placementRule];
            const patch = [{
                op: "replace",
                path: "/spec/schedulerName",
                value: DR_SECHEDULER_NAME,
            }];
            promises.push(
                k8sPatch({model: PlacementRuleModel, resource: plsRule, data: patch})
            );
            promises.push(
                k8sCreate({model: DRPlacementControlModel, data: getDRPlacementControlKindObj(plsRule)})
            );
        }); 
        Promise.all(promises).then(() => {
            closeModal();
        }).catch(
            (error) => setError(error)
        ).finally(() =>
            setLoading(false)
        );
    };

    return(
            <Modal
                width={'700px'}
                description={resource?.metadata?.name}
                title={t('Apply policy')}
                isOpen={isOpen}
                onClose={closeModal}
                hasNoBodyWrapper={true}
                className="mco-apply-policy-modal__form"
            >
                <ModalBody className="mco-apply-policy-modal__body">
                    <TextContent className="mco-apply-policy-modal__description">   
                        <Text component={TextVariants.small}>
                            {t("Select the apps you would like to apply the policy on")}
                        </Text>
                    </TextContent>
                    <div className="form-group">
                        <ApplicationSelector
                            applicationToPlacementRuleMap={applicationToPlacementRuleMap}
                            selectedNames={selectedApps}
                            setSelectedNames={setSelectedApps}
                        />
                    </div>
                    <div className="form-group">
                        <Alert
                            className="co-alert mco-apply-policy-modal__alert"
                            variant="info"
                            title={t("DR protection will be applied for all the PVCs under the selected applications.")}
                            isInline
                        />
                    </div>
                    {error && (
                        <div className="form-group">
                            <Alert
                                isInline
                                variant="danger"
                                title={t('An error occurred')}
                                className="co-alert mco-apply-policy-modal__alert"
                            >
                                {(error as any)?.message}
                            </Alert>
                        </div>
                    )}  
                </ModalBody>
                <ModalFooter className="mco-apply-policy-modal__body">
                    <Button key="cancel" variant={ButtonVariant.secondary} onClick={closeModal}>
                        {t('Cancel')}
                    </Button>
                {!loading ? (
                    <Button key="apply" variant={ButtonVariant.primary} onClick={submit}>
                        {t('Apply')}
                    </Button>
                ) : (
                    <LoadingInline />
                )}
                </ModalFooter>
            </Modal>
    );
};


type ApplicationDict = {
    [namespace in string]: {
        [app in string] : ApplicationKind;
    };
};

type SubcsriptionDict = {
    [namespace in string]: {
        [sub in string] : SubscriptionKind
    };
};

type PlacementRuleDict = {
    [namespace in string]: {
        [plsRule in string] : PlacementRuleKind
    };
};


export default ApplyDRPolicyModal;
