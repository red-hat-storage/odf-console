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
} from '@patternfly/react-core';
import { PlusCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { NamespaceStoreDropdown } from '../namespace-store/namespace-store-dropdown';

type ReplicationFormProps = {
  namespace: string;
  updateParentState: (rules: Rule[]) => void;
  className?: string;
  // For limiting the number of rules that can be added using add rule
  ruleCountLimit?: number;
};

export type Rule = {
  id: number;
  namespaceStore: string;
  prefix: string;
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

  const handleAddRule = () => {
    setRules([
      ...rules,
      { id: rules.length + 1, namespaceStore: '', prefix: '' },
    ]);
  };

  const handleRemoveRule = () => {
    let newRules = [...rules];

    // will remove the last rule from the array
    newRules.splice(-1, 1);
    setRules(newRules);
    updateParentState(rules);
  };
  return (
    <div className={className}>
      <Modal {...modalProps} />
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
      >
        <FlexItem>
          <Text component={TextVariants.h2}>{t('Replication rules ')}</Text>
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
          <Grid hasGutter md={4} className="odf-mcg__form">
            <RuleForm
              namespace={namespace}
              rule={rule}
              onNSChange={(ns: NamespaceStoreKind) =>
                handleNSChange(ns, rule.id)
              }
              onPrefixChange={(val: string) => handlePrefixChange(val, rule.id)}
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
      </Form>
    </div>
  );
};

type RuleFormProps = {
  namespace: string;
  rule: Rule;
  onNSChange: (ns: NamespaceStoreKind) => void;
  onPrefixChange: (val: string) => void;
};

export const RuleForm: React.FC<RuleFormProps> = ({
  namespace,
  rule,
  onNSChange,
  onPrefixChange,
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
    </>
  );
};
