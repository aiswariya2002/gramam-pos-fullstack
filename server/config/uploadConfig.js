// config/uploadConfig.js
import multer from "multer";
import fs from "fs";
import path from "path";

const uploadsDir = path.join(process.cwd(), "uploads");

// ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    cb(null, name + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // allow only images
  if (/image\/(jpeg|png|webp|gif|jpg)/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const limits = {
  fileSize: 2 * 1024 * 1024, // 2 MB limit (adjust as needed)
};

const upload = multer({ storage, fileFilter, limits });

export default upload;
