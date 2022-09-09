import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  GreenCheckCircleIcon,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import * as _ from 'lodash';
import {
  Flex,
  FlexItem,
  Text,
  TextContent,
  TextVariants,
  Tooltip,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import {
  TableComposable,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  ThProps,
  SortByDirection,
} from '@patternfly/react-table';
import { DRPlacementControlKind } from '../../../types';
import { DRPolicyMap, getDRPoliciesCount } from '../../../utils';
import { DRPC_STATUS } from './dr-status-card';
import './dr-status-table.scss';

const reactPropFix = {
  translate: 'yes',
};

const getCurrentStatus = (drpcList: DRPlacementControlKind[]): string =>
  drpcList.reduce((prevStatus, drpc) => {
    const newStatus = DRPC_STATUS[drpc?.status?.phase] || '';
    return [DRPC_STATUS.Relocating, DRPC_STATUS.FailingOver].includes(newStatus)
      ? newStatus
      : prevStatus || newStatus;
  }, '');

const isRelocating = (status: DRPC_STATUS) =>
  [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated].includes(status);

const isFailingOver = (status: DRPC_STATUS) =>
  [DRPC_STATUS.FailingOver, DRPC_STATUS.FailedOver].includes(status);

const getTargetClusters = (
  currentStatus: string,
  drpcList: DRPlacementControlKind[]
) => {
  const targetClusters = drpcList.reduce((acc, drpc) => {
    const status = DRPC_STATUS[drpc?.status?.phase] || '';
    if (status === currentStatus) {
      (isRelocating(status) && acc.add(drpc?.spec?.preferredCluster)) ||
        (isFailingOver(status) && acc.add(drpc?.spec?.failoverCluster));
    }
    return acc;
  }, new Set());
  return [...targetClusters].join(',');
};

const getDRStatus = (
  currentStatus: string,
  targetClusters: string,
  t: TFunction
) => {
  switch (currentStatus) {
    case DRPC_STATUS.Relocating:
    case DRPC_STATUS.FailingOver:
      return {
        text: currentStatus,
        icon: <InProgressIcon />,
        toolTip: (
          <>
            <h4>{t('Target cluster')}</h4>
            <p>{t('In use: {{targetClusters}}', { targetClusters })}</p>
          </>
        ),
      };
    case DRPC_STATUS.Relocated:
    case DRPC_STATUS.FailedOver:
      return {
        text: currentStatus,
        icon: <GreenCheckCircleIcon />,
        toolTip: (
          <>
            <h4>{t('Target cluster')}</h4>
            <p>{t('Used: {{targetClusters}}', { targetClusters })}</p>
          </>
        ),
      };
    default:
      return {};
  }
};

const getSortableRowValues = (drStatus: DRCurrentStatusType): string[] => [
  drStatus?.drPolicyName,
  drStatus?.lastSync,
  drStatus?.currentStatus?.text,
];

const sortDRStatus = (
  drCurrentStatus: DRCurrentStatusType[],
  activeSortIndex: number,
  activeSortDirection: string
) => {
  let sortedDRStatus = drCurrentStatus;
  if (activeSortIndex !== null && sortedDRStatus?.length) {
    sortedDRStatus = drCurrentStatus.sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];
      if (activeSortDirection === SortByDirection.asc) {
        return aValue.localeCompare(bValue);
      }
      return bValue.localeCompare(aValue);
    });
  }
  return sortedDRStatus;
};

export const DRPoliciesStatusTable: React.FC<DRPoliciesStatusTableProps> = ({
  drPolicies,
}) => {
  const { t } = useCustomTranslation();
  const [activeSortIndex, setActiveSortIndex] = React.useState<number>(null);
  const [activeSortDirection, setActiveSortDirection] =
    React.useState<SortByDirection>();
  const drCurrentStatus: DRCurrentStatusType[] = React.useMemo(
    () =>
      _.map(drPolicies, (drpcList, policyName) => {
        const currentStatus = getCurrentStatus(drpcList);
        const targetClusters = getTargetClusters(currentStatus, drpcList);
        return {
          drPolicyName: policyName,
          // TODO:Gowtham Once it is available on DRPC CR
          lastSync: '',
          currentStatus: getDRStatus(currentStatus, targetClusters, t),
        };
      }),
    [drPolicies, t]
  );

  const sortedDRStatus = React.useMemo(
    () => sortDRStatus(drCurrentStatus, activeSortIndex, activeSortDirection),
    [drCurrentStatus, activeSortIndex, activeSortDirection]
  );

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
    <Flex
      direction={{ default: 'column' }}
      spaceItems={{ default: 'spaceItemsMd' }}
    >
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.h4} data-test="dr-policies-count">
            {t('{{count}} Disaster recovery policies ', {
              count: getDRPoliciesCount(drPolicies),
            })}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Track the status of ongoing activities associated with the policy in use with your application.'
            )}
          </Text>
        </TextContent>
      </FlexItem>
      <FlexItem className="mco-dr-status-status-table__box">
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
              <Th
                {...reactPropFix}
                sort={getSortParams(0)}
                data-test="policy-name-column"
              >
                {t('Policy name')}
              </Th>
              <Th
                {...reactPropFix}
                sort={getSortParams(1)}
                data-test="last-sync-column"
              >
                {t('Last sync')}
              </Th>
              <Th
                {...reactPropFix}
                sort={getSortParams(1)}
                data-test="activity-status-column"
              >
                {t('Activity status')}
              </Th>
            </Tr>
          </Thead>
          <Tbody {...reactPropFix}>
            {sortedDRStatus?.map((drstatus, rowIndex) => (
              <Tr {...reactPropFix} key={rowIndex}>
                <Td {...reactPropFix} data-test={`policy-name-row-${rowIndex}`}>
                  {drstatus?.drPolicyName}
                </Td>
                <Td {...reactPropFix} data-test={`last-sync-row-${rowIndex}`}>
                  {drstatus?.lastSync}
                </Td>
                <Td
                  {...reactPropFix}
                  data-test={`activity-status-row-${rowIndex}`}
                >
                  <Tooltip content={drstatus?.currentStatus?.toolTip}>
                    <StatusIconAndText
                      title={drstatus?.currentStatus?.text}
                      icon={drstatus?.currentStatus?.icon}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </TableComposable>
      </FlexItem>
    </Flex>
  );
};

type DRPoliciesStatusTableProps = {
  drPolicies: DRPolicyMap;
};

type DRCurrentStatusType = {
  drPolicyName: string;
  lastSync: string;
  currentStatus: {
    text?: string;
    icon?: JSX.Element;
    toolTip?: React.ReactNode;
  };
};
