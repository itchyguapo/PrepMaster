import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  tutorGroups,
  groupMembers,
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
  subjects
} from "@shared/schema";
import { eq, and, or, inArray, desc, sql, count, gte, lt } from "drizzle-orm";
import { requireTutor } from "../middleware/tutorAuth";

const router = Router();

// All routes require tutor authentication
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
        categoryId: tutorGroups.trackId,
        maxStudents: tutorGroups.maxStudents,
        isActive: tutorGroups.isActive,
        groupCode: tutorGroups.groupCode,
        createdAt: tutorGroups.createdAt,
        updatedAt: tutorGroups.updatedAt,
        studentCount: sql<number>`(
          SELECT COUNT(*)::int 
          FROM ${groupMembers} 
          WHERE ${groupMembers.groupId} = ${tutorGroups.id} 
          AND ${groupMembers.status} = 'active'
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
        trackId: categoryId || null,
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
        trackId: categoryId !== undefined ? categoryId : existingGroup[0].trackId,
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
        id: groupMembers.id,
        studentId: groupMembers.studentId,
        joinedAt: groupMembers.joinedAt,
        status: groupMembers.status,
        role: groupMembers.role,
        username: users.username,
        email: users.email,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.studentId, users.id))
      .where(eq(groupMembers.groupId, id))
      .orderBy(desc(groupMembers.joinedAt));

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
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, targetStudentId)))
      .limit(1);

    if (existingMember.length > 0) {
      // Reactivate if removed
      if (existingMember[0].status === "removed") {
        const [updated] = await db
          .update(groupMembers)
          .set({ status: "active" })
          .where(eq(groupMembers.id, existingMember[0].id))
          .returning();
        return res.json(updated);
      }
      return res.status(400).json({ message: "Student is already a member of this group" });
    }

    const [newMember] = await db
      .insert(groupMembers)
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

// Remove student from group
router.delete("/groups/:id/members/:studentId", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id, studentId } = req.params;

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
      .update(groupMembers)
      .set({ status: "removed" })
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.studentId, studentId)));

    return res.json({ message: "Student removed from group" });
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
              FROM ${groupMembers} 
              WHERE ${groupMembers.groupId} = ${tutorAssignments.groupId}
              AND ${groupMembers.status} = 'active'
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
              SELECT ${groupMembers.studentId} 
              FROM ${groupMembers} 
              WHERE ${groupMembers.groupId} = ${tutorAssignments.groupId}
              AND ${groupMembers.status} = 'active'
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
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.status, "active")));

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

// Get live assignment status
router.get("/assignments/:id/live-status", async (req: Request, res: Response) => {
  try {
    const tutorId = (req as any).tutorId;
    const { id: assignmentId } = req.params;

    // Verify assignment belongs to tutor
    const assignment = await db
      .select()
      .from(tutorAssignments)
      .where(and(eq(tutorAssignments.id, assignmentId), eq(tutorAssignments.tutorId, tutorId)))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Get in-progress attempts
    const liveAttempts = await db
      .select({
        id: assignmentAttempts.id,
        studentId: assignmentAttempts.studentId,
        startedAt: assignmentAttempts.startedAt,
        username: users.username,
        email: users.email,
      })
      .from(assignmentAttempts)
      .leftJoin(users, eq(assignmentAttempts.studentId, users.id))
      .where(
        and(
          eq(assignmentAttempts.assignmentId, assignmentId),
          eq(assignmentAttempts.status, "in_progress")
        )
      );

    return res.json({
      assignmentId,
      liveAttempts,
      count: liveAttempts.length,
    });
  } catch (err: any) {
    console.error("Error fetching live status:", err);
    return res.status(500).json({
      message: "Failed to fetch live status",
      error: err.message || String(err)
    });
  }
});

export default router;

