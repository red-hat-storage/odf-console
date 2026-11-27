import { MirrorPeerKind } from '@odf/mco/types';

export const findMirrorPeerForPair = (
  clusterPair: [string, string],
  mirrorPeers: MirrorPeerKind[]
): MirrorPeerKind | undefined => {
  const [c1, c2] = clusterPair.slice().sort();
  return mirrorPeers.find((mp) => {
    const peerClusters = (mp.spec?.items ?? [])
      .map((item) => item.clusterName)
      .sort();
    return (
      peerClusters.length === 2 &&
      peerClusters[0] === c1 &&
      peerClusters[1] === c2
    );
  });
};
