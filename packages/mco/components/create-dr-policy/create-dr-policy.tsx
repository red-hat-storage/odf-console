import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import {
  ACM_DEFAULT_DOC_VERSION,
  DRPolicyModel,
  MirrorPeerModel,
  useDocVersion,
} from '@odf/shared';
import { StatusBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink, referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  ExpandableSection,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Content,
  TextInput,
  ContentVariants,
} from '@patternfly/react-core';
import {
  ACM_OPERATOR_SPEC_NAME,
  acmDocHome,
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  ODFMCO_OPERATOR,
  ReplicationType,
} from '../../constants';
import '../../style.scss';
import { MirrorPeerKind } from '../../types';
import { S3Details } from './add-s3-bucket-details/s3-bucket-details-form';
import './create-dr-policy.scss';
import { SelectClusterList } from './select-cluster-list';
import { SelectReplicationType } from './select-replication-type';
import { SelectedClusterValidation } from './selected-cluster-validator';
import { createPolicyPromises } from './utils/k8s-utils';
import {
  DRPolicyAction,
  DRPolicyActionType,
  drPolicyInitialState,
  drPolicyReducer,
  DRPolicyState,
} from './utils/reducer';

const getDRPolicyListPageLink = (url: string) =>
  url.replace(`/${referenceForModel(DRPolicyModel)}/~new`, '');

const isFilled = (v: string) => !!v && v.trim().length > 0;

const areS3DetailsValid = (d: S3Details) =>
  Object.values(d).every((v) => isFilled(v));

export const validateDRPolicyInputs = (state: DRPolicyState): boolean => {
  const {
    policyName,
    replicationType,
    selectedClusters,
    isClusterSelectionValid,
    replicationBackend,
    cluster1S3Details,
    cluster2S3Details,
    useSameS3Connection,
  } = state;

  const baseValid =
    isFilled(policyName) &&
    !!replicationType &&
    isClusterSelectionValid &&
    selectedClusters.length === MAX_ALLOWED_CLUSTERS;

  if (!baseValid) return false;

  if (replicationBackend === BackendType.ThirdParty) {
    const s3Ok =
      areS3DetailsValid(cluster1S3Details) &&
      (useSameS3Connection || areS3DetailsValid(cluster2S3Details));
    return s3Ok;
  }

  return true;
};

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

/* const convertS3ProfileToDetails = (
  profile: S3StoreProfile,
  clusterName: string
): S3Details => {
  return {
    clusterName,
    bucketName: profile.s3Bucket || '',
    endpoint: profile.s3CompatibleEndpoint || '',
    accessKeyId: '',
    secretKey: '',
    region: profile.s3Region || '',
    s3ProfileName: profile.s3ProfileName || '',
  };
}; */

const CreateDRPolicy: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { pathname: url } = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = React.useReducer(
    drPolicyReducer,
    drPolicyInitialState
  );
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const [mirrorPeers, mirrorPeerLoaded, mirrorPeerLoadError] =
    useK8sWatchResource<MirrorPeerKind[]>({
      kind: referenceForModel(MirrorPeerModel),
      isList: true,
      namespaced: false,
    });

  /*  const [drClusters, drClustersLoaded, drClustersLoadError] =
    useK8sWatchResource<DRClusterKind[]>({
      kind: referenceForModel(DRClusterModel),
      isList: true,
      namespaced: false,
}); */

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  /*   const selectedDRClusters = React.useMemo(() => {
    if (
      state.selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
      drClustersLoaded &&
      !drClustersLoadError
    ) {
      const drCluster1 = drClusters.find(
        (drCluster) => getName(drCluster) === getName(state.selectedClusters[0])
      );
      const drCluster2 = drClusters.find(
        (drCluster) => getName(drCluster) === getName(state.selectedClusters[1])
      );
      return [drCluster1, drCluster2].filter(Boolean) as DRClusterKind[];
    }
    return [];
  }, [
    state.selectedClusters,
    drClusters,
    drClustersLoaded,
    drClustersLoadError,
  ]);

  React.useEffect(() => {
    const loadS3ProfileDetails = async () => {
      if (
        state.replicationBackend === BackendType.ThirdParty &&
        selectedDRClusters.length === MAX_ALLOWED_CLUSTERS
      ) {
        try {
          const ramenS3Profiles = await fetchRamenS3Profiles();

          const cluster1S3ProfileName =
            selectedDRClusters[0]?.spec?.s3ProfileName;
          const cluster2S3ProfileName =
            selectedDRClusters[1]?.spec?.s3ProfileName;

          const cluster1Name = getName(selectedDRClusters[0]);
          const cluster2Name = getName(selectedDRClusters[1]);

          if (cluster1S3ProfileName) {
            const cluster1Profile = ramenS3Profiles.find(
              (profile) => profile.s3ProfileName === cluster1S3ProfileName
            );
            if (cluster1Profile) {
              const cluster1Details = convertS3ProfileToDetails(
                cluster1Profile,
                cluster1Name
              );
              dispatch({
                type: DRPolicyActionType.SET_CLUSTER1_S3_DETAILS,
                payload: cluster1Details,
              });
            }
          }

          if (cluster2S3ProfileName) {
            const cluster2Profile = ramenS3Profiles.find(
              (profile) => profile.s3ProfileName === cluster2S3ProfileName
            );
            if (cluster2Profile) {
              const cluster2Details = convertS3ProfileToDetails(
                cluster2Profile,
                cluster2Name
              );
              dispatch({
                type: DRPolicyActionType.SET_CLUSTER2_S3_DETAILS,
                payload: cluster2Details,
              });
            }
          }
        } catch (error) {
          setErrorMessage(
            t('Failed to load S3 profile details: {{error}}', {
              error: (error as Error)?.message || JSON.stringify(error),
            })
          );
        }
      }
    };

    loadS3ProfileDetails();
  }, [selectedDRClusters, dispatch, state.replicationBackend, t]); */

  const onCreate = async () => {
    try {
      setIsLoading(true);
      await createPolicyPromises(state, mirrorPeers);
      navigate(getDRPolicyListPageLink(url));
    } catch (error) {
      setIsLoading(false);
      setErrorMessage((error as Error)?.message || JSON.stringify(error));
    }
  };

  const setPolicyName = (strVal: string) =>
    dispatch({
      type: DRPolicyActionType.SET_POLICY_NAME,
      payload: strVal,
    });

  const loaded = mirrorPeerLoaded;
  const loadedError = mirrorPeerLoadError;

  /* const clusterNames = React.useMemo(
    () => state.selectedClusters.map(getName),
    [state.selectedClusters]
  ); */
  const acmDocVersion = useDocVersion({
    defaultDocVersion: ACM_DEFAULT_DOC_VERSION,
    specName: ACM_OPERATOR_SPEC_NAME,
  });

  const acmDoc = acmDocHome(acmDocVersion);
  return (
    <>
      <PageHeading title={t('Create DRPolicy')}>
        <Content className="mco-create-data-policy__description">
          <Content component={ContentVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Content>
        </Content>
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
              data-test-id="policy-name"
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
                  <Trans>
                    Note: If your managed cluster does not appear here, confirm
                    it is successfully imported and refer to the{' '}
                    <ExternalLink href={acmDoc}>
                      RHACM documentation
                    </ExternalLink>{' '}
                    for more details.
                  </Trans>
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
                  {/* {!state.selectedClustersHaveODF && (
                    <FormGroup
                      fieldId="select-backend"
                      label={t('Select replication')}
                    >
                      <FormHelperText>
                        <HelperText className="mco-create-data-policy__text-input">
                          <HelperTextItem>
                            {t(
                              'All disaster recovery prerequisites are met for both clusters. Multiple storage backends are available on both of the selected clusters.'
                            )}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                      <SelectReplicationBackend
                        clusterNames={clusterNames}
                        doClustersHaveODF={state.selectedClustersHaveODF}
                        dispatch={dispatch}
                        selectedKey={state.replicationBackend}
                      />
                    </FormGroup>
                  )} */}
                  {/* {!state.selectedClustersHaveODF &&
                    state.replicationBackend === BackendType.ThirdParty && (
                      <>
                        <ThirdPartyStorageWarning
                          docHref={tpsDoc(DOC_VERSION)}
                        />
                        <FormGroup
                          fieldId="add-s3-bucket-details"
                          label={t('Replication site')}
                        >
                          <FormHelperText>
                            <HelperText className="mco-create-data-policy__text-input">
                              <HelperTextItem>
                                {t(
                                  'Provide S3 bucket connection details for each managed cluster. If a S3 bucket is not already configured for cluster, create one and then continue.'
                                )}
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                          <ClusterS3BucketDetailsForm
                            selectedClusters={state.selectedClusters}
                            cluster1Details={state.cluster1S3Details}
                            cluster2Details={state.cluster2S3Details}
                            useSameConnection={state.useSameS3Connection}
                            dispatch={dispatch}
                          />
                        </FormGroup>
                      </>
                    )} */}

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
              data-test-id="create-button"
              data-test="create-button"
              variant={ButtonVariant.primary}
              onClick={onCreate}
              isDisabled={!validateDRPolicyInputs(state) || isLoading}
              isLoading={isLoading}
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
