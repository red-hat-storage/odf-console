import * as React from 'react';
import { useExistingFileSystemNames } from '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation';
import { filterUsedDiscoveredDevices } from '@odf/core/components/utils';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import {
  PageHeading,
  useCustomTranslation,
  ButtonBar,
  TextInputWithFieldRequirements,
  LocalDiskModel,
} from '@odf/shared';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  FormSection,
  ActionGroup,
  Button,
  Alert,
  AlertVariant,
  ButtonType,
  ButtonVariant,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { useIsLocalClusterConfigured } from '../common/hooks';
import { NodesSection } from '../common/NodesSection';
import {
  configureMetricsNamespaceLabels,
  createScaleLocalClusterPayload,
  labelNodes,
} from '../common/payload';
import { ExternalRegistryFormSection } from './ExternalRegistryFormSection';
import { LUNsTable } from './LUNsTable';
import {
  createCSIDriver,
  createLocalDisks,
  createLocalFileSystem,
  createStorageClass,
} from './payload';
import { SANSystemComponentState, initialComponentState } from './types';
import { useDeviceFinder } from './useDeviceFinder';
import useSANSystemFormValidation from './useFormValidation';
import { usePersistentRegistryCheck } from './usePersistentRegistryCheck';

type CreateSANSystemFormProps = {
  componentState: SANSystemComponentState;
  setComponentState: React.Dispatch<
    React.SetStateAction<SANSystemComponentState>
  >;
};

const CreateSANSystemForm: React.FC<CreateSANSystemFormProps> = ({
  componentState,
  setComponentState,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const localCluster = useIsLocalClusterConfigured();
  const isLocalClusterConfigured = !_.isEmpty(localCluster);

  const [disks] = useK8sWatchResource<LocalDiskKind[]>({
    groupVersionKind: {
      group: LocalDiskModel.apiGroup,
      version: LocalDiskModel.apiVersion,
      kind: LocalDiskModel.kind,
    },
    isList: true,
  });

  const existingFileSystemNames = useExistingFileSystemNames();

  const {
    fieldRequirements,
    control,
    formState: { isSubmitted },
    watch,
    getValues,
  } = useSANSystemFormValidation(existingFileSystemNames);

  const [
    hasPersistentRegistry,
    hasPersistentRegistryLoading,
    hasPersistentRegistryError,
  ] = usePersistentRegistryCheck();

  const selectedNodes = componentState.selectedNodes;

  const { sharedDevices, deviceFinderLoading } = useDeviceFinder(selectedNodes);

  // Watch form fields
  const lunGroupName = watch('lunGroupName');
  const imageRegistryUrl = watch('imageRegistryUrl');
  const imageRepositoryName = watch('imageRepositoryName');
  const secretKey = watch('secretKey');
  const caCertificateSecret = watch('caCertificateSecret');
  const privateKeySecret = watch('privateKeySecret');

  const isFormValid = !!(
    lunGroupName &&
    imageRegistryUrl &&
    imageRepositoryName &&
    secretKey &&
    caCertificateSecret &&
    privateKeySecret &&
    componentState.selectedNodes.length > 0 &&
    componentState.selectedLUNs.size > 0
  );

  const filteredSharedDevices = filterUsedDiscoveredDevices(
    sharedDevices,
    disks
  );

  const onCreate = React.useCallback(async () => {
    setLoading(true);
    setError('');

    const mappedLuns: DiscoveredDevice[] = sharedDevices.filter((lun) =>
      componentState.selectedLUNs.has(lun.WWN)
    );
    try {
      if (!isLocalClusterConfigured) {
        await labelNodes(componentState.selectedNodes)();
        const externalKmmRegistry =
          !hasPersistentRegistry &&
          (() => {
            const values = getValues();
            return values.imageRegistryUrl &&
              values.imageRepositoryName &&
              values.secretKey &&
              values.caCertificateSecret &&
              values.privateKeySecret
              ? {
                  imageRegistryUrl: values.imageRegistryUrl,
                  imageRepositoryName: values.imageRepositoryName,
                  secretKey: values.secretKey,
                  caCertificateSecret: values.caCertificateSecret,
                  privateKeySecret: values.privateKeySecret,
                }
              : undefined;
          })();
        await createScaleLocalClusterPayload(externalKmmRegistry)();
        await createCSIDriver();
        await configureMetricsNamespaceLabels();
      }
      const localDisks = await createLocalDisks(mappedLuns, t);
      const fileSystem = await createLocalFileSystem(
        lunGroupName,
        localDisks,
        t
      );
      await createStorageClass(fileSystem, t);
      navigate('/odf/external-systems');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('An error occurred while creating the SAN system')
      );
    } finally {
      setLoading(false);
    }
  }, [
    sharedDevices,
    componentState.selectedLUNs,
    componentState.selectedNodes,
    isLocalClusterConfigured,
    hasPersistentRegistry,
    getValues,
    lunGroupName,
    navigate,
    t,
  ]);

  return (
    <Form isWidthLimited>
      <FormSection title={t('General configuration')}>
        <FormGroup label={t('Connection name')} fieldId="connectionName">
          <div data-test="san-connection-name">{t('SAN-based storage')}</div>
        </FormGroup>
        {!hasPersistentRegistryLoading &&
          !hasPersistentRegistryError &&
          !hasPersistentRegistry && (
            <ExternalRegistryFormSection
              control={control}
              fieldRequirements={fieldRequirements}
            />
          )}
        <FormGroup label={t('Select local cluster nodes')} isRequired>
          <NodesSection
            isDisabled={isLocalClusterConfigured}
            selectedNodes={componentState.selectedNodes}
            setSelectedNodes={(nodes) =>
              setComponentState((prev) => ({ ...prev, selectedNodes: nodes }))
            }
            allNodesDescription={t(
              'All non control plane nodes are selected to handle requests to IBM Scale'
            )}
            selectNodesDescription={t(
              'Select a minimum of 3 nodes to handle requests to IBM Scale'
            )}
          />
        </FormGroup>
      </FormSection>
      <FormSection title={t('LUN group details')}>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Select one or more of the shared LUNs accessible from all the selected local nodes above.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.lunGroupName}
          popoverProps={{
            headerContent: t('LUN group name requirements'),
            footerContent: `${t('Example')}: lun-group-a`,
          }}
          formGroupProps={{
            label: t('Name'),
            fieldId: 'lunGroupName',
            isRequired: true,
          }}
          textInputProps={{
            id: 'lunGroupName',
            name: 'lunGroupName',
            type: 'text',
            'data-test': 'lun-group-name',
          }}
        />
        <FormGroup label={t('LUNs')} isRequired>
          <LUNsTable
            luns={filteredSharedDevices}
            selectedLUNs={componentState.selectedLUNs}
            onLUNSelect={(selectedLUNs) =>
              setComponentState((prev) => ({ ...prev, selectedLUNs }))
            }
            loaded={!deviceFinderLoading}
          />
        </FormGroup>
      </FormSection>
      {!isFormValid && isSubmitted && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Address form errors to proceed')}
        />
      )}
      <ButtonBar errorMessage={error}>
        <ActionGroup className="pf-v5-c-form">
          <Button
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            isDisabled={loading || !isFormValid}
            isLoading={loading}
            data-test="connect-and-create-san-system"
            onClick={onCreate}
          >
            {t('Connect and create')}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            type={ButtonType.button}
            variant={ButtonVariant.secondary}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export const CreateSANSystem: React.FC = () => {
  const [componentState, setComponentState] =
    React.useState<SANSystemComponentState>(initialComponentState);
  const { t } = useCustomTranslation();

  return (
    <>
      <PageHeading
        title={t('Connect Storage Area Network')}
        hasUnderline={false}
        breadcrumbs={[
          {
            name: t('External Systems'),
            path: '/odf/external-systems',
          },
          {
            name: t('Connect Storage Area Network'),
            path: '/odf/external-systems/san/~create',
          },
        ]}
      >
        {t(
          'Use groups of shared LUNs from local cluster nodes to create StorageClasses with Fusion Data Foundation Access for SAN.'
        )}
      </PageHeading>
      <div className="odf-m-pane__body">
        <CreateSANSystemForm
          componentState={componentState}
          setComponentState={setComponentState}
        />
      </div>
    </>
  );
};

export default CreateSANSystem;
