import mongoose, { isValidObjectId } from "mongoose";
import { LikeDislike } from "../models/likeDislike.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";



export const getUserLikeDislikeStatusForVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required.");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format.");
    }


    // Check if a like or dislike exists for the user on this video
    const interaction = await LikeDislike.findOne({
        video: videoId,
        likedBy: req.user?._id
    });


    let status = interaction ? interaction.type : null;



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                { status }, 
                "Video like/dislike status retrieved successfully."
            )
        );
});


export const toggleVideoLikeDislike = asyncHandler(async (req, res) => {

    const { videoId } = req.params;
    const { type } = req.body; // Expect "like" or "dislike" from the request body

    if (!videoId) {
        throw new ApiError(400, "Bad Request: Video ID is required.");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format.");
    }

    if (!["like", "dislike"].includes(type)) {
        throw new ApiError(400, "Bad Request: Valid like/dislike type (either 'like' or 'dislike') is required.");
    }


    // Check if a like or dislike already exists for the user on this video
    const interaction = await LikeDislike.findOne({
        video: videoId,
        likedBy: req.user?._id
    });
    
    
    if (interaction) {
        
        if (interaction.type === type) {
            // If the same type of interaction exists, remove it (toggle off)
            const deleteLikeDislike = await interaction.deleteOne();
            
            if (!deleteLikeDislike) {
                throw new ApiError(500, `Internal Server Error: Failed to remove ${type} from video. Please try again later.`);
            }


            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        {}, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`
                    )
                );
        } else {
            // If opposite type of interaction exists, update to new type
            interaction.type = type;
            
            await interaction.save();
            
            
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        interaction, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`
                    )
                );
        }
    } else {
        // No interaction exists, create a new like/dislike
        const newInteraction = await LikeDislike.create({
            video: videoId,
            likedBy: req.user?._id,
            type: type
        });

        if (!newInteraction) {
            throw new ApiError(500, `Internal Server Error: Failed to create ${type} for the video. Please try again later.`);
        }


        return res
            .status(201)
            .json(
                new ApiResponse(
                    201, 
                    newInteraction, 
                    `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`
                )
            );
    }
});


export const getUserLikeDislikeStatusForComment = asyncHandler(async (req, res) => {
    
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment id is required.");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format.");
    }


    const interaction = await LikeDislike.findOne({
        comment: commentId,
        likedBy: req.user?._id
    });


    let status = interaction ? interaction.type : null;



    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                { status }, 
                "comment like/dislike status retrieved successfully."
            )
        );
});


export const toggleCommentLikeDislike = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const { type } = req.body; // Expecting the like/dislike type in the request body

    if (!commentId) {
        throw new ApiError(400, "Comment id is required.");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id format.");
    }

    if (!type || !["like", "dislike"].includes(type)) {
        throw new ApiError(400, "Bad Request: 'type' is required and must be either 'like' or 'dislike'.");
    }


    // Check if the user has already liked/disliked the comment
    const existingInteraction = await LikeDislike.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });


    if (existingInteraction) {
        // If the interaction type is the same, remove it
        if (existingInteraction.type === type) {
            
            const deleteLikeDislike = await existingInteraction.deleteOne();

            if (!deleteLikeDislike) {
                throw new ApiError(500, `Internal Server Error: Failed to remove ${type} from comment. Please try again later.`);
            }


            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        {}, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`
                    )
                );
        } else {
            // If the interaction type is different, update it
            existingInteraction.type = type;
            
            await existingInteraction.save({ validateBeforeSave: false });


            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        existingInteraction, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`
                    )
            );
        }
    } else {
        // If there's no existing interaction, create a new one
        const newLike = await LikeDislike.create({
            comment: commentId,
            likedBy: req.user?._id,
            type,
        });

        if (!newLike) {
            throw new ApiError(500, `Internal Server Error: Failed to create ${type} for the comment. Please try again later.`);
        }


        return res
            .status(201)
            .json(
                new ApiResponse(
                    201, 
                    newLike, 
                    `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`
                )
            );
    }
    
});


export const getUserLikeDislikeStatusForTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required.");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID.");
    }


    // Check if a like or dislike exists for the user on this tweet
    const interaction = await LikeDislike.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    
    let status = interaction ? interaction.type : null;



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { status },
                "Tweet like/dislike status retrieved successfully"
            )
        );
});


export const toggleTweetLikeDislike = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;
    const { type } = req.body; // Expecting "like" or "dislike" from the request body

    if (!tweetId) {
        throw new ApiError(400, "Bad Request: Tweet ID is required.");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }

    if (!["like", "dislike"].includes(type)) {
        throw new ApiError(400, "Bad Request: Valid like/dislike type (either 'like' or 'dislike') is required.");
    }


    // Check if a like or dislike already exists for the user on this tweet
    const interaction = await LikeDislike.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    });


    if (interaction) {
        // If the same type of interaction exists, remove it (toggle off)
        if (interaction.type === type) {

            const deleteLikeDislike = await interaction.deleteOne();

            if (!deleteLikeDislike) {
                throw new ApiError(500, `Internal Server Error: Failed to remove ${type} from tweet. Please try again later.`);
            }
            
            
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        {}, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully.`
                    )
                );
        } else {
            // If the opposite type of interaction exists, update to the new type
            interaction.type = type;
            
            await interaction.save();
            

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200, 
                        interaction, 
                        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully.`
                    )
                );
        }
    } else {
        // No interaction exists, create a new like/dislike
        const newInteraction = await LikeDislike.create({
            tweet: tweetId,
            likedBy: req.user?._id,
            type: type
        });

        if (!newInteraction) {
            throw new ApiError(500, `Internal Server Error: Failed to create ${type} for the tweet. Please try again later.`);
        }


        return res
            .status(201)
            .json(
                new ApiResponse(
                    201, 
                    newInteraction, 
                    `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully.`
                )
        
            );
    }
});
