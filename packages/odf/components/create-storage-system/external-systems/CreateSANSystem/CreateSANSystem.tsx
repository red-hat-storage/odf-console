import * as React from 'react';
import {
  PageHeading,
  useCustomTranslation,
  ButtonBar,
  TextInputWithFieldRequirements,
} from '@odf/shared';
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
import { createScaleLocalClusterPayload, labelNodes } from '../common/payload';
import { LUNsTable } from './LUNsTable';
import { SANSystemComponentState, initialComponentState, LUN } from './types';
import useSANSystemFormValidation from './useFormValidation';
import './CreateSANSystem.scss';

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

  const {
    fieldRequirements,
    control,
    handleSubmit,
    formState: { isSubmitted },
    watch,
    getValues,
  } = useSANSystemFormValidation();

  // Mock LUNs data - in real implementation, this would come from an API
  const [luns] = React.useState<LUN[]>([
    { name: 'vol_1', id: 'Content cell', capacity: 'Content cell' },
    { name: 'vol_2', id: 'Content cell', capacity: 'Content cell' },
    { name: 'vol_3', id: 'Content cell', capacity: 'Content cell' },
  ]);

  // Watch form fields
  const lunGroupName = watch('lunGroupName');

  const mandatoryFieldsValid = !!(
    lunGroupName &&
    componentState.selectedNodes.length > 0 &&
    componentState.selectedLUNs.size > 0
  );

  const isFormValid = mandatoryFieldsValid;

  const onCreate = React.useCallback(async () => {
    setLoading(true);
    setError('');
    getValues();

    try {
      if (!isLocalClusterConfigured) {
        await labelNodes(componentState.selectedNodes);
        await createScaleLocalClusterPayload(false);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentState, getValues, navigate, t]);

  return (
    <Form onSubmit={handleSubmit(onCreate)} isWidthLimited>
      <FormSection title={t('General configuration')}>
        <FormGroup label={t('Connection name')} fieldId="connectionName">
          <div data-test="san-connection-name">SAN-based storage</div>
        </FormGroup>
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
            footerContent: `${t('Example')}: LUN_groupA`,
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
            luns={luns}
            selectedLUNs={componentState.selectedLUNs}
            onLUNSelect={(selectedLUNs) =>
              setComponentState((prev) => ({ ...prev, selectedLUNs }))
            }
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
      {error && (
        <Alert variant="danger" title={t('Error')} isInline>
          {error}
        </Alert>
      )}
      <ButtonBar errorMessage={error}>
        <ActionGroup className="pf-v5-c-form">
          <Button
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            isDisabled={loading || !isFormValid}
            isLoading={loading}
            data-test="connect-and-create-san-system"
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
