import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { LikeDislike } from "../models/likeDislike.model.js";
import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { 
    uploadOnCloudinary, 
    deletePhotoOnCloudinary, 
    deleteVideoOnCloudinary, 
    deleteFolderOnCloudinary 
} from "../utils/cloudinary.js";




export const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description} = req.body
    
    if (!title || !description) {
        throw new ApiError(400, "Title and description are mandatory fields and cannot be empty.")
    }
    

    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files?.videoFile[0]?.path;
    }else {
        throw new ApiError(400, "VideoFile file is required.")
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "VideoFile file is required.")
    }
    

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    }else {
        throw new ApiError(400, "Thumbnail file is required.")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required.")
    }


    let publishVideoId = new mongoose.Types.ObjectId().toHexString()

    if (!publishVideoId) {
        throw new ApiError(500, "Failed to generate a video ID. Please try again.")        
    }


    const fileStorePathOnCloudinary = `videohub/${req.user?._id}/${publishVideoId}`


    const videoFile = await uploadOnCloudinary(videoFileLocalPath, fileStorePathOnCloudinary)

    if (!videoFile) {
        throw new ApiError(500, "Failed to upload the video. Please try again later.")
    }


    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, fileStorePathOnCloudinary)

    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload the thumbnail. Please try again later.")
    }


    const video = await Video.create({
        _id: publishVideoId,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    if (!video) {
        throw new ApiError(500, "Failed to upload the video. Please try again.")
    }



    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                video,
                "Video published successfully."
            )
        ) 
});


export const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId.trim()) {
        throw new ApiError(400, "Video ID is required and must be a non-empty string.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not valid.")
    }
    
    
    const video = await Video.findById(videoId)
        .populate({
            path: "owner",
            select: "avatar fullName username"
        })
        .select("videoFile title description views createdAt");

    if (!video) {
        throw new ApiError(404, "Video does not exist.")
    }

    if (!video.owner) {
        throw new ApiError(404, "Video owner details not found.");
    }


    const [likesCount, dislikesCount, userLikeDislikeStatus] = await Promise.all([
        LikeDislike.countDocuments({ video: videoId, type: 'like' }),
        LikeDislike.countDocuments({ video: videoId, type: 'dislike' }),
        LikeDislike.findOne({ video: videoId, likedBy: req.user?._id})
    ]);

    const isVideoLikedByMe = userLikeDislikeStatus ? userLikeDislikeStatus.type : null;

    
    const totalSubscribers = video.owner
        ? await Subscription.countDocuments({ channel: video.owner._id })
        : 0;
    
    

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videoId: video._id,
                    videoFile: video.videoFile,
                    title: video.title,
                    description: video.description,
                    views: video.views,
                    createdAt: video.createdAt,
                    totalLikes: likesCount,
                    totalDislikes: dislikesCount,
                    isVideoLikedByMe,
                    ownerId: video.owner._id,
                    ownerName: video.owner.fullName,
                    ownerAvatar: video.owner.avatar,
                    ownerUsername: video.owner.username,
                    ownerTotalSubscribers: totalSubscribers
                },
                "Video fetched successfully."
            )
        )
    
});


export const updateVideoInfo = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { title, description } = req.body

    if (!videoId.trim()) {
        throw new ApiError(400, "Video ID is required and must be a non-empty string.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not valid.")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video does not exist.")
    }


    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video.")
    }


    if(title) {
        video.title = title
    }

    if(description) {
        video.description = description
    }

    
    let thumbnailLocalPath = req.file?.path;

    if (thumbnailLocalPath) {
        
        const fileStorePathOnCloudinary = `videohub/${req.user?._id}/${video._id}`


        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, fileStorePathOnCloudinary)
    
        if (!thumbnail) {
            throw new ApiError(500, "Failed to upload the thumbnail. Please try again later.")
        }
        

        const deleteThumbnailOnCloudinary = await deletePhotoOnCloudinary(video.thumbnail)

        if (deleteThumbnailOnCloudinary.result !== "ok") {
            throw new ApiError(500, "Failed to delete the thumbnail. Please try again later.")
        }


        video.thumbnail = thumbnail.url
    }


    const updatedVideo = await video.save({ validateBeforeSave: false });      

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video details. Please try again later.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video details updated successfully."
            )
        )

    
});


export const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params
        
    if (!videoId.trim()) {
        throw new ApiError(400, "Video ID is required and must be a non-empty string.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not valid.")
    }


    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video does not exist.")
    }


    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Access denied: You do not have permission to delete this video.")
    }


    const deleteThumbnailOnCloudinary = await deletePhotoOnCloudinary(video.thumbnail)

    if (deleteThumbnailOnCloudinary.result !== "ok") {
        throw new ApiError(500, "Failed to delete the thumbnail. Please try again later.")
    }


    const deleteVideoFileOnCloudinary = await deleteVideoOnCloudinary(video.videoFile)

    if (deleteVideoFileOnCloudinary.result !== "ok") {
        throw new ApiError(500, "Failed to delete the video. Please try again later.")
    }


    await deleteFolderOnCloudinary(`videohub/${req.user?._id}/${video._id}`)


    const deletedVideo = await video.deleteOne()

    if (!deletedVideo.acknowledged || deletedVideo.deletedCount === 0) {
        throw new ApiError(500, "Failed to delete the video. Please try again.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video deleted successfully."
            )
        )
    
});


export const toggleVideoPublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId.trim()) {
        throw new ApiError(400, "Video ID is required and must be a non-empty string.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Video id is not valid.")
    }


    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video does not exist.")
    }


    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to update status of this video")
    }


    video.isPublished = !(video.isPublished)

    const updatedVideo = await video.save({ validateBeforeSave: false });

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to toggle video publish status. Please try again later.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video publish status has been updated successfully."
            )
        )
});


export const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;


        const searchCriteria = {
            isPublished: true // Only fetch published videos
        };

        
        if (query) {
            searchCriteria.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ];
        }


        if (userId && isValidObjectId(userId)) {
            searchCriteria.owner = userId;
        }


        const sortOptions = {
            [sortBy]: sortType === "asc" ? 1 : -1
        };


        const videos = await Video.find(searchCriteria)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .populate('owner', '_id username fullName avatar')
            .select('title description thumbnail views duration createdAt');

        
        const totalVideos = await Video.countDocuments(searchCriteria);

        
        return res
            .status(200)
            .json(
                new ApiResponse(200, {
                    videos,
                    totalVideos,
                    totalPages: Math.ceil(totalVideos / limit),
                    currentPage: Number(page)
                }, "Videos fetched successfully.")
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Error occurred while fetching videos.");
    }
});


export const handelVideoView = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId) {
        throw new ApiError(400, "Video id is required.");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id.");
    }


    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new ApiError(404, "Video not found.");
    }


    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }


    const hasWatched = user.watchHistory.includes(videoId);


    if (!hasWatched) {
        user.watchHistory.push(videoId);
        await user.save();

        
        video.views += 1;
        await video.save();


        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "View count updated successfully."
                )
            );
    } else {
        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "This video has already been watched by you."
                )
            );
    }
});


export const fetchRecommendedVideos = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId = null } = req.body;

        if (!videoId.trim()) {
            throw new ApiError(400, "Video ID is required and must be a non-empty string.")
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video ID.");
        }

        // Step 1: Fetch the current video
        const currentVideo = await Video.findById(videoId)
            .populate('owner', 'username fullName avatar')
            .exec();

        if (!currentVideo) {
            throw new ApiError(404, "Video does not exist.");
        }
        
        if (!currentVideo.isPublished) {
            throw new ApiError(403, "This video is not available for viewing.");
        }

        if (!currentVideo.owner) {
            throw new ApiError(500, "Owner information is missing for this video.");
        }


        // Step 2: Fetch videos from the same owner (i.e., channel)
        const relatedVideos = await Video.find({
            _id: { $ne: videoId },
            owner: currentVideo.owner._id,
            isPublished: true
        })
        .select('thumbnail title duration views createdAt')
        .populate('owner', 'username fullName avatar')
        .limit(5)
        .exec();


        // Step 3: Fetch videos based on similar title or description (using regex)
        const similarVideos = await Video.find({
            _id: { $ne: videoId },
            $or: [
                { title: { $regex: currentVideo.title.split(" ").join("|"), $options: "i" } },
                { description: { $regex: currentVideo.description.split(" ").join("|"), $options: "i" } }
            ],
            isPublished: true
        })
        .select('thumbnail title duration views createdAt')
        .populate('owner', 'username fullName avatar')
        .limit(5)
        .exec();


        // Step 4: Fetch popular videos (based on views or likes)
        const popularVideos = await Video.find({
            _id: { $ne: videoId },
            isPublished: true
        })
        .select('thumbnail title duration views createdAt')
        .populate('owner', 'username fullName avatar')
        .sort({ views: -1 })
        .limit(5)
        .exec();


        // Step 5: If user is logged in, fetch videos based on their watch history
        let watchHistoryVideos = [];
        if (userId) {
            const user = await User.findById(userId)
                .populate('watchHistory', null, { isPublished: true })
                .exec();

            if (user && user.watchHistory) {
                watchHistoryVideos = user.watchHistory.filter(v => v._id.toString() !== videoId);
            }
        }


        // Step 6: Merge all video recommendations and remove duplicates
        let allVideos = [...relatedVideos, ...similarVideos, ...popularVideos, ...watchHistoryVideos];


        // Remove duplicates by video ID
        const uniqueVideos = allVideos.filter((video, index, self) =>
            index === self.findIndex((v) => v._id.toString() === video._id.toString())
        );


        // Step 7: Limit results to show a fixed number of videos
        const recommendedVideos = uniqueVideos.slice(0, 10).map(video => ({
            videoId: video._id,
            thumbnail: video.thumbnail,
            title: video.title,
            duration: video.duration,
            views: video.views,
            createdAt: video.createdAt,
            ownerId: video.owner._id,
            ownerAvatar: video.owner.avatar,
            ownerName: video.owner.fullName,
            ownerUsername: video.owner.username
        }));

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { videos: recommendedVideos },
                    "Recommended Videos fetched successfully."
                )
            );

    } catch (error) {
        throw new ApiError(500, error.message || "Error occurred while fetching recommended videos.");
    }
});


export const getVideosByChannel = asyncHandler(async (req, res) => {

    const { channelId } = req.params;
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 4; 
    const skip = (page - 1) * limit;


    if (!channelId) {
        throw new ApiError(400, "Channel ID is required.");
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID.");
    }

        
    const videos = await Video.find({ owner: channelId })
        .select("_id thumbnail title duration views createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        
    const totalVideos = await Video.countDocuments({ owner: channelId });
    const totalPages = Math.ceil(totalVideos / limit);



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                { videos, totalVideos, totalPages, currentPage: page }, 
                "Channel videos fetched successfully."
            )
        );
});


export const getLikedVideos = asyncHandler(async (req, res) => {
        
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;


    const likedVideos = await LikeDislike.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "liked_videos",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            description: 1,
                            duration: 1, // Include the duration field
                            views: 1,
                            createdAt: 1,
                            owner: 1 // Include the owner field for later population
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$liked_videos"
            }
        },
        {
            $replaceRoot: {
                newRoot: "$liked_videos"
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
            $unwind: {
                path: "$ownerDetails"
            }
        },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                "ownerDetails._id": 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: parseInt(limit)
        }
    ]);


    const totalLikedVideos = await LikeDislike.countDocuments({
        video: { $exists: true },
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        type: "like"
    });

    const totalPages = Math.ceil(totalLikedVideos / limit);



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    likedVideos,
                    totalLikedVideos,
                    totalPages,
                    currentPage: page
                },
                "Liked videos fetched successfully."
            )
        );
});
