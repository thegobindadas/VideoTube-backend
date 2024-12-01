import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getChannelStatistics,
    getVideosByChannel,
} from "../controllers/dashboard.controller.js";




const router = Router();
router.use(verifyJWT);




router.route("/channel/stats").get(getChannelStatistics);

router.route("/channel/videos").get(getVideosByChannel);










export default router