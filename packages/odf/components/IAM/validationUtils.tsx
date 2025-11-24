export const validateKey = (key: string): string => {
  const allowedCharsRegex = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]+$/u;

  // Check all conditions
  const hasMinLengthError = key.length < 1;
  const hasMaxLengthError = key.length > 128;
  const hasInvalidChars = !allowedCharsRegex.test(key);

  // Return single comprehensive message listing ALL requirements if any error exists
  if (hasMinLengthError || hasMaxLengthError || hasInvalidChars) {
    return 'Key must be at least 1 character, cannot exceed 128 characters, and can only contain letters, numbers, spaces, and the following special characters: _ . : / = + - @';
  }

  return '';
};

export const validateValue = (value: string): string => {
  const allowedCharsRegex = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]*$/u;

  // Check all conditions
  const hasMaxLengthError = value.length > 256;
  const hasInvalidChars = value.length > 0 && !allowedCharsRegex.test(value);

  // Return single comprehensive message listing ALL requirements if any error exists
  if (hasMaxLengthError || hasInvalidChars) {
    return 'Value cannot exceed 256 characters and can only contain letters, numbers, spaces, and the following special characters: _ . : / = + - @';
  }

  return '';
};
