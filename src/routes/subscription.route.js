import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    checkSubscriptionStatus,
    toggleSubscriptionStatus,
    getChannelSubscribersList,
    searchChannelSubscribers,
    getUserSubscribedChannels,
    searchUserSubscribedChannels,
} from "../controllers/subscription.controller.js";



const router = Router();
router.use(verifyJWT);



router.route("/channel/:channelId/subscription-status").get(checkSubscriptionStatus);

router.route("/channel/:channelId/subscribe").post(toggleSubscriptionStatus);

router.route("/channel/subscribers").get(getChannelSubscribersList);

router.route("/search/channel/subscribers").get(searchChannelSubscribers);

router.route("/channel/subscribed-channels").get(getUserSubscribedChannels);

router.route("/search/channel/subscribed-channels").get(searchUserSubscribedChannels);










export default router