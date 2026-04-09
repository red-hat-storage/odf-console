import * as React from 'react';
import { ObjectDetailsSidebar } from '@odf/core/components/s3-browser/object-details/ObjectDetailsSidebar';
import { BUCKET_VERSIONING_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import { ObjectCrFormat } from '@odf/core/types';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import {
  getIsVersioningEnabled,
  getIsVersioningSuspended,
} from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isClientPlugin } from '@odf/shared/utils';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import { Alert, AlertActionLink } from '@patternfly/react-core';
import { IAction } from '@patternfly/react-table';
import { LazyClientCorsConfigModal } from '../../../modals/s3-browser/client-cors-config/LazyClientCorsConfigModal';
import { S3Context } from '../s3-context';
import UploadSidebar from '../upload-objects';
import { FileUploadComponent } from '../upload-objects';
import { ExtraProps, ObjectsList } from './ObjectsList';
import { useIsClientCorsConfigured } from './useIsClientCorsConfigured';

type ObjectListWithSidebarProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

type ObjectListWithSidebarContentProps = {
  triggerRefresh: () => void;
};

type ClientCorsAlertProps = {
  bucketName: string;
  s3Client: S3Commands;
  triggerRefresh: () => void;
};

const ClientCorsAlert: React.FC<ClientCorsAlertProps> = ({
  bucketName,
  s3Client,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModal();

  return (
    <Alert
      isInline
      variant="info"
      title={t('CORS will affect certain actions in object browser.')}
      className="pf-v6-u-my-sm"
      actionLinks={
        <AlertActionLink
          onClick={() =>
            launcher(LazyClientCorsConfigModal, {
              isOpen: true,
              extraProps: { bucketName, s3Client, triggerRefresh },
            })
          }
        >
          {t('Enable CORS')}
        </AlertActionLink>
      }
    >
      <p>
        {t(
          'Upload, Download, Preview and Share with presigned URL actions will not be available.'
        )}
      </p>
    </Alert>
  );
};

const ObjectListWithSidebarContent: React.FC<
  ObjectListWithSidebarContentProps
> = ({ triggerRefresh }) => {
  const { bucketName } = useParams();
  const { s3Client } = React.useContext(S3Context);
  const isClientCluster = isClientPlugin();

  const { data: versioningData } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_VERSIONING_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketVersioning({ Bucket: bucketName })
  );
  const isClientCorsConfigured = useIsClientCorsConfigured();

  const allowVersioning =
    getIsVersioningEnabled(versioningData) ||
    getIsVersioningSuspended(versioningData);
  const showClientCorsAlert = isClientCluster && !isClientCorsConfigured;

  const [isUploadSidebarExpanded, setUploadSidebarExpanded] =
    React.useState(false);
  const [isObjectSidebarExpanded, setObjectSidebarExpanded] =
    React.useState(false);
  const [object, setObject] = React.useState<ObjectCrFormat>(null);
  const [objectActions, setObjectActions] =
    React.useState<React.MutableRefObject<IAction[]>>();
  const [extraProps, setExtraProps] = React.useState({} as ExtraProps);
  const [completionTime, setCompletionTime] = React.useState<number>();
  const [listAllVersions, setListAllVersions] = React.useState<boolean>(false);

  const closeObjectSidebar = () => setObjectSidebarExpanded(false);
  const closeUploadSidebar = () => setUploadSidebarExpanded(false);
  const showUploadSidebar = () => {
    closeObjectSidebar();
    setUploadSidebarExpanded(true);
  };
  const onRowClick = (
    selectedObject: ObjectCrFormat,
    actionItems: React.MutableRefObject<IAction[]>,
    objectExtraProps: ExtraProps
  ) => {
    if (selectedObject.isFolder) return;
    closeUploadSidebar();
    setObject(selectedObject);
    setObjectActions(actionItems);
    setExtraProps(objectExtraProps);
    setObjectSidebarExpanded(true);
  };

  return (
    <>
      {showClientCorsAlert && (
        <ClientCorsAlert
          bucketName={bucketName}
          s3Client={s3Client}
          triggerRefresh={triggerRefresh}
        />
      )}
      <UploadSidebar
        isExpanded={isUploadSidebarExpanded}
        closeSidebar={closeUploadSidebar}
        completionTime={completionTime}
        mainContent={
          <>
            <FileUploadComponent
              s3Client={s3Client}
              bucketName={bucketName}
              showSidebar={showUploadSidebar}
              hideSidebar={closeUploadSidebar}
              setCompletionTime={setCompletionTime}
              triggerRefresh={triggerRefresh}
              blockDataPath={showClientCorsAlert}
            />
            <ObjectDetailsSidebar
              closeSidebar={closeObjectSidebar}
              isExpanded={isObjectSidebarExpanded}
              object={object}
              objectActions={objectActions}
              extraProps={extraProps}
              showVersioning={listAllVersions}
              blockDataPath={showClientCorsAlert}
              wrappedContent={
                <ObjectsList
                  onRowClick={onRowClick}
                  closeObjectSidebar={closeObjectSidebar}
                  listAllVersions={listAllVersions}
                  setListAllVersions={setListAllVersions}
                  allowVersioning={allowVersioning}
                  blockDataPath={showClientCorsAlert}
                />
              }
            />
          </>
        }
      />
    </>
  );
};

export const ObjectListWithSidebar: React.FC<ObjectListWithSidebarProps> = ({
  obj: { fresh, triggerRefresh },
}) => {
  return fresh ? (
    <ObjectListWithSidebarContent triggerRefresh={triggerRefresh} />
  ) : (
    <LoadingBox />
  );
};
