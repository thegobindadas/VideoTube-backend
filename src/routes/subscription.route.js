import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    isSubscribed,
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels,
    searchSubscribedChannels,
} from "../controllers/subscription.controller.js"



const router = Router();
router.use(verifyJWT);




router.get("/c/subscription-status/:channelId", isSubscribed);

router.route("/c/:channelId").post(toggleSubscription);

router.route("/c/:channelId/subscribers").get(getChannelSubscribers);

router.route("/subscribed-channels").get(getSubscribedChannels)

router.route("/search/subscribed-channels").get(searchSubscribedChannels)








export default router