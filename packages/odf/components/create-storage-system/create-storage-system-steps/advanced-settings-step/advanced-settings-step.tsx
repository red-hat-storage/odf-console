import * as React from 'react';
import type { ErasureCodingSchema } from '@odf/core/types';
import { getErasureCodingNodeValidation } from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Form, FormGroup, Checkbox } from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import { ErasureCodingSchemaTable } from './erasure-coding/erasure-coding-schema-table';

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  state,
  dispatch,
  nodeCount = 0,
  capacity,
  flexibleScaling = false,
}) => {
  const { t } = useCustomTranslation();
  const { useErasureCoding, erasureCodingSchema } = state;
  const ecValidation = React.useMemo(
    () => getErasureCodingNodeValidation(nodeCount),
    [nodeCount]
  );
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
        {flexibleScaling && (
          <>
            <Checkbox
              id="use-erasure-coding"
              label={t('Use erasure coding')}
              description={t(
                'Use erasure coding instead of replication to protect the cluster data.'
              )}
              isChecked={useErasureCoding}
              isDisabled={!ecValidation.valid}
              onChange={() => {
                dispatch({
                  type: 'advancedSettings/useErasureCoding',
                  payload: !useErasureCoding,
                });
              }}
              className="odf-advanced-settings__checkbox odf-backing-store__radio--margin-bottom"
            />
            {useErasureCoding && ecValidation.valid && (
              <FormGroup
                fieldId="erasure-coding-schema"
                className="pf-v5-u-mt-md"
              >
                <ErasureCodingSchemaTable
                  nodeCount={nodeCount}
                  selectedSchema={erasureCodingSchema}
                  onSelectSchema={onSelectSchema}
                  rawCapacityBytes={
                    typeof capacity === 'number' ? capacity : null
                  }
                />
              </FormGroup>
            )}
          </>
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
  /** Whether flexible scaling applies; when true, erasure coding option is shown. Passed from create-steps. */
  flexibleScaling?: boolean;
};
