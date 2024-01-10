import * as React from 'react';
import { ErrorHandler } from '@odf/core/components/create-storage-system/error-handler';
import {
  checkError,
  createDownloadFile,
  getIPFamily,
  isValidJSON,
  prettifyJSON,
} from '@odf/core/components/utils';
import { IP_FAMILY } from '@odf/core/constants';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { RHCSState } from '@odf/core/types';
import {
  CanGoToNextStep,
  CreatePayload,
  StorageClassComponentProps as ExternalComponentProps,
  StorageClassWizardStepExtensionProps as ExternalStorage,
} from '@odf/odf-plugin-sdk/extensions';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import {
  PodModel,
  SecretModel,
  OCSStorageClusterModel,
} from '@odf/shared/models';
import { getAnnotations } from '@odf/shared/selectors';
import { ListKind, PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel } from '@odf/shared/utils';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import {
  FormGroup,
  FileUpload,
  FileUploadProps,
  Form,
} from '@patternfly/react-core';
import './system-connection-details.scss';

const OCS_OPERATOR = 'ocs-operator';

const SCRIPT_NAME = 'ceph-external-cluster-details-exporter.py';

export const getValidationKeys = (
  rawKeys: string
): { plainKeys: string[]; secretKeys: [] } => {
  const { configMaps, secrets, storageClasses } = rawKeys
    ? JSON.parse(rawKeys)
    : { configMaps: [], secrets: [], storageClasses: [] };
  const plainKeys = _.concat(configMaps, storageClasses);
  return { plainKeys, secretKeys: secrets };
};

export const ConnectionDetails: React.FC<ExternalComponentProps<RHCSState>> = ({
  setFormState,
  formState,
}) => {
  const { t } = useCustomTranslation();

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [pods, podsLoaded, podsLoadError] =
    useK8sGet<ListKind<PodKind>>(PodModel);
  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: OCS_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });

  const { fileName, fileData, errorMessage, isLoading } = formState;

  const annotations = getAnnotations(csv);

  const downloadFile = createDownloadFile(
    annotations?.['external.features.ocs.openshift.io/export-script']
  );

  const handleFileChange: FileUploadProps['onChange'] = (
    fData: string,
    fName
  ) => {
    if (isValidJSON(fData)) {
      const { plainKeys, secretKeys } = getValidationKeys(
        annotations?.['external.features.ocs.openshift.io/validation']
      );
      const ipAddress: string = pods.items?.[0]?.status?.podIP;
      const ipFamily: IP_FAMILY = ipAddress
        ? getIPFamily(ipAddress)
        : IP_FAMILY.IPV4;
      const error: string = checkError(fData, plainKeys, secretKeys, ipFamily);
      setFormState('errorMessage', error);
    } else {
      const invalidString: string = t(
        'The uploaded file is not a valid JSON file'
      );
      setFormState('errorMessage', fData ? invalidString : '');
    }

    setFormState('fileName', fName);
    setFormState('fileData', fData);
  };

  return (
    <ErrorHandler
      error={podsLoadError || csvLoadError}
      loaded={podsLoaded && csvLoaded}
    >
      <Form>
        <FormGroup
          label={t('External storage system metadata')}
          fieldId="external-storage-system-metadata"
          className="odf-connection-details__form-group"
          helperText={
            <div className="odf-connection-details__helper-text">
              <Trans t={t as any} ns="plugin__odf-console">
                Download <code>{{ SCRIPT_NAME }}</code> script and run on the
                RHCS cluster, then upload the results (JSON) in the External
                storage system metadata field.
              </Trans>{' '}
              {downloadFile && (
                <a
                  id="downloadAnchorElem"
                  href={downloadFile}
                  download="ceph-external-cluster-details-exporter.py"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Download script')}
                </a>
              )}
            </div>
          }
          helperTextInvalid={errorMessage}
          validated={errorMessage ? 'error' : 'default'}
        >
          <FileUpload
            id="external-storage-system-metadata"
            className="odf-connection-details__file-upload"
            type="text"
            isRequired
            isReadOnly
            value={prettifyJSON(fileData ?? '')}
            filename={fileName}
            isLoading={isLoading}
            validated={errorMessage ? 'error' : 'default'}
            dropzoneProps={{
              accept: '.json',
            }}
            onChange={handleFileChange}
            onReadStarted={() => setFormState('isLoading', true)}
            onReadFinished={() => setFormState('isLoading', false)}
            browseButtonText={t('Browse')}
            clearButtonText={t('Clear')}
            filenamePlaceholder={t('Upload helper script')}
          />
        </FormGroup>
      </Form>
    </ErrorHandler>
  );
};

export const rhcsPayload: CreatePayload<RHCSState> = ({
  systemName,
  state,
  model,
  namespace,
  inTransitStatus,
  shouldSetCephRBDAsDefault,
}) => {
  return [
    {
      model: SecretModel,
      payload: {
        apiVersion: SecretModel.apiVersion,
        kind: SecretModel.kind,
        metadata: {
          name: 'rook-ceph-external-cluster-details',
          namespace: namespace,
        },
        stringData: {
          external_cluster_details: state.fileData,
        },
        type: 'Opaque',
      },
    },
    {
      model,
      payload: {
        apiVersion: getAPIVersionForModel(model as K8sKind),
        apiGroup: model.apiGroup,
        kind: model.kind,
        metadata: {
          name: systemName,
          namespace: namespace,
        },
        spec: {
          network: {
            connections: {
              encryption: {
                enabled: inTransitStatus,
              },
            },
          },
          externalStorage: {
            enable: true,
          },
          managedResources: {
            cephBlockPools: { defaultStorageClass: shouldSetCephRBDAsDefault },
          },
          labelSelector: {
            matchExpressions: [],
          },
        },
      },
    },
  ];
};

export const rhcsCanGoToNextStep: CanGoToNextStep<RHCSState> = (state) =>
  !!state.fileName &&
  !!state.fileData &&
  !state.errorMessage &&
  !state.isLoading;

export const EXTERNAL_CEPH_STORAGE: ExternalStorage[] = [
  {
    displayName: 'Red Hat Ceph Storage',
    model: {
      apiGroup: OCSStorageClusterModel.apiGroup,
      apiVersion: OCSStorageClusterModel.apiVersion,
      kind: OCSStorageClusterModel.kind,
      plural: OCSStorageClusterModel.plural,
    },
    component: ConnectionDetails,
    createPayload: rhcsPayload,
    canGoToNextStep: rhcsCanGoToNextStep,
  },
];
