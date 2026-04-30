import { PoolType } from '../constants/storage-pool-const';
import {
  createStoragePool,
  deleteStoragePool,
  navigateToStoragePoolList,
  showAvailablePoolsInSCForm,
  verifyBlockPoolJSON,
} from '../helpers/storage-pool';

describe('Storage Pool', () => {
  beforeEach(() => {
    navigateToStoragePoolList();
  });

  it('should create a block storage pool', () => {
    createStoragePool(PoolType.BLOCK, 'test-block-pool');
    verifyBlockPoolJSON('test-block-pool');
  });

  it('should create a filesystem storage pool', () => {
    createStoragePool(PoolType.FILESYSTEM, 'test-fs-pool');
  });

  it('should show available pools in SC form', () => {
    showAvailablePoolsInSCForm(PoolType.BLOCK);
  });

  it('should delete a storage pool', () => {
    deleteStoragePool('test-block-pool');
  });
});
