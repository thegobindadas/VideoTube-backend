import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";




export const createNewTweet = asyncHandler(async (req, res) => {

    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Unprocessable Entity: Content is required.")        
    }


    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "Unable to create tweet at the moment. Please try again later.");   
    }



    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                tweet,
                "Tweet created successfully."
            )
        )
});


export const getTweetsByUser = asyncHandler(async (req, res) => {

    const { userId } = req.params;
    const { page = 1, limit = 4 } = req.query;
    const currentUserId = req.user._id;

    if (!userId) {
        throw new ApiError(400, "User id is required.");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id.");
    }


    const skip = (page - 1) * limit;


    const tweets = await Tweet.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        { $skip: skip }, 
        { $limit: parseInt(limit) },
        {
            $lookup: {
                from: "likedislikes", 
                localField: "_id",
                foreignField: "tweet",
                as: "interactions",
            },
        },
        {
            $addFields: {
                likeCount: {
                    $size: {
                        $filter: { input: "$interactions", as: "i", cond: { $eq: ["$$i.type", "like"] } },
                    },
                },
                dislikeCount: {
                    $size: {
                        $filter: { input: "$interactions", as: "i", cond: { $eq: ["$$i.type", "dislike"] } },
                    },
                },
            },
        },
        {
            $lookup: {
                from: "likedislikes",
                localField: "_id",
                foreignField: "tweet",
                as: "userInteractions",
            },
        },
        {
            $addFields: {
                isTweetLikedDislikedByMe: {
                    $cond: {
                        if: {
                            $gt: [
                                { $size: { $filter: { input: "$userInteractions", as: "ui", cond: { $eq: ["$$ui.likedBy", new mongoose.Types.ObjectId(currentUserId)] } } } },
                                0,
                            ],
                        },
                        then: {
                            $let: {
                                vars: {
                                    interaction: {
                                        $arrayElemAt: [
                                            { $filter: { input: "$userInteractions", as: "ui", cond: { $eq: ["$$ui.likedBy", new mongoose.Types.ObjectId(currentUserId)] } } },
                                            0,
                                        ],
                                    },
                                },
                                in: "$$interaction.type",
                            },
                        },
                        else: null,
                    },
                },
            },
        },
        {
            $project: {
                interactions: 0,
                userInteractions: 0,
            },
        },
    ]);


    const populatedTweets = await Tweet.populate(tweets, {
        path: "owner",
        select: "avatar username fullName _id",
    });


    const totalTweets = await Tweet.countDocuments({ owner: userId });

    const totalPages = Math.ceil(totalTweets / limit);



    if (!tweets || tweets.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        tweets: [],
                        totalTweets: totalTweets || 0,
                        totalPages,
                        currentPage: page,
                    },
                    "Tweets fetched successfully."
                )
            );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    tweets: populatedTweets,
                    totalTweets,
                    totalPages,
                    currentPage: page,
                },
                "Tweets fetched successfully."
            )
        );
});


export const updateExistingTweet = asyncHandler(async (req, res) => {
        
    const { tweetId } = req.params
    const { content } = req.body


    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required.")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id.")
    }


    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.")
    }


    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You are not authorized to update this tweet.")
    }


    if(content) {
        tweet.content = content
    }

    const updatedTweet = await tweet.save({ validateBeforeSave: false })

    if (!updatedTweet) {
        throw new ApiError(500, "Internal Server Error: Failed to update tweet.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully."
            )
        )
});


export const deleteTweetById = asyncHandler(async (req, res) => {

    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required.")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id.")
    }


    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.")
    }


    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You are not authorized to delete this tweet.")
    }


    const deteteTweet = await tweet.deleteOne()

    if (!deteteTweet) {
        throw new ApiError(500, "Internal Server Error: Failed to delete the tweet.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Tweet deleted successfully."
            )
        )
});
