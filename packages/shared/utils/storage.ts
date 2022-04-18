import { ClusterServiceVersionKind } from '@odf/shared/types';
import { ODF_OPERATOR  } from '../constants';

export const getODFCsv = (csvList: ClusterServiceVersionKind[] = []) =>
csvList.find((csv) => csv?.metadata.name?.substring(0, ODF_OPERATOR.length) === ODF_OPERATOR);
