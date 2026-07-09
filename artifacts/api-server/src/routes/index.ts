import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bingxRouter from "./bingx";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bingxRouter);
router.use(notesRouter);

export default router;
