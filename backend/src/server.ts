import "dotenv/config";

import cors from "cors";
import express from "express";

import watchRouter from "./routes/watches.js";
import scraperRoutes from "./routes/scraper.js";

const app = express();

const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "reality-window",
  });
});

app.use("/api/watches", watchRouter);

app.use("/api/scraper", scraperRoutes);

app.listen(PORT, () => {
  console.log(`Reality Window API running on http://localhost:${PORT}`);
});
