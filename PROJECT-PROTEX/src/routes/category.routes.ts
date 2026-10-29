import { Router } from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authentication } from "../middleware/authentication.js";
import { authorization } from "../middleware/authorization.js";

const router = Router();

// Melihat kategori
router.get("/", getAllCategories);

// Pengelolaan kategori khusus admin
router.post("/", authentication, authorization("admin"), createCategory);

router.put("/:id", authentication, authorization("admin"), updateCategory);

router.delete("/:id", authentication, authorization("admin"), deleteCategory);

export default router;
