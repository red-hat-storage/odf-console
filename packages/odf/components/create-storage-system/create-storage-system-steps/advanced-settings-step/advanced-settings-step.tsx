import * as React from 'react';
import { DeploymentType, type ErasureCodingScheme } from '@odf/core/types';
import { getErasureCodingNodeValidation } from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Form,
  FormGroup,
  Checkbox,
  Alert,
  AlertVariant,
  TextInput,
} from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import { ErasureCodingTable } from './erasure-coding/erasure-coding-table';

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  state,
  dispatch,
  deployment,
  nodeCount = 0,
  capacity,
  flexibleScaling,
}) => {
  const { t } = useCustomTranslation();
  const {
    useErasureCoding,
    erasureCodingScheme,
    enableForcefulDeployment,
    forcefulDeploymentConfirmation,
  } = state;

  const ecValidation = getErasureCodingNodeValidation(nodeCount);
  const isMCG = deployment === DeploymentType.MCG;

  const onSelectScheme = (scheme: ErasureCodingScheme) => {
    dispatch({
      type: 'advancedSettings/erasureCodingScheme',
      payload: scheme,
    });
  };

  return (
    <Form>
      <FormGroup label={t('Advanced Settings')} fieldId="advanced-settings">
        <Checkbox
          id="enable-forceful-deployment"
          label={t('Enable forceful deployment')}
          description={t(
            'Override and completely wipe any data on disks used to create this storage cluster'
          )}
          isChecked={enableForcefulDeployment}
          onChange={() =>
            dispatch({
              type: 'advancedSettings/enableForcefulDeployment',
              payload: !enableForcefulDeployment,
            })
          }
          className="odf-backing-store__radio--margin-bottom"
        />
        {enableForcefulDeployment && (
          <>
            <Alert
              variant={AlertVariant.warning}
              isInline
              isPlain
              title={t(
                'Any data on the disks used to create this storage cluster will be deleted. This cannot be undone.'
              )}
              className="pf-v6-u-mt-sm"
            />
            <FormGroup
              label={t('Type CONFIRM to confirm')}
              fieldId="forceful-deployment-confirmation"
              className="pf-v6-u-my-md"
            >
              <TextInput
                id="forceful-deployment-confirmation"
                value={forcefulDeploymentConfirmation}
                onChange={(_event, value: string) =>
                  dispatch({
                    type: 'advancedSettings/setForcefulDeploymentConfirmation',
                    payload: value,
                  })
                }
                placeholder={t('CONFIRM')}
                aria-label={t('Forceful deployment confirmation')}
              />
            </FormGroup>
          </>
        )}
        <Checkbox
          id="use-erasure-coding"
          label={t('Use erasure coding')}
          description={t(
            'Use erasure coding instead of replication to protect the cluster data.'
          )}
          isChecked={useErasureCoding}
          isDisabled={isMCG || !(flexibleScaling && ecValidation.valid)}
          onChange={() => {
            dispatch({
              type: 'advancedSettings/useErasureCoding',
              payload: !useErasureCoding,
            });
          }}
          className="odf-advanced-settings__checkbox odf-backing-store__radio--margin-bottom"
        />
        {!isMCG &&
          useErasureCoding &&
          flexibleScaling &&
          ecValidation.valid && (
            <FormGroup fieldId="erasure-coding-table" className="pf-v6-u-mt-md">
              <ErasureCodingTable
                nodeCount={nodeCount}
                selectedScheme={erasureCodingScheme}
                onSelectScheme={onSelectScheme}
                rawCapacityBytes={
                  typeof capacity === 'number' ? capacity : null
                }
              />
            </FormGroup>
          )}
      </FormGroup>
    </Form>
  );
};

type AdvancedSettingsProps = {
  dispatch: WizardDispatch;
  state: WizardState['advancedSettings'];
  deployment: DeploymentType;
  nodeCount?: number;
  capacity?: string | number | null;
  flexibleScaling: boolean;
};
