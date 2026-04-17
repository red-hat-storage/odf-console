import * as React from 'react';
import { DISCOVERED_APP_NS } from '@odf/mco/constants';
import { getDRPlacementControlResourceObj } from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { DRPolicyModel } from '@odf/shared';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sList } from '@odf/shared/hooks';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import validationRegEx from '@odf/shared/utils/validation';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useForm } from 'react-hook-form';
import { TFunction } from 'react-i18next';
import * as Yup from 'yup';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  FormSection,
  Content,
  ContentVariants,
  FormHelperText,
  HelperText,
  HelperTextItem,
  SelectOption,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import { NamespaceSelectionTable } from './namespace-table';
import './namespace-step.scss';

const getDRClusterFromPolicies = (drPolicies: DRPolicyKind[]): string[] => {
  // Only DRCluster names will be displayed for the selection.
  const drClusters: string[] = [];
  drPolicies?.forEach((policy) => drClusters.push(...policy.spec.drClusters));
  return [...new Set(drClusters)];
};

const clusterOptions = (clusters: string[]): JSX.Element[] =>
  clusters?.map((cluster) => (
    <SelectOption
      id={cluster}
      key={cluster}
      data-test="cluster-dropdown-item"
      value={cluster}
    >
      {cluster}
    </SelectOption>
  ));

const getInputValidationSchema = (t: TFunction, existingNames: string[]) => {
  const fieldRequirements = [
    fieldRequirementsTranslations.maxChars(t, 63),
    fieldRequirementsTranslations.startAndEndName(t),
    fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    fieldRequirementsTranslations.cannotBeUsedBefore(t),
  ];

  const schema = Yup.object({
    'name-input': Yup.string()
      .required()
      .max(63, fieldRequirements[0])
      .matches(
        validationRegEx.startAndEndsWithAlphanumerics,
        fieldRequirements[1]
      )
      .matches(
        validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
        fieldRequirements[2]
      )
      .test(
        'unique-name',
        fieldRequirements[3],
        (value: string) => !existingNames.includes(value)
      ),
  });

  return { schema, fieldRequirements };
};

export const NameInput: React.FC<NameInputProps> = ({
  name,
  drPlacements,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      drPlacements
        ?.filter((drpc) => getNamespace(drpc) === DISCOVERED_APP_NS)
        .map(getName) || [];
    return getInputValidationSchema(t, existingNames);
  }, [drPlacements, t]);

  const resolver = useYupValidationResolver(schema);
  const {
    control,
    watch,
    formState: { isValid },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const newName: string = watch('name-input');

  React.useEffect(
    () =>
      dispatch({
        type: EnrollDiscoveredApplicationStateType.SET_NAME,
        payload: isValid ? newName : '',
      }),
    [newName, isValid, dispatch]
  );

  return (
    <TextInputWithFieldRequirements
      control={control}
      fieldRequirements={fieldRequirements}
      defaultValue={name}
      popoverProps={{
        headerContent: t('Name requirements'),
        footerContent: `${t('Example')}: my-name`,
      }}
      formGroupProps={{
        className: 'pf-v6-u-w-50',
        label: t('Name'),
        fieldId: 'name-input',
        isRequired: true,
      }}
      textInputProps={{
        id: 'name-input',
        name: 'name-input',
        placeholder: t('Enter a unique name'),
        'data-test': 'discovered-app-group-name',
        'aria-label': t('Name input'),
      }}
      helperText={t(
        'A unique identifier for ACM discovered applications from selected namespaces.'
      )}
    />
  );
};

export const NamespaceSelection: React.FC<NamespaceSelectionProps> = ({
  state,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const [drPolicies, policyloaded, policyLoadError] =
    useK8sList<DRPolicyKind>(DRPolicyModel);

  const [drPlacements, drpcLoaded, drpcLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj());

  const loaded = policyloaded && drpcLoaded;
  const loadError = policyLoadError || drpcLoadError;

  const { clusterName, namespaces, name } = state.namespace;
  const clusterNameHelperText = t(
    'Select a DRCluster to choose your namespace.'
  );
  const noClusterHelperText = t('No DR cluster found');

  const drClusters = getDRClusterFromPolicies(drPolicies);

  const clusterNamevalidated = getValidatedProp(
    (isValidationEnabled && !clusterName) || !drClusters.length
  );

  const setSelectedClusterName = (selectedClusterName: string) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_CLUSTER_NAME,
      payload: selectedClusterName,
    });
  };

  return loaded && !loadError ? (
    <Form maxWidth="58rem">
      <FormSection title={t('Namespace selection')}>
        <Content component={ContentVariants.small}>
          {t(
            'Enable disaster recovery protection by selecting the namespaces of your ACM discovered application.'
          )}
        </Content>
        <FormGroup
          className="pf-v6-u-w-50"
          label={t('DR cluster')}
          fieldId="managed-cluster-selection"
          isRequired
        >
          <SingleSelectDropdown
            id="managed-cluster-dropdown"
            placeholderText={t('Select cluster')}
            selectedKey={clusterName}
            selectOptions={clusterOptions(drClusters)}
            onChange={setSelectedClusterName}
            validated={clusterNamevalidated}
            isDisabled={!drClusters.length}
          />

          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={clusterNamevalidated}>
                {!drClusters.length
                  ? noClusterHelperText
                  : clusterNameHelperText}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup
          label={t('Namespace')}
          fieldId="multi-namespace-selection"
          isRequired
        >
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="default">
                {t(
                  'Select namespaces that belongs to your ACM discovered applications.'
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <Alert
            className="odf-alert pf-v6-u-mt-sm"
            title={t(
              'Once you select namespaces, applications regardless of their type, within those namespaces cannot be subsequently enrolled separately under disaster recovery protection.'
            )}
            variant={AlertVariant.info}
            isInline
          />
          <NamespaceSelectionTable
            namespaces={namespaces}
            clusterName={clusterName}
            policies={drPolicies}
            drPlacements={drPlacements}
            isValidationEnabled={isValidationEnabled}
            dispatch={dispatch}
          />
        </FormGroup>
        <NameInput
          name={name}
          drPlacements={drPlacements}
          dispatch={dispatch}
        />
      </FormSection>
    </Form>
  ) : (
    <StatusBox loaded={loaded} loadError={loadError} />
  );
};

type NamespaceSelectionProps = {
  state: EnrollDiscoveredApplicationState;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};

type NameInputProps = {
  name: string;
  drPlacements: DRPlacementControlKind[];
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
