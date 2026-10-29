import { Router } from "express";
import {
  register,
  login,
  getProfile,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { authentication } from "../middleware/authentication.js";
import { authorization } from "../middleware/authorization.js";

const router = Router();

// Registrasi dan login
router.post("/register", register);
router.post("/login", login);

// Profil user yang sedang login
router.get("/profile", authentication, getProfile);

// Pengelolaan user khusus admin
router.get("/", authentication, authorization("admin"), getAllUsers);

router.put("/:id", authentication, authorization("admin"), updateUser);

router.delete("/:id", authentication, authorization("admin"), deleteUser);

export default router;
