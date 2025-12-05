import { TFunction } from 'react-i18next';

export const maxChars = (t: TFunction, max: number) =>
  t('No more than {{max}} characters', { max });

export const minChars = (t: TFunction, min: number) =>
  t('No less than {{min}} characters', { min });

export const startAndEndName = (t: TFunction) =>
  t('Starts and ends with a lowercase letter or number');

export const alphaNumericPeriodAdnHyphen = (t: TFunction) =>
  t('Only lowercase letters, numbers, non-consecutive periods, or hyphens');

export const cannotBeUsedBefore = (t: TFunction) => t('Cannot be used before');

export const cannotBeUsedBeforeInNamespace = (t: TFunction) =>
  t('Cannot be used before within the same namespace');

export const uniqueName = (t: TFunction, fieldName: string) =>
  t('A unique name for the {{fieldName}} within the project', { fieldName });

export const cannotBeEmpty = (t: TFunction) => t('Cannot be empty');

export const fieldRequirementsTranslations = {
  maxChars,
  minChars,
  startAndEndName,
  alphaNumericPeriodAdnHyphen,
  cannotBeUsedBefore,
  cannotBeUsedBeforeInNamespace,
  uniqueName,
  cannotBeEmpty,
};
