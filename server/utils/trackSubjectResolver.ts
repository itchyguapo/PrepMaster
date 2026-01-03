import { db } from "../db";
import { categories, subjects } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Track-Subject Resolution Logic
 * Critical business rule: Determines which subjects are valid for a given track
 */

export interface ResolvedSubject {
  id: string;
  name: string;
  code: string;
  description?: string;
  isRequired: boolean;
  order: number;
}

export interface TrackResolutionResult {
  track: {
    id: string;
    name: string;
    code: string;
    examBodyId: string;
  };
  subjects: ResolvedSubject[];
  totalSubjects: number;
  requiredSubjects: number;
}

/**
 * Resolve subjects for a given track
 * This is the core business logic for track → subject mapping
 */
export async function resolveSubjectsForTrack(trackId: string): Promise<TrackResolutionResult | null> {
  try {
    // Tracks were removed; treat trackId as categoryId
    const categoryRecords = await db
      .select()
      .from(categories)
      .where(eq(categories.id, trackId))
      .limit(1);

    if (categoryRecords.length === 0) {
      return null;
    }

    const category = categoryRecords[0];

    // Get subjects for this category
    const subjectRecords = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectDescription: subjects.description,
        categoryId: subjects.categoryId,
      })
      .from(subjects)
      .where(and(
        eq(subjects.categoryId, trackId),
        eq(subjects.examBodyId, category.examBodyId)
      ))
      .orderBy(subjects.name);

    // Transform to ResolvedSubject format
    const resolvedSubjects: ResolvedSubject[] = subjectRecords.map((s, idx) => ({
      id: s.subjectId,
      name: s.subjectName,
      code: s.subjectCode,
      description: s.subjectDescription || undefined,
      isRequired: false,
      order: idx,
    }));

    const requiredSubjects = 0;

    return {
      track: {
        id: category.id,
        name: category.name,
        code: category.name,
        examBodyId: category.examBodyId,
      },
      subjects: resolvedSubjects,
      totalSubjects: resolvedSubjects.length,
      requiredSubjects,
    };
  } catch (error) {
    console.error("[TRACK_RESOLVER] Error resolving subjects for track:", error);
    return null;
  }
}

/**
 * Get all tracks for an exam body with their subject counts
 */
export async function getTracksWithSubjectCounts(examBodyId: string) {
  try {
    const tracks = await db
      .select({
        id: categories.id,
        name: categories.name,
        subjectCount: sql<number>`COUNT(${subjects.id})`,
        requiredSubjectCount: sql<number>`0`,
      })
      .from(categories)
      .leftJoin(subjects, eq(categories.id, subjects.categoryId))
      .where(eq(categories.examBodyId, examBodyId))
      .groupBy(categories.id)
      .orderBy(categories.name);

    return tracks;
  } catch (error) {
    console.error("[TRACK_RESOLVER] Error getting tracks with subject counts:", error);
    return [];
  }
}

/**
 * Validate that a set of subjects is valid for a given track
 */
export async function validateSubjectsForTrack(trackId: string, subjectIds: string[]): Promise<{
  isValid: boolean;
  validSubjects: string[];
  invalidSubjects: string[];
  missingRequiredSubjects: string[];
}> {
  const resolution = await resolveSubjectsForTrack(trackId);

  if (!resolution) {
    return {
      isValid: false,
      validSubjects: [],
      invalidSubjects: subjectIds,
      missingRequiredSubjects: [],
    };
  }

  const trackSubjectIds = resolution.subjects.map(s => s.id);
  const requiredSubjectIds = resolution.subjects.filter(s => s.isRequired).map(s => s.id);

  const validSubjects = subjectIds.filter(id => trackSubjectIds.includes(id));
  const invalidSubjects = subjectIds.filter(id => !trackSubjectIds.includes(id));
  const missingRequiredSubjects = requiredSubjectIds.filter(id => !subjectIds.includes(id));

  return {
    isValid: invalidSubjects.length === 0 && missingRequiredSubjects.length === 0,
    validSubjects,
    invalidSubjects,
    missingRequiredSubjects,
  };
}

/**
 * Get subject IDs for a track (used for question filtering)
 */
export async function getSubjectIdsForTrack(trackId: string): Promise<string[]> {
  try {
    const subjectRecords = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.categoryId, trackId));

    return subjectRecords.map(s => s.id);
  } catch (error) {
    console.error("[TRACK_RESOLVER] Error getting subject IDs for track:", error);
    return [];
  }
}

/**
 * Get tracks that include a specific subject
 */
export async function getTracksForSubject(subjectId: string): Promise<Array<{
  id: string;
  name: string;
  code: string;
  examBodyId: string;
  isRequired: boolean;
}>> {
  try {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        examBodyId: categories.examBodyId,
      })
      .from(subjects)
      .innerJoin(categories, eq(subjects.categoryId, categories.id))
      .where(eq(subjects.id, subjectId))
      .limit(1);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.name,
      examBodyId: r.examBodyId,
      isRequired: false,
    }));
  } catch (error) {
    console.error("[TRACK_RESOLVER] Error getting tracks for subject:", error);
    return [];
  }
}
