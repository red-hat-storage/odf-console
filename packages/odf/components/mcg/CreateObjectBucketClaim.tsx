import * as React from 'react';
import { BucketClassKind, ObjectBucketClaimKind } from '@odf/core/types';
import {
  createNewObjectBucketClaim,
  createNewSingleNamespaceBucketClass,
  generateGenericName,
  getStorageClassDescription,
} from '@odf/core/utils';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import ResourcesDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StorageClassModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind, StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel, resourcePathFromModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import { match, useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import {
  ActionGroup,
  Button,
  Checkbox,
  TextVariants,
  Text,
} from '@patternfly/react-core';
import {
  NooBaaObjectBucketClaimModel,
  NooBaaBucketClassModel,
} from '../../models';
import { ReplicationPolicyForm, Rule } from './replication-policy-form';
import {
  Action,
  commonReducer,
  defaultState,
  OBCReplicationRules,
  ReplicationResources,
  ReplicationRuleFormData,
  State,
} from './state';
import './create-obc.scss';
import '../../style.scss';

type CreateOBCFormProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
  namespace?: string;
};

export const NB_PROVISIONER = 'noobaa.io/obc';

const objectStorageProvisioners = [
  'openshift-storage.noobaa.io/obc',
  'openshift-storage.ceph.rook.io/bucket',
];

export const isObjectSC = (sc: StorageClassResourceKind) =>
  objectStorageProvisioners.includes(_.get(sc, 'provisioner'));

const createReplicationRulesAndStringify = (
  data: ReplicationRuleFormData[],
  namespace: string
): string => {
  const rules: Array<OBCReplicationRules> = data.map((rule) => ({
    ruleId: `rule-${rule.ruleNumber}`,
    obName: `obc-${namespace}-${generateGenericName(
      rule.namespaceStore,
      'destination-bucket'
    )}`,
    filter: {
      prefix: rule.prefix,
    },
  }));
  return rules ? JSON.stringify(rules) : '';
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
  const { state, dispatch, namespace } = props;
  const isNoobaa = state.scProvisioner?.includes(NB_PROVISIONER);

  const onScChange = (sc) => {
    dispatch({ type: 'setStorage', name: getName(sc) });
    dispatch({ type: 'setProvisioner', name: sc?.provisioner });
  };

  const [replicationEnabled, toggleReplication] = React.useState(false);
  const updateReplicationPolicy = (rules: Rule[]) => {
    let rulesFormData: Array<ReplicationRuleFormData> = [];
    rules.forEach((rule) => {
      if (rule.namespaceStore)
        rulesFormData.push({
          ruleNumber: rule.id,
          namespaceStore: rule.namespaceStore,
          prefix: rule.prefix,
        });
    });
    dispatch({ type: 'setReplicationRuleFormData', data: rulesFormData });
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
          namespace
        );
        obj.spec.additionalConfig = { 'replication-policy': replicationPolicy };
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
  ]);

  const storageClassResource = {
    kind: StorageClassModel.kind,
    namespaced: false,
    isList: true,
  };

  const bucketClassResource = {
    kind: referenceForModel(NooBaaBucketClassModel),
    namespaced: true,
    isList: true,
    namespace: 'openshift-storage',
  };

  return (
    <div>
      <div className="form-group">
        <label className="control-label" htmlFor="obc-name">
          {t('ObjectBucketClaim Name')}
        </label>
        <div className="form-group">
          <input
            className="pf-c-form-control"
            type="text"
            onChange={(e) =>
              dispatch({ type: 'setName', name: e.currentTarget.value.trim() })
            }
            value={state.name}
            placeholder={t('my-object-bucket')}
            aria-describedby="obc-name-help"
            id="obc-name"
            data-test="obc-name"
            name="obcName"
            pattern="[a-z0-9](?:[-a-z0-9]*[a-z0-9])?"
          />
          <p className="help-block" id="obc-name-help">
            {t('If not provided a generic name will be generated.')}
          </p>
        </div>
        <div className="form-group">
          <label className="control-label" htmlFor="sc-dropdown">
            {t('StorageClass')}
          </label>
          <div className="form-group">
            <ResourcesDropdown<StorageClassResourceKind>
              resourceModel={StorageClassModel}
              onSelect={(res) => onScChange(res)}
              filterResource={isObjectSC}
              className="odf-mcg__resource-dropdown"
              id="sc-dropdown"
              data-test="sc-dropdown"
              resource={storageClassResource}
              secondaryTextGenerator={getStorageClassDescription}
            />
            <p className="help-block">
              {t(
                'Defines the object-store service and the bucket provisioner.'
              )}
            </p>
          </div>
        </div>
        {isNoobaa && (
          <div className="form-group">
            <label className="control-label odf-required" htmlFor="obc-name">
              {t('BucketClass')}
            </label>
            <div className="form-group">
              <ResourceDropdown<K8sResourceKind>
                onSelect={(sc) =>
                  dispatch({ type: 'setBucketClass', name: sc.metadata?.name })
                }
                className="odf-mcg__resource-dropdown"
                initialSelection={(resources) =>
                  resources.find(
                    (res) => res.metadata.name === 'noobaa-default-bucket-class'
                  )
                }
                id="bc-dropdown"
                data-test="bc-dropdown"
                resource={bucketClassResource}
                resourceModel={NooBaaBucketClassModel}
              />
            </div>
            <div className="form-group">
              <Text component={TextVariants.h1}>{t('Replication Policy')}</Text>
              <p className="help-block">
                {t(
                  'For higher resiliency, set a replication configuration for objects which are stored in NooBaa namespace buckets'
                )}
              </p>
            </div>
            <div className="form-group">
              <Checkbox
                id="enable-replication"
                label="Enable replication"
                isChecked={replicationEnabled}
                onChange={() => {
                  // if this checkbox is disabled, then on this point we purge the contents of replication form data
                  if (replicationEnabled)
                    dispatch({ type: 'setReplicationRuleFormData', data: [] });
                  toggleReplication(!replicationEnabled);
                }}
              />
            </div>
            {replicationEnabled && (
              <ReplicationPolicyForm
                className="form-group"
                namespace={namespace}
                updateParentState={updateReplicationPolicy}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const CreateOBCPage: React.FC<CreateOBCPageProps> = (props) => {
  const { t } = useCustomTranslation();
  const [state, dispatch] = React.useReducer(commonReducer, defaultState);
  const namespace = props.match.params.ns;

  const history = useHistory();

  const save = (e: React.FormEvent<EventTarget>) => {
    e.preventDefault();
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

            history.push(
              `${resourcePathFromModel(
                NooBaaObjectBucketClaimModel,
                resource.metadata.name,
                resource.metadata.namespace
              )}`
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

  return (
    <div className="odf-m-pane__body odf-m-pane__form">
      <Helmet>
        <title>{t('Create ObjectBucketClaim')}</title>
      </Helmet>
      <h1 className="odf-m-pane__heading odf-m-pane__heading--baseline">
        <div>{t('Create ObjectBucketClaim')}</div>
        <div className="odf-m-pane__heading--link">
          <Link
            to={`${resourcePathFromModel(
              NooBaaObjectBucketClaimModel,
              null,
              namespace
            )}/~new`}
            replace
          >
            {t('Edit YAML')}
          </Link>
        </div>
      </h1>
      <form className="odf-m-pane__body-group" onSubmit={save}>
        <CreateOBCForm
          state={state}
          dispatch={dispatch}
          namespace={namespace}
        />
        <ButtonBar errorMessage={state.error} inProgress={state.progress}>
          <ActionGroup className="pf-c-form">
            <Button type="submit" variant="primary" data-test="obc-create">
              {t('Create')}
            </Button>
            <Button onClick={history.goBack} type="button" variant="secondary">
              {t('Cancel')}
            </Button>
          </ActionGroup>
        </ButtonBar>
      </form>
    </div>
  );
};

type CreateOBCPageProps = {
  match: match<{ ns?: string }>;
};
