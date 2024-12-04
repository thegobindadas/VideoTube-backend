import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { LikeDislike } from "../models/likeDislike.model.js";
import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";




export const getChannelStatistics = asyncHandler(async (req, res) => {

    const channelId = req.user._id;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id.");
    }


    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }


    // Get the total number of videos uploaded by the channel
    const totalVideos = await Video.countDocuments({ owner: channelId });


    // Get the total number of subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: channelId });


    // Get the total video views for the channel
    const totalVideoViews = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    const totalViews = totalVideoViews.length > 0 ? totalVideoViews[0].totalViews : 0;


    // Get the total number of likes across all videos for the channel
    const totalLikes = await LikeDislike.countDocuments({
        video: { $in: await Video.find({ owner: channelId }).select("_id") },
        type: "like" // Filter for likes only
    });



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {
                    totalVideos,
                    totalSubscribers,
                    totalViews,
                    totalLikes
                }, 
                "Channel stats fetched successfully"
            )
        );
});


export const getVideosByChannel = asyncHandler(async (req, res) => {

    const channelId = req.user._id;
    const { page = 1, limit = 5 } = req.query;

    if (!channelId) {
        throw new ApiError(400, "Channel id is required.");
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id.");
    }

        
    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel does not exist.");
    }

        
    const videos = await Video.aggregate([
        { 
            $match: { 
                owner: new mongoose.Types.ObjectId(channelId) 
            } 
        },
        {
            $lookup: {
                from: "likedislikes", // Collection name for likeDislikeSchema
                let: { videoId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$video", "$$videoId"] } } },
                    {
                        $group: {
                            _id: "$type",
                            count: { $sum: 1 },
                        },
                    },
                ],
                as: "likesDislikes",
            },
        },
        {
            $addFields: {
                totalLikes: {
                    $ifNull: [
                        { $arrayElemAt: [{ $filter: { input: "$likesDislikes", as: "ld", cond: { $eq: ["$$ld._id", "like"] } } }, 0] },
                        { count: 0 },
                    ],
                },
                totalDislikes: {
                    $ifNull: [
                        { $arrayElemAt: [{ $filter: { input: "$likesDislikes", as: "ld", cond: { $eq: ["$$ld._id", "dislike"] } } }, 0] },
                        { count: 0 },
                    ],
                },
            },
        },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                isPublished: 1,
                createdAt: 1,
                totalLikes: "$totalLikes.count",
                totalDislikes: "$totalDislikes.count",
            },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: Number(limit) },
    ]);

    // Get total count of videos for pagination
    const totalVideos = await Video.countDocuments({ owner: channelId });



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {
                    videos,
                    totalVideos,
                    totalPages: Math.ceil(totalVideos / limit),
                    currentPage: Number(page),
                },
                "Channel videos fetched successfully"
            )
        );
});


export const getChannelData = asyncHandler(async (req, res) => {
    
    const channelId = req.user._id;
    const { page = 1, limit = 2 } = req.query;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id.");
    }


    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found.");
    }

    
    // Fetch channel statistics
    const [totalVideos, totalSubscribers, totalVideoViews, totalLikes, videos] = await Promise.all([
        
        // Total number of videos
        Video.countDocuments({ owner: channelId }),
    

        // Total number of subscribers
        Subscription.countDocuments({ channel: channelId }),
        

        // Total video views
        Video.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
            { $group: { _id: null, totalViews: { $sum: "$views" } } },
        ]),


        //Get the total number of likes across all videos for the channel
        LikeDislike.countDocuments({
            video: { $in: await Video.find({ owner: channelId }).select("_id") },
            type: "like" // Filter for likes only
        }),


        // Fetch paginated videos with likes and dislikes
        Video.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
            {
                $lookup: {
                    from: "likedislikes",
                    let: { videoId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$video", "$$videoId"] } } },
                        {
                            $group: {
                                _id: "$type",
                                count: { $sum: 1 },
                            },
                        },
                    ],
                    as: "likesDislikes",
                },
            },
            {
                $addFields: {
                    totalLikes: {
                        $ifNull: [
                            { $arrayElemAt: [{ $filter: { input: "$likesDislikes", as: "ld", cond: { $eq: ["$$ld._id", "like"] } } }, 0] },
                            { count: 0 },
                        ],
                    },
                    totalDislikes: {
                        $ifNull: [
                            { $arrayElemAt: [{ $filter: { input: "$likesDislikes", as: "ld", cond: { $eq: ["$$ld._id", "dislike"] } } }, 0] },
                            { count: 0 },
                        ],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    thumbnail: 1,
                    title: 1,
                    isPublished: 1,
                    createdAt: 1,
                    totalLikes: "$totalLikes.count",
                    totalDislikes: "$totalDislikes.count",
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: Number(limit) },
        ]),
    ]);


    // Calculate total views
    const totalViews = totalVideoViews.length > 0 ? totalVideoViews[0].totalViews : 0;


    // Get total pages for pagination
    const totalVideoCount = await Video.countDocuments({ owner: channelId });
    const totalPages = Math.ceil(totalVideoCount / limit);



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    stats: {
                        totalVideos,
                        totalSubscribers,
                        totalViews,
                        totalLikes,
                    },
                    videos: {
                        data: videos,
                        totalVideos: totalVideoCount,
                        totalPages,
                        currentPage: Number(page),
                    },
                },
                "Channel data fetched successfully"
            )
        );
});
