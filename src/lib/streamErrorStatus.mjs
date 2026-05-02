export function mapStreamErrorStatus(message) {
  const text = (message || '').toLowerCase();

  if (text.includes('invalid params')) return 400;

  if (text.includes('unable to resolve show')) return 404;
  if (text.includes('no sources for episode')) return 404;

  if (text.includes('catalog api')) return 502;
  if (text.includes('catalog request failed')) return 502;
  if (text.includes('resolved links empty')) return 502;

  return 500;
}
