export function shouldUseCssLandscapeFallback({
  enteredFullscreen,
  nativeFullscreenActive,
  viewportIsPortrait,
}) {
  if (!enteredFullscreen && !viewportIsPortrait) return false;
  if (nativeFullscreenActive) return false;
  return true;
}
