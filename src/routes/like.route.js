import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getVideoLikeDislikeStatus,
    toggleVideoLikeDislike,
    getCommentLikeDislikeStatus,
    toggleCommentLikeDislike,
    getTweetLikeDislikeStatus,
    toggleTweetLikeDislike,
} from "../controllers/like.controller.js";




const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file




router.route("/video/:videoId/like-status").get(getVideoLikeDislikeStatus);

router.route("/video/:videoId/like-toggle").post(toggleVideoLikeDislike);


router.route("/comment/:commentId/like-status").get(getCommentLikeDislikeStatus);

router.route("/comment/:commentId/like-toggle").post(toggleCommentLikeDislike);


router.route("/tweet/:tweetId/like-status").get(getTweetLikeDislikeStatus);

router.route("/tweet/:tweetId/like-toggle").post(toggleTweetLikeDislike);










export default router