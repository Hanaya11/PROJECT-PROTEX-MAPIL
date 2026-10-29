import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDirectory));
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (_req, res) => {
  res.sendFile("index.html", { root: publicDirectory });
});

app.use(errorHandler);

export default app;
