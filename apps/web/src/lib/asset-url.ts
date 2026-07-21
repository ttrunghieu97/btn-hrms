export function toProtectedAssetUrl(value: string) {
  if (value.startsWith('/files/')) {
    return `/api${value}`;
  }

  return value;
}

export function extractProtectedAssetUrl(value: unknown) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return toProtectedAssetUrl(value);
  }

  if (!value || typeof value !== 'object') return undefined;

  const candidates = Object.values(value).filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );

  const assetUrl = candidates.find(
    (item) =>
      item.startsWith('http://') ||
      item.startsWith('https://') ||
      item.startsWith('/') ||
      item.startsWith('blob:')
  );

  return assetUrl ? toProtectedAssetUrl(assetUrl) : undefined;
}
