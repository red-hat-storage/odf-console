import { TFunction } from 'i18next';

export const MAX_ALLOWED_CLUSTERS = 2;
export const ODF_OPERATOR = 'odf-operator';

export const REPLICATION_TYPE = (t: TFunction) => ({
  async: t('plugin__odf-console~Asynchronous'),
  sync: t('plugin__odf-console~Synchronous'),
});
