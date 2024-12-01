import { Router } from 'express';
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createPlaylist,
    addVideoToPlaylist,
    getPlaylistById,
    getPlaylistVideos,
    getPlaylistDetailsWithVideos,
    getUserPlaylists,
    getMyPlaylistsNames,
    updatePlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controllers/playlist.controller.js";



const router = Router();
router.use(verifyJWT);




router.route("/").post(createPlaylist);

router.route("/add-video/:playlistId/:videoId").patch(addVideoToPlaylist);

router.route("/user/:userId/playlists").get(getUserPlaylists);

router.route("/my-playlists").get(getMyPlaylistsNames);

router.route("/:playlistId").get(getPlaylistById);

router.route("/:playlistId/videos").get(getPlaylistVideos);

router.route("/:playlistId/details-with-videos").get(getPlaylistDetailsWithVideos);

router.route("/remove-video/:playlistId/:videoId").patch(removeVideoFromPlaylist);

router.route("/update/:playlistId").patch(updatePlaylist);
   
router.route("/remove/:playlistId").delete(deletePlaylist);










export default router