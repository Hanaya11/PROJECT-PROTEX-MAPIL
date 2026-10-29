import type { Request, Response } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { Readable } from "node:stream";
import db from "../config/database.js";
import cloudinary from "../config/cloudinary.js";

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

type ReportRequest = Request & {
  user?: {
    id_user: number;
    email: string;
    role: "user" | "admin";
  };
  file?: UploadedFile;
};

type Report = RowDataPacket & {
  id_report: number;
  id_user: number;
  id_pengklaim: number | null;
  jenis_laporan: "hilang" | "ditemukan";
  status: "aktif" | "diklaim" | "selesai";
  status_klaim: "menunggu" | "diterima" | "ditolak" | null;
  image_url: string | null;
  image_public_id: string | null;
};

const reportQuery = `
  SELECT r.*, u.nama AS nama_pelapor, c.nama_category,
         p.nama AS nama_pengklaim
  FROM reports r
  JOIN users u ON r.id_user = u.id_user
  JOIN categories c ON r.id_category = c.id_category
  LEFT JOIN users p ON r.id_pengklaim = p.id_user
`;

const validId = (id: number) => Number.isInteger(id) && id > 0;

const validImage = (file?: UploadedFile) =>
  !file || (file.mimetype.startsWith("image/") && file.size <= 5 * 1024 * 1024);

const handleError = (res: Response, error: unknown, message: string) => {
  console.error(error);
  return res.status(500).json({ message });
};

const getReport = async (id: number) => {
  const [rows] = await db.execute<Report[]>(
    "SELECT * FROM reports WHERE id_report = ?",
    [id],
  );

  return rows[0];
};

const getCategoryId = async (
  idCategory: unknown,
  categoryName: unknown,
): Promise<number | null> => {
  if (idCategory !== undefined && idCategory !== null && idCategory !== "") {
    const id = Number(idCategory);

    if (!validId(id)) return null;

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id_category FROM categories WHERE id_category = ?",
      [id],
    );

    return rows.length ? id : null;
  }

  if (typeof categoryName !== "string" || !categoryName.trim()) {
    return null;
  }

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id_category FROM categories WHERE nama_category = ?",
    [categoryName.trim()],
  );

  const category = rows[0];
  return category ? Number(category.id_category) : null;
};

const uploadImage = (file: UploadedFile) =>
  new Promise<{ url: string; id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "protex/reports" },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Upload gambar gagal."));
        }

        resolve({
          url: result.secure_url,
          id: result.public_id,
        });
      },
    );

    Readable.from(file.buffer).pipe(stream);
  });

const deleteImage = async (id: string | null) => {
  if (id) await cloudinary.uploader.destroy(id);
};

// MELIHAT SEMUA LAPORAN
export const getAllReports = async (_req: Request, res: Response) => {
  try {
    const [rows] = await db.execute(
      `${reportQuery} ORDER BY r.created_at DESC`,
    );

    return res.json({ data: rows });
  } catch (error) {
    return handleError(res, error, "Gagal mengambil laporan.");
  }
};

// DETAIL LAPORAN
export const getReportById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!validId(id)) {
      return res.status(400).json({ message: "ID laporan tidak valid." });
    }

    const [rows] = await db.execute(`${reportQuery} WHERE r.id_report = ?`, [
      id,
    ]);
    const report = (rows as Report[])[0];

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan." });
    }

    return res.json({ data: report });
  } catch (error) {
    return handleError(res, error, "Gagal mengambil detail laporan.");
  }
};

// TAMBAH LAPORAN
export const createReport = async (req: Request, res: Response) => {
  const request = req as ReportRequest;
  let imageId: string | null = null;

  try {
    const userId = request.user?.id_user;
    const body = request.body ?? {};

    if (!userId) {
      return res.status(401).json({
        message: "Silakan login terlebih dahulu.",
      });
    }

    if (
      !body.judul?.trim() ||
      !body.deskripsi?.trim() ||
      !body.jenis_laporan ||
      !body.lokasi?.trim() ||
      !body.tanggal_kejadian ||
      !validImage(request.file)
    ) {
      return res.status(400).json({
        message: "Semua data laporan wajib diisi dengan benar.",
      });
    }

    if (!["hilang", "ditemukan"].includes(body.jenis_laporan)) {
      return res.status(400).json({
        message: "Jenis laporan harus hilang atau ditemukan.",
      });
    }

    if (Number.isNaN(Date.parse(body.tanggal_kejadian))) {
      return res.status(400).json({
        message: "Tanggal kejadian tidak valid.",
      });
    }

    const categoryId = await getCategoryId(
      body.id_category,
      body.nama_category,
    );

    if (categoryId === null) {
      return res.status(400).json({
        message: "Kategori tidak ditemukan atau tidak valid.",
      });
    }

    let imageUrl: string | null = null;

    if (request.file) {
      const image = await uploadImage(request.file);
      imageUrl = image.url;
      imageId = image.id;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO reports
       (id_user, id_category, judul, deskripsi, jenis_laporan, lokasi,
        tanggal_kejadian, image_url, image_public_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        categoryId,
        body.judul.trim(),
        body.deskripsi.trim(),
        body.jenis_laporan,
        body.lokasi.trim(),
        body.tanggal_kejadian,
        imageUrl,
        imageId,
      ],
    );

    return res.status(201).json({
      message: "Laporan berhasil ditambahkan.",
      id_report: result.insertId,
    });
  } catch (error) {
    if (imageId) await deleteImage(imageId).catch(() => {});
    return handleError(res, error, "Gagal menambahkan laporan.");
  }
};

// EDIT LAPORAN
export const updateReport = async (req: Request, res: Response) => {
  const request = req as ReportRequest;
  let newImageId: string | null = null;

  try {
    const id = Number(request.params.id);
    const userId = request.user?.id_user;
    const isAdmin = request.user?.role === "admin";
    const body = request.body ?? {};

    if (!validId(id)) {
      return res.status(400).json({ message: "ID laporan tidak valid." });
    }

    if (
      !body.judul?.trim() ||
      !body.deskripsi?.trim() ||
      !body.jenis_laporan ||
      !body.lokasi?.trim() ||
      !body.tanggal_kejadian ||
      !validImage(request.file)
    ) {
      return res.status(400).json({
        message: "Semua data laporan wajib diisi dengan benar.",
      });
    }

    if (!["hilang", "ditemukan"].includes(body.jenis_laporan)) {
      return res.status(400).json({
        message: "Jenis laporan harus hilang atau ditemukan.",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_kejadian) ||
      Number.isNaN(Date.parse(body.tanggal_kejadian))
    ) {
      return res.status(400).json({
        message: "Format tanggal harus YYYY-MM-DD.",
      });
    }

    const categoryId = await getCategoryId(
      body.id_category,
      body.nama_category,
    );

    if (categoryId === null) {
      return res.status(400).json({
        message: "Kategori tidak ditemukan atau tidak valid.",
      });
    }

    const report = await getReport(id);

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan." });
    }

    if (!isAdmin && report.id_user !== userId) {
      return res.status(403).json({
        message: "Kamu tidak memiliki akses ke laporan ini.",
      });
    }

    if (report.status !== "aktif" || report.id_pengklaim !== null) {
      return res.status(409).json({
        message: "Laporan tidak dapat diedit.",
      });
    }

    let imageUrl = report.image_url;
    let imagePublicId = report.image_public_id;

    if (request.file) {
      const image = await uploadImage(request.file);
      imageUrl = image.url;
      imagePublicId = image.id;
      newImageId = image.id;
    }

    await db.execute(
      `UPDATE reports SET id_category=?, judul=?, deskripsi=?,
       jenis_laporan=?, lokasi=?, tanggal_kejadian=?,
       image_url=?, image_public_id=? WHERE id_report=?`,
      [
        categoryId,
        body.judul.trim(),
        body.deskripsi.trim(),
        body.jenis_laporan,
        body.lokasi.trim(),
        body.tanggal_kejadian,
        imageUrl,
        imagePublicId,
        id,
      ],
    );

    if (newImageId && report.image_public_id) {
      await deleteImage(report.image_public_id).catch(console.error);
    }

    return res.json({ message: "Laporan berhasil diperbarui." });
  } catch (error) {
    if (newImageId) await deleteImage(newImageId).catch(() => {});
    return handleError(res, error, "Gagal memperbarui laporan.");
  }
};

// HAPUS LAPORAN
export const deleteReport = async (req: Request, res: Response) => {
  const request = req as ReportRequest;

  try {
    const id = Number(request.params.id);

    if (request.user?.role !== "admin") {
      return res.status(403).json({
        message: "Hanya admin yang dapat menghapus laporan.",
      });
    }

    if (!validId(id)) {
      return res.status(400).json({ message: "ID laporan tidak valid." });
    }

    const report = await getReport(id);

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan." });
    }

    await db.execute("DELETE FROM reports WHERE id_report = ?", [id]);
    await deleteImage(report.image_public_id).catch(console.error);

    return res.json({ message: "Laporan berhasil dihapus." });
  } catch (error) {
    return handleError(res, error, "Gagal menghapus laporan.");
  }
};

// AJUKAN KLAIM
export const claimReport = async (req: Request, res: Response) => {
  const request = req as ReportRequest;

  try {
    const id = Number(request.params.id);
    const userId = request.user?.id_user;

    if (!userId) {
      return res.status(401).json({
        message: "Silakan login terlebih dahulu.",
      });
    }

    if (!validId(id)) {
      return res.status(400).json({ message: "ID laporan tidak valid." });
    }

    const report = await getReport(id);

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan." });
    }

    if (report.jenis_laporan !== "ditemukan" || report.id_user === userId) {
      return res.status(400).json({
        message: "Laporan ini tidak dapat diklaim.",
      });
    }

    if (report.status !== "aktif" || report.id_pengklaim !== null) {
      return res.status(409).json({ message: "Barang sudah diklaim." });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE reports SET id_pengklaim=?, status_klaim='menunggu'
       WHERE id_report=? AND status='aktif' AND id_pengklaim IS NULL`,
      [userId, id],
    );

    if (!result.affectedRows) {
      return res.status(409).json({ message: "Barang sudah diklaim." });
    }

    return res.json({
      message: "Klaim berhasil diajukan dan menunggu persetujuan.",
    });
  } catch (error) {
    return handleError(res, error, "Gagal mengajukan klaim.");
  }
};

// TERIMA ATAU TOLAK KLAIM
export const reviewClaim = async (req: Request, res: Response) => {
  const request = req as ReportRequest;

  try {
    const id = Number(request.params.id);
    const keputusan = request.body?.keputusan;
    const userId = request.user?.id_user;

    if (!validId(id) || !["diterima", "ditolak"].includes(keputusan)) {
      return res.status(400).json({
        message: "Keputusan klaim tidak valid.",
      });
    }

    const report = await getReport(id);

    if (!report) {
      return res.status(404).json({ message: "Laporan tidak ditemukan." });
    }

    if (request.user?.role !== "admin" && report.id_user !== userId) {
      return res.status(403).json({
        message: "Kamu tidak memiliki akses untuk meninjau klaim ini.",
      });
    }

    if (report.status_klaim !== "menunggu" || report.id_pengklaim === null) {
      return res.status(409).json({
        message: "Tidak ada klaim yang menunggu persetujuan.",
      });
    }

    if (keputusan === "diterima") {
      await db.execute(
        `UPDATE reports SET status_klaim='diterima', status='diklaim'
         WHERE id_report=?`,
        [id],
      );
    } else {
      await db.execute(
        `UPDATE reports SET status_klaim='ditolak',
         id_pengklaim=NULL, status='aktif' WHERE id_report=?`,
        [id],
      );
    }

    return res.json({
      message: `Klaim berhasil ${keputusan}.`,
    });
  } catch (error) {
    return handleError(res, error, "Gagal memproses klaim.");
  }
};

// SELESAIKAN LAPORAN
export const completeReport = async (req: Request, res: Response) => {
  const request = req as ReportRequest;

  try {
    const id = Number(request.params.id);
    const userId = request.user?.id_user;
    const isAdmin = request.user?.role === "admin";

    if (!validId(id)) {
      return res.status(400).json({ message: "ID laporan tidak valid." });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE reports SET status='selesai'
       WHERE id_report=? AND status='diklaim'
       AND (id_user=? OR ?=1)`,
      [id, userId ?? 0, isAdmin ? 1 : 0],
    );

    if (!result.affectedRows) {
      return res.status(409).json({
        message:
          "Laporan tidak ditemukan, belum diklaim, atau tidak memiliki akses.",
      });
    }

    return res.json({
      message: "Laporan berhasil diselesaikan.",
    });
  } catch (error) {
    return handleError(res, error, "Gagal menyelesaikan laporan.");
  }
};
