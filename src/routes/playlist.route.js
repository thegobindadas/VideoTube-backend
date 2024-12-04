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
    updatePlaylistDetails,
    togglePlaylistVisibility,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controllers/playlist.controller.js";



const router = Router();
router.use(verifyJWT);




router.route("/").post(createPlaylist);

router.route("/:playlistId/add/videos/:videoId").patch(addVideoToPlaylist);

router.route("/user").get(getUserPlaylists);

router.route("/me/names").get(getMyPlaylistsNames);

router.route("/:playlistId").get(getPlaylistById);

router.route("/:playlistId/videos").get(getPlaylistVideos);

router.route("/:playlistId/details-with-videos").get(getPlaylistDetailsWithVideos);

router.route("/update-details/:playlistId").patch(updatePlaylistDetails);

router.route("/:playlistId/toggle-public").patch(togglePlaylistVisibility);

router.route("/:playlistId/remove/videos/:videoId").patch(removeVideoFromPlaylist);
   
router.route("/remove/:playlistId").delete(deletePlaylist);










export default router