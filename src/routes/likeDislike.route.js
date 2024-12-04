import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getUserLikeDislikeStatusForVideo,
    toggleVideoLikeDislike,
    getUserLikeDislikeStatusForComment,
    toggleCommentLikeDislike,
    getUserLikeDislikeStatusForTweet,
    toggleTweetLikeDislike,
} from "../controllers/likeDislike.controller.js";




const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file




router.route("/video/:videoId/like-status").get(getUserLikeDislikeStatusForVideo);

router.route("/video/:videoId/like-toggle").post(toggleVideoLikeDislike);


router.route("/comment/:commentId/like-status").get(getUserLikeDislikeStatusForComment);

router.route("/comment/:commentId/like-toggle").post(toggleCommentLikeDislike);


router.route("/tweet/:tweetId/like-status").get(getUserLikeDislikeStatusForTweet);

router.route("/tweet/:tweetId/like-toggle").post(toggleTweetLikeDislike);










export default router