import * as React from 'react';
import { StorageType, SecretRef } from '../types';

type S3LoginProps = {
  onLogin: (secretRef: SecretRef, storageType: StorageType) => void;
  logout: () => void;
};

export const S3Login: React.FC<S3LoginProps> = () => {
  // const [secretName, setSecretName] = React.useState('');
  // const [secretNamespace, setSecretNamespace] = React.useState('');
  // const [storageType, setStorageType] = React.useState<StorageType>(
  //   StorageType.Session
  // );

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (secretName.trim() && secretNamespace.trim()) {
  //     logout();
  //     onLogin(
  //       { name: secretName.trim(), namespace: secretNamespace.trim() },
  //       storageType
  //     );
  //   }
  // };

  // ToDo: Placeholder, fix this
  return null;
};
