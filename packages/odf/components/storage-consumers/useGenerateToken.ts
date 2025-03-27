import * as React from 'react';
import {
  SecretModel,
  StorageConsumerKind,
  StorageConsumerModel,
} from '@odf/shared';
import {
  k8sGet,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const useGetToken = (storageConsumer: StorageConsumerKind) => {
  const [secretName, setSecretName] = React.useState('');
  const [token, setToken] = React.useState('');

  const [resource, loaded] = useK8sWatchResource<StorageConsumerKind>(
    !_.isEmpty(storageConsumer)
      ? {
          groupVersionKind: {
            group: StorageConsumerModel.apiGroup,
            version: StorageConsumerModel.apiVersion,
            kind: StorageConsumerModel.kind,
          },
          isList: false,
          name: storageConsumer.metadata.name,
          namespace: storageConsumer.metadata.namespace,
        }
      : null
  );

  React.useEffect(() => {
    if (loaded && !token && resource?.status?.onboardingTicketSecret?.name) {
      setSecretName(resource.status.onboardingTicketSecret.name);
    }
  }, [resource, loaded, token]);

  React.useEffect(() => {
    if (secretName) {
      k8sGet({
        model: SecretModel,
        name: secretName,
        ns: storageConsumer.metadata.namespace,
      }).then((secret) => {
        const data = _.get(secret, 'data.token');
        if (data) {
          setToken(token);
        }
      });
    }
  });
  return token;
};

export default useGetToken;
