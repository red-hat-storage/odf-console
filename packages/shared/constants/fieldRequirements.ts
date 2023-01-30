import { TFunction } from 'i18next';

export const maxChars = (t: TFunction, max: number) =>
  t(`No more than ${max} characters`);

export const startAndEndName = (t: TFunction) =>
  t('Starts and ends with a lowercase letter or number');

export const alphaNumericPeriodAdnHyphen = (t: TFunction) =>
  t('Only lowercase letters, numbers, non-consecutive periods, or hyphens');

export const cannotBeUsedBefore = (t: TFunction) => t('Cannot be used before');

export const uniqueName = (t: TFunction, fieldName: string) =>
  t(`A unique name for the ${fieldName} within the project`);

export const fieldRequirementsTranslations = {
  maxChars,
  startAndEndName,
  alphaNumericPeriodAdnHyphen,
  cannotBeUsedBefore,
  uniqueName,
};
