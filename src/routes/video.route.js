import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    publishAVideo,
    getVideoById,
    updateVideoInfo,
    deleteVideo,
    toggleVideoPublishStatus,
    getAllVideos,
    handelVideoView,
    fetchRecommendedVideos,
    getVideosByChannel,
    getLikedVideos,
} from "../controllers/video.controller.js";



const router = Router()
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file



router.route("/").post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
        
    ]),
    publishAVideo
);

router.route("/:videoId").get(getVideoById);

router.route("/:videoId").patch(upload.single("thumbnail"), updateVideoInfo);

router.route("/:videoId").delete(deleteVideo);

router.route("/:videoId/toggle-publish").patch(toggleVideoPublishStatus);

router.route("/").get(getAllVideos);

router.route("/:videoId/view").post(handelVideoView);

router.route("/:videoId/recommendations").get(fetchRecommendedVideos);

router.route("/channel/:channelId/videos").get(getVideosByChannel);

router.route("/me/liked-videos").get(getLikedVideos);










export default router