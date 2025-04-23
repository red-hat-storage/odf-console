import * as React from 'react';
import { EmptyBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { SecretModel, ConfigMapModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { SecretKind, ConfigMapKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { SecretValue } from '@odf/shared/utils/SecretValue';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Base64 } from 'js-base64';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import '../../style.scss';

export const GetSecret: React.FC<GetSecretProps> = ({ obj }) => {
  const { t } = useCustomTranslation();
  const [reveal, setReveal] = React.useState(false);

  const name = getName(obj);
  const namespace = getNamespace(obj);

  const [secretResource, cmResource] = React.useMemo(
    () => [
      {
        kind: SecretModel.kind,
        namespace,
        name,
        isList: false,
      },
      {
        kind: ConfigMapModel.kind,
        namespace,
        name,
        isList: false,
      },
    ],
    [name, namespace]
  );

  const [secretData, secretLoaded, secretLoadError] =
    useK8sWatchResource<SecretKind>(secretResource);

  const [configData, configLoaded, configLoadError] =
    useK8sWatchResource<ConfigMapKind>(cmResource);
  const isLoaded = secretLoaded && configLoaded;
  const error = secretLoadError || configLoadError;
  const bucketName = configData?.data?.BUCKET_NAME;
  const endpoint = `${configData?.data?.BUCKET_HOST}:${configData?.data?.BUCKET_PORT}`;
  const accessKey =
    isLoaded && !error
      ? Base64.decode(secretData?.data?.AWS_ACCESS_KEY_ID)
      : '';
  const secretKey =
    isLoaded && !error
      ? Base64.decode(secretData?.data?.AWS_SECRET_ACCESS_KEY)
      : '';

  const secretValues =
    isLoaded && !error
      ? [
          { field: 'Endpoint', value: endpoint },
          { field: 'Bucket Name', value: bucketName },
          { field: 'Access Key', value: accessKey },
          { field: 'Secret Key', value: secretKey },
        ]
      : [];

  const dl = secretValues.length
    ? secretValues.reduce((acc, datum) => {
        const { field, value } = datum;
        acc.push(
          <DescriptionListGroup>
            <DescriptionListTerm key={`${field}-k`} data-test="secret-data">
              {field}
            </DescriptionListTerm>
            <DescriptionListDescription key={`${field}-v`}>
              <SecretValue value={value} reveal={reveal} encoded={false} />
            </DescriptionListDescription>
          </DescriptionListGroup>
        );

        return acc;
      }, [])
    : [];

  return dl.length ? (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Object Bucket Claim Data')}>
        {secretValues.length ? (
          <Button
            type="button"
            onClick={() => setReveal(!reveal)}
            variant="link"
            className="pf-m-link--align-right"
          >
            {reveal ? (
              <>
                <EyeSlashIcon className="odf-icon-space-r" />
                {t('Hide Values')}
              </>
            ) : (
              <>
                <EyeIcon className="odf-icon-space-r" />
                {t('Reveal Values')}
              </>
            )}
          </Button>
        ) : null}
      </SectionHeading>
      {dl.length ? (
        <DescriptionList className="secret-data">{dl}</DescriptionList>
      ) : (
        <EmptyBox label={t('Data')} />
      )}
    </div>
  ) : null;
};

type GetSecretProps = {
  obj: K8sResourceKind;
};
