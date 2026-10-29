import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import db from "../config/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// TIPE DATA USER
type User = RowDataPacket & {
  id_user: number;
  nama: string;
  email: string;
  password: string;
  role: "user" | "admin";
};

// REQUEST YANG SUDAH LOGIN
type AuthRequest = Request & {
  user?: {
    id_user: number;
    email: string;
    role: "user" | "admin";
  };
};

// VALIDASI JWT SECRET
const getTokenSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET belum diatur di file .env");
  }

  return secret;
};

// REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { nama, email, password } = req.body;

    if (
      typeof nama !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !nama.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Nama dan email wajib diisi. Password minimal 8 karakter.",
      });
    }

    const cleanNama = nama.trim();
    const cleanEmail = email.trim().toLowerCase();

    const [existingUsers] = await db.execute<RowDataPacket[]>(
      "SELECT id_user FROM users WHERE email = ?",
      [cleanEmail],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email sudah terdaftar.",
      });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (nama, email, password, role)
       VALUES (?, ?, ?, 'user')`,
      [cleanNama, cleanEmail, password],
    );

    return res.status(201).json({
      message: "Registrasi berhasil.",
      data: {
        id_user: result.insertId,
        nama: cleanNama,
        email: cleanEmail,
        role: "user",
      },
    });
  } catch (error) {
    const err = error as { code?: string };

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email sudah terdaftar.",
      });
    }

    console.error("Register error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan saat registrasi.",
    });
  }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email dan password wajib diisi.",
      });
    }

    const [users] = await db.execute<User[]>(
      `SELECT id_user, nama, email, password, role
       FROM users
       WHERE email = ?`,
      [email.trim().toLowerCase()],
    );

    const user = users[0];

    if (!user || password !== user.password) {
      return res.status(401).json({
        message: "Email atau password salah.",
      });
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        email: user.email,
        role: user.role,
      },
      getTokenSecret(),
      { expiresIn: "1d" },
    );

    return res.status(200).json({
      message: "Login berhasil.",
      token,
      data: {
        id_user: user.id_user,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Terjadi kesalahan saat login.",
    });
  }
};

// MELIHAT PROFIL SENDIRI
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const id_user = req.user?.id_user;

    if (!id_user) {
      return res.status(401).json({
        message: "Silakan login terlebih dahulu.",
      });
    }

    const [users] = await db.execute<RowDataPacket[]>(
      `SELECT id_user, nama, email, role, created_at
       FROM users
       WHERE id_user = ?`,
      [id_user],
    );

    const user = users[0];

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Profil berhasil diambil.",
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Gagal mengambil profil.",
    });
  }
};

// MELIHAT SEMUA USER (ADMIN)
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const [users] = await db.execute<RowDataPacket[]>(
      `SELECT id_user, nama, email, role, created_at
       FROM users
       ORDER BY id_user DESC`,
    );

    return res.status(200).json({
      message: "Data user berhasil diambil.",
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Gagal mengambil data user.",
    });
  }
};

// MENGUBAH DATA USER (ADMIN)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const id_user = Number(req.params.id);
    const { nama, email, role } = req.body;

    if (!Number.isInteger(id_user) || id_user <= 0) {
      return res.status(400).json({
        message: "ID user tidak valid.",
      });
    }

    if (
      typeof nama !== "string" ||
      !nama.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof role !== "string" ||
      !["user", "admin"].includes(role)
    ) {
      return res.status(400).json({
        message: "Nama, email, dan role harus valid.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE users
       SET nama = ?, email = ?, role = ?
       WHERE id_user = ?`,
      [nama.trim(), cleanEmail, role, id_user],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan atau tidak ada perubahan.",
      });
    }

    return res.status(200).json({
      message: "Data user berhasil diperbarui.",
    });
  } catch (error) {
    const err = error as { code?: string };

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email sudah digunakan user lain.",
      });
    }

    console.error("Update user error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui user.",
    });
  }
};

// MENGHAPUS USER (ADMIN)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id_user = Number(req.params.id);

    if (!Number.isInteger(id_user) || id_user <= 0) {
      return res.status(400).json({
        message: "ID user tidak valid.",
      });
    }

    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM users WHERE id_user = ?",
      [id_user],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "User berhasil dihapus.",
    });
  } catch (error) {
    const err = error as { code?: string };

    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "User tidak bisa dihapus karena masih terkait dengan laporan.",
      });
    }

    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "Gagal menghapus user.",
    });
  }
};
