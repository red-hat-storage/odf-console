const DASH_PREFIX = '/odf/system';

export const getDashboardLink = (systemKind: string, systemName: string) =>
  `${DASH_PREFIX}/${systemKind}/${systemName}`;
