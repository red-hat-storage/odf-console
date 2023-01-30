import * as React from 'react';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as Yup from 'yup';
import { NooBaaObjectBucketClaimModel } from '../../models';
import validationRegEx from '../../utils/validation';

export type UseObcBaseSchema = {
  obcNameSchema: Yup.ObjectSchema<{ obcName: Yup.StringSchema }>;
  fieldRequirements: string[];
};

const useObcNameSchema = (namespace?: string): UseObcBaseSchema => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] = useK8sList(
    NooBaaObjectBucketClaimModel,
    namespace
  );

  return React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((data) => getName(data)) : [];

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const obcNameSchema = Yup.object({
      obcName: Yup.string()
        .max(253, fieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[2]
        )
        .test(
          'unique-name',
          fieldRequirements[3],
          (value: string) => !existingNames.includes(value)
        )
        .notRequired()
        .transform((value: string) => (!!value ? value : undefined)),
    });

    return { obcNameSchema, fieldRequirements };
  }, [data, loadError, loaded, t]);
};

export default useObcNameSchema;
