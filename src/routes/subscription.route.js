import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    checkSubscriptionStatus,
    toggleSubscriptionStatus,
    getChannelSubscribersList,
    getUserSubscribedChannels,
    searchSubscribedChannels,
} from "../controllers/subscription.controller.js";



const router = Router();
router.use(verifyJWT);




router.get("/channel/:channelId/subscription-status", checkSubscriptionStatus);

router.route("/channel/:channelId/subscribe").post(toggleSubscriptionStatus);

router.route("/channel/subscribers").get(getChannelSubscribersList);

router.route("/subscribed-channels").get(getUserSubscribedChannels);

router.route("/search/subscribed-channels").get(searchSubscribedChannels);










export default router