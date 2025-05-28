import { RequestHandler } from "express";
import config from "../../config";

export const apiKeyAuth: RequestHandler = (req, res, next) => {
  const providedApiKey = req.headers["x-api-key"];

  if (!providedApiKey) {
    res.status(401).json({
      error: "Unauthorized",
      message: "X-Api-Key header is missing.",
    });
    return;
  }

  if (providedApiKey !== config.apiKey) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid X-Api-Key.",
    });
    return;
  }

  next();
};
