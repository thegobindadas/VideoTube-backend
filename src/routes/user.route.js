import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUserProfile,
    updateCurrentUserPassword,
    updateCurrentUserAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controller.js";



const router = Router()



router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/profile").get(verifyJWT, getCurrentUserProfile);

router.route("/change-password").post(verifyJWT, updateCurrentUserPassword);

router.route("/update/account-details").patch(verifyJWT, updateCurrentUserAccountDetails);

router.route("/update/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/update/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getWatchHistory);










export default router