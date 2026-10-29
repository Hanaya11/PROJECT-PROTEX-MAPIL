import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthRequest = Request & {
  user?: {
    id_user: number;
    email: string;
    role: "user" | "admin";
  };
};

export const authentication = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Token tidak ditemukan. Silakan login.",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        message: "Konfigurasi JWT belum tersedia.",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.id_user !== "number" ||
      typeof decoded.email !== "string" ||
      (decoded.role !== "user" && decoded.role !== "admin")
    ) {
      return res.status(401).json({ message: "Token tidak valid." });
    }

    (req as AuthRequest).user = {
      id_user: decoded.id_user,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Token tidak valid atau sudah kedaluwarsa.",
    });
  }
};
