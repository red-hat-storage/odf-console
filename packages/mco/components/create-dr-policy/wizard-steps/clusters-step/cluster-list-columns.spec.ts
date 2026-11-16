import { StorageVendorId } from '@odf/mco/constants';
import { ManagedClusterInfoType } from '@odf/mco/types';
import { getAvailableVendors } from '@odf/mco/utils/storage-vendor-registry';
import { isRowSelectable } from './cluster-list-columns';

const cluster = (
  name: string,
  { odf = false, scale = false, other = false } = {}
) =>
  ({
    metadata: { name },
    storageProviders: {
      odf: odf ? {} : undefined,
      scale: scale ? {} : undefined,
    },
    odfInfo: { isValidODFVersion: odf },
    providers: other ? [{ displayName: 'ebs.csi.aws.com', count: 1 }] : [],
  }) as ManagedClusterInfoType;

const df = cluster('df', { odf: true });
const scale = cluster('scale', { scale: true });
const dfOther = cluster('df-other', { odf: true, other: true });
const scaleOther = cluster('scale-other', { scale: true, other: true });
const none = cluster('none');

const vendorIds = (clusters: ManagedClusterInfoType[]) =>
  getAvailableVendors(clusters).map((v) => v.descriptor.id);

describe('isRowSelectable', () => {
  it('disables clusters without any provider', () => {
    expect(isRowSelectable(none, [])).toBe(false);
    expect(isRowSelectable(df, [])).toBe(true);
  });

  it('enables only clusters that share a provider with the selection', () => {
    expect(isRowSelectable(dfOther, [df])).toBe(true);
    expect(isRowSelectable(scale, [df])).toBe(false);
    expect(isRowSelectable(scaleOther, [dfOther])).toBe(true);
  });

  it('keeps selected clusters selectable and caps the pair at two', () => {
    expect(isRowSelectable(df, [df, dfOther])).toBe(true);
    expect(isRowSelectable(cluster('df-2', { odf: true }), [df, dfOther])).toBe(
      false
    );
  });
});

describe('getAvailableVendors', () => {
  it('offers only the providers configured on both clusters', () => {
    expect(vendorIds([df, dfOther])).toEqual([StorageVendorId.DataFoundation]);
    expect(vendorIds([dfOther, scaleOther])).toEqual([StorageVendorId.Generic]);
    expect(vendorIds([df, scale])).toEqual([]);
  });
});
