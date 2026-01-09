import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  tutorGroups,
  group_members,
  tutorAssignments,
  assignmentAttempts,
  tutorNotes,
  users,
  exams,
  questions,
  attempts,
  subscriptions,
  examBodies,
  categories,
  subjects,
  tutorProfiles,
  tutorExams,
  tutorExamSubjects,
  tutorExamQuestions,
  tutorExamSessions,
  tutorExamAnswers,
  questionOptions as schemaQuestionOptions
} from "@shared/schema";
import { eq, and, or, inArray, desc, sql, count, gte, lt } from "drizzle-orm";
import { requireTutor } from "../middleware/tutorAuth";
import { PdfService } from "../services/PdfService";

const router = Router();

// ========== PUBLIC / SHARED ENDPOINTS ==========

// Request tutor access
router.post("/request-access", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if already has a profile
    const existing = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ message: "Request already submitted", status: existing[0].status });
    }

    const [newProfile] = await db
      .insert(tutorProfiles)
      .values({
        userId,
        status: "pending",
        studentQuota: 0,
      })
      .returning();

    return res.json(newProfile);
  } catch (err: any) {
    console.error("Error requesting tutor access:", err);
    return res.status(500).json({ message: "Failed to submit request", error: err.message || String(err) });
  }
});

// GET public exam info (Anonymous)
router.get("/exams/:id/public", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await db
      .select({
        id: tutorExams.id,
        title: tutorExams.title,
        totalQuestions: tutorExams.totalQuestions,
        timeLimitMinutes: tutorExams.timeLimitMinutes,
        status: tutorExams.status,
        expiresAt: tutorExams.expiresAt,
      })
      .from(tutorExams)
      .where(eq(tutorExams.id, id))
      .limit(1);

    if (exam.length === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam[0].status !== "active") {
      return res.status(403).json({ message: "Exam is not active", status: exam[0].status });
    }

    if (new Date(exam[0].expiresAt) < new Date()) {
      return res.status(403).json({ message: "Exam has expired" });
    }

    return res.json(exam[0]);
  } catch (err: any) {
    console.error("Error fetching public exam:", err);
    return res.status(500).json({ message: "Failed to fetch exam", error: err.message || String(err) });
  }
});

// START public exam (Anonymous)
router.post("/exams/:id/start", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { candidateName, candidateClass, candidateSchool } = req.body;

    if (!candidateName || !candidateClass || !candidateSchool) {
      return res.status(400).json({ message: "Candidate details are required" });
    }

    const exam = await db.select().from(tutorExams).where(eq(tutorExams.id, id)).limit(1);
    if (exam.length === 0) return res.status(404).json({ message: "Exam not found" });

    // Quota check
    const usedQuota = await db
      .select({ count: count() })
      .from(tutorExamSessions)
      .where(eq(tutorExamSessions.tutorExamId, id));

    if (usedQuota[0].count >= exam[0].maxCandidates) {
      return res.status(403).json({ message: "Exam candidate limit reached" });
    }

    // Duplicate check
    const existing = await db
      .select()
      .from(tutorExamSessions)
      .where(
        and(
          eq(tutorExamSessions.tutorExamId, id),
          eq(tutorExamSessions.candidateName, candidateName),
          eq(tutorExamSessions.candidateClass, candidateClass),
          eq(tutorExamSessions.candidateSchool, candidateSchool)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(403).json({ message: "A candidate with these details has already started/submitted this exam" });
    }

    // Create session
    const [session] = await db
      .insert(tutorExamSessions)
      .values({
        tutorExamId: id,
        candidateName,
        candidateClass,
        candidateSchool,
        status: "in_progress",
      })
      .returning();

    // Fetch questions (locked)
    const lockedQuestions = await db
      .select({
        id: questions.id,
        text: questions.text,
        type: questions.type,
        options: questions.options,
        subjectId: tutorExamQuestions.subjectId,
      })
      .from(tutorExamQuestions)
      .innerJoin(questions, eq(tutorExamQuestions.questionId, questions.id))
      .where(eq(tutorExamQuestions.tutorExamId, id));

    return res.json({ session, questions: lockedQuestions });
  } catch (err: any) {
    console.error("Error starting exam:", err);
    return res.status(500).json({ message: "Failed to start exam", error: err.message || String(err) });
  }
});

// SUBMIT public exam (Anonymous)
router.post("/exams/sessions/:sessionId/submit", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { responses } = req.body; // Map of questionId -> selectedOptionId

    const session = await db.select().from(tutorExamSessions).where(eq(tutorExamSessions.id, sessionId)).limit(1);
    if (session.length === 0) return res.status(404).json({ message: "Session not found" });

    if (session[0].status === "submitted") {
      return res.status(403).json({ message: "Exam already submitted" });
    }

    // Grading logic
    let totalScore = 0;
    const gradingResults: any[] = [];

    const examQuestions = await db
      .select({
        id: questions.id,
      })
      .from(tutorExamQuestions)
      .where(eq(tutorExamQuestions.tutorExamId, session[0].tutorExamId));

    for (const q of examQuestions) {
      const selectedOptionId = responses[q.id];
      let isCorrect = false;

      if (selectedOptionId) {
        const option = await db.select().from(schemaQuestionOptions).where(eq(schemaQuestionOptions.id, selectedOptionId)).limit(1);
        if (option.length > 0 && option[0].isCorrect) {
          isCorrect = true;
          totalScore++;
        }
      }

      gradingResults.push({
        tutorExamSessionId: sessionId,
        questionId: q.id,
        selectedOptionId: selectedOptionId || null,
        isCorrect,
      });
    }

    // Persist results
    await db.transaction(async (tx) => {
      await tx.insert(tutorExamAnswers).values(gradingResults);
      await tx
        .update(tutorExamSessions)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          score: totalScore,
        })
        .where(eq(tutorExamSessions.id, sessionId));
    });

    return res.json({ message: "Exam submitted successfully", status: "submitted" });
  } catch (err: any) {
    console.error("Error submitting exam:", err);
    return res.status(500).json({ message: "Failed to submit exam", error: err.message || String(err) });
  }
});

// All routes below require tutor authentication
router.use(requireTutor);

// Helper to generate unique group code
function generateGroupCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ========== GROUPS ENDPOINTS ==========

// Get all groups for the tutor
router.get("/groups", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;

    const groups = await db
      .select({
        id: tutorGroups.id,
        name: tutorGroups.name,
        description: tutorGroups.description,
        subject: tutorGroups.subject,
        examBodyId: tutorGroups.examBodyId,
        categoryId: tutorGroups.categoryId,
        maxStudents: tutorGroups.maxStudents,
        isActive: tutorGroups.isActive,
        groupCode: tutorGroups.groupCode,
        createdAt: tutorGroups.createdAt,
        updatedAt: tutorGroups.updatedAt,
        studentCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${group_members} 
          WHERE ${group_members.groupId} = ${tutorGroups.id} 
          AND ${group_members.status} = 'active'
        )`,
      })
      .from(tutorGroups)
      .where(eq(tutorGroups.tutorId, tutorId))
      .orderBy(desc(tutorGroups.createdAt));

    return res.json(groups);
  } catch (err: any) {
    console.error("Error fetching groups:", err);
    return res.status(500).json({
      message: "Failed to fetch groups",
      error: err.message || String(err)
    });
  }
});

// Create a new group
router.post("/groups", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { name, description, subject, examBodyId, categoryId, maxStudents } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Generate unique group code
    let groupCode = generateGroupCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .select()
        .from(tutorGroups)
        .where(eq(tutorGroups.groupCode, groupCode))
        .limit(1);

      if (existing.length === 0) break;
      groupCode = generateGroupCode();
      attempts++;
    }

    const [newGroup] = await db
      .insert(tutorGroups)
      .values({
        tutorId,
        name,
        description: description || null,
        subject: subject || null,
        examBodyId: examBodyId || null,
        categoryId: categoryId || null,
        maxStudents: maxStudents || null,
        groupCode,
        isActive: true,
      })
      .returning();

    return res.json(newGroup);
  } catch (err: any) {
    console.error("Error creating group:", err);
    return res.status(500).json({
      message: "Failed to create group",
      error: err.message || String(err)
    });
  }
});

// Update a group
router.put("/groups/:id", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;
    const { name, description, subject, examBodyId, categoryId, maxStudents, isActive } = req.body;

    // Verify group belongs to tutor
    const existingGroup = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, id), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    const [updatedGroup] = await db
      .update(tutorGroups)
      .set({
        name: name || existingGroup[0].name,
        description: description !== undefined ? description : existingGroup[0].description,
        subject: subject !== undefined ? subject : existingGroup[0].subject,
        examBodyId: examBodyId !== undefined ? examBodyId : existingGroup[0].examBodyId,
        categoryId: categoryId !== undefined ? categoryId : existingGroup[0].categoryId,
        maxStudents: maxStudents !== undefined ? maxStudents : existingGroup[0].maxStudents,
        isActive: isActive !== undefined ? isActive : existingGroup[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(tutorGroups.id, id))
      .returning();

    return res.json(updatedGroup);
  } catch (err: any) {
    console.error("Error updating group:", err);
    return res.status(500).json({
      message: "Failed to update group",
      error: err.message || String(err)
    });
  }
});

// Delete a group
router.delete("/groups/:id", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    // Verify group belongs to tutor
    const existingGroup = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, id), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    await db.delete(tutorGroups).where(eq(tutorGroups.id, id));

    return res.json({ message: "Group deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting group:", err);
    return res.status(500).json({
      message: "Failed to delete group",
      error: err.message || String(err)
    });
  }
});

// Get group members
router.get("/groups/:id/members", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    // Verify group belongs to tutor
    const existingGroup = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, id), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = await db
      .select({
        id: group_members.id,
        studentId: group_members.studentId,
        joinedAt: group_members.joinedAt,
        status: group_members.status,
        role: group_members.role,
        guestName: group_members.guestName,
        guestEmail: group_members.guestEmail,
        username: users.username,
        email: users.email,
      })
      .from(group_members)
      .leftJoin(users, eq(group_members.studentId, users.id))
      .where(eq(group_members.groupId, id))
      .orderBy(desc(group_members.joinedAt));

    return res.json(members);
  } catch (err: any) {
    console.error("Error fetching group members:", err);
    return res.status(500).json({
      message: "Failed to fetch group members",
      error: err.message || String(err)
    });
  }
});

// Add student to group
router.post("/groups/:id/members", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;
    const { studentId, email } = req.body;

    // Verify group belongs to tutor
    const existingGroup = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, id), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    let targetStudentId = studentId;

    // If email provided, find user by email
    if (!targetStudentId && email) {
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userRecords.length === 0) {
        return res.status(404).json({ message: "Student not found with that email" });
      }
      targetStudentId = userRecords[0].id;
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: "studentId or email is required" });
    }

    // Check if already a member
    const existingMember = await db
      .select()
      .from(group_members)
      .where(and(eq(group_members.groupId, id), eq(group_members.studentId, targetStudentId)))
      .limit(1);

    if (existingMember.length > 0) {
      // Reactivate if removed
      if (existingMember[0].status === "removed") {
        const [updated] = await db
          .update(group_members)
          .set({ status: "active" })
          .where(eq(group_members.id, existingMember[0].id))
          .returning();
        return res.json(updated);
      }
      return res.status(400).json({ message: "Student is already a member of this group" });
    }

    const [newMember] = await db
      .insert(group_members)
      .values({
        groupId: id,
        studentId: targetStudentId,
        status: "active",
        role: "student",
      })
      .returning();

    return res.json(newMember);
  } catch (err: any) {
    console.error("Error adding group member:", err);
    return res.status(500).json({
      message: "Failed to add group member",
      error: err.message || String(err)
    });
  }
});

// Remove member from group
router.delete("/groups/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id, memberId } = req.params;

    // Verify group belongs to tutor
    const existingGroup = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, id), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (existingGroup.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Mark as removed instead of deleting
    await db
      .update(group_members)
      .set({ status: "removed" })
      .where(and(eq(group_members.groupId, id), eq(group_members.id, memberId)));

    return res.json({ message: "Member removed from group" });
  } catch (err: any) {
    console.error("Error removing group member:", err);
    return res.status(500).json({
      message: "Failed to remove group member",
      error: err.message || String(err)
    });
  }
});

// ========== ASSIGNMENTS ENDPOINTS ==========

// Get all assignments for the tutor
router.get("/assignments", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { status, groupId } = req.query;

    let conditions: any[] = [eq(tutorAssignments.tutorId, tutorId)];

    if (status && status !== "all") {
      const validStatuses = ["draft", "scheduled", "active", "completed", "closed"] as const;
      if (validStatuses.includes(status as typeof validStatuses[number])) {
        conditions.push(eq(tutorAssignments.status, status as typeof validStatuses[number]));
      }
    }

    if (groupId) {
      conditions.push(eq(tutorAssignments.groupId, groupId as string));
    }

    const assignments = await db
      .select({
        id: tutorAssignments.id,
        tutorId: tutorAssignments.tutorId,
        groupId: tutorAssignments.groupId,
        studentId: tutorAssignments.studentId,
        examId: tutorAssignments.examId,
        title: tutorAssignments.title,
        instructions: tutorAssignments.instructions,
        dueDate: tutorAssignments.dueDate,
        timeLimit: tutorAssignments.timeLimit,
        maxAttempts: tutorAssignments.maxAttempts,
        status: tutorAssignments.status,
        randomizeQuestions: tutorAssignments.randomizeQuestions,
        showResultsImmediately: tutorAssignments.showResultsImmediately,
        topics: tutorAssignments.topics,
        createdAt: tutorAssignments.createdAt,
        updatedAt: tutorAssignments.updatedAt,
        groupName: sql<string | null>`(
          SELECT ${tutorGroups.name} 
          FROM ${tutorGroups} 
          WHERE ${tutorGroups.id} = ${tutorAssignments.groupId}
        )`,
        completionCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${assignmentAttempts} 
          WHERE ${assignmentAttempts.assignmentId} = ${tutorAssignments.id}
          AND ${assignmentAttempts.status} = 'submitted'
        )`,
        totalStudents: sql<number>`(
          CASE 
            WHEN ${tutorAssignments.groupId} IS NOT NULL THEN (
              SELECT COUNT(*)::int 
              FROM ${group_members} 
              WHERE ${group_members.groupId} = ${tutorAssignments.groupId}
              AND ${group_members.status} = 'active'
            )
            WHEN ${tutorAssignments.studentId} IS NOT NULL THEN 1
            ELSE 0
          END
        )`,
      })
      .from(tutorAssignments)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(tutorAssignments.createdAt));

    return res.json(assignments);
  } catch (err: any) {
    console.error("Error fetching assignments:", err);
    return res.status(500).json({
      message: "Failed to fetch assignments",
      error: err.message || String(err)
    });
  }
});

// Create a new assignment
router.post("/assignments", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const {
      title,
      instructions,
      examBodyId,
      categoryId,
      subjectId,
      topics,
      questionCount,
      dueDate,
      timeLimit,
      maxAttempts,
      randomizeQuestions,
      showResultsImmediately,
      groupId,
      studentId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!groupId && !studentId) {
      return res.status(400).json({ message: "Either groupId or studentId is required" });
    }

    // Generate exam from criteria
    let examId: string | null = null;
    if (examBodyId && categoryId && subjectId) {
      // Get questions matching criteria
      let questionConditions: any[] = [
        eq(questions.examBodyId, examBodyId),
        eq(questions.subjectId, subjectId),
        eq(questions.status, "live"),
      ];

      // Filter by topics if provided
      if (topics && Array.isArray(topics) && topics.length > 0) {
        questionConditions.push(inArray(questions.topic, topics));
      }

      const availableQuestions = await db
        .select()
        .from(questions)
        .where(and(...questionConditions));

      if (availableQuestions.length === 0) {
        return res.status(400).json({
          message: "No questions found matching the selected criteria"
        });
      }

      // Select questions
      let selectedQuestions = availableQuestions;
      if (randomizeQuestions) {
        selectedQuestions = [...availableQuestions].sort(() => Math.random() - 0.5);
      }

      const questionsToUse = selectedQuestions.slice(0, questionCount || availableQuestions.length);
      const questionIds = questionsToUse.map(q => q.id);

      // Get exam body and category names
      const examBody = await db.select().from(examBodies).where(eq(examBodies.id, examBodyId)).limit(1);
      const category = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
      const subject = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);

      const durationMinutes = timeLimit
        ? (Number(timeLimit) > 300 ? Math.ceil(Number(timeLimit) / 60) : Number(timeLimit))
        : 60;

      // Create exam (current schema)
      const [newExam] = await db
        .insert(exams)
        .values({
          title,
          examBodyId,
          categoryId: categoryId,
          trackId: null,
          selectedSubjects: subject[0] ? [{ id: subject[0].id, name: subject[0].name }] : [],
          questionIds,
          durationMinutes,
          totalQuestions: questionIds.length,
          totalMarks: questionIds.length,
          createdBy: tutorId,
          tutorId,
          isTutorAssignment: true,
          status: "published",
          isPractice: true,
          isRandomized: randomizeQuestions !== false,
        })
        .returning();

      examId = newExam.id;
    }

    // Create assignment
    const [newAssignment] = await db
      .insert(tutorAssignments)
      .values({
        tutorId,
        groupId: groupId || null,
        studentId: studentId || null,
        examId,
        title,
        instructions: instructions || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        timeLimit: timeLimit || null,
        maxAttempts: maxAttempts || 1,
        status: dueDate && new Date(dueDate) > new Date() ? "scheduled" : "active",
        randomizeQuestions: randomizeQuestions !== false,
        showResultsImmediately: showResultsImmediately !== false,
        topics: topics || [],
      })
      .returning();

    return res.json(newAssignment);
  } catch (err: any) {
    console.error("Error creating assignment:", err);
    return res.status(500).json({
      message: "Failed to create assignment",
      error: err.message || String(err)
    });
  }
});

// Update an assignment
router.put("/assignments/:id", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;
    const updateData = req.body;

    // Verify assignment belongs to tutor
    const existingAssignment = await db
      .select()
      .from(tutorAssignments)
      .where(and(eq(tutorAssignments.id, id), eq(tutorAssignments.tutorId, tutorId)))
      .limit(1);

    if (existingAssignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [updatedAssignment] = await db
      .update(tutorAssignments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tutorAssignments.id, id))
      .returning();

    return res.json(updatedAssignment);
  } catch (err: any) {
    console.error("Error updating assignment:", err);
    return res.status(500).json({
      message: "Failed to update assignment",
      error: err.message || String(err)
    });
  }
});

// Delete an assignment
router.delete("/assignments/:id", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    // Verify assignment belongs to tutor
    const existingAssignment = await db
      .select()
      .from(tutorAssignments)
      .where(and(eq(tutorAssignments.id, id), eq(tutorAssignments.tutorId, tutorId)))
      .limit(1);

    if (existingAssignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await db.delete(tutorAssignments).where(eq(tutorAssignments.id, id));

    return res.json({ message: "Assignment deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting assignment:", err);
    return res.status(500).json({
      message: "Failed to delete assignment",
      error: err.message || String(err)
    });
  }
});

// Get assignment report
router.get("/assignments/:id/report", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    // Verify assignment belongs to tutor
    const assignment = await db
      .select()
      .from(tutorAssignments)
      .where(and(eq(tutorAssignments.id, id), eq(tutorAssignments.tutorId, tutorId)))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Get all attempts for this assignment
    const assignmentAttemptsList = await db
      .select({
        id: assignmentAttempts.id,
        studentId: assignmentAttempts.studentId,
        attemptId: assignmentAttempts.attemptId,
        score: assignmentAttempts.score,
        status: assignmentAttempts.status,
        startedAt: assignmentAttempts.startedAt,
        submittedAt: assignmentAttempts.submittedAt,
        feedback: assignmentAttempts.feedback,
        username: users.username,
        email: users.email,
      })
      .from(assignmentAttempts)
      .leftJoin(users, eq(assignmentAttempts.studentId, users.id))
      .where(eq(assignmentAttempts.assignmentId, id));

    // Get exam questions if examId exists
    let questionsList: any[] = [];
    if (assignment[0].examId) {
      const exam = await db
        .select()
        .from(exams)
        .where(eq(exams.id, assignment[0].examId))
        .limit(1);

      if (exam.length > 0 && exam[0].questionIds) {
        questionsList = await db
          .select()
          .from(questions)
          .where(inArray(questions.id, exam[0].questionIds));
      }
    }

    // Calculate statistics
    const totalStudents = assignmentAttemptsList.length;
    const submittedCount = assignmentAttemptsList.filter(a => a.status === "submitted").length;
    const averageScore = totalStudents > 0
      ? assignmentAttemptsList.reduce((sum, a) => sum + (a.score || 0), 0) / totalStudents
      : 0;

    return res.json({
      assignment: assignment[0],
      attempts: assignmentAttemptsList,
      questions: questionsList,
      statistics: {
        totalStudents,
        submittedCount,
        pendingCount: totalStudents - submittedCount,
        averageScore: Math.round(averageScore * 100) / 100,
      },
    });
  } catch (err: any) {
    console.error("Error fetching assignment report:", err);
    return res.status(500).json({
      message: "Failed to fetch assignment report",
      error: err.message || String(err)
    });
  }
});

// Get student performance
router.get("/students/:id/performance", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id: studentId } = req.params;

    // Get all assignments for this student from this tutor
    const studentAssignments = await db
      .select()
      .from(tutorAssignments)
      .where(
        and(
          eq(tutorAssignments.tutorId, tutorId),
          or(
            eq(tutorAssignments.studentId, studentId),
            sql`${studentId} IN (
              SELECT ${group_members.studentId} 
              FROM ${group_members} 
              WHERE ${group_members.groupId} = ${tutorAssignments.groupId}
              AND ${group_members.status} = 'active'
            )`
          )
        )
      );

    // Get attempts for these assignments
    const assignmentIds = studentAssignments.map(a => a.id);
    const studentAttempts = assignmentIds.length > 0
      ? await db
        .select()
        .from(assignmentAttempts)
        .where(
          and(
            eq(assignmentAttempts.studentId, studentId),
            inArray(assignmentAttempts.assignmentId, assignmentIds)
          )
        )
      : [];

    return res.json({
      studentId,
      assignments: studentAssignments,
      attempts: studentAttempts,
    });
  } catch (err: any) {
    console.error("Error fetching student performance:", err);
    return res.status(500).json({
      message: "Failed to fetch student performance",
      error: err.message || String(err)
    });
  }
});

// Get group analytics
router.get("/groups/:id/analytics", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id: groupId } = req.params;

    // Verify group belongs to tutor
    const group = await db
      .select()
      .from(tutorGroups)
      .where(and(eq(tutorGroups.id, groupId), eq(tutorGroups.tutorId, tutorId)))
      .limit(1);

    if (group.length === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Get group members
    const members = await db
      .select()
      .from(group_members)
      .where(and(eq(group_members.groupId, groupId), eq(group_members.status, "active")));

    // Get assignments for this group
    const groupAssignments = await db
      .select()
      .from(tutorAssignments)
      .where(eq(tutorAssignments.groupId, groupId));

    // Get attempts for these assignments
    const assignmentIds = groupAssignments.map(a => a.id);
    const allAttempts = assignmentIds.length > 0
      ? await db
        .select()
        .from(assignmentAttempts)
        .where(inArray(assignmentAttempts.assignmentId, assignmentIds))
      : [];

    // Calculate statistics
    const totalStudents = members.length;
    const totalAssignments = groupAssignments.length;
    const averageScore = allAttempts.length > 0
      ? allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length
      : 0;

    return res.json({
      group: group[0],
      statistics: {
        totalStudents,
        totalAssignments,
        averageScore: Math.round(averageScore * 100) / 100,
        totalAttempts: allAttempts.length,
      },
      members,
      assignments: groupAssignments,
    });
  } catch (err: any) {
    console.error("Error fetching group analytics:", err);
    return res.status(500).json({
      message: "Failed to fetch group analytics",
      error: err.message || String(err)
    });
  }
});

// ========== TUTOR EXAM MANAGEMENT (V1) ==========

// Get active tutor profile and quota
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const [profile] = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, tutorId))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    return res.json(profile);
  } catch (err: any) {
    console.error("Error fetching tutor profile:", err);
    return res.status(500).json({ message: "Failed to fetch profile", error: err.message || String(err) });
  }
});

// List tutor's exams
router.get("/exams", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const exams = await db
      .select({
        id: tutorExams.id,
        title: tutorExams.title,
        status: tutorExams.status,
        expiresAt: tutorExams.expiresAt,
        totalQuestions: tutorExams.totalQuestions,
        maxCandidates: tutorExams.maxCandidates,
        createdAt: tutorExams.createdAt,
        submissionCount: sql<number>`(SELECT COUNT(*)::int FROM ${tutorExamSessions} WHERE ${tutorExamSessions.tutorExamId} = ${tutorExams.id} AND ${tutorExamSessions.status} = 'submitted')`
      })
      .from(tutorExams)
      .where(eq(tutorExams.tutorId, tutorId))
      .orderBy(desc(tutorExams.createdAt));

    return res.json(exams);
  } catch (err: any) {
    console.error("Error fetching tutor exams:", err);
    return res.status(500).json({ message: "Failed to fetch exams", error: err.message || String(err) });
  }
});

// Create a new tutor exam with weighted question selection
router.post("/exams", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const {
      title,
      examBodyId,
      categoryId,
      timeLimitMinutes,
      expiresAt,
      maxCandidates,
      subjectWeightage // Array of { subjectId: string, count: number }
    } = req.body;

    if (!title || !examBodyId || !categoryId || !subjectWeightage || !Array.isArray(subjectWeightage)) {
      return res.status(400).json({ message: "Invalid exam configuration" });
    }

    // Verify tutor profile and quota
    const [profile] = await db.select().from(tutorProfiles).where(eq(tutorProfiles.userId, tutorId)).limit(1);
    if (!profile || profile.status !== "approved") {
      return res.status(403).json({ message: "Tutor account not approved" });
    }

    const totalRequestedQuestions = subjectWeightage.reduce((sum, s) => sum + s.count, 0);

    // Initial exam record
    const [newExam] = await db
      .insert(tutorExams)
      .values({
        tutorId,
        examBodyId,
        categoryId,
        title,
        totalQuestions: totalRequestedQuestions,
        timeLimitMinutes: timeLimitMinutes || 60,
        expiresAt: new Date(expiresAt),
        status: "active", // Activate immediately by default for v1
        maxCandidates: maxCandidates || profile.studentQuota,
      })
      .returning();

    // Select and lock questions
    const lockedQuestions: any[] = [];
    const weightageRecords: any[] = [];

    for (const sw of subjectWeightage) {
      const { subjectId, count: qCount } = sw;

      // Get all live questions for this subject
      const availableQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.subjectId, subjectId),
            eq(questions.status, "live")
          )
        );

      if (availableQuestions.length < qCount) {
        // Rollback would be better but let's at least error out
        // Actually for simplicity, we'll just take what's available or error
        return res.status(400).json({
          message: `Not enough questions available for subject ID ${subjectId}. Requested ${qCount}, available ${availableQuestions.length}`
        });
      }

      // Randomly select N questions
      const selected = [...availableQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, qCount);

      selected.forEach(q => {
        lockedQuestions.push({
          tutorExamId: newExam.id,
          questionId: q.id,
          subjectId: subjectId,
        });
      });

      weightageRecords.push({
        tutorExamId: newExam.id,
        subjectId,
        questionCount: qCount,
      });
    }

    // Persist locked state
    await db.transaction(async (tx) => {
      await tx.insert(tutorExamSubjects).values(weightageRecords);
      await tx.insert(tutorExamQuestions).values(lockedQuestions);
    });

    return res.json(newExam);
  } catch (err: any) {
    console.error("Error creating tutor exam:", err);
    return res.status(500).json({ message: "Failed to create exam", error: err.message || String(err) });
  }
});

// Get detailed stats for a specific exam
router.get("/exams/:id/stats", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    const [exam] = await db.select().from(tutorExams).where(and(eq(tutorExams.id, id), eq(tutorExams.tutorId, tutorId))).limit(1);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const sessions = await db
      .select()
      .from(tutorExamSessions)
      .where(eq(tutorExamSessions.tutorExamId, id))
      .orderBy(desc(tutorExamSessions.submittedAt));

    const stats = {
      total: sessions.length,
      submitted: sessions.filter(s => s.status === "submitted").length,
      inProgress: sessions.filter(s => s.status === "in_progress").length,
      averageScore: sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.filter(s => s.status === "submitted").length : 0,
    };

    return res.json({ exam, sessions, stats });
  } catch (err: any) {
    console.error("Error fetching exam stats:", err);
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message || String(err) });
  }
});


// Publish results: Update status to 'closed' and generate PDFs
router.post("/exams/:id/publish-results", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id } = req.params;

    const [exam] = await db
      .select()
      .from(tutorExams)
      .where(and(eq(tutorExams.id, id), eq(tutorExams.tutorId, tutorId)))
      .limit(1);

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    // Fetch all submitted sessions
    const sessions = await db
      .select()
      .from(tutorExamSessions)
      .where(eq(tutorExamSessions.tutorExamId, id));

    const submittedSessions = sessions.filter(s => s.status === "submitted");

    if (submittedSessions.length === 0) {
      return res.status(400).json({ message: "No submitted sessions to publish" });
    }

    // Generate PDFs
    const masterLink = await PdfService.generateMasterResultSheet(exam, sessions);
    const individualLink = await PdfService.generateIndividualSlips(exam, sessions);

    // Update exam status
    const [updatedExam] = await db
      .update(tutorExams)
      .set({ status: "closed" })
      .where(eq(tutorExams.id, id))
      .returning();

    return res.json({
      message: "Results published successfully",
      exam: updatedExam,
      masterPdf: masterLink,
      individualPdf: individualLink
    });
  } catch (err: any) {
    console.error("Error publishing results:", err);
    return res.status(500).json({ message: "Failed to publish results", error: err.message || String(err) });
  }
});

export default router;

