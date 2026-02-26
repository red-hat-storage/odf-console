import * as React from 'react';
import { NOOBAA_PROVISIONER } from '@odf/core/constants';
import { NooBaaObjectBucketClaimModel } from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import * as Yup from 'yup';
import { State } from './state';

export type UseObcBaseSchema = {
  obcFormSchema: Yup.ObjectSchema<{
    obcName: Yup.StringSchema;
    'sc-dropdown': Yup.StringSchema;
    bucketclass: Yup.StringSchema;
  }>;
  fieldRequirements: string[];
};

const useObcFormSchema = (
  namespace: string,
  state: State,
  isClient: boolean = false
): UseObcBaseSchema => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] = useK8sList(
    NooBaaObjectBucketClaimModel,
    namespace
  );

  return React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((dataItem) => getName(dataItem)) : [];

    const isNoobaa = state.scProvisioner?.includes(NOOBAA_PROVISIONER);

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBeforeInNamespace(t),
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

    const obcFormSchema = Yup.object({
      'sc-dropdown': Yup.string().required(),
      bucketclass: Yup.string().when('sc-dropdown', {
        is: (value: string) => !!value && isNoobaa && !isClient,
        then: (schema: Yup.StringSchema) => schema.required(),
      }),
    }).concat(obcNameSchema);

    return {
      obcFormSchema:
        obcFormSchema as unknown as UseObcBaseSchema['obcFormSchema'],
      fieldRequirements,
    };
  }, [data, isClient, loadError, loaded, state.scProvisioner, t]);
};

export default useObcFormSchema;
