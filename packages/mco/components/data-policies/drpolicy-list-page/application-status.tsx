import * as React from 'react';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { ApplicationModel } from '@odf/shared/models/common';
import { ListKind } from '@odf/shared/types';
import { ApplicationKind } from '@odf/shared/types/k8s';
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
import { ACMPlacementRuleModel, ACMSubscriptionModel } from '../../../models';
import { ACMSubscriptionKind, DRPlacementControlKind } from '../../../types';
import { matchApplicationsToSubstring } from '../../../utils';
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
    subscription?.spec?.placement?.placementRef?.kind ===
      ACMPlacementRuleModel?.kind &&
    placementRuleNameMapping?.[subscription?.metadata?.namespace]?.includes(
      subscription?.spec?.placement?.placementRef?.name
    )
  );
};

const fetchApplications = (
  subscriptionMapping: SubcsriptionMapping,
  app: ApplicationKind
): string[] => {
  let appNames: string[] = [];
  const appName = app?.metadata?.name;
  const appNamespace = app?.metadata?.namespace;
  const namespcedSubscriptions = subscriptionMapping[appNamespace] ?? {};

  Object.values(namespcedSubscriptions).forEach((subs) => {
    // applying subscription filter from application
    const valid = matchApplicationsToSubstring(subs, app);
    if (valid && !appNames.includes(appName)) {
      appNames.push(appName);
    }
  });

  return appNames;
};

export const ApplicationStatus: React.FC<ApplicationStatusPros> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
  const { drPlacementControls } = props;

  const [isModalOpen, setModalOpen] = React.useState(false);
  const [applicationMapping, setApplicationMapping] =
    React.useState<ApplicationMapping>({});
  const [subscriptionMapping, setSubscriptionMapping] =
    React.useState<SubcsriptionMapping>({});
  const [applicationNames, setApplicationNames] = React.useState<string[]>([]);
  const [filteredNames, setFilteredNames] = React.useState<string[]>([]);
  const [searchAppName, setSearchAppName] = React.useState('');
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>();
  const [activeSortDirection, setActiveSortDirection] = React.useState<
    'asc' | 'desc'
  >();

  const [applications, applicationsLoaded, applicationsLoadError] =
    useK8sGet<ListKind<ApplicationKind>>(ApplicationModel);
  const [subscriptions, subscriptionsLoaded, subscriptionsLoadError] =
    useK8sGet<ListKind<ACMSubscriptionKind>>(ACMSubscriptionModel);

  React.useEffect(() => {
    if (applicationsLoaded && !applicationsLoadError) {
      // namespace wise application object
      const appMapping: ApplicationMapping = applications?.items?.reduce(
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
      const subsMapping: SubcsriptionMapping = subscriptions?.items?.reduce(
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
  }, [
    applications,
    applicationsLoaded,
    applicationsLoadError,
    subscriptions,
    subscriptionsLoaded,
    subscriptionsLoadError,
    drPlacementControls,
  ]);

  React.useEffect(() => {
    if (
      Object.keys(applicationMapping).length !== 0 &&
      Object.keys(subscriptionMapping).length !== 0
    ) {
      let appNames: string[] = [];

      Object.keys(applicationMapping).forEach((namespace) => {
        Object.keys(applicationMapping[namespace]).forEach((name) => {
          appNames = [
            ...appNames,
            ...fetchApplications(
              subscriptionMapping,
              applicationMapping[namespace][name]
            ),
          ];
        });
      });
      setApplicationNames(appNames);
      setFilteredNames(appNames);
    }
  }, [applicationMapping, subscriptionMapping]);

  const handleModalToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const onSearch = (searchValue: string) => {
    setSearchAppName(searchValue);
    if (searchValue === '') {
      setFilteredNames(applicationNames);
    } else {
      setFilteredNames(
        applicationNames.filter((name) => filterItems(name, searchValue))
      );
    }
  };

  let sortedRepositories = filteredNames;
  if (activeSortIndex !== null && sortedRepositories?.length) {
    sortedRepositories = filteredNames.sort((a, b) => {
      if (activeSortDirection === 'asc') {
        return a.localeCompare(b);
      }
      return b.localeCompare(a);
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
      <Button variant={ButtonVariant.link} onClick={handleModalToggle}>
        {t('{{ length }} Applications', { length: applicationNames.length })}
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
              {t('List all the connected Applications under a policy.')}
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
                  onClear={() => setSearchAppName('')}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <div className="mco-application-status__box">
            {filteredNames.length === 0 ? (
              <Bullseye className="mco-application-status__bullseye">
                {t('No matching Application found')}
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
                        Name
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody {...reactPropFix}>
                    {sortedRepositories.map((appName, rowIndex) => (
                      <Tr {...reactPropFix} key={rowIndex}>
                        <Td {...reactPropFix}>{appName}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </TableComposable>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="mco-application-status__body">
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
