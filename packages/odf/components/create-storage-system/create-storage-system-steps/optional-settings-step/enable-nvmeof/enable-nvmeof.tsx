import * as React from 'react';
import { TechPreviewBadge } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import { WizardDispatch } from '../../../reducer';

export const EnableNVMEOF: React.FC<EnableNVMEOFProps> = ({
  dispatch,
  nvmeofEnabled,
}) => {
  const { t } = useCustomTranslation();

  return (
    <FormGroup>
      <Checkbox
        id="enable-nvmeof"
        label={
          <>
            {t('Enable NVMe-over-Fabrics (NVMe-oF)')}
            <span className="pf-v6-u-ml-sm">
              <TechPreviewBadge />
            </span>
          </>
        }
        description={t(
          'Use an NVMe-oF gateway to create new StorageClasses with high-performance, low-latency block storage access.'
        )}
        isChecked={nvmeofEnabled}
        onChange={(_event, checked) =>
          dispatch({
            type: 'optionalSettings/enableNVMEOF',
            payload: checked,
          })
        }
        className="odf-backing-store__radio--margin-bottom"
      />
    </FormGroup>
  );
};

type EnableNVMEOFProps = {
  dispatch: WizardDispatch;
  nvmeofEnabled: boolean;
};
