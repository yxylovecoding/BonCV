import { z } from 'zod';

const shortText = z.string().max(240);
const longText = z.string().max(4_000);
const id = z.string().min(1).max(160);

const profileSchema = z.object({
  name: shortText,
  headline: z.array(shortText).max(12),
  phone: shortText,
  email: shortText,
  politicalStatus: shortText,
  origin: shortText,
  birthDate: shortText,
  photoUrl: z.string().max(2_000).nullable(),
}).strict();

const entrySchema = z.object({
  id,
  sectionId: id,
  title: shortText,
  organization: shortText,
  role: shortText,
  startDate: shortText,
  endDate: shortText,
  educationLevel: z.enum(['none', 'bachelor', 'master', 'doctor']).optional(),
  educationStatus: z.enum(['completed', 'in_progress']).optional(),
  graduationDate: shortText.nullable().optional(),
  summary: longText,
  highlights: z.array(longText).max(80),
  meta: z.array(shortText).max(40),
}).strict();

const sectionSchema = z.object({
  id,
  kind: z.enum(['education', 'research', 'competition', 'experience', 'skills', 'custom']),
  title: shortText,
  order: z.number().int().min(0).max(1_000),
  entries: z.array(entrySchema).max(120),
}).strict();

const entryOverrideSchema = z.object({
  title: shortText.optional(),
  role: shortText.optional(),
  summary: longText.optional(),
  highlights: z.array(longText).max(80).optional(),
}).strict();

const presetSchema = z.object({
  id,
  name: shortText,
  profileFields: z.array(z.enum(['headline', 'phone', 'email', 'politicalStatus', 'origin', 'photo'])).max(6),
  selectedEntryIds: z.array(id).max(500),
  sectionOrder: z.array(id).max(120),
  entryOrder: z.array(id).max(500),
  entryOverrides: z.record(id, entryOverrideSchema).default({}),
  includePhoto: z.boolean(),
  createdAt: shortText,
  updatedAt: shortText,
}).strict();

export const stateUpdateSchema = z.object({
  expectedRevision: z.number().int().min(0).optional(),
  profile: profileSchema,
  sections: z.array(sectionSchema).max(120),
  presets: z.array(presetSchema).max(80),
}).strict();
