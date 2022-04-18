import { ODF_MINIMUM_SUPPORT  } from '../constants/dr-policy';

export const isMinimumSupportedODFVersion = (odfVersion: string): boolean =>
    odfVersion.localeCompare(ODF_MINIMUM_SUPPORT, undefined, { numeric: true, sensitivity: 'base' }) >= 0 
