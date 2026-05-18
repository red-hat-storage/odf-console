import { SECOND } from '@odf/core/constants';
import { FeatureDetector } from '@odf/core/features';
import {
  CustomResourceDefinitionModel,
  NooBaaObjectBucketClaimModel,
  NooBaaObjectBucketModel,
} from '@odf/shared/models';
import { CustomResourceDefinitionKind } from '@odf/shared/types';
import { k8sList, SetFeatureFlag } from '@openshift-console/dynamic-plugin-sdk';

export { default } from '@odf/core/redux';
export * from '@odf/core/redux';

export const OB_OBC_CRD_EXISTS = 'OB_OBC_CRD_EXISTS';

export const detectObObcCrds: FeatureDetector = async (
  setFlag: SetFeatureFlag
) => {
  let intervalId = null;

  const detector = async () => {
    try {
      const crds = (await k8sList({
        model: CustomResourceDefinitionModel,
        queryParams: { ns: null },
      })) as CustomResourceDefinitionKind[];

      const obcCrd = crds?.filter(
        (crd) => crd.spec.names.kind === NooBaaObjectBucketClaimModel.kind
      );
      const obCrd = crds?.filter(
        (crd) => crd.spec.names.kind === NooBaaObjectBucketModel.kind
      );

      if (obcCrd?.length > 0 && obCrd?.length > 0) {
        setFlag(OB_OBC_CRD_EXISTS, true);
        clearInterval(intervalId);
      } else {
        setFlag(OB_OBC_CRD_EXISTS, false);
      }
    } catch (_error) {
      setFlag(OB_OBC_CRD_EXISTS, false);
    }
  };

  detector();
  intervalId = setInterval(detector, 15 * SECOND);
};
