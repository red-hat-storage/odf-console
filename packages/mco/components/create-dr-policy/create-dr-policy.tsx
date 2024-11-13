import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import { getName } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  Text,
  TextInput,
  TextContent,
  TextVariants,
  ActionGroup,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ExpandableSection,
  Checkbox,
} from '@patternfly/react-core';
import {
  MAX_ALLOWED_CLUSTERS,
  REPLICATION_TYPE,
  ODFMCO_OPERATOR,
} from '../../constants';
import { DRPolicyModel, MirrorPeerModel } from '../../models';
import { MirrorPeerKind } from '../../types';
import { SelectClusterList } from './select-cluster-list';
import { SelectReplicationType } from './select-replication-type';
import { SelectedClusterValidation } from './selected-cluster-validator';
import { SelectedClusterView } from './selected-cluster-view';
import { createPolicyPromises } from './utils/k8s-utils';
import {
  drPolicyReducer,
  drPolicyInitialState,
  DRPolicyActionType,
  DRPolicyAction,
} from './utils/reducer';
import '../../style.scss';
import './create-dr-policy.scss';

const getDRPolicyListPageLink = (url: string) =>
  url.replace(`/${referenceForModel(DRPolicyModel)}/~new`, '');

const validateDRPolicyInputs = (
  policyName: string,
  replicationType: REPLICATION_TYPE,
  clusterCount: number,
  isClusterSelectionValid: boolean
) =>
  !!policyName &&
  !!replicationType &&
  !!isClusterSelectionValid &&
  clusterCount === MAX_ALLOWED_CLUSTERS;

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  enableRBDImageFlatten,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const handleRBDImageFlattenOnChange = (checked: boolean) => {
    dispatch({
      type: DRPolicyActionType.SET_RBD_IMAGE_FLATTEN,
      payload: checked,
    });
  };

  return (
    <ExpandableSection toggleText={t('Advanced settings')}>
      <Checkbox
        label={t(
          'Enable disaster recovery support for restored and cloned PersistentVolumeClaims (For Data Foundation only)'
        )}
        isChecked={enableRBDImageFlatten}
        onChange={(_event, checked: boolean) =>
          handleRBDImageFlattenOnChange(checked)
        }
        id="flat-image-checkbox"
        name="flat-image-checkbox"
      />
      <Alert
        className="pf-v5-u-mt-md odf-alert mco-create-data-policy__alert"
        title={
          <Trans>
            Before choosing this option, read the section
            <i className="pf-v5-u-mx-xs">
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

const CreateDRPolicy: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { pathname: url } = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = React.useReducer(
    drPolicyReducer,
    drPolicyInitialState
  );
  const [errorMessage, setErrorMessage] = React.useState('');

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  const onCreate = () => {
    const promises = createPolicyPromises(state, mirrorPeers);
    Promise.all(promises)
      .then(() => {
        navigate(getDRPolicyListPageLink(url));
      })
      .catch((error) => {
        setErrorMessage(error?.message);
      });
  };

  const setPolicyName = (strVal: string) =>
    dispatch({
      type: DRPolicyActionType.SET_POLICY_NAME,
      payload: strVal,
    });

  const loaded = mirrorPeerLoaded;
  const loadedError = mirrorPeerLoadError;

  return (
    <>
      <PageHeading title={t('Create DRPolicy')}>
        <TextContent className="mco-create-data-policy__description">
          <Text component={TextVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      {loaded && !loadedError ? (
        <Form className="mco-create-data-policy__body">
          <FormGroup
            className="mco-create-data-policy__text-input"
            fieldId="policy-name"
            label={t('Policy name')}
          >
            <TextInput
              data-test="policy-name-text"
              id="policy-name"
              data-testid="policy-name"
              value={state.policyName}
              type="text"
              placeholder={t('Enter a policy name')}
              onChange={(_event, strVal: string) => setPolicyName(strVal)}
              isRequired
            />
          </FormGroup>
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
              requiredODFVersion={odfMCOVersion}
              dispatch={dispatch}
            />
          </FormGroup>
          <FormGroup>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    "Note: If your cluster isn't visible on this list, verify its import status and refer to the steps outlined in the ACM documentation."
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          {state.selectedClusters.length === 2 && (
            <>
              <FormGroup fieldId="cluster-selection-validation">
                <SelectedClusterValidation
                  selectedClusters={state.selectedClusters}
                  requiredODFVersion={odfMCOVersion}
                  dispatch={dispatch}
                  mirrorPeers={mirrorPeers}
                />
              </FormGroup>
              {state.isClusterSelectionValid && (
                <>
                  <FormGroup
                    fieldId="selected-clusters"
                    label={t('Selected clusters')}
                  >
                    {state.selectedClusters.map((c, i) => (
                      <SelectedClusterView
                        key={getName(c)}
                        index={i + 1}
                        cluster={c}
                      />
                    ))}
                  </FormGroup>
                  <SelectReplicationType
                    selectedClusters={state.selectedClusters}
                    replicationType={state.replicationType}
                    syncIntervalTime={state.syncIntervalTime}
                    dispatch={dispatch}
                  />
                  {state.replicationType === REPLICATION_TYPE.ASYNC && (
                    <FormGroup fieldId="advanced-settings">
                      <AdvancedSettings
                        enableRBDImageFlatten={state.enableRBDImageFlatten}
                        dispatch={dispatch}
                      />
                    </FormGroup>
                  )}
                  {errorMessage && (
                    <FormGroup fieldId="error-message">
                      <Alert
                        className="odf-alert mco-create-data-policy__alert"
                        title={t('An error occurred')}
                        variant={AlertVariant.danger}
                        isInline
                      >
                        {errorMessage}
                      </Alert>
                    </FormGroup>
                  )}
                </>
              )}
            </>
          )}
          <ActionGroup className="mco-create-data-policy__action-group">
            <Button
              data-testid="create-button"
              data-test="create-button"
              variant={ButtonVariant.primary}
              onClick={onCreate}
              isDisabled={
                !validateDRPolicyInputs(
                  state.policyName,
                  state.replicationType,
                  state.selectedClusters.length,
                  state.isClusterSelectionValid
                )
              }
            >
              {t('Create')}
            </Button>
            <Button
              data-test="cancel-button"
              variant={ButtonVariant.secondary}
              onClick={() => navigate(-1)}
            >
              {t('Cancel')}
            </Button>
          </ActionGroup>
        </Form>
      ) : (
        <StatusBox loaded={loaded} loadError={loadedError} />
      )}
    </>
  );
};

type AdvancedSettingsProps = {
  enableRBDImageFlatten: boolean;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export default CreateDRPolicy;
