import * as React from 'react';
import { CopyToClipboard } from '@odf/shared/utils/copy-to-clipboard';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Base64 } from 'js-base64';
import { Button } from '@patternfly/react-core';
import { EyeSlashIcon, EyeIcon } from '@patternfly/react-icons';
import { EmptyBox } from '../generic/status-box';
import { SectionHeading } from '../heading/page-heading';
import { ConfigMapModel, SecretModel } from '../models';
import { getName, getNamespace } from '../selectors';
import { ConfigMapKind, K8sResourceKind, SecretKind } from '../types';
import { useCustomTranslation } from '../useCustomTranslationHook';

type SecretValueProps = {
  value: string;
  encoded?: boolean;
  reveal: boolean;
};

export const MaskedData: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  return (
    <>
      <span className="sr-only">{t('Value hidden')}</span>
      <span aria-hidden="true">&bull;&bull;&bull;&bull;&bull;</span>
    </>
  );
};

export const SecretValue: React.FC<SecretValueProps> = ({
  value,
  reveal,
  encoded = true,
}) => {
  const { t } = useCustomTranslation();
  if (!value) {
    return <span className="text-muted">{t('No value')}</span>;
  }

  const decodedValue = encoded ? Base64.decode(value) : value;
  const visibleValue = reveal ? decodedValue : <MaskedData />;
  return <CopyToClipboard value={decodedValue} visibleValue={visibleValue} />;
};

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
          <dt key={`${field}-k`} data-test="secret-data">
            {field}
          </dt>
        );
        acc.push(
          <dd key={`${field}-v`}>
            <SecretValue value={value} reveal={reveal} encoded={false} />
          </dd>
        );
        return acc;
      }, [])
    : [];

  return dl.length ? (
    <div className="co-m-pane__body">
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
                <EyeSlashIcon className="co-icon-space-r" />
                {t('Hide Values')}
              </>
            ) : (
              <>
                <EyeIcon className="co-icon-space-r" />
                {t('Reveal Values')}
              </>
            )}
          </Button>
        ) : null}
      </SectionHeading>
      {dl.length ? (
        <dl className="secret-data">{dl}</dl>
      ) : (
        <EmptyBox label={t('Data')} />
      )}
    </div>
  ) : null;
};

type GetSecretProps = {
  obj: K8sResourceKind;
};
