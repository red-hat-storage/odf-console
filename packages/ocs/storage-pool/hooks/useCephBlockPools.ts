import * as React from 'react';
import { useSafeK8sList } from '@odf/core/hooks';
import { CephBlockPoolModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { StoragePoolKind } from '../../types';
import { getExistingBlockPoolNames } from '../../utils';

/**
 * Lists CephBlockPools in the namespace and derives existing pool names plus
 * `defaultDeviceClass` from the default block pool (`{clusterName}-cephblockpool`).
 */
export const useCephBlockPools = (
  clusterName: string | undefined,
  namespace?: string
) => {
  const [blockPools, blockPoolsLoaded, blockPoolsLoadError] =
    useSafeK8sList<StoragePoolKind>(CephBlockPoolModel, namespace);

  const defaultBlockPoolName = clusterName
    ? `${clusterName}-cephblockpool`
    : '';

  const [blockExistingNames, defaultDeviceClass] = React.useMemo(() => {
    let blockPoolNames: string[] = [];
    let deviceClass = '';
    if (blockPoolsLoaded && !blockPoolsLoadError && defaultBlockPoolName) {
      blockPoolNames = getExistingBlockPoolNames(blockPools);
      deviceClass =
        blockPools.find(
          (blockPool) => getName(blockPool) === defaultBlockPoolName
        )?.spec?.deviceClass || '';
    }
    return [blockPoolNames, deviceClass] as const;
  }, [blockPools, blockPoolsLoaded, blockPoolsLoadError, defaultBlockPoolName]);

  return {
    blockExistingNames,
    defaultDeviceClass,
    blockPoolsLoaded,
    blockPoolsLoadError,
  };
};
