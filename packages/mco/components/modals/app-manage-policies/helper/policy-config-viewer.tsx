import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import {
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { parseSyncInterval } from '@odf/mco/utils';
import { fromNow } from '@odf/shared/details-page/datetime';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { Labels } from '@odf/shared/labels';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  SelectOption,
  Text,
} from '@patternfly/react-core';
import '../style.scss';

const getDropdownOptions = (
  placements: string[],
  defaultOptionText: string
): JSX.Element[] => [
  <SelectOption key={defaultOptionText} value={defaultOptionText} />,
  ...placements?.map((placement) => (
    <SelectOption key={placement} value={placement} />
  )),
];

const getLabels = (
  placementControlMap: PlacementControlMap,
  selected: string,
  isDefaultSelected: boolean
): string[] =>
  isDefaultSelected
    ? // Aggregate all labels
      Object.values(placementControlMap).reduce(
        (acc, drpc) => [...acc, ...drpc?.pvcSelector],
        []
      ) || []
    : // Get all labels from selected placement control info
      [...placementControlMap?.[selected]?.pvcSelector];

export const DataPolicyStatus: React.FC<DataPolicyStatusProps> = ({
  isValidated,
  t,
}) => {
  return (
    <StatusIconAndText
      {...(isValidated
        ? { title: t('Validated'), icon: <GreenCheckCircleIcon /> }
        : {
            title: t('Not Validated'),
            icon: <RedExclamationCircleIcon />,
          })}
    />
  );
};

export const DescriptionListItem: React.FC<DescriptionListItemProps> = ({
  term,
  description,
}) => {
  return (
    <DescriptionListGroup>
      <DescriptionListTerm className="text-muted">{term}</DescriptionListTerm>
      <DescriptionListDescription>{description}</DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export const PolicyInfo: React.FC<PolicyInfoProps> = ({
  policyName,
  clusters,
  replicationType,
  isValidated,
  schedulingInterval,
}) => {
  const { t } = useCustomTranslation();
  const [unit, interval] = parseSyncInterval(schedulingInterval);
  return (
    <>
      <DescriptionListItem term={t('Name')} description={policyName} />
      <DescriptionListItem
        term={t('Replication type')}
        description={REPLICATION_DISPLAY_TEXT(t)[replicationType]}
      />
      <DescriptionListItem
        term={t('Sync interval')}
        description={`${interval} ${SYNC_SCHEDULE_DISPLAY_TEXT(t)[unit]}`}
      />
      <DescriptionListItem
        term={t('Status')}
        description={<DataPolicyStatus isValidated={isValidated} t={t} />}
      />
      <DescriptionListItem
        term={t('Cluster')}
        description={clusters.join(', ')}
      />
    </>
  );
};

export const PolicyConfigViewer: React.FC<PolicyConfigViewerProps> = ({
  policyName,
  replicationType,
  schedulingInterval,
  clusters,
  isValidated,
  placementControlMap,
  disableSelector,
  hideSelector,
}) => {
  const { t } = useCustomTranslation();
  const defaultSelectionText = t('All placements');
  const [selected, setSelected] = React.useState(defaultSelectionText);
  const isDefaultSelected = selected === defaultSelectionText;
  const labels = React.useMemo(
    () => getLabels(placementControlMap, selected, isDefaultSelected),
    [selected, isDefaultSelected, placementControlMap]
  );
  const dropdownOptions = React.useMemo(
    () =>
      getDropdownOptions(
        Object.keys(placementControlMap),
        defaultSelectionText
      ),
    [placementControlMap, defaultSelectionText]
  );
  const onChange = (value: string) => {
    setSelected(value);
  };

  return (
    <>
      <div className="mco-manage-policies__header">
        <Text component="h3"> {t('Policy configuration details')} </Text>
        {!!Object.keys(placementControlMap).length && !hideSelector && (
          <SingleSelectDropdown
            id="placement-control-view-dropdown"
            selectedKey={selected}
            isDisabled={disableSelector}
            selectOptions={dropdownOptions}
            onChange={onChange}
            className="mco-manage-policies__dropdown--wide"
          />
        )}
      </div>
      <div className="mco-manage-policies__col-padding">
        <DescriptionList
          isHorizontal
          isCompact
          horizontalTermWidthModifier={{
            default: '15rem',
            sm: '15rem',
            md: '15rem',
            lg: '15rem',
            xl: '20rem',
            '2xl': '20rem',
          }}
        >
          <PolicyInfo
            policyName={policyName}
            replicationType={replicationType}
            schedulingInterval={schedulingInterval}
            clusters={clusters}
            isValidated={isValidated}
          />
          {!isDefaultSelected ? (
            <>
              <DescriptionListItem
                term={t('Replication status')}
                description={t('Last sync {{time}}', {
                  time: fromNow(
                    placementControlMap?.[selected]?.lastGroupSyncTime
                  ),
                })}
              />
              <DescriptionListItem
                term={t('Application resources protected')}
                description={selected}
              />
            </>
          ) : (
            <DescriptionListItem
              term={t('Application resources protected')}
              description={pluralize(
                Object.keys(placementControlMap).length,
                t('placement'),
                t('placements')
              )}
            />
          )}
          <DescriptionListItem
            term={t('PVC label selector')}
            description={<Labels numLabels={3} labels={labels} />}
          />
        </DescriptionList>
      </div>
    </>
  );
};

type DescriptionListItemProps = {
  term: React.ReactNode;
  description: React.ReactNode;
};

type DataPolicyStatusProps = {
  isValidated: boolean;
  t: TFunction;
};

export type PlacementControlMap = {
  [placementName: string]: {
    pvcSelector: string[];
    lastGroupSyncTime?: string;
  };
};

type PolicyInfoProps = {
  policyName: string;
  replicationType: string;
  schedulingInterval: string;
  isValidated: boolean;
  clusters: string[];
};

type PolicyConfigViewerProps = PolicyInfoProps & {
  placementControlMap: PlacementControlMap;
  disableSelector?: boolean;
  hideSelector?: boolean;
};
