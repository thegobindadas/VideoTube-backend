import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { 
    publishAVideo,
    fetchVideoById,
    getVideoLikeDislikeCounts,
    getVideoOwnerDetails,
    updateVideoInfo,
    removeVideo,
    toggleVideoPublishStatus,
    getAllVideos,
    handelVideoView,
    fetchRecommendedVideos,
    getChannelVideos,
} from "../controllers/video.controller.js"



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

router.route("/:videoId").get(fetchVideoById)

router.route("/:videoId/like-dislike-counts").get(getVideoLikeDislikeCounts)

router.route("/owner/:ownerId").get(getVideoOwnerDetails)

router.route("/:videoId/update").patch(upload.single("thumbnail"), updateVideoInfo);

router.route("/:videoId/delete").delete(removeVideo)

router.route("/:videoId/toggle-publish").patch(toggleVideoPublishStatus);

router.route("/").get(getAllVideos)

router.route("/:videoId/view").post(handelVideoView)

router.route("/:videoId/recommendations").get(fetchRecommendedVideos)

router.get("/channel/:channelId/videos", getChannelVideos);







export default router