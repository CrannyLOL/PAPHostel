import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hostelRouter from "./hostel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hostelRouter);

export default router;
