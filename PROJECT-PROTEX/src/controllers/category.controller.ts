import type { Request, Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../config/database.js";

// MELIHAT SEMUA KATEGORI
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM categories ORDER BY id_category ASC",
    );

    return res.status(200).json({
      message: "Data kategori berhasil diambil.",
      data: rows,
    });
  } catch (error) {
    console.error("Error getAllCategories:", error);

    return res.status(500).json({
      message: "Gagal mengambil data kategori.",
    });
  }
};

// MELIHAT DETAIL KATEGORI
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM categories WHERE id_category = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Detail kategori berhasil diambil.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error getCategoryById:", error);

    return res.status(500).json({
      message: "Gagal mengambil detail kategori.",
    });
  }
};

// MENAMBAH KATEGORI (ADMIN)
export const createCategory = async (req: Request, res: Response) => {
  try {
    const nama = req.body?.nama_category;

    if (typeof nama !== "string" || nama.trim() === "") {
      return res.status(400).json({
        message: "Nama kategori wajib diisi.",
      });
    }

    const namaCategory = nama.trim();

    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO categories (nama_category) VALUES (?)",
      [namaCategory],
    );

    return res.status(201).json({
      message: "Kategori berhasil ditambahkan.",
      data: {
        id_category: result.insertId,
        nama_category: namaCategory,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Nama kategori sudah ada.",
      });
    }

    console.error("Error createCategory:", error);

    return res.status(500).json({
      message: "Gagal menambahkan kategori.",
    });
  }
};

// MENGUBAH KATEGORI (ADMIN)
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const nama = req.body?.nama_category;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    if (typeof nama !== "string" || nama.trim() === "") {
      return res.status(400).json({
        message: "Nama kategori wajib diisi.",
      });
    }

    const namaCategory = nama.trim();

    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE categories SET nama_category = ? WHERE id_category = ?",
      [namaCategory, id],
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.execute<RowDataPacket[]>(
        "SELECT id_category FROM categories WHERE id_category = ?",
        [id],
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Kategori tidak ditemukan.",
        });
      }
    }

    return res.status(200).json({
      message: "Kategori berhasil diperbarui.",
      data: {
        id_category: id,
        nama_category: namaCategory,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan.",
      });
    }

    console.error("Error updateCategory:", error);

    return res.status(500).json({
      message: "Gagal memperbarui kategori.",
    });
  }
};

// MENGHAPUS KATEGORI (ADMIN)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID kategori tidak valid.",
      });
    }

    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM categories WHERE id_category = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Kategori tidak ditemukan.",
      });
    }

    return res.status(200).json({
      message: "Kategori berhasil dihapus.",
    });
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
      return res.status(409).json({
        message: "Kategori masih digunakan oleh laporan.",
      });
    }

    console.error("Error deleteCategory:", error);

    return res.status(500).json({
      message: "Gagal menghapus kategori.",
    });
  }
};
