import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import { FileSystemModel } from '@odf/shared/models/scale';
import { GreenCheckCircleIcon } from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  pluralize,
  TextContent,
  TextVariants,
  Text,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Thead, Tr, Th, Tbody, Table, Td } from '@patternfly/react-table';

const resource = {
  kind: referenceForModel(FileSystemModel),
  isList: true,
};

const isConnected = (fileSystem: FileSystemKind) => {
  return fileSystem.status?.conditions?.some(
    (condition) => condition.type === 'Connected' && condition.status === 'True'
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
  const areAllFileSystemsConnected = fileSystems.every((fileSystem) =>
    fileSystem.status?.conditions?.every(
      (condition) =>
        condition.type === 'Connected' && condition.status === 'True'
    )
  );
  const isAnyFileSystemConnected = fileSystems.some((fileSystem) =>
    fileSystem.status?.conditions?.some(
      (condition) =>
        condition.type === 'Connected' && condition.status === 'True'
    )
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
  const connectedFileSystems = fileSystems?.filter((fileSystem) =>
    isConnected(fileSystem)
  );
  return (
    <div>
      <TextContent className="pf-v5-u-my-xl">
        <Text component={TextVariants.h2}>
          <span className="pf-v5-u-mr-sm">
            <FileSystemStatusIcon
              fileSystems={fileSystems}
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
        </Text>
      </TextContent>
      {fileSystems?.length > 0 ? (
        <Table aria-label={t('File systems table')} variant="compact">
          <Thead>
            <Tr>
              <Th>{t('Name')}</Th>
              <Th>{t('Connection status')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fileSystems?.map((fileSystem: FileSystemKind) => (
              <Tr key={fileSystem.metadata.name}>
                <Td>{fileSystem.metadata.name}</Td>
                <Td>
                  {isConnected(fileSystem) ? t('Connected') : t('Disconnected')}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <EmptyState variant={EmptyStateVariant.sm}>
          <EmptyStateIcon icon={CubesIcon} />
          <Title headingLevel="h5" size="lg">
            {t('No file systems found')}
          </Title>
        </EmptyState>
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
