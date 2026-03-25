import * as React from 'react';
import type { ErasureCodingSchema } from '@odf/core/types';
import {
  getErasureCodingNodeValidation,
  isFlexibleScaling,
} from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Form, FormGroup, Checkbox } from '@patternfly/react-core';
import type { WizardNodeState } from '../../reducer';
import { WizardState, WizardDispatch } from '../../reducer';
import { ErasureCodingSchemaTable } from './erasure-coding/erasure-coding-schema-table';

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  state,
  dispatch,
  nodeCount = 0,
  capacity,
  nodes = [],
  isNoProvisioner = false,
  enableArbiter = false,
}) => {
  const { t } = useCustomTranslation();
  const { useErasureCoding, erasureCodingSchema } = state;
  const flexibleScaling = React.useMemo(
    () => isFlexibleScaling(nodes, isNoProvisioner, enableArbiter),
    [nodes, isNoProvisioner, enableArbiter]
  );
  const ecValidation = React.useMemo(
    () => getErasureCodingNodeValidation(nodeCount),
    [nodeCount]
  );
  // Clear erasure coding when flexible scaling is not available
  React.useEffect(() => {
    if (!flexibleScaling && useErasureCoding) {
      dispatch({
        type: 'advancedSettings/useErasureCoding',
        payload: false,
      });
    }
  }, [flexibleScaling, useErasureCoding, dispatch]);
  const onSelectSchema = React.useCallback(
    (schema: ErasureCodingSchema) => {
      dispatch({
        type: 'advancedSettings/erasureCodingSchema',
        payload: schema,
      });
    },
    [dispatch]
  );

  return (
    <Form>
      <FormGroup label={t('Advanced Settings')} fieldId="advanced-settings">
        <Checkbox
          id="use-erasure-coding"
          label={t('Use erasure coding')}
          description={t(
            'Use erasure coding instead of replication to protect the cluster data.'
          )}
          isChecked={useErasureCoding}
          isDisabled={!flexibleScaling || !ecValidation.valid}
          onChange={() => {
            dispatch({
              type: 'advancedSettings/useErasureCoding',
              payload: !useErasureCoding,
            });
          }}
          className="odf-advanced-settings__checkbox odf-backing-store__radio--margin-bottom"
        />
        {useErasureCoding && ecValidation.valid && flexibleScaling && (
          <FormGroup fieldId="erasure-coding-schema" className="pf-v6-u-mt-md">
            <ErasureCodingSchemaTable
              nodeCount={nodeCount}
              selectedSchema={erasureCodingSchema}
              onSelectSchema={onSelectSchema}
              rawCapacityBytes={typeof capacity === 'number' ? capacity : null}
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
  /** For erasure coding: node count and capacity from Capacity and nodes step */
  nodeCount?: number;
  capacity?: string | number | null;
  /** Used to compute flexible scaling (erasure coding available when true). */
  nodes?: WizardNodeState[] | null;
  isNoProvisioner?: boolean;
  enableArbiter?: boolean;
};
