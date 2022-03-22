import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import {
  getAPIVersionForModel,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import {
  Form,
  FormGroup,
  Text,
  TextInput,
  Badge,
  TextContent,
  TextVariants,
  InputGroup,
  ActionGroup,
  Button,
  Flex,
  FlexItem,
  Dropdown,
  DropdownItem,
  DropdownToggle,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  REPLICATION_TYPE,
} from '../../../constants/dr-policy';
import { DRPolicyModel } from '../../../models';
import { DRPolicyKind } from '../../../types/types';
import { Cluster, SelectClusterList } from './select-cluster-list';
import './create-dr-policy.scss';

const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  region,
  storageSystem,
}) => {
  return (
    <Flex display={{ default: 'inlineFlex' }}>
      <FlexItem>
        <Badge key={id} isRead>
          {id}
        </Badge>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.p}>{cluster}</Text>
          <Text component={TextVariants.small}>{region}</Text>
          <Text component={TextVariants.small}>{storageSystem}</Text>
        </TextContent>
      </FlexItem>
    </Flex>
  );
};

type SelectedClusterProps = {
  id: number;
  cluster: string;
  region: string;
  storageSystem: string;
};

const SyncSchedule: React.FC<SyncScheduleProps> = ({
  schedule,
  setSchedule,
}) => {
  const { t } = useTranslation('plugin__odf-console');

  const SyncSchedule = {
    minutes: t('minutes'),
    seconds: t('seconds'),
  };
  const SCHEDULE_FORMAT = {
    [SyncSchedule.minutes]: 'm',
    [SyncSchedule.seconds]: 's',
  };

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState(
    SyncSchedule.minutes
  );

  const setSyncSchedule = (time: string, format?: string) =>
    setSchedule(`${time}${SCHEDULE_FORMAT[format ?? selectedFormat]}`);

  const onSelect = (event) => {
    const scheduleTime = schedule.match(/\d+/g)[0];
    const newScheduleFormat = event.target.value;
    setIsOpen(false);
    setSelectedFormat(newScheduleFormat);
    setSyncSchedule(scheduleTime, newScheduleFormat);
  };

  return (
    <InputGroup>
      <TextInput
        id="sync-schedule"
        defaultValue="5"
        type="number"
        onChange={(scheduleTime) => setSyncSchedule(scheduleTime)}
        isRequired
      />
      <Dropdown
        aria-label={t('Select schedule time format in minutes or seconds')}
        onSelect={onSelect}
        toggle={
          <DropdownToggle onToggle={(open) => setIsOpen(open)}>
            {selectedFormat}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={[
          <DropdownItem
            key="minutes"
            value={SyncSchedule.minutes}
            component="button"
          >
            {SyncSchedule.minutes}
          </DropdownItem>,
          <DropdownItem
            key="seconds"
            value={SyncSchedule.seconds}
            component="button"
          >
            {SyncSchedule.seconds}
          </DropdownItem>,
        ]}
      />
    </InputGroup>
  );
};

type SyncScheduleProps = {
  schedule: string;
  setSchedule: React.Dispatch<React.SetStateAction<string>>;
};

export const CreateDRPolicy: React.FC<{}> = ({}) => {
  const { t } = useTranslation('plugin__odf-console');
  const history = useHistory();
  const [policyName, setPolicyName] = React.useState('');
  const [replication] = React.useState('');
  const [selectedClusters, setSelectedClusters] = React.useState<Cluster[]>([]);
  const [syncTime, setSyncTime] = React.useState('5m');

  const onCreate = () => {
    const payload: DRPolicyKind = {
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
      metadata: { name: policyName },
      spec: {
        drClusterSet: selectedClusters.map((cluster) => ({
          name: cluster.name,
          region: cluster.region,
          s3profileName: '',
        })),
      },
    };
    if (replication === REPLICATION_TYPE(t)['async']) {
      payload.spec.schedulingInterval = syncTime;
    }
    k8sCreate({ model: DRPolicyModel, data: payload });
  };

  return (
    <div>
      <PageHeading title={t('Create DRPolicy')}>
        <TextContent className="mco-create-data-policy__description">
          <Text component={TextVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <Form isWidthLimited className="mco-create-data-policy">
        <FormGroup fieldId="policy-name" label={t('Policy name')}>
          <TextInput
            id="policy-name"
            value={policyName}
            type="text"
            onChange={setPolicyName}
            isRequired
          />
        </FormGroup>
        <FormGroup fieldId="connect-clusters" label={t('Connect clusters')}>
          <SelectClusterList
            selectedClusters={selectedClusters}
            setSelectedClusters={setSelectedClusters}
          />
        </FormGroup>
        {!!selectedClusters.length && (
          <FormGroup fieldId="selected-clusters" label={t('Selected clusters')}>
            {selectedClusters.map((c, i) => (
              <SelectedCluster
                key={c.name}
                id={i + 1}
                cluster={c.name}
                region="us-east-1"
                storageSystem="storage-system-1"
              />
            ))}
          </FormGroup>
        )}
        {replication && (
          <FormGroup
            fieldId="replication-policy"
            label={t('Replication policy')}
          >
            <TextContent>
              <Text component={TextVariants.p}>{replication}</Text>
            </TextContent>
          </FormGroup>
        )}
        {replication === REPLICATION_TYPE(t)['async'] && (
          <FormGroup fieldId="sync-schedule" label={t('Sync schedule')}>
            <SyncSchedule schedule={syncTime} setSchedule={setSyncTime} />
          </FormGroup>
        )}
        <ActionGroup className="mco-create-data-policy__action-group">
          <Button
            variant="primary"
            onClick={onCreate}
            isDisabled={
              !policyName || selectedClusters.length !== MAX_ALLOWED_CLUSTERS
            }
          >
            {t('Create')}
          </Button>
          <Button variant="link" onClick={history.goBack}>
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
};
