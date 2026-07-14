import type { CvEntry, EducationLevel, FireProfileResponse } from './types';

const rank: Record<EducationLevel, number> = { none: 0, bachelor: 1, master: 2, doctor: 3 };

export function highestEducation(entries: CvEntry[]) {
  return entries
    .filter((entry) => entry.educationLevel)
    .sort((a, b) => rank[b.educationLevel ?? 'none'] - rank[a.educationLevel ?? 'none'])[0];
}

export function createFireProfile(revision: number, updatedAt: string, birthDate: string, entries: CvEntry[]): FireProfileResponse {
  const education = highestEducation(entries);
  return {
    schemaVersion: 1,
    revision,
    updatedAt,
    birthDate,
    education: {
      level: education?.educationLevel ?? 'none',
      status: education?.educationStatus ?? 'completed',
      graduationDate: education?.graduationDate ?? null,
    },
  };
}
