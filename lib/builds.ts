import type { ResumeBuild } from './types';

export function keepRecentBuilds(builds: ResumeBuild[], limitPerPreset = 20) {
  const counts = new Map<string, number>();
  return builds.filter((build) => {
    const count = counts.get(build.presetId) ?? 0;
    if (count >= limitPerPreset) return false;
    counts.set(build.presetId, count + 1);
    return true;
  });
}
