import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { tutorInquiries } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

// Submit tutor/school inquiry (public)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { institutionName, contactName, email, phone, studentCount, useCase, preferredContact } = req.body;

    if (!institutionName || !contactName || !email) {
      return res.status(400).json({ message: "Institution name, contact name, and email are required" });
    }

    const [inquiry] = await db
      .insert(tutorInquiries)
      .values({
        institutionName,
        contactName,
        email,
        phone: phone || null,
        studentCount: studentCount || null,
        useCase: useCase || null,
        preferredContact: preferredContact || "email",
        status: "pending",
      })
      .returning();

    return res.status(201).json({ message: "Inquiry submitted successfully", inquiry });
  } catch (err: any) {
    console.error("Error creating tutor inquiry:", err);
    return res.status(500).json({ message: "Failed to submit inquiry", error: err.message || String(err) });
  }
});

// Get all inquiries (admin only)
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const allInquiries = await db
      .select()
      .from(tutorInquiries)
      .orderBy(desc(tutorInquiries.createdAt));

    return res.json(allInquiries);
  } catch (err: any) {
    console.error("Error fetching tutor inquiries:", err);
    return res.status(500).json({ message: "Failed to fetch inquiries", error: err.message || String(err) });
  }
});

// Get single inquiry (admin only)
router.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inquiryRecords = await db
      .select()
      .from(tutorInquiries)
      .where(eq(tutorInquiries.id, id))
      .limit(1);

    if (inquiryRecords.length === 0) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    return res.json(inquiryRecords[0]);
  } catch (err: any) {
    console.error("Error fetching tutor inquiry:", err);
    return res.status(500).json({ message: "Failed to fetch inquiry", error: err.message || String(err) });
  }
});

// Update inquiry (admin only)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updates: any = { updatedAt: new Date() };

    if (status && ["pending", "contacted", "quoted", "converted", "closed"].includes(status)) {
      updates.status = status;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const [updated] = await db
      .update(tutorInquiries)
      .set(updates)
      .where(eq(tutorInquiries.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Inquiry not found" });
    }

    return res.json({ message: "Inquiry updated successfully", inquiry: updated });
  } catch (err: any) {
    console.error("Error updating tutor inquiry:", err);
    return res.status(500).json({ message: "Failed to update inquiry", error: err.message || String(err) });
  }
});

export default router;

