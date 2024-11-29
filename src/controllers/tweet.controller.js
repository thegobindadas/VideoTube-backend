import mongoose, { isValidObjectId } from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"




export const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required")        
    }


    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while creating tweet")   
    }


    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            tweet,
            "Tweet created successfully"
        )
    )
})


export const getUserTweets = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 4 } = req.query; 

        if (!userId) {
            throw new ApiError(400, "User id is required");
        }

        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user id");
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
                $project: {
                    interactions: 0,
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
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {
                        tweets: [],
                        totalTweets: totalTweets || 0,
                        totalPages,
                        currentPage: page,
                    },
                    "Tweets fetched successfully"
                )
            );
        }


        
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    tweets: populatedTweets,
                    totalTweets,
                    totalPages,
                    currentPage: page,
                },
                "Tweets fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching tweets");
    }
});


export const updateTweet = asyncHandler(async (req, res) => {
    try {
        
        const { tweetId } = req.params
        const { content } = req.body


        if (!tweetId) {
            throw new ApiError(400, "Tweet id is required")
        }


        if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweet id")
        }


        const tweet = await Tweet.findById(tweetId)

        if (!tweet) {
            throw new ApiError(404, "Tweet not found")
        }


        if (tweet.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this tweet")
        }


        if(content) {
            tweet.content = content
        }

        const updatedTweet = await tweet.save({ validateBeforeSave: false })

        if (!updatedTweet) {
            throw new ApiError(500, "Something went wrong while updating tweet")
        }



        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedTweet,
                "Tweet updated successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while updating tweet")
    }
})


export const deleteTweet = asyncHandler(async (req, res) => {
    try {

        const { tweetId } = req.params

        if (!tweetId) {
            throw new ApiError(400, "Tweet id is required")
        }


        if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweet id")
        }


        const tweet = await Tweet.findById(tweetId)

        if (!tweet) {
            throw new ApiError(404, "Tweet not found")
        }


        if (tweet.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this tweet")
        }


        const deteteTweet = await tweet.deleteOne()


        if (!deteteTweet) {
            throw new ApiError(500, "Something went wrong while deleting tweet")
        }



        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Tweet deleted successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while deleting tweet")
    }
})