import mongoose, { isValidObjectId } from "mongoose"
import { LikeDislike } from "../models/likeDislike.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"



export const toggleVideoLikeDislike = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const { type } = req.body; // Expect "like" or "dislike" from the request body

        if (!videoId || !["like", "dislike"].includes(type)) {
            throw new ApiError(400, "Video id and valid like/dislike type are required");
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }


        // Check if a like or dislike already exists for the user on this video
        const interaction = await LikeDislike.findOne({
            video: videoId,
            likedBy: req.user?._id
        });

        if (interaction) {
            // If the same type of interaction exists, remove it (toggle off)
            if (interaction.type === type) {
                
                await interaction.deleteOne();
                

                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200, 
                            {}, 
                            `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`
                        )
                    );
            } 
            // If opposite type of interaction exists, update to new type
            else {
                
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
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while toggling like/dislike on video");
    }
});


export const isVideoLikeDislike = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            throw new ApiError(400, "Video id is required");
        }

        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id");
        }

        // Check if a like or dislike exists for the user on this video
        const interaction = await LikeDislike.findOne({
            video: videoId,
            likedBy: req.user?._id
        });

        let status;
        if (interaction) {
            status = interaction.type; // either "like" or "dislike"
        } else {
            status = null; // no interaction found
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200, 
                    { status }, 
                    "Video like/dislike status retrieved successfully"
                )
            );

    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching like/dislike status");
    }
});


export const toggleCommentLikeDislike = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params;
        const { type } = req.body; // Expecting the like/dislike type in the request body

        if (!commentId) {
            throw new ApiError(400, "Comment id is required");
        }

        if (!isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id");
        }

        if (!type || !["like", "dislike"].includes(type)) {
            throw new ApiError(400, "Type is required and must be either 'like' or 'dislike'");
        }


        // Check if the user has already liked/disliked the comment
        const existingInteraction = await Like.findOne({
            comment: commentId,
            likedBy: req.user?._id,
        });

        if (existingInteraction) {
            // If the interaction type is the same, remove it
            if (existingInteraction.type === type) {
                
                const deleteLike = await existingInteraction.deleteOne();

                if (!deleteLike) {
                    throw new ApiError(500, "Something went wrong while removing like/dislike from comment");
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
            const newLike = await Like.create({
                comment: commentId,
                likedBy: req.user?._id,
                type,
            });

            if (!newLike) {
                throw new ApiError(500, "Something went wrong while liking/disliking the comment");
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
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while toggling like/dislike on comment");
    }
});


export const toggleTweetLikeDislike = asyncHandler(async (req, res) => {
    try {
        const { tweetId } = req.params;
        const { type } = req.body; // Expecting "like" or "dislike" from the request body

        if (!tweetId || !["like", "dislike"].includes(type)) {
            throw new ApiError(400, "Tweet id and valid like/dislike type are required");
        }

        if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid tweet id");
        }


        // Check if a like or dislike already exists for the user on this tweet
        const interaction = await LikeDislike.findOne({
            tweet: tweetId,
            likedBy: req.user?._id
        });

        if (interaction) {
            // If the same type of interaction exists, remove it (toggle off)
            if (interaction.type === type) {
                await interaction.deleteOne();
                
                
                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200, 
                            {}, 
                            `${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`
                        )
                    );
            } 
            // If the opposite type of interaction exists, update to the new type
            else { 
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
                tweet: tweetId,
                likedBy: req.user?._id,
                type: type
            });


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
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while toggling like/dislike on tweet");
    }
});


export const isTweetLikeDislike = asyncHandler(async (req, res) => {
    try {
        const { tweetId } = req.params;

        if (!tweetId) {
            throw new ApiError(400, "Tweet ID is required");
        }

        if (!isValidObjectId(tweetId)) {
            throw new ApiError(400, "Invalid Tweet ID");
        }

        // Check if a like or dislike exists for the user on this tweet
        const interaction = await LikeDislike.findOne({
            tweet: tweetId,
            likedBy: req.user?._id,
        });

        let status;
        if (interaction) {
            status = interaction.type; // either "like" or "dislike"
        } else {
            status = null; // no interaction found
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { status },
                    "Tweet like/dislike status retrieved successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching like/dislike status for the tweet");
    }
});



export const getLikedVideos = asyncHandler(async (req, res) => {
    try {
        
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
                                description: 1, // Include other fields if necessary
                                views: 1,
                                createdAt: 1 // Add timestamps if needed
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
            }
        ]);

        if (!likedVideos || likedVideos.length === 0) {
            return res.status(404).json(new ApiResponse(404, [], "No liked videos found"));
        }



        return res.status(200).json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching liked videos");
    }
});