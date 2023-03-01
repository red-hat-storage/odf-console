import * as React from 'react';
import { NamespaceStoreKind } from '@odf/core/types';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Flex,
  FlexItem,
  TextVariants,
  Button,
  ButtonVariant,
  Form,
  Grid,
  GridItem,
  FormGroup,
  TextInput,
  Text,
  Checkbox,
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
};

export type Rule = {
  id: number;
  namespaceStore: string;
  prefix: string;
  syncDeletion?: boolean;
};

export const NS_STORE_MODAL_KEY = 'BC_CREATE_WIZARD_NS_STORE_CREATE_MODAL';

const modalMap = {
  [NS_STORE_MODAL_KEY]: React.lazy(
    () => import('../namespace-store/namespace-store-modal')
  ),
};

export const ReplicationPolicyForm: React.FC<ReplicationFormProps> = ({
  namespace,
  updateParentState,
  ruleCountLimit = 10,
  className,
}) => {
  const [rules, setRules] = React.useState<Rule[]>([
    { id: 1, namespaceStore: '', prefix: '' },
  ]);

  const [logReplicationInfo, setLogReplicationInfo] =
    React.useState<LogReplicationInfo>({
      logLocation: '',
      logPrefix: '',
    });

  const { t } = useCustomTranslation();

  const [Modal, modalProps, launcher] = useModalLauncher(modalMap);

  const launchModal = React.useCallback(
    () => launcher(NS_STORE_MODAL_KEY, null),
    [launcher]
  );

  const handleNSChange = (ns: NamespaceStoreKind, ruleId: number) => {
    const newRules = [...rules];
    const index = newRules.findIndex((rule) => rule.id === ruleId);
    newRules[index].namespaceStore = getName(ns);
    setRules(newRules);
    updateParentState(rules);
  };

  const handlePrefixChange = (value: string, ruleId: number) => {
    const newRules = [...rules];
    const index = newRules.findIndex((rule) => rule.id === ruleId);
    newRules[index].prefix = value;
    setRules(newRules);
    updateParentState(rules);
  };

  const handleSyncDeletion = (value: boolean, ruleId: number) => {
    const newRules = [...rules];
    const index = newRules.findIndex((rule) => rule.id === ruleId);
    newRules[index].syncDeletion = value;
    setRules(newRules);
    let temp = { ...logReplicationInfo };
    if (!newRules.some((rule) => rule.syncDeletion)) {
      temp = { logLocation: null, logPrefix: null };
      setLogReplicationInfo(temp);
    }
    updateParentState(rules, temp);
  };

  const handleAddRule = () => {
    setRules([
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
    let newRules = [...rules];

    // will remove the last rule from the array
    newRules.splice(-1, 1);
    setRules(newRules);
    updateParentState(rules);
  };

  const hasSyncDeletion = rules.some((rule) => rule.syncDeletion);
  return (
    <div className={className}>
      <Modal {...modalProps} />
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>
          <Text component={TextVariants.h3}>{t('Replication rules ')}</Text>
        </FlexItem>
        <FlexItem>
          <Button
            variant={ButtonVariant.link}
            className="nb-bc-step-page-form__modal-launcher"
            onClick={launchModal}
          >
            <PlusCircleIcon /> {t('Create new NamespaceStore')}
          </Button>
        </FlexItem>
      </Flex>

      <Form>
        {rules.map((rule, index) => (
          <Grid hasGutter md={3} className="odf-mcg__form">
            <RuleForm
              namespace={namespace}
              rule={rule}
              onNSChange={(ns: NamespaceStoreKind) =>
                handleNSChange(ns, rule.id)
              }
              onPrefixChange={(val: string) => handlePrefixChange(val, rule.id)}
              onSyncDeletions={(val: boolean) =>
                handleSyncDeletion(val, rule.id)
              }
            />
            {rules.length === index + 1 && (
              <GridItem>
                <Button
                  variant="link"
                  icon={<MinusCircleIcon />}
                  onClick={handleRemoveRule}
                  data-testid="remove-rule-btn"
                  data-test="remove-rule-btn"
                  className="odf-mcg__remove-button"
                ></Button>
              </GridItem>
            )}
          </Grid>
        ))}

        {rules.length < ruleCountLimit && (
          <FormGroup fieldId="add-rule-btn">
            <Button
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={handleAddRule}
              isInline
              data-testid="add-rule-btn"
              data-test="add-rule-btn"
            >
              {t('Add rule')}
            </Button>
          </FormGroup>
        )}

        {hasSyncDeletion && (
          <LogReplicationInfoForm
            location={logReplicationInfo.logLocation}
            prefix={logReplicationInfo.logPrefix}
            onLogLocationChange={handleLogLocationChange}
            onPrefixChange={handleLogPrefixChange}
          />
        )}
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
};

export const RuleForm: React.FC<RuleFormProps> = ({
  namespace,
  rule,
  onNSChange,
  onPrefixChange,
  onSyncDeletions,
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      <GridItem>
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
        </FormGroup>
      </GridItem>
      <GridItem>
        <FormGroup fieldId="prefix-input-field" label={t('Prefix')}>
          <TextInput
            data-test="prefix-input"
            placeholder={t('Enter a prefix')}
            type="text"
            id="prefix-input"
            value={rule.prefix}
            onChange={onPrefixChange}
            aria-label={t('Prefix')}
          />
        </FormGroup>
      </GridItem>
      <GridItem>
        <FormGroup
          fieldId="sync-deletions-checkbox"
          className="odf-mcg__rule-checkbox"
        >
          <Checkbox
            data-test="sync-deletion"
            id="sync-deletions-checkbox"
            isChecked={rule.syncDeletion}
            onChange={onSyncDeletions}
            aria-label={t('sync deletion')}
            label={t('Sync deletion')}
          />
        </FormGroup>
      </GridItem>
    </>
  );
};
