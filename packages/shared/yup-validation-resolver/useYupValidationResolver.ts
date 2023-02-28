import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Resolver } from 'react-hook-form';
import { AnySchema, ValidationError, setLocale } from 'yup';

export type ValidationErrorMessage = { type: string; field?: string };

export type ValidationErrorMessages = {
  type?: string;
  message?: string;
  messages?: Record<string, ValidationErrorMessage>;
};

const useYupValidationResolver = <T>(validationSchema: AnySchema): Resolver => {
  const { t } = useCustomTranslation();

  React.useEffect(() => {
    setLocale({
      mixed: {
        required: t('Required'),
      },
    });
  }, [t]);

  return React.useCallback(
    (data: T) =>
      validationSchema
        ?.validate(data, {
          abortEarly: false,
        })
        .then((values: T) => ({ values, errors: {} }))
        .catch((errors: any) => ({
          values: {},
          errors: errors?.inner?.reduce(
            (
              allErrors: Record<string, ValidationErrorMessages>,
              currentError: ValidationError
            ) => {
              return {
                ...allErrors,
                [currentError.path]: {
                  type: currentError.type ?? 'validation',
                  message: currentError.message,
                  messages: {
                    ...allErrors[currentError.path]?.messages,
                    [currentError.message]: {
                      type: currentError.type ?? 'validation',
                      field: currentError.path,
                    },
                  },
                },
              };
            },
            {}
          ),
        })),
    [validationSchema]
  );
};

export default useYupValidationResolver;
