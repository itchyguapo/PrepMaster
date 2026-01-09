import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Handle both ESM and CJS environments
let __dirname_resolved: string;
try {
    const __filename = fileURLToPath(import.meta.url);
    __dirname_resolved = path.dirname(__filename);
} catch {
    __dirname_resolved = process.cwd();
}

const UPLOADS_DIR = path.resolve(__dirname_resolved, "../../uploads/tutor-results");

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class PdfService {
    /**
     * Generates a master result sheet for a tutor exam
     */
    static async generateMasterResultSheet(exam: any, sessions: any[]): Promise<string> {
        const fileName = `results_${exam.id}_master.pdf`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        const doc = new PDFDocument({ margin: 50 });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text("PrepMaster CBT - Exam Results", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text(exam.title, { align: "center" });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
        doc.moveDown();

        // Stats
        const submittedCount = sessions.filter(s => s.status === "submitted").length;
        doc.fontSize(14).text("Summary Statistics:");
        doc.fontSize(12).text(`Total Questions: ${exam.totalQuestions}`);
        doc.fontSize(12).text(`Total Candidates: ${submittedCount}`);
        doc.moveDown();

        // Table Header
        const tableTop = 250;
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("Candidate Name", 50, tableTop);
        doc.text("Class", 200, tableTop);
        doc.text("School", 300, tableTop);
        doc.text("Score", 450, tableTop);
        doc.text("%", 500, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Rows
        let y = tableTop + 25;
        doc.font("Helvetica");

        sessions.forEach((session, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            if (session.status === "submitted") {
                const percentage = Math.round((session.score / exam.totalQuestions) * 100);
                doc.text(session.candidateName, 50, y);
                doc.text(session.candidateClass, 200, y);
                doc.text(session.candidateSchool, 300, y);
                doc.text(`${session.score} / ${exam.totalQuestions}`, 450, y);
                doc.text(`${percentage}%`, 500, y);
                y += 20;
            }
        });

        doc.end();

        return new Promise((resolve) => {
            stream.on("finish", () => resolve(`/uploads/tutor-results/${fileName}`));
        });
    }

    /**
     * Generates individual result slips for all students in an exam
     */
    static async generateIndividualSlips(exam: any, sessions: any[]): Promise<string> {
        const fileName = `results_${exam.id}_individual.pdf`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        const doc = new PDFDocument({ margin: 50 });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        sessions.forEach((session, index) => {
            if (session.status !== "submitted") return;

            if (index > 0) doc.addPage();

            doc.fontSize(18).text("PrepMaster CBT", { align: "center" });
            doc.fontSize(14).text("Individual Result Slip", { align: "center" });
            doc.moveDown();

            doc.fontSize(12).font("Helvetica-Bold").text("Exam Title: ", { continued: true }).font("Helvetica").text(exam.title);
            doc.moveDown();

            doc.fontSize(12).font("Helvetica-Bold").text("Candidate Information:");
            doc.font("Helvetica").text(`Name: ${session.candidateName}`);
            doc.text(`Class: ${session.candidateClass}`);
            doc.text(`School: ${session.candidateSchool}`);
            doc.moveDown();

            const percentage = Math.round((session.score / exam.totalQuestions) * 100);
            doc.fontSize(14).font("Helvetica-Bold").text("Performance Summary:");
            doc.fontSize(12).font("Helvetica").text(`Total Questions: ${exam.totalQuestions}`);
            doc.text(`Correct Answers: ${session.score}`);
            doc.fontSize(16).text(`FINAL SCORE: ${percentage}%`, { align: "right" });

            doc.moveDown();
            doc.fontSize(10).font("Helvetica-Oblique").text("Disclaimer: This is a system-generated result slip.", { align: "center" });
        });

        doc.end();

        return new Promise((resolve) => {
            stream.on("finish", () => resolve(`/uploads/tutor-results/${fileName}`));
        });
    }
}
