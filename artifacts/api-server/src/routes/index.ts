import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bingxRouter from "./bingx";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bingxRouter);

export default router;
