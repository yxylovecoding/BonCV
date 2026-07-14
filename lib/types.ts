export type EducationLevel = 'none' | 'bachelor' | 'master' | 'doctor';
export type EducationStatus = 'completed' | 'in_progress';
export type SectionKind = 'education' | 'research' | 'competition' | 'experience' | 'skills' | 'custom';
export type ProfileField = 'headline' | 'phone' | 'email' | 'politicalStatus' | 'origin' | 'photo';

export interface CvProfile {
  name: string;
  headline: string[];
  phone: string;
  email: string;
  politicalStatus: string;
  origin: string;
  birthDate: string;
  photoUrl: string | null;
}

export interface CvEntry {
  id: string;
  sectionId: string;
  title: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  educationLevel?: EducationLevel;
  educationStatus?: EducationStatus;
  graduationDate?: string | null;
  summary: string;
  highlights: string[];
  meta: string[];
}

export interface CvSection {
  id: string;
  kind: SectionKind;
  title: string;
  order: number;
  entries: CvEntry[];
}

export interface ResumePreset {
  id: string;
  name: string;
  profileFields: ProfileField[];
  selectedEntryIds: string[];
  sectionOrder: string[];
  entryOrder: string[];
  includePhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeBuild {
  id: string;
  presetId: string;
  presetName: string;
  contentHash: string;
  createdAt: string;
  texPath: string;
  pdfPath: string | null;
  pageCount: number | null;
  status: 'ready' | 'tex_only' | 'failed';
  error?: string;
}

export interface IntegrationKey {
  id: string;
  label: string;
  prefix: string;
  secretHash: string;
  scopes: Array<'fire:read'>;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface PublicIntegrationKey extends Omit<IntegrationKey, 'secretHash'> {}

export interface BonCvState {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  profile: CvProfile;
  sections: CvSection[];
  presets: ResumePreset[];
  builds: ResumeBuild[];
  integrationKeys: IntegrationKey[];
}

export interface AdminState extends Omit<BonCvState, 'integrationKeys'> {
  integrationKeys: PublicIntegrationKey[];
}

export interface FireProfileResponse {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  birthDate: string;
  education: {
    level: EducationLevel;
    status: EducationStatus;
    graduationDate: string | null;
  };
}
