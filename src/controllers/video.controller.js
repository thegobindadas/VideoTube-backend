import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js";
import { LikeDislike } from "../models/likeDislike.model.js"
import { Subscription } from "../models/subscription.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deletePhotoOnCloudinary, deleteVideoOnCloudinary, deleteFolderOnCloudinary } from "../utils/cloudinary.js";




export const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description} = req.body
    
    if (!title || !description) {
        throw new ApiError(400, "Please provide  title and description")
    }
    

    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoFileLocalPath = req.files?.videoFile[0]?.path;
    }else {
        throw new ApiError(400, "VideoFile file is required")
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "VideoFile file is required")
    }
    

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    }else {
        throw new ApiError(400, "Thumbnail file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }


    let publishVideoId = new mongoose.Types.ObjectId().toHexString()

    if (!publishVideoId) {
        throw new ApiError(500, "Something went wrong while generating video id")        
    }


    const fileStorePathOnCloudinary = `videohub/${req.user?._id}/${publishVideoId}`


    const videoFile = await uploadOnCloudinary(videoFileLocalPath, fileStorePathOnCloudinary)

    if (!videoFile) {
        throw new ApiError(500, "Something went wrong while uploading video file")
    }


    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, fileStorePathOnCloudinary)

    if (!thumbnail) {
        throw new ApiError(500, "Something went wrong while uploading thumbnail")
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
        throw new ApiError(500, "Something went wrong while publishing video")
    }



    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            video,
            "Video published successfully"
        )
    ) 
})


export const fetchVideoById = asyncHandler(async (req, res) => {

    try {
        const { videoId } = req.params

        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Video id is not valid")
        }
    
    
        const video = await Video.findById(videoId)
            .populate({
                path: "owner",
                select: "avatar fullName username"
            })
            .select("videoFile title description views createdAt");
    
        if (!video) {
            throw new ApiError(404, "Video does not exist")
        }
    
        const totalSubscribers = await Subscription.countDocuments({ channel: video.owner._id });
    
    
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
                    ownerId: video.owner._id,
                    ownerName: video.owner.fullName,
                    ownerAvatar: video.owner.avatar,
                    ownerUsername: video.owner.username,
                    totalSubscribers
                },
                "Video fetched successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching video")
    }
})


export const getVideoLikeDislikeCounts = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            throw new ApiError(400, "Video id is required");
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }


        const [likesCount, dislikesCount] = await Promise.all([
            LikeDislike.countDocuments({ video: videoId, type: 'like' }),
            LikeDislike.countDocuments({ video: videoId, type: 'dislike' })
        ]);


        const responseData = {
            totalLikes: likesCount,
            totalDislikes: dislikesCount
        };



        return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                responseData, 
                "Like and dislike counts fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching like and dislike counts");
    }
});


export const getVideoOwnerDetails = asyncHandler(async (req, res) => {
    try {
        const { ownerId } = req.params;

        if (!ownerId) {
            throw new ApiError(400, "Owner id is required");
        }

        if (!mongoose.Types.ObjectId.isValid(ownerId)) {
            throw new ApiError(400, "Invalid owner id");
        }


        const owner = await User.findById(ownerId)
            .select('username fullName avatar')
            .lean();

        if (!owner) {
            throw new ApiError(404, "Owner not found");
        }


        owner.totalSubscribers = await Subscription.countDocuments({ channel: ownerId });



        return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                owner, 
                "Owner details fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching owner details");
    }
});


export const updateVideoInfo = asyncHandler(async (req, res) => {

    try {
        const { videoId } = req.params
    
        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }


        const video = await Video.findById(videoId)

        if (!video) {
            throw new ApiError(404, "Video does not exist")
        }
    

        if (video.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this video")
        }

    
        const { title, description } = req.body

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
                throw new ApiError(500, "Something went wrong while uploading thumbnail")
            }
            

            const deleteThumbnailOnCloudinary = await deletePhotoOnCloudinary(video.thumbnail)

            if (deleteThumbnailOnCloudinary.result !== "ok") {
                throw new ApiError(500, "Something went wrong while deleting thumbnail")
            }


            video.thumbnail = thumbnail.url
        }


        const updatedVideo = await video.save({ validateBeforeSave: false });      
    
        if (!updatedVideo) {
            throw new ApiError(500, "Something went wrong while updating video details")
        }



        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video details updated successfully"
            )
        )

    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while updating video details")
    }
})


export const removeVideo = asyncHandler(async (req, res) => {
    try {

        const { videoId } = req.params
        
        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }


        const video = await Video.findById(videoId)

        if (!video) {
            throw new ApiError(404, "Video does not exist")
        }


        if (video.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this video")
        }


        const deleteThumbnailOnCloudinary = await deletePhotoOnCloudinary(video.thumbnail)

        if (deleteThumbnailOnCloudinary.result !== "ok") {
            throw new ApiError(500, "Something went wrong while deleting thumbnail")
        }


        const deleteVideoFileOnCloudinary = await deleteVideoOnCloudinary(video.videoFile)

        if (deleteVideoFileOnCloudinary.result !== "ok") {
            throw new ApiError(500, "Something went wrong while deleting video")
        }


        await deleteFolderOnCloudinary(`videohub/${req.user?._id}/${video._id}`)


        const deletedVideo = await video.deleteOne()

        if (!deletedVideo) {
            throw new ApiError(500, "Something went wrong while deleting video folder")
        }



        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video deleted successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while deleting video")
    }
})


export const toggleVideoPublishStatus = asyncHandler(async (req, res) => {
    try {

        const { videoId } = req.params

        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }


        const video = await Video.findById(videoId)

        if (!video) {
            throw new ApiError(404, "Video does not exist")
        }


        if (video.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update status of this video")
        }


        video.isPublished = !(video.isPublished)

        const updatedVideo = await video.save({ validateBeforeSave: false });

        if (!updatedVideo) {
            throw new ApiError(500, "Something went wrong while toggling publish status")
        }



        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Publish status toggled successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while toggling publish status")
    }
})


export const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 9, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

        // Create a base search criteria object
        const searchCriteria = {
            isPublished: true // Only fetch published videos
        };

        // If query is provided, search in title or description
        if (query) {
            searchCriteria.$or = [
                { title: { $regex: query, $options: "i" } }, // Case-insensitive search in title
                { description: { $regex: query, $options: "i" } } // Case-insensitive search in description
            ];
        }

        // If userId is provided, filter by the user's uploaded videos
        if (userId && isValidObjectId(userId)) {
            searchCriteria.owner = userId;
        }

        // Sorting: determine ascending or descending based on sortType
        const sortOptions = {
            [sortBy]: sortType === "asc" ? 1 : -1
        };

        // Fetch videos based on search criteria, pagination, and sorting
        const videos = await Video.find(searchCriteria)
            .sort(sortOptions) // Apply sorting
            .skip((page - 1) * limit) // Skip for pagination
            .limit(Number(limit)) // Limit the number of videos per page
            .populate('owner', '_id username fullName avatar') // Populate owner (channel) information
            .select('title description thumbnail views duration createdAt'); // Select relevant video fields

        // Get the total number of videos for pagination
        const totalVideos = await Video.countDocuments(searchCriteria);

        
        return res
        .status(200)
        .json(
            new ApiResponse(200, {
                videos,
                totalVideos,
                totalPages: Math.ceil(totalVideos / limit),
                currentPage: Number(page)
            }, "Videos fetched successfully")
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Error occurred while fetching videos");
    }
});


export const handelVideoView = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id;

        if (!videoId) {
            throw new ApiError(400, "Video id is required");
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }


        // Find the video by ID
        const video = await Video.findById(videoId);
        
        if (!video) {
            throw new ApiError(404, "Video not found");
        }


        const user = await User.findById(userId);

        if (!user) {
            throw new ApiError(404, "User not found");
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
                    "View count incremented successfully"
                )
            );
        } else {
         
            return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "User has already viewed this video"
                )
            );
        }
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while incrementing video views");
    }
});


export const fetchRecommendedVideos = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const { userId = null } = req.body;

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video ID format");
        }

        // Step 1: Fetch the current video
        const currentVideo = await Video.findById(videoId)
            .populate('owner', 'username fullName avatar') // Populate owner with username, fullName, and avatar
            .exec();

        if (!currentVideo) {
            throw new ApiError(404, "The requested video does not exist");
        }
        
        if (!currentVideo.isPublished) {
            throw new ApiError(403, "This video is not available for viewing");
        }

        if (!currentVideo.owner) {
            throw new ApiError(500, "Owner information is missing for this video");
        }

        // Step 2: Fetch videos from the same owner (i.e., channel)
        const relatedVideos = await Video.find({
            _id: { $ne: videoId },  // Exclude the current video
            owner: currentVideo.owner._id, // Same owner/channel
            isPublished: true
        })
        .select('thumbnail title duration views createdAt') // Select only required fields
        .populate('owner', 'username fullName avatar') // Populate owner fields
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
        .select('thumbnail title duration views createdAt') // Select only required fields
        .populate('owner', 'username fullName avatar') // Populate owner fields
        .limit(5)
        .exec();

        // Step 4: Fetch popular videos (based on views or likes)
        const popularVideos = await Video.find({
            _id: { $ne: videoId },
            isPublished: true
        })
        .select('thumbnail title duration views createdAt') // Select only required fields
        .populate('owner', 'username fullName avatar') // Populate owner fields
        .sort({ views: -1 })  // Sort by most views
        .limit(5)
        .exec();

        // Step 5: If user is logged in, fetch videos based on their watch history
        let watchHistoryVideos = [];
        if (userId) {
            const user = await User.findById(userId)
                .populate('watchHistory', null, { isPublished: true }) // Only include published videos in watch history
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
            ownerUsername: video.owner.username // Adding username here
        }));

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { videos: recommendedVideos },
                    "Recommended Videos fetched successfully"
                )
            );

    } catch (error) {
        console.error("Error fetching recommended videos:", error);
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        }
        throw new ApiError(500, error.message || "Error occurred while fetching recommended videos");
    }
});


export const getChannelVideos = asyncHandler(async (req, res) => {
    try {
        const { channelId } = req.params;
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 4; 
        const skip = (page - 1) * limit;

        if (!channelId) {
            throw new ApiError(400, "Channel ID is required");
        }

        if (!isValidObjectId(channelId)) {
            throw new ApiError(400, "Invalid channel ID");
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
                    "Channel videos fetched successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Failed to fetch channel videos");
    }
});
