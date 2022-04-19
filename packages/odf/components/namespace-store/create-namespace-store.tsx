import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { getName } from '@odf/shared/selectors';
import { referenceForModel } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, useHistory } from 'react-router';
import { Title } from '@patternfly/react-core';
import { ODF_MODEL_FLAG } from '../../features';
import { NooBaaNamespaceStoreModel } from '../../models';
import NamespaceStoreForm from './namespace-store-form';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const CreateNamespaceStore: React.FC<CreateNamespaceStoreProps> = ({
  match,
}) => {
  const { t } = useTranslation();
  const { ns = CEPH_STORAGE_NAMESPACE, appName } = match.params;

  const history = useHistory();
  const onCancel = () => history.goBack();

  const isODF = useFlag(ODF_MODEL_FLAG);

  return (
    <>
      <div className="co-create-operand__header">
        <Title
          size="2xl"
          headingLevel="h1"
          className="co-create-operand__header-text"
        >
          {t('Create NamespaceStore ')}
        </Title>
        <p className="help-block">
          {t(
            'Represents an underlying storage to be used as read or write target for the data in the namespace buckets.'
          )}
        </p>
      </div>
      <NamespaceStoreForm
        onCancel={onCancel}
        redirectHandler={(resources) => {
          const lastIndex = resources.length - 1;
          const resourcePath = `${referenceForModel(
            NooBaaNamespaceStoreModel
          )}/${getName(resources[lastIndex])}`;
          isODF
            ? history.push(`/odf/resource/${resourcePath}`)
            : history.push(
                `/k8s/ns/${ns}/clusterserviceversions/${appName}/${resourcePath}`
              );
        }}
        namespace={ns}
        className="nb-endpoints-page-form__short"
      />
    </>
  );
};

type CreateNamespaceStoreProps = RouteComponentProps<{
  ns: string;
  appName: string;
}>;

export default CreateNamespaceStore;
