import { useSelector } from 'react-redux';

export const storageClusterReducerName = 'storagecluster';

const getStorageClusterName = (state): string | null => {
  // console.log('getStorageClusterName');
  // console.log('getStorageClusterName');
  // console.log(state);
  // console.log('getStorageClusterName');
  // console.log('getStorageClusterName');
  return (
    state.plugins?.odfConsole?.[storageClusterReducerName]
      ?.storageClusterName || null
  );
};

export const useStorageClusterNameSelector = (): string | null => {
  const selector = useSelector(getStorageClusterName);
  return selector;
};
