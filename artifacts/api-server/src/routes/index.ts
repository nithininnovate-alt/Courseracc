import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import applicationsRouter from "./applications";
import coursesRouter from "./courses";
import academicsRouter from "./academics";
import operationsRouter from "./operations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(applicationsRouter);
router.use(coursesRouter);
router.use(academicsRouter);
router.use(operationsRouter);
router.use(dashboardRouter);

export default router;
