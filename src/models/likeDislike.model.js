import mongoose, { Schema } from "mongoose";


const likeDislikeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["like", "dislike"],
        required: true
    }
}, { timestamps: true });


export const LikeDislike = mongoose.model("LikeDislike", likeDislikeSchema)