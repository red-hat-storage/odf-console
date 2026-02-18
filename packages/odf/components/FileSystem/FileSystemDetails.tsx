import * as React from 'react';
import { SAN_STORAGE_SYSTEM_NAME } from '@odf/core/constants';
import { FileSystemKind } from '@odf/core/types/scale';
import { DetailsPage, FileSystemModel, getName, Kebab } from '@odf/shared';
import { ResourceSummary } from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ResourceYAMLEditor,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';

type FileSystemDetailsProps = {
  obj: FileSystemKind;
};

const FileSystemDetails: React.FC<FileSystemDetailsProps> = (props) => {
  const { obj } = props;
  const { t } = useCustomTranslation();
  return (
    <div className="odf-m-pane__body">
      <SectionHeading
        text={t('{{resource}} details', { resource: FileSystemModel.label })}
      />
      <div className="row">
        <div className="col-sm-6">
          <ResourceSummary resource={obj} resourceModel={FileSystemModel} />
        </div>
      </div>
    </div>
  );
};

const YAMLEditor: React.FC<FileSystemDetailsProps> = (props) => {
  const { obj } = props;
  return <ResourceYAMLEditor initialResource={obj} />;
};

export const FileSystemDetailsPage: React.FC = () => {
  const { t } = useCustomTranslation();
  const { name, namespace } = useParams();
  const [resource, loaded, loadError] = useK8sWatchResource<FileSystemKind>({
    groupVersionKind: {
      group: FileSystemModel.apiGroup,
      version: FileSystemModel.apiVersion,
      kind: FileSystemModel.kind,
    },
    namespace: namespace,
    name,
  });

  // Check if this is a SAN FileSystem (has local spec and no remote spec)
  const isSANFileSystem =
    resource?.spec?.local && _.isEmpty(resource?.spec?.remote);

  const customKebabItems = React.useMemo(() => {
    if (!isSANFileSystem) {
      return undefined;
    }
    return [
      {
        key: 'DELETE',
        value: t('Delete LUN group'),
        component: React.lazy(
          () => import('../../modals/lun-group/DeleteLUNModal')
        ),
      },
    ];
  }, [isSANFileSystem, t]);

  const actions = React.useCallback(() => {
    return (
      <Kebab
        toggleType="Dropdown"
        extraProps={{
          resource,
          resourceModel: FileSystemModel,
          namespace,
        }}
        customKebabItems={customKebabItems}
      />
    );
  }, [resource, namespace, customKebabItems]);

  const breadcrumbs = [
    {
      name: t('External systems'),
      path: '/odf/external-systems',
    },
    {
      name: SAN_STORAGE_SYSTEM_NAME,
      path: `/odf/external-systems/scale.spectrum.ibm.com~v1beta1~cluster/${SAN_STORAGE_SYSTEM_NAME}`,
    },
    {
      name: resource ? getName(resource) : '',
      path: '',
    },
  ];

  return (
    <DetailsPage
      loaded={loaded}
      loadError={loadError}
      resource={resource}
      resourceModel={FileSystemModel}
      actions={actions}
      breadcrumbs={breadcrumbs}
      pages={[
        {
          href: '',
          name: t('Details'),
          component: FileSystemDetails,
        },
        {
          href: 'yaml',
          name: t('YAML'),
          component: YAMLEditor,
        },
      ]}
    />
  );
};

export default FileSystemDetailsPage;
