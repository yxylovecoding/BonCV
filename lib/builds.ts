import type { ResumeBuild } from './types';

export interface ResumeBuildGroup {
  presetId: string;
  presetName: string;
  builds: ResumeBuild[];
}

export function keepRecentBuilds(builds: ResumeBuild[], limitPerPreset = 20) {
  const counts = new Map<string, number>();
  return builds.filter((build) => {
    const count = counts.get(build.presetId) ?? 0;
    if (count >= limitPerPreset) return false;
    counts.set(build.presetId, count + 1);
    return true;
  });
}

export function groupBuildsByPreset(builds: ResumeBuild[]) {
  const groups = new Map<string, ResumeBuildGroup>();
  builds.forEach((build) => {
    const group = groups.get(build.presetId);
    if (group) group.builds.push(build);
    else groups.set(build.presetId, { presetId: build.presetId, presetName: build.presetName, builds: [build] });
  });
  return [...groups.values()];
}
