import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { LikeDislike } from "../models/likeDislike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";




export const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required.")
    }

    if (!videoId) {
        throw new ApiError(400, "Video id is required.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id.")
    }


    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Internal server error: Unable to post comment on the video. Please try again later.")
    }



    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                comment,
                "Comment created successfully."
            )
        )
});


export const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!commentId) {
        throw new ApiError(400, "Comment Id is required.")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id.")  
    }


    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found. The comment you are looking for does not exist.")
    }


    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment. Only the owner can modify it.")
    }


    if (content) {
        comment.content = content
    }

    const updatedComment = await comment.save({ validateBeforeSave: false })

    if (!updatedComment) {
        throw new ApiError(500, "Internal server error: Failed to update the comment. Please try again later.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully."
            )
        )
});


export const deleteComment = asyncHandler(async (req, res) => {
        
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment id is required.")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id.")
    }


    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found. The comment you are trying to delete does not exist.")
    }


    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to delete this comment.")
    }


    const deleteComment = await comment.deleteOne()

    if (!deleteComment) {
        throw new ApiError(500, "Internal server error: Failed to delete the comment. Please try again later.")
    }



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Comment deleted successfully"
            )
        )
});


export const getCommentsForVideo = asyncHandler(async (req, res) => { 
    
    const { videoId } = req.params
    const { page = 1, limit = 3 } = req.query

    if (!videoId) {
        throw new ApiError(400, "Video id is required.")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id.")
    }

    
    const comments = await Comment.find({ video: videoId })
        .populate('owner', 'username fullName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit) 
        .limit(Number(limit));

    if (!comments || comments.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        comments: [],
                        totalComments: comments.length,
                        totalPages: Math.ceil(comments.length / limit),
                        currentPage: Number(page),
                    },
                    "Comments fetched successfully."
                )
            );
    }

    
    const commentsWithLikesDislikes = await Promise.all(
        comments.map(async (comment) => {
            
            const totalLikes = await LikeDislike.countDocuments({ comment: comment._id, type: 'like' });
            const totalDislikes = await LikeDislike.countDocuments({ comment: comment._id, type: 'dislike' });

            
            const userLikeDislike = await LikeDislike.findOne({
                comment: comment._id,
                likedBy: req.user._id
            });


            let isCommentLikedDislikedByMe = null;

            if (userLikeDislike) {
                isCommentLikedDislikedByMe = userLikeDislike.type;
            }

            
            comment = comment.toObject(); // Convert to plain object to modify
            comment.totalLikes = totalLikes;
            comment.totalDislikes = totalDislikes;
            comment.isCommentLikedDislikedByMe = isCommentLikedDislikedByMe;


            return comment;
        })
    );

    
    const totalComments = await Comment.countDocuments({ video: videoId });



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    comments: commentsWithLikesDislikes,
                    totalComments,
                    totalPages: Math.ceil(totalComments / limit),
                    currentPage: Number(page),
                },
                "Comments fetched successfully."
            )
        );
});
