import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Playlist } from "../models/playlist.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";



export const createPlaylist = asyncHandler(async (req, res) => {
    
    const { name, description } = req.body
    
    if (!name) {
        throw new ApiError(400, "Playlist name is required.")
    }


    const finalDescription = description || `${name.trim()} videos`;
    
    
    const existingPlaylist = await Playlist.findOne({
        name: new RegExp(`^${name}$`, 'i'),
        owner: req.user._id
    });

    if (existingPlaylist) {
        throw new ApiError(409, "Conflict: A playlist with the same name already exists.");
    }
    
    
    const playlist = await Playlist.create({
        name,
        description: finalDescription,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(500, "Internal Server Error: Unable to create the playlist.")
    }
    
    
    
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist created successfully."
            )
        )
   
});


export const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params;

    if (!playlistId || !videoId) {
        throw new ApiError(400, "Both Playlist ID and Video ID are required.");
    }

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID.");
    }


    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Not Found: Playlist does not exist.");
    }


    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to modify this playlist.");
    }


    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Not Found: Video does not exist.");
    }

        
    if (playlist.videos.includes(video._id)) {
        throw new ApiError(400, "Conflict: Video is already in the playlist.");
    }

        
    playlist.videos.push(video._id);
    
    await playlist.save()



    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video added to playlist successfully."
            )
        );
});


export const getUserPlaylists = asyncHandler(async (req, res) => {

    const { userId } = req.query;
    const requestingUserId = req.user?._id;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const skip = (page - 1) * limit;


    if (!userId) {
        throw new ApiError(400, "User ID is required.");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID.");
    }


    // Define match criteria based on whether the user is requesting their own playlists
    const matchCriteria = {
        owner: new mongoose.Types.ObjectId(userId),
    };

    const userIdAsObjectId = new mongoose.Types.ObjectId(userId);
    
    // Add isPublic: true only if userId !== requestingUserId
    if (!userIdAsObjectId.equals(requestingUserId)) {
        matchCriteria.isPublic = true;
    }


    const playlists = await Playlist.aggregate([
        { 
            $match: matchCriteria
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                firstVideoThumbnail: { $arrayElemAt: ["$videoDetails.thumbnail", 0] }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                totalVideos: 1,
                firstVideoThumbnail: 1
            }
        },
        { $skip: skip },
        { $limit: limit }
    ]);

    const totalPlaylists = await Playlist.countDocuments(matchCriteria);

    const totalPages = Math.ceil(totalPlaylists / limit);



    if (!playlists || playlists.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        playlists: [],
                        totalPages,
                        currentPage: page,
                        totalPlaylists: 0
                    },
                    "No playlists found for this user."
                )
            );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    playlists,
                    totalPages,
                    currentPage: page,
                    totalPlaylists
                },
                "Playlists fetched successfully."
            )
        );
});


export const getMyPlaylistsNames = asyncHandler(async (req, res) => {

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    if (!userId) {
        throw new ApiError(400, "User ID is required.");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID.");
    }


    const playlists = await Playlist.find({ owner: userId })
        .skip(skip)
        .limit(limit);


    const totalPlaylists = await Playlist.countDocuments({ owner: userId });
    const totalPages = Math.ceil(totalPlaylists / limit);



    if (playlists.length === 0 || page > totalPages) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        playlists: [],
                        totalPages,
                        currentPage: page,
                        totalPlaylists: 0,
                    },
                    "No playlists found for this user."
                )
            );
    }


        
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    playlists,
                    totalPages,
                    currentPage: page,
                    totalPlaylists,
                },
                "Playlists fetched successfully."
            )
        );
});


export const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist ID is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID.");
    }


    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",  
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $lookup: {
                from: "subscriptions",  
                localField: "owner",
                foreignField: "channel",
                as: "ownerSubscribers"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                firstVideoThumbnail: { $arrayElemAt: ["$videoDetails.thumbnail", 0] },
                ownerId: { $arrayElemAt: ["$ownerDetails._id", 0] },
                ownerAvatar: { $arrayElemAt: ["$ownerDetails.avatar", 0] },
                ownerName: { $arrayElemAt: ["$ownerDetails.fullName", 0] },
                ownerUsername: { $arrayElemAt: ["$ownerDetails.username", 0] },
                ownerTotalSubscribers: { $size: "$ownerSubscribers" },
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                totalVideos: 1,
                firstVideoThumbnail: 1,
                ownerId: 1,
                ownerAvatar: 1,
                ownerName: 1,
                ownerUsername: 1,
                ownerTotalSubscribers: 1
            }
        }
    ]);

    if (!playlist || playlist.length === 0) {
        throw new ApiError(404, "Not Found: Playlist not found or is empty.");
    }
    


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist[0],
                "Playlist fetched successfully."
            )
        );
});


export const getPlaylistVideos = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!playlistId) {
        throw new ApiError(400, "Playlist ID is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID.");
    }


    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;


    const playlistVideos = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $match: { "videoDetails": { $ne: [] } }
        },
        {
            $unwind: {
                path: "$videoDetails",
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "videoOwnerDetails"
            }
        },
        {
            $addFields: {
                videoId: "$videoDetails._id",
                videoThumbnail: "$videoDetails.thumbnail",
                videoDuration: "$videoDetails.duration",
                videoTitle: "$videoDetails.title",
                videoViews: "$videoDetails.views",
                videoCreatedAt: "$videoDetails.createdAt",
                videoOwnerId: { $arrayElemAt: ["$videoOwnerDetails._id", 0] },
                videoOwnerAvatar: { $arrayElemAt: ["$videoOwnerDetails.avatar", 0] },
                videoOwnerName: { $arrayElemAt: ["$videoOwnerDetails.fullName", 0] },
                videoOwnerUsername: { $arrayElemAt: ["$videoOwnerDetails.username", 0] }
            }
        },
        {
            $project: {
                videoId: 1,
                videoThumbnail: 1,
                videoDuration: 1,
                videoTitle: 1,
                videoViews: 1,
                videoCreatedAt: 1,
                videoOwnerId: 1,
                videoOwnerAvatar: 1,
                videoOwnerName: 1,
                videoOwnerUsername: 1
            }
        },
        { $skip: skip },
        { $limit: limitNum }
    ]);
        
        
    const totalVideosResult = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
        { $unwind: "$videos" },
        { $count: "totalVideos" },
    ]);
        
    const totalVideos = totalVideosResult[0]?.totalVideos || 0;
        

    if (playlistVideos.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        playlistVideos: [],  
                        currentPage: pageNum,
                        totalPages: 0,
                        totalVideos: totalVideos || 0,
                    },
                    "Not Found: Playlist has no videos."
                )
            );
    }
        


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    playlistVideos,
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalVideos / limitNum),
                    totalVideos
                },
                "Playlist videos fetched successfully."
            )
        );
});


export const getPlaylistDetailsWithVideos = asyncHandler(async (req, res) => {
    
    const { playlistId } = req.params;
    const requestingUserId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    if (!playlistId) {
        throw new ApiError(400, "Playlist ID is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID.");
    }


    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;


    const playlistCheck = await Playlist.findById(playlistId).select("owner isPublic").lean();

    if (!playlistCheck) {
        throw new ApiError(404, "Playlist not found.");
    }


    const isOwner = playlistCheck.owner.toString() === requestingUserId.toString();

    if (!isOwner && !playlistCheck.isPublic) {
        throw new ApiError(403, "Access denied. This playlist is private.");
    }


    // Aggregate to fetch playlist details along with the video details
    const result = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $match: { "videoDetails": { $ne: [] } }
        },
        {
            $unwind: {
                path: "$videoDetails",
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "videoOwnerDetails"
            }
        },
        {
            $addFields: {
                videoId: "$videoDetails._id",
                videoThumbnail: "$videoDetails.thumbnail",
                videoDuration: "$videoDetails.duration",
                videoTitle: "$videoDetails.title",
                videoViews: "$videoDetails.views",
                videoCreatedAt: "$videoDetails.createdAt",
                videoOwnerId: { $arrayElemAt: ["$videoOwnerDetails._id", 0] },
                videoOwnerAvatar: { $arrayElemAt: ["$videoOwnerDetails.avatar", 0] },
                videoOwnerName: { $arrayElemAt: ["$videoOwnerDetails.fullName", 0] },
                videoOwnerUsername: { $arrayElemAt: ["$videoOwnerDetails.username", 0] }
            }
        },
        {
            $project: {
                videoId: 1,
                videoThumbnail: 1,
                videoDuration: 1,
                videoTitle: 1,
                videoViews: 1,
                videoCreatedAt: 1,
                videoOwnerId: 1,
                videoOwnerAvatar: 1,
                videoOwnerName: 1,
                videoOwnerUsername: 1
            }
        },
        { $skip: skip },
        { $limit: limitNum }
    ]);


    // Fetch the playlist details
    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "ownerSubscribers"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                firstVideoThumbnail: { $arrayElemAt: ["$videoDetails.thumbnail", 0] },
                ownerId: { $arrayElemAt: ["$ownerDetails._id", 0] },
                ownerAvatar: { $arrayElemAt: ["$ownerDetails.avatar", 0] },
                ownerName: { $arrayElemAt: ["$ownerDetails.fullName", 0] },
                ownerUsername: { $arrayElemAt: ["$ownerDetails.username", 0] },
                ownerTotalSubscribers: { $size: "$ownerSubscribers" },
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                totalVideos: 1,
                firstVideoThumbnail: 1,
                ownerId: 1,
                ownerAvatar: 1,
                ownerName: 1,
                ownerUsername: 1,
                ownerTotalSubscribers: 1
            }
        }
    ]);


    const totalVideosResult = await Playlist.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
        { $unwind: "$videos" },
        { $count: "totalVideos" },
    ]);

    const totalVideos = totalVideosResult[0]?.totalVideos || 0;

    if (!playlist || playlist.length === 0) {
        throw new ApiError(404, "Not Found: Playlist not found.");
    }
    
    
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    playlistInfo: playlist[0],
                    playlistVideos: result,
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalVideos / limitNum),
                    totalVideos
                },
                "Playlist and videos fetched successfully."
            )
        );
});


export const updatePlaylistDetails = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;
    const { name, description } = req.body;

        
    if (!playlistId) {
        throw new ApiError(400, "Playlist id is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id.");
    }

        
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Not Found: Playlist not found.");
    }

        
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to update this playlist.");
    }

        
    if (name) playlist.name = name;

    if (description) playlist.description = description;

        
    const updatedPlaylist = await playlist.save();      

    if (!updatedPlaylist) {
        throw new ApiError(500, "Internal Server Error: Failed to update the playlist.");
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                updatedPlaylist, 
                "Playlist updated successfully."
            )
        );
});


export const togglePlaylistVisibility = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist ID is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID.");
    }


    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Not Found: Playlist not found.");
    }

    
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to modify this playlist.");
    }

    
    playlist.isPublic = !playlist.isPublic;

    const updatedPlaylist = await playlist.save();

    if (!updatedPlaylist) {
        throw new ApiError(500, "Internal Server Error: Failed to update the playlist.");
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublic: updatedPlaylist.isPublic },
                `Playlist is now ${updatedPlaylist.isPublic ? "public" : "private"}.`
            )
        );
});


export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params;

    if (!playlistId || !videoId) {
        throw new ApiError(400, "Both Playlist ID and Video ID are required.");
    }

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID format.");
    }


    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Not Found: Video not found.");
    }


    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Not Found: Playlist not found.");
    }


    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to remove videos from this playlist.");
    }


    const videoExists = playlist.videos.includes(videoId);

    if (!videoExists) {
        throw new ApiError(404, "Not Found: Video not found in playlist.");
    }


    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true, validateBeforeSave: false }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Internal Server Error: Failed to update playlist after removing video.");
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video removed from playlist successfully."
            )
        );
});


export const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist id is required.");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id.");
    }


    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Not Found: Playlist not found.");
    }

        
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You do not have permission to delete this playlist");
    }

        
    const deletedPlaylist = await Playlist.deleteOne({ _id: playlistId });
    
    if (!deletedPlaylist.deletedCount) {
        throw new ApiError(500, "Internal Server Error: Failed to delete the playlist. Please try again later.");
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {}, 
                "Playlist deleted successfully."
            )
        );

});
