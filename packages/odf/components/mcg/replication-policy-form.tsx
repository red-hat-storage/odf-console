import * as React from 'react';
import { NamespaceStoreKind } from '@odf/core/types';
import { useModalWrapper } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Flex,
  FlexItem,
  ContentVariants,
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  Content,
  Checkbox,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { NamespaceStoreDropdown } from '../namespace-store/namespace-store-dropdown';
import { LogReplicationInfoForm } from './log-replication-info-form';
import { LogReplicationInfo } from './state';

type ReplicationFormProps = {
  namespace: string;
  updateParentState: (
    rules: Rule[],
    logReplicationInfo?: LogReplicationInfo
  ) => void;
  className?: string;
  // For limiting the number of rules that can be added using add rule
  ruleCountLimit?: number;
  showNamespaceStoreError?: boolean;
  eventLogsSupported?: boolean;
  savedRules?: Rule[];
};

export type Rule = {
  id: number;
  namespaceStore: string;
  prefix: string;
  syncDeletion?: boolean;
};

const toFormRules = (savedRules?: Rule[], keepSyncDeletion = true): Rule[] => {
  if (!savedRules?.length) {
    return [{ id: 1, namespaceStore: '', prefix: '' }];
  }
  return savedRules.map((rule) => ({
    id: rule.id,
    namespaceStore: rule.namespaceStore || '',
    prefix: rule.prefix || '',
    syncDeletion: keepSyncDeletion ? rule.syncDeletion : false,
  }));
};

const ModalComponent = React.lazy(
  () => import('../namespace-store/namespace-store-modal')
);

export const ReplicationPolicyForm: React.FC<ReplicationFormProps> = ({
  namespace,
  updateParentState,
  ruleCountLimit = 10,
  className,
  showNamespaceStoreError = false,
  eventLogsSupported = false,
  savedRules,
}) => {
  const [rules, setRules] = React.useState<Rule[]>(() =>
    toFormRules(savedRules, eventLogsSupported)
  );

  const [logReplicationInfo, setLogReplicationInfo] =
    React.useState<LogReplicationInfo>({
      logLocation: '',
      logPrefix: '',
    });

  const { t } = useCustomTranslation();

  const launchModal = useModalWrapper();

  const [eventLogsEnabled, toggleEventLogs] = React.useState(false);
  const rulesRef = React.useRef(rules);
  rulesRef.current = rules;
  const updateParentStateRef = React.useRef(updateParentState);
  updateParentStateRef.current = updateParentState;

  React.useEffect(() => {
    if (eventLogsSupported) {
      return;
    }
    const cleared = { logLocation: '', logPrefix: '' };
    const nextRules = rulesRef.current.map((rule) => ({
      ...rule,
      syncDeletion: false,
    }));
    toggleEventLogs(false);
    setLogReplicationInfo(cleared);
    setRules(nextRules);
    updateParentStateRef.current(nextRules, cleared);
  }, [eventLogsSupported]);

  const commitRules = (
    nextRules: Rule[],
    logInfo: LogReplicationInfo = logReplicationInfo
  ) => {
    setRules(nextRules);
    updateParentState(nextRules, logInfo);
  };

  const handleNSChange = (ns: NamespaceStoreKind, ruleId: number) => {
    commitRules(
      rules.map((rule) =>
        rule.id === ruleId
          ? { ...rule, namespaceStore: getName(ns) || '' }
          : rule
      )
    );
  };

  const handlePrefixChange = (value: string, ruleId: number) => {
    commitRules(
      rules.map((rule) =>
        rule.id === ruleId ? { ...rule, prefix: value } : rule
      )
    );
  };

  const handleSyncDeletion = (value: boolean, ruleId: number) => {
    const nextRules = rules.map((rule) =>
      rule.id === ruleId
        ? { ...rule, syncDeletion: eventLogsEnabled ? value : false }
        : rule
    );
    let temp = { ...logReplicationInfo };
    if (!nextRules.some((rule) => rule.syncDeletion)) {
      temp = { logLocation: '', logPrefix: '' };
      setLogReplicationInfo(temp);
    }
    commitRules(nextRules, temp);
  };

  const handleAddRule = () => {
    commitRules([
      ...rules,
      { id: rules.length + 1, namespaceStore: '', prefix: '' },
    ]);
  };

  const handleLogPrefixChange = (prefix: string) => {
    const repInfo = { ...logReplicationInfo, logPrefix: prefix };
    setLogReplicationInfo(repInfo);
    updateParentState(rules, repInfo);
  };

  const handleLogLocationChange = (logLocation: string) => {
    const repInfo = { ...logReplicationInfo, logLocation: logLocation };
    setLogReplicationInfo(repInfo);
    updateParentState(rules, repInfo);
  };
  const handleRemoveRule = () => {
    // will remove the last rule from the array
    commitRules(rules.slice(0, -1));
  };

  const disableSyncDeletions = React.useCallback(
    (isEventLogEnabled: boolean) => {
      const newRules: Array<Rule> = rules.map((rule) => ({
        ...rule,
        syncDeletion: isEventLogEnabled ? rule.syncDeletion : false,
      }));
      setRules(newRules);
      updateParentState(newRules);
    },
    [rules, updateParentState]
  );

  const onChangeEventLogs = (isEventLogEnabled: boolean) => {
    toggleEventLogs(isEventLogEnabled);
    disableSyncDeletions(isEventLogEnabled);
  };

  const onClick = () =>
    launchModal(ModalComponent, { isOpen: true, namespace });

  return (
    <div className={className}>
      <Form>
        <FormGroup>
          <Checkbox
            id="enable-event-logs"
            label={t('Optimize replication using event logs')}
            isChecked={eventLogsSupported && eventLogsEnabled}
            isDisabled={!eventLogsSupported}
            description={t(
              'You must enable and configure object logging in the cloud or MCG environment.'
            )}
            onChange={(_event, isEventLogEnabled: boolean) => {
              if (!eventLogsSupported) {
                return;
              }
              onChangeEventLogs(isEventLogEnabled);
            }}
          />
        </FormGroup>
        <FormGroup>
          {eventLogsSupported && eventLogsEnabled && (
            <LogReplicationInfoForm
              location={logReplicationInfo.logLocation}
              prefix={logReplicationInfo.logPrefix}
              onLogLocationChange={handleLogLocationChange}
              onPrefixChange={handleLogPrefixChange}
            />
          )}
        </FormGroup>

        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Content component={ContentVariants.h3}>
              {t('Replication rules ')}
            </Content>
          </FlexItem>
          <FlexItem>
            <Button
              icon={<PlusCircleIcon />}
              variant={ButtonVariant.link}
              className="nb-bc-step-page-form__modal-launcher"
              onClick={onClick}
            >
              {t('Create new NamespaceStore')}
            </Button>
          </FlexItem>
        </Flex>
        <Stack hasGutter className="odf-mcg__form">
          {rules.map((rule, index) => (
            <StackItem key={rule.id}>
              <Split hasGutter>
                <SplitItem className="odf-mcg__rule">
                  <RuleForm
                    index={index}
                    namespace={namespace}
                    rule={rule}
                    onNSChange={(ns: NamespaceStoreKind) =>
                      handleNSChange(ns, rule.id)
                    }
                    onPrefixChange={(val: string) =>
                      handlePrefixChange(val, rule.id)
                    }
                    onSyncDeletions={(val: boolean) =>
                      handleSyncDeletion(val, rule.id)
                    }
                    isSyncDeletionDisabled={!eventLogsEnabled}
                    namespaceStoreError={
                      showNamespaceStoreError && !rule.namespaceStore
                        ? t('Required')
                        : undefined
                    }
                  />
                </SplitItem>

                <SplitItem>
                  {rules.length === index + 1 && (
                    <Button
                      variant="link"
                      icon={<MinusCircleIcon />}
                      onClick={handleRemoveRule}
                      data-testid="remove-rule-btn"
                      data-test="remove-rule-btn"
                      className="odf-mcg__remove-button"
                    />
                  )}
                </SplitItem>
              </Split>
            </StackItem>
          ))}
          {rules.length < ruleCountLimit && (
            <StackItem>
              <Button
                id="add-rule-btn"
                variant="link"
                icon={<PlusCircleIcon />}
                onClick={handleAddRule}
                isInline
                data-testid="add-rule-btn"
                data-test="add-rule-btn"
              >
                {t('Add rule')}
              </Button>
            </StackItem>
          )}
        </Stack>
      </Form>
    </div>
  );
};

type RuleFormProps = {
  namespace: string;
  rule: Rule;
  onNSChange: (ns: NamespaceStoreKind) => void;
  onPrefixChange: (val: string) => void;
  onSyncDeletions: (val: boolean) => void;
  isSyncDeletionDisabled: boolean;
  namespaceStoreError?: string;
  index?: number;
};

export const RuleForm: React.FC<RuleFormProps> = ({
  namespace,
  rule,
  onNSChange,
  onPrefixChange,
  onSyncDeletions,
  isSyncDeletionDisabled,
  namespaceStoreError,
  index,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Stack className="odf-mcg__stack-item">
      <StackItem>
        <Split hasGutter>
          <SplitItem isFilled>
            <FormGroup
              fieldId="namespace-store-dropdown-field"
              label={t('NamespaceStore')}
              className="odf-mcg__namespacestore-dropdown"
              isRequired
            >
              <NamespaceStoreDropdown
                onChange={onNSChange}
                id="ns-dropdown"
                selectedKey={rule.namespaceStore}
                creatorDisabled={true}
                namespace={namespace}
              />
              {namespaceStoreError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant="error"
                      data-test="namespace-store-required-error"
                    >
                      {namespaceStoreError}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>
          </SplitItem>
          <SplitItem isFilled>
            <FormGroup fieldId="prefix-input-field" label={t('Prefix')}>
              <TextInput
                data-test="prefix-input"
                placeholder={t('Enter a prefix')}
                type="text"
                id="prefix-input"
                value={rule.prefix}
                onChange={(_event, value) => onPrefixChange(value)}
                aria-label={t('Prefix')}
              />
            </FormGroup>
          </SplitItem>
        </Split>
      </StackItem>
      <StackItem>
        <FormGroup fieldId="sync-deletions-checkbox">
          <Checkbox
            data-test="sync-deletion"
            id="sync-deletions-checkbox"
            isChecked={rule.syncDeletion}
            isDisabled={isSyncDeletionDisabled}
            onChange={(_event, value) => onSyncDeletions(value)}
            description={
              index === 0
                ? t(
                    'Sync deletion syncs the delete operation. If you delete data from bucket 1, the same data gets deleted from bucket 2'
                  )
                : ''
            }
            aria-label={t('sync deletion')}
            label={t('Sync deletion')}
          />
        </FormGroup>
      </StackItem>
    </Stack>
  );
};
