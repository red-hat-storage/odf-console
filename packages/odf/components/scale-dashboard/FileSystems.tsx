import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import { getName, getNamespace } from '@odf/shared';
import { FileSystemModel } from '@odf/shared/models/scale';
import { GreenCheckCircleIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link, useLocation } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  pluralize,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Thead, Tr, Th, Tbody, Table, Td } from '@patternfly/react-table';
import { filterScaleFileSystems } from '../ibm-common/utils';

const resource = {
  kind: referenceForModel(FileSystemModel),
  isList: true,
};

const isConnected = (fileSystem: FileSystemKind) => {
  return fileSystem.status?.conditions?.some(
    (condition) => condition.type === 'Success' && condition.status === 'True'
  );
};

const FileSystemStatusIcon: React.FC<{
  fileSystems: FileSystemKind[];
  loading: boolean;
  loadError: boolean;
}> = ({ fileSystems, loading, loadError }) => {
  if (fileSystems?.length === 0 || loading || loadError) {
    return null;
  }
  const areAllFileSystemsConnected = fileSystems.every(
    (fileSystem) =>
      fileSystem.status?.conditions?.find(
        (condition) => condition.type === 'Success'
      )?.status === 'True'
  );
  const isAnyFileSystemConnected = fileSystems.some(
    (fileSystem) =>
      fileSystem.status?.conditions?.find(
        (condition) => condition.type === 'Success'
      )?.status === 'True'
  );
  if (areAllFileSystemsConnected) {
    return <GreenCheckCircleIcon />;
  }
  if (isAnyFileSystemConnected) {
    return <YellowExclamationTriangleIcon />;
  }
  return <RedExclamationCircleIcon />;
};

const FileSystemsTable: React.FC = () => {
  const { t } = useCustomTranslation();
  const [fileSystems, fileSystemsLoaded, fileSystemsLoadError] =
    useK8sWatchResource<FileSystemKind[]>(resource);
  const filteredFileSystems = filterScaleFileSystems(fileSystems);
  const connectedFileSystems = filteredFileSystems?.filter((fileSystem) =>
    isConnected(fileSystem)
  );
  const location = useLocation();
  // odf/external-systems/scale.spectrum.ibm.com~v1beta1~remotecluster/:systemName
  const externalSystemName = location.pathname.split('/')[3];
  return (
    <div>
      <Content className="pf-v6-u-my-xl">
        <Content component={ContentVariants.h2}>
          <span className="pf-v6-u-mr-sm">
            <FileSystemStatusIcon
              fileSystems={filteredFileSystems}
              loading={!fileSystemsLoaded}
              loadError={fileSystemsLoadError}
            />
          </span>
          {t('{{ filesystems }} connected', {
            filesystems: pluralize(
              connectedFileSystems?.length,
              t('filesystem')
            ),
          })}
        </Content>
      </Content>
      {filteredFileSystems?.length > 0 ? (
        <Table aria-label={t('File systems table')} variant="compact">
          <Thead>
            <Tr>
              <Th>{t('Name')}</Th>
              <Th>{t('Connection status')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredFileSystems?.map((fileSystem: FileSystemKind) => (
              <Tr key={fileSystem.metadata.uid}>
                <Td>
                  <Link
                    to={`/odf/external-systems/scale.spectrum.ibm.com~v1beta1~cluster/${externalSystemName}/filesystems/ns/${getNamespace(fileSystem)}/${getName(fileSystem)}`}
                  >
                    {getName(fileSystem)}
                  </Link>
                </Td>
                <Td>
                  {isConnected(fileSystem) ? t('Connected') : t('Disconnected')}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <EmptyState
          titleText={
            <Title headingLevel="h5" size="lg">
              {t('No file systems found')}
            </Title>
          }
          icon={CubesIcon}
          variant={EmptyStateVariant.sm}
        ></EmptyState>
      )}
    </div>
  );
};

const FileSystemsCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('File systems')}</CardTitle>
      </CardHeader>
      <CardBody>
        <FileSystemsTable />
      </CardBody>
    </Card>
  );
};

export default FileSystemsCard;
