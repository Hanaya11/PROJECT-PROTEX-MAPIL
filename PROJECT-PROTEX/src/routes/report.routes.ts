import { Router } from "express";
import multer from "multer";
import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  claimReport,
  reviewClaim,
  completeReport,
} from "../controllers/report.controller.js";
import { authentication } from "../middleware/authentication.js";
import { authorization } from "../middleware/authorization.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Melihat laporan
router.get("/", getAllReports);
router.get("/:id", getReportById);

// Membuat dan mengubah laporan
router.post("/", authentication, upload.single("image"), createReport);

router.put("/:id", authentication, upload.single("image"), updateReport);

router.delete("/:id", authentication, authorization("admin"), deleteReport);

// Klaim laporan
router.post("/:id/claim", authentication, claimReport);

router.patch("/:id/claim", authentication, reviewClaim);

// Menyelesaikan laporan
router.patch("/:id/complete", authentication, completeReport);

export default router;
