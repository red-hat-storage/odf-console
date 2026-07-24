import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
  TextInput,
  Title,
} from '@patternfly/react-core';
import { BackendType, ReplicationType } from '../../constants';
import { SelectReplicationType } from './select-replication-type';
import {
  DRPolicyAction,
  DRPolicyActionType,
  DRPolicyState,
} from './utils/reducer';

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  enableRBDImageFlatten,
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
        className="pf-v6-u-mt-md odf-alert mco-create-data-policy__alert"
        title={
          <Trans>
            Before choosing this option, read the section
            <i className="pf-v6-u-mx-xs">
              Creating Disaster Recovery Policy on Hub cluster chapter of
              Regional-DR solution guide
            </i>
            to understand the impact and limitations of this feature.
          </Trans>
        }
        variant={AlertVariant.warning}
        isInline
      />
    </ExpandableSection>
  );
};

export const PolicyStep: React.FC<PolicyStepProps> = ({ state, dispatch }) => {
  const { t } = useCustomTranslation();

  return (
    <Form className="mco-create-data-policy__body">
      <Title headingLevel="h2" size="lg">
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
      >
        <TextInput
          data-test="policy-name-text"
          id="policy-name"
          data-test-id="policy-name"
          value={state.policyName}
          type="text"
          placeholder={t('Enter a policy name')}
          onChange={(_event, policyName) =>
            dispatch({
              type: DRPolicyActionType.SET_POLICY_NAME,
              payload: policyName,
            })
          }
          isRequired
        />
      </FormGroup>
      <SelectReplicationType
        selectedClusters={state.selectedClusters}
        replicationType={state.replicationType}
        syncIntervalTime={state.syncIntervalTime}
        dispatch={dispatch}
      />
      {state.replicationBackend === BackendType.DataFoundation &&
        state.replicationType === ReplicationType.ASYNC && (
          <FormGroup fieldId="advanced-settings">
            <AdvancedSettings
              enableRBDImageFlatten={state.enableRBDImageFlatten}
              dispatch={dispatch}
            />
          </FormGroup>
        )}
    </Form>
  );
};

type AdvancedSettingsProps = {
  enableRBDImageFlatten: boolean;
  dispatch: React.Dispatch<DRPolicyAction>;
};

type PolicyStepProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
};
