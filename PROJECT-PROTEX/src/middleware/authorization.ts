import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./authentication.js";

export const authorization = (...roles: ("user" | "admin")[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Silakan login terlebih dahulu.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Kamu tidak memiliki izin untuk mengakses fitur ini.",
      });
    }

    next();
  };
};
