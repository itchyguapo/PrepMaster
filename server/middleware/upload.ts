import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const pdfDir = path.resolve(uploadsDir, "pdf");
const audioDir = path.resolve(uploadsDir, "audio");
const imagesDir = path.resolve(uploadsDir, "images");

[uploadsDir, pdfDir, audioDir, imagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Determine upload directory based on file type
    if (file.mimetype === "application/pdf") {
      uploadPath = pdfDir;
    } else if (file.mimetype.startsWith("audio/")) {
      uploadPath = audioDir;
    } else if (file.mimetype.startsWith("image/")) {
      uploadPath = imagesDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "-");
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    // PDFs
    "application/pdf",
    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: PDF, Audio (MP3, WAV, OGG), Images (JPEG, PNG, GIF, WebP)`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Helper to get file URL
export function getFileUrl(filename: string, type: "pdf" | "audio" | "image"): string {
  const typeDir = type === "pdf" ? "pdf" : type === "audio" ? "audio" : "images";
  return `/uploads/${typeDir}/${filename}`;
}

// Helper to get file path
export function getFilePath(filename: string, type: "pdf" | "audio" | "image"): string {
  const typeDir = type === "pdf" ? "pdf" : type === "audio" ? "audio" : "images";
  return path.resolve(uploadsDir, typeDir, filename);
}

