import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, bigint, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  supabaseId: varchar("supabase_id").unique(), // Supabase auth user ID
  emailConfirmed: boolean("email_confirmed").default(false), // Email confirmation status
  role: text("role", { enum: ["student", "tutor", "admin"] }).default("student"),
  subscriptionStatus: text("subscription_status", { enum: ["basic", "standard", "premium", "expired"] }).default("basic"),
  dailyQuotaUsed: integer("daily_quota_used").default(0),
  lastQuotaReset: timestamp("last_quota_reset", { withTimezone: true }),
  activeGeneratedExams: integer("active_generated_exams").default(0), // Cached count
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  preferredExamBody: text("preferred_exam_body"), // For Basic plan: WAEC or JAMB (user chooses one)
  isBanned: boolean("is_banned").default(false), // Admin can ban users
  bannedAt: timestamp("banned_at", { withTimezone: true }), // When user was banned
  bannedReason: text("banned_reason"), // Reason for ban
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Exam attempts (offline-first sync)
export const attempts = pgTable("attempts", {
  id: varchar("id").primaryKey(),
  examId: text("exam_id").notNull(),
  userId: varchar("user_id"), // optional until auth is wired
  tenantId: varchar("tenant_id"), // optional multi-tenant placeholder
  answers: jsonb("answers").$type<Record<string | number, string>>().notNull(),
  startedAt: bigint("started_at", { mode: "number" }),
  completedAt: bigint("completed_at", { mode: "number" }),
  durationSeconds: integer("duration_seconds"),
  totalQuestions: integer("total_questions"),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertAttemptSchema = createInsertSchema(attempts);
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attempts.$inferSelect;

// Question data versions (keep latest payload per tenant)
export const questionDataVersions = pgTable("question_data_versions", {
  id: varchar("id").primaryKey().default("global"),
  tenantId: varchar("tenant_id").default("global"),
  version: bigint("version", { mode: "number" }).notNull(),
  payload: jsonb("payload").$type<{
    examBodies: any[];
    categories: any[];
    subjects: any[];
    questions: any[];
    updatedAt?: number;
  }>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertQuestionDataVersionSchema = createInsertSchema(questionDataVersions);
export type InsertQuestionDataVersion = z.infer<typeof insertQuestionDataVersionSchema>;
export type QuestionDataVersion = typeof questionDataVersions.$inferSelect;

// Exam Bodies (WAEC, NECO, JAMB, etc.)
export const examBodies = pgTable("exam_bodies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertExamBodySchema = createInsertSchema(examBodies).pick({ name: true });
export type InsertExamBody = z.infer<typeof insertExamBodySchema>;
export type ExamBody = typeof examBodies.$inferSelect;

// Exam Types (WASSCE, SSCE, UTME, etc.)
export const examTypes = pgTable("exam_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(), // e.g., "WASSCE", "SSCE", "UTME"
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  durationMinutes: integer("duration_minutes").notNull(),
  rules: jsonb("rules").$type<{
    questionCount: number;
    subjectsRequired: number;
    passingScore?: number;
    randomizationEnabled: boolean;
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertExamTypeSchema = createInsertSchema(examTypes).pick({
  name: true,
  code: true,
  examBodyId: true,
  durationMinutes: true,
  rules: true
});
export type InsertExamType = z.infer<typeof insertExamTypeSchema>;
export type ExamType = typeof examTypes.$inferSelect;

// Academic Tracks (Science, Arts, Commercial) - scoped to exam body
export const academicTracks = pgTable("academic_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(), // e.g., "SCIENCE", "ARTS", "COMMERCIAL"
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertAcademicTrackSchema = createInsertSchema(academicTracks).pick({
  name: true,
  code: true,
  examBodyId: true,
  description: true,
  isActive: true
});
export type InsertAcademicTrack = z.infer<typeof insertAcademicTrackSchema>;
export type AcademicTrack = typeof academicTracks.$inferSelect;

// Categories (simplified version for question bank - maps to academic_tracks)
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueExamBodyCategory: sql`UNIQUE(${table.examBodyId}, ${table.name})`
}));

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  examBodyId: true
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Subjects (Physics, Chemistry, Mathematics, etc.) - NEUTRAL ENTITIES
export const subjects = pgTable("subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull(), // e.g., "PHY", "CHEM", "MATH"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  examBodyId: varchar("exam_body_id").references(() => examBodies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  code: true,
  description: true,
  isActive: true
});
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;

// Track-Subject Junction Table (CRITICAL - maps subjects to tracks)
export const trackSubjects = pgTable("track_subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull().references(() => academicTracks.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").default(true), // Is this subject required for the track?
  order: integer("order").default(0), // Display order within track
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  // Ensure no duplicate subject-track mappings
  uniqueTrackSubject: sql`UNIQUE(${table.trackId}, ${table.subjectId})`
}));

export const insertTrackSubjectSchema = createInsertSchema(trackSubjects).pick({
  trackId: true,
  subjectId: true,
  examBodyId: true,
  isRequired: true,
  order: true
});
export type InsertTrackSubject = z.infer<typeof insertTrackSubjectSchema>;
export type TrackSubject = typeof trackSubjects.$inferSelect;

// Syllabi (version-controlled curriculum documents)
export const syllabi = pgTable("syllabi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  version: text("version").notNull(), // e.g., "2023", "2024"
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<{
    objectives: string[];
    topics: string[];
    assessmentCriteria: string[];
  }>(),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSyllabusSchema = createInsertSchema(syllabi).pick({
  title: true,
  version: true,
  examBodyId: true,
  subjectId: true,
  content: true,
  isActive: true,
  effectiveFrom: true,
  effectiveTo: true
});
export type InsertSyllabus = z.infer<typeof insertSyllabusSchema>;
export type Syllabus = typeof syllabi.$inferSelect;

// Topics (within syllabi)
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code"), // e.g., "1.1", "2.3"
  syllabusId: varchar("syllabus_id").notNull().references(() => syllabi.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  description: text("description"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTopicSchema = createInsertSchema(topics).pick({
  name: true,
  code: true,
  syllabusId: true,
  subjectId: true,
  examBodyId: true,
  description: true,
  order: true,
  isActive: true
});
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;

// Subtopics (within topics)
export const subtopics = pgTable("subtopics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code"), // e.g., "1.1.1", "2.3.4"
  topicId: varchar("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  syllabusId: varchar("syllabus_id").notNull().references(() => syllabi.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  description: text("description"),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSubtopicSchema = createInsertSchema(subtopics).pick({
  name: true,
  code: true,
  topicId: true,
  syllabusId: true,
  subjectId: true,
  examBodyId: true,
  description: true,
  order: true,
  isActive: true
});
export type InsertSubtopic = z.infer<typeof insertSubtopicSchema>;
export type Subtopic = typeof subtopics.$inferSelect;

// Exam Rules (extensible JSON-based configuration)
export const examRules = pgTable("exam_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }), // Primary reference
  examTypeId: varchar("exam_type_id").references(() => examTypes.id, { onDelete: "set null" }), // Made optional
  trackId: varchar("track_id").references(() => academicTracks.id, { onDelete: "cascade" }), // Optional - can be exam-type wide
  name: text("name").notNull(),
  description: text("description"),
  rules: jsonb("rules").$type<{
    duration?: number;
    questionCount?: number;
    questionDistribution?: Record<string, number>; // subject -> count
    difficultyDistribution?: Record<string, number>; // easy/medium/hard -> percentage
    randomization?: boolean;
    showResults?: boolean;
    allowReview?: boolean;
    passingScore?: number;
    customRules?: Record<string, any>;
  }>().notNull(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // For rule precedence
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertExamRuleSchema = createInsertSchema(examRules).pick({
  examBodyId: true,
  examTypeId: true,
  trackId: true,
  name: true,
  description: true,
  rules: true,
  isActive: true,
  priority: true
});
export type InsertExamRule = z.infer<typeof insertExamRuleSchema>;
export type ExamRule = typeof examRules.$inferSelect;

// Question Status Lifecycle
// New simplified status: ["live", "review", "disabled"]
// Backward compatible with old statuses: ["draft", "reviewed", "approved", "live", "archived"]
export const questionStatuses = ["live", "review", "disabled", "draft", "reviewed", "approved", "archived"] as const;

// Questions (NEVER directly tied to tracks - only through subjects)
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id"), // Links to question_versions for history
  text: text("text").notNull(),
  type: text("type", { enum: ["multiple_choice", "true_false", "short_answer", "essay"] }).default("multiple_choice"),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull(),
  marks: integer("marks").default(1),

  // Relationships (hierarchical) - Required structure per instruction1.md
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }), // NEW: Required per instruction1.md
  subjectId: varchar("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  topic: text("topic"), // Optional topic field per instruction1.md
  examTypeId: varchar("exam_type_id").references(() => examTypes.id, { onDelete: "set null" }), // Optional - Categories are primary
  syllabusId: varchar("syllabus_id").references(() => syllabi.id, { onDelete: "set null" }),
  topicId: varchar("topic_id").references(() => topics.id, { onDelete: "set null" }),
  subtopicId: varchar("subtopic_id").references(() => subtopics.id, { onDelete: "set null" }),

  // Question Data
  options: jsonb("options").$type<{ id: string; text: string }[]>(), // Options stored as JSONB for backward compatibility (secondary - primary source is questionOptions table)

  // Metadata
  year: text("year"),
  source: text("source"), // e.g., "WAEC 2023", "JAMB Past Question"
  tags: jsonb("tags").$type<string[]>(), // For advanced filtering

  // Status & Workflow
  // Default status is "review" per instruction1.md
  status: text("status", { enum: questionStatuses }).default("review"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  archivedBy: varchar("archived_by").references(() => users.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archiveReason: text("archive_reason"),

  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertQuestionSchema = createInsertSchema(questions);
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Question Options (separate table for better structure)
export const questionOptions = pgTable("question_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  optionId: text("option_id").notNull(), // A, B, C, D, etc.
  text: text("text").notNull(),
  order: integer("order").default(0),
  isCorrect: boolean("is_correct").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertQuestionOptionSchema = createInsertSchema(questionOptions).pick({
  questionId: true,
  optionId: true,
  text: true,
  order: true,
  isCorrect: true
});
export type InsertQuestionOption = z.infer<typeof insertQuestionOptionSchema>;
export type QuestionOption = typeof questionOptions.$inferSelect;

// Marking Guides (for essay/short answer questions)
export const markingGuides = pgTable("marking_guides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  criteria: text("criteria").notNull(), // e.g., "Content", "Structure", "Grammar"
  description: text("description").notNull(),
  marks: integer("marks").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertMarkingGuideSchema = createInsertSchema(markingGuides).pick({
  questionId: true,
  criteria: true,
  description: true,
  marks: true,
  order: true
});
export type InsertMarkingGuide = z.infer<typeof insertMarkingGuideSchema>;
export type MarkingGuide = typeof markingGuides.$inferSelect;

// Question Versions (for tracking changes and maintaining history)
export const questionVersions = pgTable("question_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  text: text("text").notNull(),
  type: text("type", { enum: ["multiple_choice", "true_false", "short_answer", "essay"] }),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }),
  marks: integer("marks"),

  // Store snapshot of relationships at time of version
  examBodyId: varchar("exam_body_id").notNull(),
  examTypeId: varchar("exam_type_id").notNull(),
  subjectId: varchar("subject_id").notNull(),
  syllabusId: varchar("syllabus_id"),
  topicId: varchar("topic_id"),
  subtopicId: varchar("subtopic_id"),

  // Store snapshot of options/guides at time of version
  options: jsonb("options").$type<{ id: string; text: string; isCorrect: boolean }[]>(),
  markingGuides: jsonb("marking_guides").$type<{ criteria: string; description: string; marks: number }[]>(),

  // Metadata
  changeReason: text("change_reason"),
  changedBy: varchar("changed_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertQuestionVersionSchema = createInsertSchema(questionVersions).pick({
  questionId: true,
  version: true,
  text: true,
  type: true,
  difficulty: true,
  marks: true,
  examBodyId: true,
  examTypeId: true,
  subjectId: true,
  syllabusId: true,
  topicId: true,
  subtopicId: true,
  options: true,
  markingGuides: true,
  changeReason: true,
  changedBy: true
});
export type InsertQuestionVersion = z.infer<typeof insertQuestionVersionSchema>;
export type QuestionVersion = typeof questionVersions.$inferSelect;

// Exams (groups of questions)
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),

  // Hierarchical relationships
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }), // Science, Arts, Commercial
  examTypeId: varchar("exam_type_id").references(() => examTypes.id, { onDelete: "set null" }), // Made optional - Categories are primary
  trackId: varchar("track_id").references(() => academicTracks.id, { onDelete: "set null" }), // Optional - may be subject-specific

  // Subject selection (resolved from track, or manually selected)
  selectedSubjects: jsonb("selected_subjects").$type<{ id: string; name: string }[]>(), // Subjects included in this exam

  // Question composition
  questionIds: jsonb("question_ids").$type<string[]>().notNull(), // array of question IDs
  questionDistribution: jsonb("question_distribution").$type<Record<string, number>>(), // subject -> question count

  // Exam configuration
  durationMinutes: integer("duration_minutes").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  totalMarks: integer("total_marks").notNull(),

  // Rules application
  appliedRules: jsonb("applied_rules").$type<Record<string, any>>(), // Snapshot of rules applied

  // Status and workflow
  status: text("status", { enum: ["draft", "published", "archived"] }).default("draft"),
  isPractice: boolean("is_practice").default(true), // Practice vs official exam
  isRandomized: boolean("is_randomized").default(true),

  // Creator and permissions
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  tutorId: varchar("tutor_id").references(() => users.id, { onDelete: "set null" }), // For tutor-created exams
  isTutorAssignment: boolean("is_tutor_assignment").default(false),

  // Scheduling (for official exams)
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertExamSchema = createInsertSchema(exams);
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof exams.$inferSelect;

// Blog Posts / Resources
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  videoUrl: text("video_url"), // YouTube, Vimeo, etc.
  videoEmbedCode: text("video_embed_code"), // Custom embed code
  fileUrl: text("file_url"), // For PDFs, audio files, downloadable resources
  externalUrl: text("external_url"), // For external links
  author: text("author").default("PrepMaster Team"),
  category: text("category"), // e.g., "Study Tips", "Subject Notes", "Video Tutorial"
  contentType: text("content_type", { enum: ["notice", "note", "video", "pdf", "audio", "link", "quiz", "flashcard"] }), // Explicit content type
  subject: text("subject"), // Link to subjects table or free text
  examBodyId: varchar("exam_body_id").references(() => examBodies.id, { onDelete: "set null" }), // Reference to exam_bodies table
  priority: integer("priority").default(0), // For notices ordering (higher = more important)
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Store content type, file size, duration, etc.
  tags: jsonb("tags").$type<string[]>().default([]),
  featured: boolean().default(false),
  published: boolean().default(true),
  views: integer("views").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts);
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["basic", "standard", "premium"] }).default("basic").notNull(),
  status: text("status", { enum: ["active", "cancelled", "expired", "pending"] }).default("active").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  paystackSubscriptionCode: varchar("paystack_subscription_code"), // For recurring payments
  paystackCustomerCode: varchar("paystack_customer_code"), // Paystack customer ID
  paymentMethod: text("payment_method", { enum: ["paystack", "manual"] }).default("paystack"),
  paymentType: text("payment_type", { enum: ["subscription", "lifetime"] }).default("subscription"),
  isLifetime: boolean("is_lifetime").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Payments - Track payment transactions
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  paystackReference: varchar("paystack_reference").unique().notNull(),
  paystackTransactionId: varchar("paystack_transaction_id"),
  amount: integer("amount").notNull(), // Amount in kobo
  currency: text("currency").default("NGN").notNull(),
  plan: text("plan", { enum: ["basic", "standard", "premium"] }).notNull(),
  billingPeriod: text("billing_period", { enum: ["monthly", "annual", "lifetime"] }),
  paymentType: text("payment_type", { enum: ["subscription", "lifetime"] }).default("subscription"),
  status: text("status", { enum: ["pending", "success", "failed", "cancelled"] }).default("pending").notNull(),
  metadata: jsonb("metadata"), // Store additional Paystack response data
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments);
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Tutor Groups - Student groups managed by tutors
export const tutorGroups = pgTable("tutor_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject"),
  examBodyId: varchar("exam_body_id").references(() => examBodies.id, { onDelete: "set null" }),
  categoryId: varchar("category_id").references(() => categories.id, { onDelete: "set null" }),
  maxStudents: integer("max_students"),
  isActive: boolean("is_active").default(true),
  groupCode: varchar("group_code").unique(), // Unique code for students to join
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTutorGroupSchema = createInsertSchema(tutorGroups);
export type InsertTutorGroup = z.infer<typeof insertTutorGroupSchema>;
export type TutorGroup = typeof tutorGroups.$inferSelect;

// Group Members - Student-tutor group relationships
export const group_members = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => tutorGroups.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for guest members
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  status: text("status", { enum: ["active", "removed"] }).default("active"),
  role: text("role", { enum: ["student", "assistant"] }).default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertGroupMemberSchema = createInsertSchema(group_members);
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof group_members.$inferSelect;

// Tutor Assignments - Tests assigned by tutors to groups/students
export const tutorAssignments = pgTable("tutor_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").references(() => tutorGroups.id, { onDelete: "set null" }), // Nullable for individual assignments
  studentId: varchar("student_id").references(() => users.id, { onDelete: "set null" }), // Nullable for group assignments
  examId: varchar("exam_id").references(() => exams.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  instructions: text("instructions"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  timeLimit: integer("time_limit"), // in seconds, nullable
  maxAttempts: integer("max_attempts").default(1),
  status: text("status", { enum: ["draft", "scheduled", "active", "completed", "closed"] }).default("draft"),
  randomizeQuestions: boolean("randomize_questions").default(true),
  showResultsImmediately: boolean("show_results_immediately").default(true),
  topics: jsonb("topics").$type<string[]>().default([]), // Array of topic names
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTutorAssignmentSchema = createInsertSchema(tutorAssignments);
export type InsertTutorAssignment = z.infer<typeof insertTutorAssignmentSchema>;
export type TutorAssignment = typeof tutorAssignments.$inferSelect;

// Assignment Attempts - Student attempts on tutor assignments
export const assignmentAttempts = pgTable("assignment_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => tutorAssignments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for guests
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  attemptId: varchar("attempt_id").references(() => attempts.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  score: integer("score"), // Percentage or points
  status: text("status", { enum: ["in_progress", "submitted", "graded"] }).default("in_progress"),
  feedback: text("feedback"), // Feedback from tutor
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertAssignmentAttemptSchema = createInsertSchema(assignmentAttempts);
export type InsertAssignmentAttempt = z.infer<typeof insertAssignmentAttemptSchema>;
export type AssignmentAttempt = typeof assignmentAttempts.$inferSelect;

// Exam Formulas - Admin-managed formulas for exams
export const examFormulas = pgTable("exam_formulas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subject: text("subject"), // e.g., "Mathematics", "Physics", "Chemistry"
  category: text("category"), // e.g., "Algebra", "Geometry", "Trigonometry"
  content: text("content").notNull(), // The formula content (can be LaTeX, plain text, or HTML)
  examBody: text("exam_body"), // e.g., "WAEC", "JAMB", "NECO"
  order: integer("order").default(0), // For ordering formulas
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertExamFormulaSchema = createInsertSchema(examFormulas);
export type InsertExamFormula = z.infer<typeof insertExamFormulaSchema>;
export type ExamFormula = typeof examFormulas.$inferSelect;

// Tutor Notes - Tutor notes/feedback on student performance
export const tutorNotes = pgTable("tutor_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignmentId: varchar("assignment_id").references(() => tutorAssignments.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertTutorNoteSchema = createInsertSchema(tutorNotes);
export type InsertTutorNote = z.infer<typeof insertTutorNoteSchema>;
export type TutorNote = typeof tutorNotes.$inferSelect;

// Tutor/School Inquiries - For B2B quote requests
export const tutorInquiries = pgTable("tutor_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionName: text("institution_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  studentCount: text("student_count"), // e.g., "1-50", "51-100", "100+"
  useCase: text("use_case"),
  preferredContact: text("preferred_contact"), // "email", "phone", "both"
  status: text("status", { enum: ["pending", "contacted", "quoted", "converted", "closed"] }).default("pending"),
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const insertTutorInquirySchema = createInsertSchema(tutorInquiries);
export type InsertTutorInquiry = z.infer<typeof insertTutorInquirySchema>;
export type TutorInquiry = typeof tutorInquiries.$inferSelect;

// Ads functionality removed

// User Stats - Gamification and progress tracking
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastPracticeDate: timestamp("last_practice_date", { withTimezone: true }),
  totalQuestionsAnswered: integer("total_questions_answered").default(0),
  totalCorrectAnswers: integer("total_correct_answers").default(0),
  accuracy: integer("accuracy").default(0), // percentage
  achievements: jsonb("achievements").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserStatsSchema = createInsertSchema(userStats);
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

// Offline Downloads tracking
export const downloads = pgTable("downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  examId: varchar("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueUserDownload: sql`UNIQUE(${table.userId}, ${table.examId})`
}));

export const insertDownloadSchema = createInsertSchema(downloads);
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloads.$inferSelect;

// Activity Logs - Track system activity and admin actions
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'user', 'subscription', 'exam_content', 'system', 'payment'
  action: text("action").notNull(), // 'Banned User', 'Deleted Category', etc.
  user: text("user").notNull(), // Contextual identifier (e.g., student email or object name)
  details: text("details"),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }), // Admin who performed the action
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs);
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// --- TUTOR EXAM SYSTEM V1 ---

export const tutorStatusEnum = ["pending", "approved", "suspended"] as const;
export const examStatusEnum = ["draft", "active", "expired", "closed"] as const;

// Tutor Profiles
export const tutorProfiles = pgTable("tutor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  approvedByAdminId: varchar("approved_by_admin_id").references(() => users.id, { onDelete: "set null" }),
  studentQuota: integer("student_quota").notNull().default(0),
  status: text("status", { enum: tutorStatusEnum }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertTutorProfileSchema = createInsertSchema(tutorProfiles);
export type InsertTutorProfile = z.infer<typeof insertTutorProfileSchema>;
export type TutorProfile = typeof tutorProfiles.$inferSelect;

// Tutor Exams
export const tutorExams = pgTable("tutor_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorId: varchar("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  examBodyId: varchar("exam_body_id").notNull().references(() => examBodies.id),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  title: text("title").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  timeLimitMinutes: integer("time_limit_minutes").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status", { enum: examStatusEnum }).notNull().default("draft"),
  maxCandidates: integer("max_candidates").notNull(),
  isProctored: boolean("is_proctored").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertTutorExamSchema = createInsertSchema(tutorExams);
export type InsertTutorExam = z.infer<typeof insertTutorExamSchema>;
export type TutorExam = typeof tutorExams.$inferSelect;

// Tutor Exam Subjects (Weightage)
export const tutorExamSubjects = pgTable("tutor_exam_subjects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorExamId: varchar("tutor_exam_id").notNull().references(() => tutorExams.id, { onDelete: "cascade" }),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id),
  questionCount: integer("question_count").notNull(),
});

export const insertTutorExamSubjectSchema = createInsertSchema(tutorExamSubjects);
export type InsertTutorExamSubject = z.infer<typeof insertTutorExamSubjectSchema>;
export type TutorExamSubject = typeof tutorExamSubjects.$inferSelect;

// Tutor Exam Questions (Locked questions)
export const tutorExamQuestions = pgTable("tutor_exam_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorExamId: varchar("tutor_exam_id").notNull().references(() => tutorExams.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id),
  subjectId: varchar("subject_id").notNull().references(() => subjects.id),
});

export const insertTutorExamQuestionSchema = createInsertSchema(tutorExamQuestions);
export type InsertTutorExamQuestion = z.infer<typeof insertTutorExamQuestionSchema>;
export type TutorExamQuestion = typeof tutorExamQuestions.$inferSelect;

// Tutor Exam Sessions (Attempts)
export const tutorExamSessions = pgTable("tutor_exam_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorExamId: varchar("tutor_exam_id").notNull().references(() => tutorExams.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name").notNull(),
  candidateClass: text("candidate_class").notNull(),
  candidateSchool: text("candidate_school").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  score: integer("score"),
  status: text("status", { enum: ["in_progress", "submitted"] }).notNull().default("in_progress"),
});

export const insertTutorExamSessionSchema = createInsertSchema(tutorExamSessions);
export type InsertTutorExamSession = z.infer<typeof insertTutorExamSessionSchema>;
export type TutorExamSession = typeof tutorExamSessions.$inferSelect;

// Tutor Exam Answers (Grading persistence)
export const tutorExamAnswers = pgTable("tutor_exam_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tutorExamSessionId: varchar("tutor_exam_session_id").notNull().references(() => tutorExamSessions.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id),
  selectedOptionId: varchar("selected_option_id").references(() => questionOptions.id),
  isCorrect: boolean("is_correct").notNull(),
});

export const insertTutorExamAnswerSchema = createInsertSchema(tutorExamAnswers);
export type InsertTutorExamAnswer = z.infer<typeof insertTutorExamAnswerSchema>;
export type TutorExamAnswer = typeof tutorExamAnswers.$inferSelect;
