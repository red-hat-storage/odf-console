/** JSON.stringify(Error) is '{}' (message/stack are non-enumerable); k8s rejections hide text under json.message. */
export const getThrownMessage = (error: unknown): string => {
  const candidates: unknown[] = [
    (error as { message?: unknown })?.message,
    (error as { json?: { message?: unknown } })?.json?.message,
    (error as { response?: { data?: { message?: unknown } } })?.response?.data
      ?.message,
  ];
  const message = candidates.find(
    (value) => typeof value === 'string' && value.trim().length
  );
  return (message as string) ?? (error ? String(error) : '');
};
