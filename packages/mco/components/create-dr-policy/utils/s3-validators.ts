export const isValidEndpoint = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidBucketName = (name: string): boolean => {
  if (name.length < 3 || name.length > 63) return false;
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) return false;
  if (/\.\./.test(name)) return false;
  if (/(\.-|-\.)/.test(name)) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return false;
  return true;
};

export const isValidS3ProfileName = (name: string): boolean =>
  /^[a-zA-Z0-9_-]+$/.test(name);
