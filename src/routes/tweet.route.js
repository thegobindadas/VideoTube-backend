import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createNewTweet,
    getTweetsByUser,
    updateExistingTweet,
    deleteTweetById,
} from "../controllers/tweet.controller.js";



const router = Router()
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file




router.route("/").post(createNewTweet);

router.route("/user/:userId").get(getTweetsByUser);

router.route("/:tweetId").patch(updateExistingTweet);

router.route("/:tweetId").delete(deleteTweetById);










export default router