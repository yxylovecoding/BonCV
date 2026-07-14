import { describe, expect, it } from 'vitest';
import { createFireProfile } from '@/lib/fire';
import type { CvEntry } from '@/lib/types';

const entry = (level: CvEntry['educationLevel'], status: CvEntry['educationStatus'], graduationDate: string | null): CvEntry => ({
  id: String(level), sectionId: 'education', title: '', organization: '', role: '', startDate: '', endDate: '', summary: '', highlights: [], meta: [],
  educationLevel: level, educationStatus: status, graduationDate,
});

describe('FIRE profile projection', () => {
  it('returns only the highest education data', () => {
    const profile = createFireProfile(12, '2026-07-14T00:00:00.000Z', '1998-01-01', [
      entry('bachelor', 'completed', '2025-06-30'),
      entry('master', 'in_progress', '2028-06-30'),
    ]);
    expect(profile).toEqual({
      schemaVersion: 1,
      revision: 12,
      updatedAt: '2026-07-14T00:00:00.000Z',
      birthDate: '1998-01-01',
      education: { level: 'master', status: 'in_progress', graduationDate: '2028-06-30' },
    });
    expect(profile).not.toHaveProperty('phone');
  });
});
