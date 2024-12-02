import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addComment,
    updateComment,
    deleteComment,
    getCommentsForVideo
} from "../controllers/comment.controller.js";



const router = Router()
router.use(verifyJWT);





router.route("/:videoId").post(addComment);

router.route("/update/:commentId").patch(updateComment);

router.route("/delete/:commentId").delete(deleteComment);

router.route("/video/:videoId/comments").get(getCommentsForVideo);










export default router