import * as React from 'react';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { ListKind } from '@odf/shared/types';
import { Operator } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { useTranslation } from 'react-i18next';
import { 
    Modal,
    Button,
    ButtonVariant,
    ModalVariant,
    Text,
    TextContent,
    TextVariants,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
    InputGroup,
    TextInput,
    Bullseye,
} from '@patternfly/react-core';
import { TableComposable, Tbody, Tr, Td, Th, Thead} from '@patternfly/react-table';
import { ApplicationModel, SubscriptionModel, PlacementRuleModel } from '../../../models';
import { DRPlacementControlKind, ApplicationKind,SubscriptionKind } from '../../../types';
import { ApplicationToPlacementRuleMap } from '../drpolicy-actions/apply-policy/application-selector';
import './application-status.scss';


const reactPropFix = {
    translate: 'no',
};

type ApplicationStatusPros = {
    drPlacementControls: DRPlacementControlKind[];
};

type PlacementRuleToDRPlacementControlDict = {
    [namespace in string]: {
        [placementRule in string] : DRPlacementControlKind;
    };
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


export const ApplicationStatus: React.FC<ApplicationStatusPros> = ((props) =>{
    const { t } = useTranslation('plugin__odf-console');

    const[isModalOpen, setModalOpen] = React.useState(false);
    const[applicationMapping, setApplicationMapping] = React.useState<ApplicationDict>({});
    const[subscriptionMapping, setSubscriptionMapping] = React.useState<SubcsriptionDict>({});
    const[applicationToPlacementRuleMap, setApplicationToPlacementRuleMap] = React.useState<ApplicationToPlacementRuleMap>({});
    const [filteredNames, setFilteredNames] = React.useState<string[]>([]);
    
    const [applications, applicationsLoaded, applicationsLoadError] = useK8sGet<ListKind<ApplicationKind>>(
        ApplicationModel
    );
    const [subscriptions, subscriptionsLoaded, subscriptionsLoadError] = useK8sGet<ListKind<SubscriptionKind>>(
        SubscriptionModel
    );

    const placementRuleToDRPlacementControlDict: PlacementRuleToDRPlacementControlDict = React.useMemo(() => (
        props.drPlacementControls?.reduce((arr, drpc) => ({ ...arr, [drpc?.metadata?.namespace]: {...arr[drpc?.metadata?.namespace],  [drpc?.spec?.placementRef?.name]: drpc}}), {})
    ), [props.drPlacementControls]);

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
            // filter subscription using drpc
            const subsFilter = (subscription: SubscriptionKind) => (
                subscription?.spec?.placement?.placementRef?.kind === PlacementRuleModel?.kind  &&
                Object.keys(placementRuleToDRPlacementControlDict?.[subscription?.metadata?.namespace] ?? {}).includes(subscription?.spec?.placement?.placementRef?.name)
            );
            // namespace wise subscription object
            const subscDict: SubcsriptionDict = subscriptions?.items.reduce((arr, subscription) => (subsFilter(subscription)? { ...arr, [subscription?.metadata?.namespace]: {...arr[subscription?.metadata?.namespace],  [subscription?.metadata?.name]: subscription}} : arr), {});
            setSubscriptionMapping(subscDict);
        };
    }, [
        subscriptions,
        subscriptionsLoaded,
        subscriptionsLoadError,
        placementRuleToDRPlacementControlDict
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
                    // fetch drpc rule using subscriptions
                    const drpc = placementRuleToDRPlacementControlDict[appNamespace][subs?.spec?.placement?.placementRef?.name];
                    const plsRuleName = drpc?.spec?.placementRef?.name;
                    
                    // generating application to placement rule map
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
                            placementControlRuleStatus: drpc?.status?.Phase,
                            disable: false,
                            namespace: appNamespace,
                        };
                    } else {
                        // morethan one placements rule found for same app
                        delete appToPlsRuleMap[Object.keys(appToPlsRuleMap)[0]];
                    };
                };
            });

            return appToPlsRuleMap;
        };

        if(Object.keys(applicationMapping).length !== 0 && Object.keys(subscriptionMapping).length !== 0) {
            let appToPlsRuleMap: ApplicationToPlacementRuleMap = {};
            
            Object.keys(applicationMapping).forEach((namespace) => {
                Object.keys(applicationMapping[namespace]).forEach((name) => {
                    appToPlsRuleMap = {...appToPlsRuleMap, ...applicationToPlacementRuleMapping(applicationMapping[namespace][name])};
                });
            });
            setApplicationToPlacementRuleMap(appToPlsRuleMap);
        };
    }, [applicationMapping, subscriptionMapping, placementRuleToDRPlacementControlDict]);

    React.useEffect(() => {
        setFilteredNames(Object.keys(applicationToPlacementRuleMap));
      },[applicationToPlacementRuleMap]);

    const handleModalToggle = (() => {
        setModalOpen(!isModalOpen);
    });

    const filterItems = (name: string, searchValue: string) => {
        if (name.toLowerCase().includes(searchValue.toLowerCase())) {
          return true;
        }
    };
    
    const onSearch = (searchValue: string) => {
        if (searchValue === '') {
            setFilteredNames(Object.keys(applicationToPlacementRuleMap));
        } else {
            setFilteredNames(Object.keys(applicationToPlacementRuleMap).filter(name => filterItems(applicationToPlacementRuleMap?.[name].applicationName, searchValue)));
        }
    };


    return (
      <React.Fragment>
        <Button variant={ButtonVariant.link} onClick={handleModalToggle}>
          {`${Object.keys(applicationToPlacementRuleMap).length} Applications`}
        </Button>
        <Modal
          variant={ModalVariant.small}
          title={t('Connected Applications')}
          isOpen={isModalOpen}
          onClose={handleModalToggle}
          hasNoBodyWrapper={true}
          className="mco-application-status__form"
        >
            <ModalBody className="mco-application-status__body">
                <TextContent>
                    <Text component={TextVariants.small}>
                        {t("List all the connected applications under a policy.")}
                    </Text>
                </TextContent>
                <Toolbar inset={{ default: 'insetNone' }}>
                    <ToolbarContent>
                        <ToolbarItem>
                            <InputGroup>
                                <TextInput placeholder={t("Application name")} name="appNameText" id="appNameText" type="search" aria-label={t("application name search")} onChange={onSearch}/>
                                <Button variant={ButtonVariant.control} aria-label={t("application name search button")}>
                                    <SearchIcon />
                                </Button>
                            </InputGroup>
                        </ToolbarItem>
                    </ToolbarContent>
                </Toolbar>
                <div className="mco-application-status__box">
                    {filteredNames.length === 0 ? (
                        <Bullseye className="mco-application-status__bullseye">
                            {t('No matching application found')}
                        </Bullseye>
                    ) : (
                        <div className="mco-application-status__table">
                            <TableComposable 
                                {...reactPropFix}
                                variant="compact"
                                aria-label={t("App list table")}
                                borders={false}
                                gridBreakPoint=''
                                isStickyHeader
                            >
                                <Thead {...reactPropFix}>
                                    <Tr {...reactPropFix}>
                                        <Th {...reactPropFix}>
                                            Name
                                        </Th>
                                        <Th {...reactPropFix}>
                                            Status
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody {...reactPropFix}>
                                    {filteredNames.map((uniqueName) => (
                                        <Tr {...reactPropFix} key={uniqueName}>
                                            <Td {...reactPropFix}>{applicationToPlacementRuleMap[uniqueName]?.applicationName}</Td>
                                            <Td {...reactPropFix}>{applicationToPlacementRuleMap[uniqueName]?.placementControlRuleStatus ?? '-'}</Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </TableComposable>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter className="mco-application-status__body">
                <Button key="close" variant={ButtonVariant.primary} onClick={handleModalToggle}>
                    {t('Close')}
                </Button>
            </ModalFooter>
        </Modal>
      </React.Fragment>
    );
});
