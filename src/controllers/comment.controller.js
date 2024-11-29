import mongoose, { isValidObjectId } from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"




export const addComment = asyncHandler(async (req, res) => {
    try {

        const { content } = req.body
        const { videoId } = req.params

        if (!content) {
            throw new ApiError(400, "Content is required")
        }

        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }


        const comment = await Comment.create({
            content,
            video: videoId,
            owner: req.user._id
        })

        if (!comment) {
            throw new ApiError(500, "Something went wrong while creating comment")
        }



        return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                comment,
                "Comment created successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while creating comment")
    }
})


export const updateComment = asyncHandler(async (req, res) => {
    try {

        const { commentId } = req.params
        const { content } = req.body
    
        if (!commentId) {
            throw new ApiError(400, "Comment Id id is required")
        }


        if (!isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id")  
        }


        const comment = await Comment.findById(commentId)

        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }


        if (comment.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this comment")
        }


        if (content) {
            comment.content = content
        }

        const updatedComment = await comment.save({ validateBeforeSave: false })


        if (!updatedComment) {
            throw new ApiError(500, "Something went wrong while updating comment")
        }


        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while updating comment")
    }
})


export const deleteComment = asyncHandler(async (req, res) => {
    try {
        
        const { commentId } = req.params

        if (!commentId) {
            throw new ApiError(400, "Comment id is required")
        }


        if (!isValidObjectId(commentId)) {
            throw new ApiError(400, "Invalid comment id")
        }


        const comment = await Comment.findById(commentId)


        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }


        if (comment.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this comment")
        }


        const deleteComment = await comment.deleteOne()

        if (!deleteComment) {
            throw new ApiError(500, "Something went wrong while deleting comment")
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
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while deleting comment")
    }
})


export const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        const { page = 1, limit = 3 } = req.query


        if (!videoId) {
            throw new ApiError(400, "Video id is required")
        }


        if (!isValidObjectId(videoId)) {
            throw new ApiError(400, "Invalid video id")
        }


        const comments = await Comment.find({ video: videoId })
            .populate('owner', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit) 
            .limit(Number(limit));
        

        if (!comments) {
            throw new ApiError(404, "Comments not found")
        }

        // Get total count of comments for the video
        const totalComments = await Comment.countDocuments({ video: videoId });


        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    comments,
                    totalComments,
                    totalPages: Math.ceil(totalComments / limit),
                    currentPage: Number(page),
                },
                "Comments fetched successfully"
            )
        )

    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while fetching comments")
    }
})