export function shouldAutoHideControls({ isPlaying, isTouchDevice }) {
  return isPlaying || isTouchDevice;
}

export function getControlsVisibility({ showControls, isPlaying, isTouchDevice }) {
  if (showControls) return true;

  if (!isPlaying && !isTouchDevice) {
    return true;
  }

  return false;
}

export function getSurfaceTapAction({ showControls }) {
  return showControls ? 'hide-controls' : 'show-controls';
}

export function getSkipTimelineSegments({ duration, skipTimes }) {
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(skipTimes)) {
    return [];
  }

  const segments = [];

  for (const item of skipTimes) {
    const startTime = Number(item?.startTime);
    const endTime = Number(item?.endTime);

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) continue;
    if (startTime < 0 || endTime <= startTime) continue;

    const startPercent = Math.max(0, Math.min((startTime / duration) * 100, 100));
    const endPercent = Math.max(0, Math.min((endTime / duration) * 100, 100));
    const widthPercent = endPercent - startPercent;

    if (widthPercent <= 0) continue;

    segments.push({
      type: item.type === 'ed' ? 'ed' : 'op',
      startPercent,
      widthPercent,
    });
  }

  return segments;
}

export function shouldAutoSkipSegment({ segmentType, autoSkipIntro, autoSkipOutro }) {
  if (segmentType === 'op') return autoSkipIntro;
  if (segmentType === 'ed') return autoSkipOutro;
  return false;
}

export function getAutoNextCountdown({ autoNextEnabled, nextEpisodePath, duration, currentTime, isPlaying }) {
  if (!autoNextEnabled || !nextEpisodePath || !isPlaying) return null;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (!Number.isFinite(currentTime)) return null;

  const remaining = duration - currentTime;
  if (remaining > 5 || remaining <= 0) return null;

  return Math.ceil(remaining);
}

export function shouldTriggerAutoNext({ autoNextEnabled, nextEpisodePath, duration, currentTime }) {
  if (!autoNextEnabled || !nextEpisodePath) return false;
  if (!Number.isFinite(duration) || duration <= 0) return false;
  if (!Number.isFinite(currentTime)) return false;

  return currentTime >= duration - 0.5;
}

export function getTapAction({ nowMs, previousTapMs, thresholdMs = 280 }) {
  if (previousTapMs !== null && nowMs - previousTapMs <= thresholdMs) {
    return { nextTapMs: null, action: 'toggle-playback' };
  }

  return { nextTapMs: nowMs, action: 'surface-controls' };
}

export function getVideoTapIntent({ nowMs, previousTapMs, thresholdMs = 280 }) {
  return getTapAction({ nowMs, previousTapMs, thresholdMs });
}
