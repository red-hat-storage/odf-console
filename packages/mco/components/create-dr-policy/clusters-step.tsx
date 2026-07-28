import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink } from '@odf/shared/utils';
import { Trans } from 'react-i18next';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { MAX_ALLOWED_CLUSTERS } from '../../constants';
import { MirrorPeerKind } from '../../types';
import { SelectClusterList } from './select-cluster-list';
import { SelectedClusterValidation } from './selected-cluster-validator';
import { DRPolicyAction, DRPolicyState } from './utils/reducer';

export const ClustersStep: React.FC<ClustersStepProps> = ({
  state,
  dispatch,
  requiredODFVersion,
  preSelectedClusters,
  acmDoc,
  mirrorPeers,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Form className="mco-create-data-policy__body">
      <FormGroup fieldId="connect-clusters" label={t('Connect clusters')}>
        <FormHelperText>
          <HelperText className="mco-create-data-policy__text-input">
            <HelperTextItem>
              {t(
                'Enables mirroring/replication between two selected clusters, ensuring failover or relocation between the two clusters in the event of an outage or planned maintenance.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <SelectClusterList
          selectedClusters={state.selectedClusters}
          requiredODFVersion={requiredODFVersion}
          dispatch={dispatch}
          preSelectedClusterNames={preSelectedClusters}
          showOnlyPreselected={preSelectedClusters.length > 0}
        />
      </FormGroup>
      <FormGroup fieldId="cluster-note">
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              <Trans>
                Note: If your managed cluster does not appear here, confirm it
                is successfully imported and refer to the{' '}
                <ExternalLink href={acmDoc}>RHACM documentation</ExternalLink>{' '}
                for more details.
              </Trans>
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      {state.selectedClusters.length === MAX_ALLOWED_CLUSTERS && (
        <FormGroup fieldId="cluster-selection-validation">
          <SelectedClusterValidation
            selectedClusters={state.selectedClusters}
            requiredODFVersion={requiredODFVersion}
            dispatch={dispatch}
            mirrorPeers={mirrorPeers}
          />
        </FormGroup>
      )}
    </Form>
  );
};

type ClustersStepProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
  requiredODFVersion: string;
  preSelectedClusters: string[];
  acmDoc: string;
  mirrorPeers: MirrorPeerKind[];
};
