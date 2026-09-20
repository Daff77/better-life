import { Router, Request, Response } from "express";
import { inMemoryStore } from "../services/store.js";

export const recipesRouter = Router();

recipesRouter.get("/", (_req: Request, res: Response) => {
  const allRecipes = Array.from(inMemoryStore.recipes.values());
  return res.json(allRecipes);
});

recipesRouter.get("/:id", (req: Request, res: Response) => {
  const recipe = inMemoryStore.recipes.get(req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: "Recipe not found" });
  }
  return res.json(recipe);
});
