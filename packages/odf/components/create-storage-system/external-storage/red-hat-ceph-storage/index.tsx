import * as React from 'react';
import {
  checkError,
  createDownloadFile,
  getIPFamily,
  isValidJSON,
  prettifyJSON,
} from '@odf/core/components/utils';
import { CEPH_STORAGE_NAMESPACE, IP_FAMILY, OCS_OPERATOR } from '@odf/core/constants';
import { RHCSState, CanGoToNextStep, CreatePayload, ExternalComponentProps } from '@odf/core/types';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { PodModel, SecretModel } from '@odf/shared/models';
import { getAnnotations } from '@odf/shared/selectors';
import { ListKind, PodKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils'
import { K8sKind } from "@openshift-console/dynamic-plugin-sdk/lib/api/common-types";
import * as _ from 'lodash';
import { Trans, useTranslation } from 'react-i18next';
import { FormGroup, FileUpload, FileUploadProps, Form } from '@patternfly/react-core';
import { ErrorHandler } from '../../error-handler';
import { useFetchCsv } from '../../use-fetch-csv';
import './index.scss';

const SCRIPT_NAME = 'ceph-external-cluster-details-exporter.py';

export const getValidationKeys = (rawKeys: string): { plainKeys: string[]; secretKeys: [] } => {
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
  const { t } = useTranslation('plugin__odf-console');
  const [pods, podsLoaded, podsLoadError] = useK8sGet<ListKind<PodKind>>(PodModel);
  const [csv, csvLoaded, csvLoadError] = useFetchCsv(OCS_OPERATOR, CEPH_STORAGE_NAMESPACE);

  const { fileName, fileData, errorMessage, isLoading } = formState;

  const annotations = getAnnotations(csv);

  const downloadFile = createDownloadFile(
    annotations?.['external.features.ocs.openshift.io/export-script'],
  );

  const handleFileChange: FileUploadProps['onChange'] = (fData: string, fName) => {
    if (isValidJSON(fData)) {
      const { plainKeys, secretKeys } = getValidationKeys(
        annotations?.['external.features.ocs.openshift.io/validation'],
      );
      const ipAddress: string = pods.items?.[0]?.status?.podIP;
      const ipFamily: IP_FAMILY = ipAddress ? getIPFamily(ipAddress) : IP_FAMILY.IPV4;
      const error: string = checkError(fData, plainKeys, secretKeys, ipFamily);
      setFormState('errorMessage', error);
    } else {
      const invalidString: string = t(
        'The uploaded file is not a valid JSON file',
      );
      setFormState('errorMessage', fData ? invalidString : '');
    }

    setFormState('fileName', fName);
    setFormState('fileData', fData);
  };

  return (
    <ErrorHandler error={podsLoadError || csvLoadError} loaded={podsLoaded && csvLoaded}>
      <Form>
        <FormGroup
          label={t('External storage system metadata')}
          fieldId="external-storage-system-metadata"
          className="odf-connection-details__form-group"
          helperText={
            <div className="odf-connection-details__helper-text">
              <Trans t={t as any} ns="plugin__odf-console">
                Download <code>{{ SCRIPT_NAME }}</code> script and run on the RHCS cluster, then
                upload the results (JSON) in the External storage system metadata field.
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

export const rhcsPayload: CreatePayload<RHCSState> = (systemName, state, model) => {
  const { apiVersion, apiGroup, kind, plural } = SecretModel;
  return [
    {
      model: {
        apiGroup,
        apiVersion,
        kind,
        plural,
      },
      payload: {
        apiVersion: SecretModel.apiVersion,
        kind: SecretModel.kind,
        metadata: {
          name: 'rook-ceph-external-cluster-details',
          namespace: CEPH_STORAGE_NAMESPACE,
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
          namespace: CEPH_STORAGE_NAMESPACE,
        },
        spec: {
          externalStorage: {
            enable: true,
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
  !!state.fileName && !!state.fileData && !state.errorMessage && !state.isLoading;
