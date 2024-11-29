import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    createPlaylist,
    addVideoToPlaylist,
    getPlaylistById,
    getPlaylistVideos,
    getUserPlaylists,
    getMyPlaylists,
    updatePlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controllers/playlist.controller.js"



const router = Router();
router.use(verifyJWT);




router.route("/").post(createPlaylist)

router.route("/add/video/:videoId/:playlistId").patch(addVideoToPlaylist);

router.route("/user/:userId").get(getUserPlaylists);

router.route("/my-playlists").get(getMyPlaylists);

router.route("/:playlistId").get(getPlaylistById)

router.route("/:playlistId/videos").get(getPlaylistVideos)

router.route("/remove/video/:videoId/:playlistId").patch(removeVideoFromPlaylist);

router.route("/update/:playlistId").patch(updatePlaylist)
   
router.route("/remove/:playlistId").delete(deletePlaylist);








export default router