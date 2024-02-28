import * as React from 'react';
import { BucketClassKind, ObjectBucketClaimKind } from '@odf/core/types';
import {
  createNewObjectBucketClaim,
  createNewSingleNamespaceBucketClass,
  generateGenericName,
  getStorageClassDescription,
} from '@odf/core/utils';
import { formSettings, DEFAULT_NS } from '@odf/shared/constants';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import ResourcesDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { StorageClassModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, ALL_NAMESPACES_KEY } from '@odf/shared/utils';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import {
  getAPIVersionForModel,
  k8sCreate,
  NamespaceBar,
  useActiveNamespace,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import { Control, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom-v5-compat';
import * as Yup from 'yup';
import {
  ActionGroup,
  Button,
  Checkbox,
  TextVariants,
  Text,
  Form,
  FormGroup,
  Alert,
} from '@patternfly/react-core';
import NamespaceSafetyBox from '../../components/utils/safety-box';
import {
  NooBaaObjectBucketClaimModel,
  NooBaaBucketClassModel,
} from '../../models';
import { useODFNamespaceSelector } from '../../redux';
import { isObjectSC } from '../../utils';
import { ReplicationPolicyForm, Rule } from './replication-policy-form';
import {
  Action,
  commonReducer,
  defaultState,
  OBCReplicationRules,
  ReplicationResources,
  ReplicationRuleFormData,
  State,
  LogReplicationInfo,
  OBCLogReplicationInfo,
} from './state';
import './create-obc.scss';
import '../../style.scss';
import useObcNameSchema from './useObcNameSchema';

const storageClassResource = {
  kind: StorageClassModel.kind,
  namespaced: false,
  isList: true,
};

const bucketClassResource = (ns: string) => ({
  kind: referenceForModel(NooBaaBucketClassModel),
  namespaced: true,
  isList: true,
  namespace: ns,
});

type CreateOBCFormProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
  namespace?: string;
  control: Control;
  fieldRequirements: string[];
};

export const NB_PROVISIONER = 'noobaa.io/obc';

const createReplicationRulesAndStringify = (
  data: ReplicationRuleFormData[],
  namespace: string,
  logReplicationInfo: LogReplicationInfo
): string => {
  const rules: Array<OBCReplicationRules> = data.map((rule) => ({
    ruleId: `rule-${rule.ruleNumber}`,
    destination_bucket: `obc-${namespace}-${generateGenericName(
      rule.namespaceStore,
      'destination-bucket'
    )}`,
    filter: {
      prefix: rule.prefix,
    },
    sync_deletions: rule.syncDeletion,
  }));

  const log_replication_info: OBCLogReplicationInfo = !_.isEmpty(
    logReplicationInfo
  )
    ? {
        logs_location: {
          logs_bucket: logReplicationInfo.logLocation,
          prefix: logReplicationInfo.logPrefix,
        },
      }
    : { logs_location: { logs_bucket: null, prefix: null } };

  return rules
    ? JSON.stringify({ rules: [...rules], log_replication_info })
    : '';
};

const generateAdditionalReplicationResources = (
  state: State,
  namespace: string
): Array<ReplicationResources> => {
  return state.replicationRuleFormData.map((rule) => {
    const bc = createNewSingleNamespaceBucketClass(
      generateGenericName(rule.namespaceStore, 'generic-bucketclass'),
      namespace,
      rule.namespaceStore
    );
    const obc = createNewObjectBucketClaim(
      generateGenericName(rule.namespaceStore, 'destination-bucket'),
      namespace,
      getName(bc),
      state.scName
    );
    const res: ReplicationResources = {
      bucketClass: bc as BucketClassKind,
      objectBucketClaim: obc as ObjectBucketClaimKind,
    };
    return res;
  });
};

export const CreateOBCForm: React.FC<CreateOBCFormProps> = (props) => {
  const { t } = useCustomTranslation();
  const { state, dispatch, namespace, control, fieldRequirements } = props;
  const isNoobaa = state.scProvisioner?.includes(NB_PROVISIONER);

  const { odfNamespace } = useODFNamespaceSelector();

  const onScChange = (sc, setScName: (value: string) => void) => {
    const scName = getName(sc);
    setScName(scName);
    dispatch({ type: 'setStorage', name: scName });
    dispatch({ type: 'setProvisioner', name: sc?.provisioner });
  };

  const [replicationEnabled, toggleReplication] = React.useState(false);

  const updateReplicationPolicy = (
    rules: Rule[],
    logReplicationInfo?: LogReplicationInfo
  ) => {
    let rulesFormData: Array<ReplicationRuleFormData> = [];
    rules.forEach((rule) => {
      if (rule.namespaceStore)
        rulesFormData.push({
          ruleNumber: rule.id,
          namespaceStore: rule.namespaceStore,
          prefix: rule.prefix,
          syncDeletion: rule.syncDeletion,
        });
    });
    dispatch({ type: 'setReplicationRuleFormData', data: rulesFormData });
    if (
      !_.isEmpty(logReplicationInfo) ||
      !rules.some((rule) => rule.syncDeletion)
    ) {
      dispatch({
        type: 'setLogReplicationInfo',
        data: { ...logReplicationInfo },
      });
    }
  };

  React.useEffect(() => {
    const obj: K8sResourceKind = {
      apiVersion: getAPIVersionForModel(NooBaaObjectBucketClaimModel),
      kind: NooBaaObjectBucketClaimModel.kind,
      metadata: {
        namespace,
      },
      spec: {
        ssl: false,
      },
    };
    if (state.scName) {
      obj.spec.storageClassName = state.scName;
    }
    if (state.name) {
      obj.metadata.name = state.name;
      obj.spec.generateBucketName = state.name;
    } else {
      obj.metadata.generateName = 'bucketclaim-';
      obj.spec.generateBucketName = 'bucket-';
    }
    if (state.bucketClass && isNoobaa) {
      if (!!state.replicationRuleFormData.length) {
        const replicationPolicy = createReplicationRulesAndStringify(
          state.replicationRuleFormData,
          namespace,
          state.logReplicationInfo
        );
        obj.spec.additionalConfig = { replication_policy: replicationPolicy };
      }
      obj.spec.additionalConfig = {
        ...obj.spec.additionalConfig,
        bucketclass: state.bucketClass,
      };
    }
    dispatch({ type: 'setPayload', payload: obj });
  }, [
    namespace,
    state.name,
    state.scName,
    state.bucketClass,
    isNoobaa,
    dispatch,
    state.replicationRuleFormData,
    state.logReplicationInfo,
  ]);

  const onChangeReplication = React.useCallback(() => {
    // if this checkbox is disabled, then on this point we purge the contents of replication form data
    if (replicationEnabled)
      dispatch({
        type: 'setReplicationRuleFormData',
        data: [],
      });
    toggleReplication(!replicationEnabled);
  }, [replicationEnabled, dispatch]);

  const filterResource = React.useCallback(
    (sc: StorageClassResourceKind) => isObjectSC(sc, odfNamespace),
    [odfNamespace]
  );

  return (
    <>
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-object-bucket`,
        }}
        formGroupProps={{
          label: t('ObjectBucketClaim Name'),
          fieldId: 'obc-name',
          className: 'control-label',
        }}
        textInputProps={{
          id: 'obc-name',
          name: 'obcName',
          className: 'pf-c-form-control',
          type: 'text',
          placeholder: t('my-object-bucket'),
          'aria-describedby': 'obc-name-help',
          'data-test': 'obc-name',
        }}
        helperText={t('If not provided a generic name will be generated.')}
      />
      <FormGroupController
        name="sc-dropdown"
        control={control}
        formGroupProps={{
          fieldId: 'sc-dropdown',
          label: t('StorageClass'),
          helperText: t(
            'Defines the object-store service and the bucket provisioner.'
          ),
          isRequired: true,
        }}
        render={({ onChange, onBlur }) => (
          <ResourcesDropdown<StorageClassResourceKind>
            resourceModel={StorageClassModel}
            onSelect={(res) => onScChange(res, onChange)}
            onBlur={onBlur}
            filterResource={filterResource}
            className="odf-mcg__resource-dropdown"
            id="sc-dropdown"
            data-test="sc-dropdown"
            resource={storageClassResource}
            secondaryTextGenerator={getStorageClassDescription}
          />
        )}
      />
      {isNoobaa && (
        <>
          <FormGroupController
            name="bucketclass"
            control={control}
            formGroupProps={{
              label: t('BucketClass'),
              isRequired: true,
            }}
            render={({ onChange, onBlur }) => (
              <ResourceDropdown<K8sResourceKind>
                onSelect={(sc) => {
                  onChange(sc.metadata?.name);
                  dispatch({
                    type: 'setBucketClass',
                    name: sc.metadata?.name,
                  });
                }}
                onBlur={onBlur}
                className="odf-mcg__resource-dropdown"
                initialSelection={(resources) =>
                  resources.find(
                    (res) => res.metadata.name === 'noobaa-default-bucket-class'
                  )
                }
                id="bc-dropdown"
                data-test="bc-dropdown"
                resource={bucketClassResource(odfNamespace)}
                resourceModel={NooBaaBucketClassModel}
              />
            )}
          />
          {isNoobaa && (
            <>
              <FormGroup>
                <Checkbox
                  id="enable-replication"
                  label={t('Enable replication')}
                  isChecked={replicationEnabled}
                  description={t(
                    'This option provides higher resiliency of objects stored in NooBaa buckets'
                  )}
                  onChange={onChangeReplication}
                />
              </FormGroup>
            </>
          )}
          {replicationEnabled && (
            <>
              <FormGroup>
                <Text component={TextVariants.h2}>
                  {t('Replication policy')}
                </Text>
              </FormGroup>
              <ReplicationPolicyForm
                className="form-group"
                namespace={namespace}
                updateParentState={updateReplicationPolicy}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

export const CreateOBCPage: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer(commonReducer, defaultState);
  const [namespace, setNamespace] = useActiveNamespace();
  const isAllProjectsInitially = React.useRef<boolean>(
    namespace === ALL_NAMESPACES_KEY
  );
  const initialNamespace = React.useRef<string>(namespace);
  const submitBtnId = 'obc-submit-btn';
  const navigate = useNavigate();
  const isNoobaa = state.scProvisioner?.includes(NB_PROVISIONER);
  const { obcNameSchema, fieldRequirements } = useObcNameSchema(namespace);

  const schema = Yup.object({
    'sc-dropdown': Yup.string().required(),
    bucketclass: Yup.string().when('sc-dropdown', {
      is: (value: string) => !!value && isNoobaa,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
  }).concat(obcNameSchema);

  const resolver = useYupValidationResolver(schema);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitted },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const obcName: string = watch('obcName');

  React.useEffect(() => {
    dispatch({ type: 'setName', name: obcName });
  }, [obcName, dispatch]);

  /**
   * In OCP, for any creation page: on changing the project from the dropdown,
   * user is redirected back to the list page, added "() => navigate(-1)" to maintain that consistency.
   * Also, if initial selection is "All Projects", it automatically re-selects "default" as the initial project.
   */
  React.useEffect(() => {
    if (isAllProjectsInitially.current) {
      setNamespace(DEFAULT_NS);
      initialNamespace.current = DEFAULT_NS;
      isAllProjectsInitially.current = false;
    } else if (initialNamespace.current !== namespace) {
      navigate(
        `/odf/object-storage/${referenceForModel(NooBaaObjectBucketClaimModel)}`
      );
    }
  }, [navigate, namespace, setNamespace]);

  const save = (
    _unused: any,
    e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) => {
    e.preventDefault();

    // NamespaceStore modal's submit is triggering this form as well, added this check to prevent that
    if (e.nativeEvent.submitter.id !== submitBtnId) return;

    dispatch({ type: 'setProgress' });
    const promises: Promise<K8sResourceKind>[] = [];
    if (!!state.replicationRuleFormData.length) {
      const additionalResources = generateAdditionalReplicationResources(
        state,
        namespace
      );

      additionalResources.forEach((res) => {
        promises.push(
          k8sCreate<K8sResourceKind>({
            model: NooBaaBucketClassModel,
            data: res.bucketClass,
          })
        );

        promises.push(
          k8sCreate<K8sResourceKind>({
            model: NooBaaObjectBucketClaimModel,
            data: res.objectBucketClaim,
          })
        );
      });
    }
    Promise.all(promises)
      .then(() => {
        k8sCreate<K8sResourceKind>({
          model: NooBaaObjectBucketClaimModel,
          data: state.payload,
        })
          .then((resource) => {
            dispatch({ type: 'unsetProgress' });
            const resourcePath = `${referenceForModel(
              NooBaaObjectBucketClaimModel
            )}/${resource.metadata.name}`;
            navigate(
              `/odf/resource/ns/${resource.metadata.namespace}/${resourcePath}`
            );
          })
          .catch((err) => {
            dispatch({ type: 'setError', message: err.message });
            dispatch({ type: 'unsetProgress' });
          });
      })
      .catch((err) => {
        dispatch({ type: 'setError', message: err.message });
        dispatch({ type: 'unsetProgress' });
      });
  };

  // Operator install namespace is determined using Subscriptions, which non-admin can not access.
  // Using "allowFallback" in "NamespaceSafetyBox" so that they can default to "openshift-storage" (if case of access issues),
  // which is current use case as well (as we do not officially support UI if ODF is installed in any other Namespace).
  // ToDo (Sanjal): Update the non-admin "Role" to a "ClusterRole", then read list of NooBaa/BucketClasses across all namespaces.
  return (
    <>
      <NamespaceBar />
      <div className="odf-m-pane__body odf-m-pane__form">
        <Helmet>
          <title>{t('Create ObjectBucketClaim')}</title>
        </Helmet>
        <h1 className="odf-m-pane__heading odf-m-pane__heading--baseline">
          <div>{t('Create ObjectBucketClaim')}</div>
        </h1>
        <NamespaceSafetyBox allowFallback>
          <Form onSubmit={handleSubmit(save)}>
            <CreateOBCForm
              state={state}
              dispatch={dispatch}
              namespace={namespace}
              control={control}
              fieldRequirements={fieldRequirements}
            />
            {!isValid && isSubmitted && (
              <Alert
                variant="danger"
                isInline
                title={t('Address form errors to proceed')}
              />
            )}
            <ButtonBar errorMessage={state.error} inProgress={state.progress}>
              <ActionGroup className="pf-c-form">
                <Button
                  id={submitBtnId}
                  type="submit"
                  variant="primary"
                  data-test="obc-create"
                >
                  {t('Create')}
                </Button>
                <Button
                  onClick={() => navigate(-1)}
                  type="button"
                  variant="secondary"
                >
                  {t('Cancel')}
                </Button>
              </ActionGroup>
            </ButtonBar>
          </Form>
        </NamespaceSafetyBox>
      </div>
    </>
  );
};
