import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { ApplicationModel } from '@odf/shared/models/common';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
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
  SearchInput,
  Bullseye,
} from '@patternfly/react-core';
import {
  TableComposable,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  ThProps,
} from '@patternfly/react-table';
import { HUB_CLUSTER_NAME } from '../../../constants';
import { ACMPlacementRuleModel, ACMSubscriptionModel } from '../../../models';
import { ACMSubscriptionKind, DRPlacementControlKind } from '../../../types';
import {
  matchApplicationToSubscription,
  getPlacementKind,
} from '../../../utils';
import './application-status.scss';

const reactPropFix = {
  translate: 'yes',
};

type ApplicationStatusPros = {
  drPlacementControls: DRPlacementControlKind[];
};

type ApplicationMapping = {
  [namespace in string]: {
    [app in string]: ApplicationKind;
  };
};

type SubcsriptionMapping = {
  [namespace in string]: {
    [sub in string]: ACMSubscriptionKind;
  };
};

type PlacementRuleNameMapping = {
  [namespace in string]: string[];
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
};

const appFilter = (application: ApplicationKind) =>
  application?.spec?.componentKinds?.some(
    (componentKind) =>
      componentKind?.group === ACMSubscriptionModel?.apiGroup &&
      componentKind?.kind === ACMSubscriptionModel?.kind
  );

const filterItems = (name: string, searchValue: string) =>
  name.toLowerCase().includes(searchValue.toLowerCase());

const subsFilter = (
  drPlacementControls: DRPlacementControlKind[],
  subscription: ACMSubscriptionKind
) => {
  const placementRuleNameMapping: PlacementRuleNameMapping =
    drPlacementControls?.reduce(
      (arr, drpc) => ({
        ...arr,
        [drpc?.metadata?.namespace]: [
          ...(arr[drpc?.metadata?.namespace] || []),
          drpc?.spec?.placementRef?.name,
        ],
      }),
      {}
    );
  return (
    getPlacementKind(subscription) === ACMPlacementRuleModel?.kind &&
    placementRuleNameMapping?.[subscription?.metadata?.namespace]?.includes(
      subscription?.spec?.placement?.placementRef?.name
    )
  );
};

const isAppDRProtected = (
  subscriptionMapping: SubcsriptionMapping,
  app: ApplicationKind
): boolean => {
  const appNamespace = getNamespace(app);
  const namespcedSubscriptions = subscriptionMapping[appNamespace] ?? {};

  return Object.values(namespcedSubscriptions).some((subs) =>
    // applying subscription filter from application
    matchApplicationToSubscription(subs, app)
  );
};

export const ApplicationStatus: React.FC<ApplicationStatusPros> = (props) => {
  const { t } = useCustomTranslation();
  const { drPlacementControls } = props;

  const [isModalOpen, setModalOpen] = React.useState(false);
  const [applicationMapping, setApplicationMapping] =
    React.useState<ApplicationMapping>({});
  const [subscriptionMapping, setSubscriptionMapping] =
    React.useState<SubcsriptionMapping>({});
  const [applications, setApplications] = React.useState<ApplicationKind[]>([]);
  const [filteredApplications, setFilteredApplications] = React.useState<
    ApplicationKind[]
  >([]);
  const [searchAppName, setSearchAppName] = React.useState('');
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>();
  const [activeSortDirection, setActiveSortDirection] = React.useState<
    'asc' | 'desc'
  >();

  const response = useK8sWatchResources(resources);
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

    if (applicationsLoaded && !applicationsLoadError) {
      // namespace wise application object
      const appMapping: ApplicationMapping = applications?.reduce(
        (arr, application) =>
          appFilter(application)
            ? {
                ...arr,
                [application?.metadata?.namespace]: {
                  ...arr[application?.metadata?.namespace],
                  [application?.metadata?.name]: application,
                },
              }
            : arr,
        {}
      );
      setApplicationMapping(appMapping);
    }

    if (subscriptionsLoaded && !subscriptionsLoadError) {
      // namespace wise subscription object
      const subsMapping: SubcsriptionMapping = subscriptions?.reduce(
        (arr, subscription) =>
          subsFilter(drPlacementControls, subscription)
            ? {
                ...arr,
                [subscription?.metadata?.namespace]: {
                  ...arr[subscription?.metadata?.namespace],
                  [subscription?.metadata?.name]: subscription,
                },
              }
            : arr,
        {}
      );
      setSubscriptionMapping(subsMapping);
    }
  }, [memoizedResponse, drPlacementControls]);

  React.useEffect(() => {
    if (
      Object.keys(applicationMapping).length !== 0 &&
      Object.keys(subscriptionMapping).length !== 0
    ) {
      let apps: ApplicationKind[] = [];

      Object.keys(applicationMapping).forEach((namespace) => {
        Object.keys(applicationMapping[namespace]).forEach((name) => {
          const application = applicationMapping[namespace][name];
          const appDRProtected = isAppDRProtected(
            subscriptionMapping,
            application
          );
          apps = appDRProtected ? [...apps, application] : apps;
        });
      });
      setApplications(apps);
      setFilteredApplications(apps);
    }
  }, [applicationMapping, subscriptionMapping]);

  const handleModalToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const onClear = () => {
    setSearchAppName('');
    setFilteredApplications(applications);
  };

  // **Note: PatternFly change the fn signature
  // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
  // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  // both cases need to be handled for backwards compatibility
  const onSearch = (input: any) => {
    const searchValue =
      typeof input === 'string'
        ? input
        : (input.target as HTMLInputElement)?.value;
    if (searchValue === '') {
      onClear();
    } else {
      setSearchAppName(searchValue);
      setFilteredApplications(
        applications.filter((app) => filterItems(getName(app), searchValue))
      );
    }
  };

  let sortedRepositories = filteredApplications;
  if (activeSortIndex !== null && sortedRepositories?.length) {
    sortedRepositories = filteredApplications.sort((a, b) => {
      const name1 = getName(a);
      const name2 = getName(b);
      if (activeSortDirection === 'asc') {
        return name1.localeCompare(name2);
      }
      return name2.localeCompare(name1);
    });
  }

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  return (
    <React.Fragment>
      <Button
        variant={ButtonVariant.link}
        onClick={handleModalToggle}
        className="mco-application-status__link"
      >
        {t('{{ length }} Applications', { length: applications.length })}
      </Button>
      <Modal
        variant={ModalVariant.small}
        title={t('Connected applications')}
        isOpen={isModalOpen}
        onClose={handleModalToggle}
        className="mco-application-status__form"
      >
        <ModalBody>
          <TextContent>
            <Text component={TextVariants.small}>
              {t('List all the connected applications under a policy.')}
            </Text>
          </TextContent>
          <Toolbar inset={{ default: 'insetNone' }}>
            <ToolbarContent>
              <ToolbarItem>
                <SearchInput
                  data-test="appSearch"
                  placeholder={t('Application name')}
                  type="text"
                  aria-label={t('application name search')}
                  value={searchAppName}
                  onChange={onSearch}
                  onClear={() => onClear()}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <div className="mco-application-status__box">
            {filteredApplications.length === 0 ? (
              <Bullseye className="mco-application-status__bullseye">
                {t('No matching application found')}
              </Bullseye>
            ) : (
              <div className="mco-application-status__table">
                <TableComposable
                  {...reactPropFix}
                  variant="compact"
                  aria-label={t('Application list')}
                  borders={false}
                  gridBreakPoint=""
                  isStickyHeader
                >
                  <Thead {...reactPropFix}>
                    <Tr {...reactPropFix}>
                      <Th {...reactPropFix} sort={getSortParams(0)}>
                        {t('Name')}
                      </Th>
                      <Th {...reactPropFix} sort={getSortParams(1)}>
                        {t('Namespace')}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody {...reactPropFix}>
                    {sortedRepositories.map((app, rowIndex) => (
                      <Tr {...reactPropFix} key={rowIndex}>
                        <Td {...reactPropFix}>{getName(app)}</Td>
                        <Td {...reactPropFix}>{getNamespace(app)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </TableComposable>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            key="close"
            variant={ButtonVariant.primary}
            onClick={handleModalToggle}
          >
            {t('Close')}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};
