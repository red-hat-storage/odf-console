import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink } from '@odf/shared/utils';
import { Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Checkbox,
  Content,
  ContentVariants,
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { BackendType, ReplicationType } from '../../../../constants';
import {
  DRPolicyAction,
  DRPolicyActionType,
  DRPolicyState,
} from '../../utils/reducer';
import { SelectReplicationType } from './select-replication-type';

type AdvancedSettingsProps = Pick<
  DRPolicyState['policy'],
  'enableRBDImageFlatten'
> & {
  docHref: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  enableRBDImageFlatten,
  docHref,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  return (
    <ExpandableSection toggleText={t('Advanced settings')}>
      <Checkbox
        label={t(
          'Enable disaster recovery support for restored and cloned PersistentVolumeClaims (For Data Foundation only)'
        )}
        isChecked={enableRBDImageFlatten}
        onChange={(_event, checked) =>
          dispatch({
            type: DRPolicyActionType.SET_RBD_IMAGE_FLATTEN,
            payload: checked,
          })
        }
        id="flat-image-checkbox"
        name="flat-image-checkbox"
      />
      <Alert
        className="pf-v6-u-mt-md pf-v6-u-mb-xs odf-alert mco-create-data-policy__alert"
        title={
          <Trans>
            Before choosing this option, read the section{' '}
            <ExternalLink href={docHref}>
              Creating Disaster Recovery Policy on Hub cluster
            </ExternalLink>{' '}
            chapter of Regional-DR solution guide to understand the impact and
            limitations of this feature.
          </Trans>
        }
        variant={AlertVariant.warning}
        isInline
      />
    </ExpandableSection>
  );
};

type PolicyStepProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
  docHref: string;
  isPolicyNameTaken: boolean;
};

export const PolicyStep: React.FC<PolicyStepProps> = ({
  state,
  dispatch,
  docHref,
  isPolicyNameTaken,
}) => {
  const { t } = useCustomTranslation();
  const nameValidated = isPolicyNameTaken ? 'error' : 'default';

  return (
    <Form className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg" className="pf-v6-u-mb-md">
        {t('Policy')}
      </Title>
      <Content>
        <Content component={ContentVariants.small}>
          {t('Select a replication policy type and interval.')}
        </Content>
      </Content>
      <FormGroup
        className="mco-create-data-policy__text-input"
        fieldId="policy-name"
        label={t('Policy name')}
        isRequired
      >
        <TextInput
          data-test="policy-name-text"
          id="policy-name"
          data-test-id="policy-name"
          value={state.policy.policyName}
          type="text"
          placeholder={t('Enter a policy name')}
          validated={nameValidated}
          onChange={(_event, policyName) =>
            dispatch({
              type: DRPolicyActionType.SET_POLICY_NAME,
              payload: policyName,
            })
          }
          isRequired
        />
        {isPolicyNameTaken && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">
                {t(
                  "A DRPolicy with name '{{name}}' already exists. Please choose a different name.",
                  { name: state.policy.policyName }
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
      <SelectReplicationType
        selectedClusters={state.clusters.selectedClusters}
        replicationType={state.policy.replicationType}
        syncIntervalTime={state.policy.syncIntervalTime}
        dispatch={dispatch}
      />
      {state.configure.replicationBackend === BackendType.DataFoundation &&
        state.policy.replicationType === ReplicationType.ASYNC && (
          <FormGroup fieldId="advanced-settings">
            <AdvancedSettings
              enableRBDImageFlatten={state.policy.enableRBDImageFlatten}
              docHref={docHref}
              dispatch={dispatch}
            />
          </FormGroup>
        )}
    </Form>
  );
};
