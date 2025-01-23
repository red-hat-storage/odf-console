import * as React from 'react';
import {
  K8sModel,
  ResourceYAMLEditor,
  k8sUpdate,
  OwnerReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { safeLoad } from 'js-yaml';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { Alert } from '@patternfly/react-core';
import { DetailsPageTitle } from '../details-page/DetailsPage';
import { LoadingBox } from '../generic/status-box';
import PageHeading from '../heading/page-heading';
import { useK8sGet } from '../hooks/k8s-get-hook';
import { ClusterServiceVersionModel } from '../models';
import { ClusterServiceVersionKind, ListKind } from '../types/console-types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { groupVersionFor, findOwner } from '../utils';
import { AsyncLoader } from '../utils/AsyncLoader';
import './YAMLEditor.scss';
import '../style.scss';

type YAMLEditorProps = {
  model: K8sModel;
  sourceObj: K8sResourceCommon;
  setSourceObj: React.Dispatch<React.SetStateAction<K8sResourceCommon>>;
  cluster?: string;
};

const validate = (t: TFunction, obj: K8sResourceCommon, model: K8sModel) => {
  if (!obj?.apiVersion) {
    return t('No "apiVersion" field found in YAML.');
  }

  if (!obj?.kind) {
    return t('No "kind" field found in YAML.');
  }

  if (!obj?.metadata) {
    return t('No "metadata" field found in YAML.');
  }

  if (obj?.metadata?.namespace && !model?.namespaced) {
    delete obj?.metadata?.namespace;
  }

  if (!obj?.metadata?.namespace && model?.namespaced) {
    return t('No "metadata.namespace" field found in YAML.');
  }
};

const ManagedResourceSaveModal = (props) => (
  <AsyncLoader
    loader={() =>
      import('../modals/ManagedResourceSaveModal').then((c) => c.default)
    }
    {...props}
  />
);

const YAMLEditor: React.FC<YAMLEditorProps> = ({
  model,
  sourceObj,
  setSourceObj,
  cluster,
}) => {
  const { t } = useCustomTranslation();
  const [state, setState] = React.useState({
    errors: null,
    success: null,
  });
  const [isOpen, setOpen] = React.useState(false);
  const [owner, setOwner] = React.useState<OwnerReference>();
  const [newObj, setNewObj] = React.useState<K8sResourceCommon>();

  const [csvList, csvLoaded, csvLoadError] = useK8sGet<
    ListKind<ClusterServiceVersionKind>
  >(ClusterServiceVersionModel, null, sourceObj?.metadata?.namespace, cluster);

  React.useEffect(() => {
    if (csvList && csvLoaded && !csvLoadError) {
      setOwner(findOwner(sourceObj, csvList?.items));
    }
  }, [csvList, csvLoaded, csvLoadError, setOwner, sourceObj]);

  const handleError = (error, success = null) => {
    setState({ ...state, errors: _.isEmpty(error) ? null : [error], success });
  };
  const onClose = () => {
    setOpen(false);
  };

  const updateYAML = (obj, k8sModel, newNamespace, newName) => {
    setState({ ...state, success: null, errors: null });
    k8sUpdate({
      model: k8sModel,
      name: newName,
      ns: newNamespace,
      data: obj,
      ...(!!cluster ? { cluster } : {}),
    })
      .then((o) => {
        const success = t(
          '{{newName}} has been updated to version {{version}}',
          {
            newName,
            version: o.metadata.resourceVersion,
          }
        );
        setState({ ...state, success, errors: null });
        setSourceObj(o);
      })
      .catch((e) => {
        handleError(e.message);
      });
  };

  const onSave = (content: string) => {
    let obj: K8sResourceCommon;
    try {
      obj = safeLoad(content);
      setNewObj(obj);
    } catch (e) {
      handleError(t('Error parsing YAML: {{e}}', { e }));
      return;
    }
    const error = validate(t, obj, model);
    if (error) {
      handleError(error);
      return;
    }
    const { namespace: newNamespace, name: newName } = obj.metadata;
    if (obj) {
      const { namespace, name } = sourceObj.metadata;
      if (name !== newName) {
        handleError(
          t(
            'Cannot change resource name (original: "{{name}}", updated: "{{newName}}").',
            { name, newName }
          )
        );
        return;
      }
      if (namespace !== newNamespace) {
        handleError(
          t(
            'Cannot change resource namespace (original: "{{namespace}}", updated: "{{newNamespace}}").',
            { namespace, newNamespace }
          )
        );
        return;
      }
      if (sourceObj.kind !== obj.kind) {
        handleError(
          t(
            'Cannot change resource kind (original: "{{original}}", updated: "{{updated}}").',
            { original: sourceObj.kind, updated: obj.kind }
          )
        );
        return;
      }
      const apiGroup = groupVersionFor(sourceObj.apiVersion).group;
      const newAPIGroup = groupVersionFor(obj.apiVersion).group;
      if (apiGroup !== newAPIGroup) {
        handleError(
          t(
            'Cannot change API group (original: "{{apiGroup}}", updated: "{{newAPIGroup}}").',
            { apiGroup, newAPIGroup }
          )
        );
        return;
      }
      if (owner) {
        setOpen(true);
        return;
      }
      updateYAML(obj, model, newNamespace, newName);
    }
  };

  return csvLoaded && !csvLoadError ? (
    <>
      <React.Suspense fallback={LoadingBox}>
        <PageHeading
          title={
            <DetailsPageTitle resource={sourceObj} resourceModel={model} />
          }
        />
        <ResourceYAMLEditor initialResource={sourceObj} onSave={onSave} />
        {state.errors && (
          <Alert
            isInline
            className="odf-alert odf-alert--scrollable odf-yaml-editor"
            variant="danger"
            title={t('An error occurred')}
          >
            <div className="odf-pre-line">{state.errors.join('\n')}</div>
          </Alert>
        )}
        {state.success && (
          <Alert
            isInline
            className="odf-alert odf-yaml-editor"
            variant="success"
            title={state.success}
          />
        )}
      </React.Suspense>
      {owner && (
        <ManagedResourceSaveModal
          isOpen={isOpen}
          closeModal={onClose}
          extraProps={{
            onSubmit: () =>
              updateYAML(
                newObj,
                model,
                newObj?.metadata?.namespace,
                newObj?.metadata?.name
              ),
            owner,
            resource: sourceObj,
          }}
        />
      )}
    </>
  ) : (
    <LoadingBox />
  );
};

export default YAMLEditor;
