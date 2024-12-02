import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";




/* The above code is a JavaScript function that checks the subscription status of a user to a specific
channel. Here is a breakdown of what the code does: */
export const checkSubscriptionStatus = asyncHandler(async (req, res) => {

    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "Channel id is required.");
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id.");
    }


    // Check if the user is subscribed to the channel
    const subscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    });



    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isSubscribed: !!subscription }, // Convert to boolean
                "Subscription status retrieved successfully."
            )
        );
});


/* The above code is a JavaScript function that toggles the subscription status for a user to a
specific channel. Here is a breakdown of what the code does: */
export const toggleSubscriptionStatus = asyncHandler(async (req, res) => {

    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "Channel id is required.");
    }

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id.");
    }


    // Check if the subscription already exists
    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    });


    if (existingSubscription) {

        // Unsubscribe if already subscribed
        const deleteSubscription = await Subscription.deleteOne({
            _id: existingSubscription._id // Ensure you're deleting the correct subscription
        });

        if (!deleteSubscription) {
            throw new ApiError(500, "Subscription not found or already unsubscribed.");
        }



        return res.status(200).json(
            new ApiResponse(
                200,
                {isSubscribed: false},
                "Unsubscribed successfully."
            )
        );
    } else {

        // Subscribe if not already subscribed
        const subscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user._id
        });

        if (!subscription) {
            throw new ApiError(500, "Internal Server Error: Subscription could not be created.");
        }



        return res.status(201).json(
            new ApiResponse(
                200,
                {
                    subscription,
                    isSubscribed: true
                },
                "Subscribed successfully."
            )
        );
    }
});


/* The above code is a controller function written in JavaScript that is responsible for fetching the
subscriber list of a channel. Here is a breakdown of what the code is doing: */
export const getChannelSubscribersList = asyncHandler(async (req, res) => {
    
    const requestingUserId = req.user._id;
    const { userId, page = 1, limit = 10 } = req.query;
    const targetUserId = userId || requestingUserId;
    
    
    if (!isValidObjectId(targetUserId)) {
      throw new ApiError(400, "Invalid channel ID.");
    }
  

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
  
    
    const totalSubscribers = await Subscription.countDocuments({ channel: targetUserId });
  
    
    const subscribers = await Subscription.aggregate([
        {
            $match: { 
                channel: new mongoose.Types.ObjectId(targetUserId) 
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        {
            $unwind: "$subscriberDetails",
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "subscriber",
                foreignField: "subscriber",
                as: "channels",
            },
        },
        {
            $project: {
                _id: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                fullName: "$subscriberDetails.fullName",
                avatar: "$subscriberDetails.avatar",
                totalSubscriptions: { $size: "$channels" },
                subscribedAt: "$createdAt",
            },
        },
        { $sort: { subscribedAt: -1  } },
        { $skip: skip },
        { $limit: limitNum },
    ]);
  
    
    const subscriberIds = subscribers.map((subscriber) => subscriber._id);
  
    const subscriptionsByMe = await Subscription.find({
      subscriber: requestingUserId,
      channel: { $in: subscriberIds },
    }).select("channel");
  
    const subscribedByMeSet = new Set(subscriptionsByMe.map((sub) => sub.channel.toString()));
  
    const result = subscribers.map((subscriber) => ({
      ...subscriber,
      isSubscribedByMe: subscribedByMeSet.has(subscriber._id.toString()),
    }));
  
    
    const totalPages = Math.ceil(totalSubscribers / limitNum);
  


    return res
        .status(200)
        .json(
            new ApiResponse(
            200,
            {
                subscribers: result,
                currentPage: pageNum,
                totalPages,
                totalSubscribers,
            },
            "Fetched channel subscribers successfully."
            )
        );
})


/* The above code is a JavaScript function that searches for subscribers of a specific channel based on
certain criteria. Here is a breakdown of what the code is doing: */
export const searchChannelSubscribers = asyncHandler(async (req, res) => {

    const requestingUserId = req.user._id;
    const { userId, search = "", page = 1, limit = 10 } = req.query;
    const targetUserId = userId || requestingUserId;
    const skip = (page - 1) * limit;
    
    
    if (!isValidObjectId(targetUserId)) {
        throw new ApiError(400, "Invalid Channel ID.");
    }

    
    const totalSubscribersData = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(targetUserId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        { $unwind: "$subscriberDetails" },
        {
            $match: {
                $or: [
                    { "subscriberDetails.fullName": { $regex: search, $options: "i" } },
                    { "subscriberDetails.username": { $regex: search, $options: "i" } },
                ],
            },
        },
        { $count: "count" },
    ]);

    const totalSubscribers = totalSubscribersData[0]?.count || 0;

    
    const subscriberList = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(targetUserId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        { $unwind: "$subscriberDetails" },
        {
            $match: {
                $or: [
                    { "subscriberDetails.fullName": { $regex: search, $options: "i" } },
                    { "subscriberDetails.username": { $regex: search, $options: "i" } },
                ],
            },
        },
        {
            $sort: { createdAt: -1 }, // Sort by `createdAt` in descending order
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "subscriber",
                foreignField: "channel",
                as: "subscribedChannels",
            },
        },
        {
            $project: {
                _id: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                fullName: "$subscriberDetails.fullName",
                avatar: "$subscriberDetails.avatar",
                totalSubscriptions: { $size: "$subscribedChannels" },
            },
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
    ]);

    
    const subscriberIds = subscriberList.map(subscriber => subscriber._id);

    const subscriptionsByMe = await Subscription.find({
        channel: { $in: subscriberIds },
        subscriber: requestingUserId,
    }).select("channel");

    const subscribedByMeSet = new Set(subscriptionsByMe.map(sub => sub.channel.toString()));

    const result = subscriberList.map(subscriber => ({
        ...subscriber,
        isSubscribedByMe: subscribedByMeSet.has(subscriber._id.toString()),
    }));


    const totalPages = Math.ceil(totalSubscribers / limit);

    

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    subscribers: result,
                    currentPage: parseInt(page),
                    totalPages,
                    totalSubscribers,
                },
                "Searched channel subscribers successfully."
            )
        );
});


/* The above code is a JavaScript function that retrieves the subscribed channels of a user. Here is a
breakdown of what the code does: */
export const getUserSubscribedChannels = asyncHandler(async (req, res) => {

    const requestingUserId = req.user._id;
    const { userId, page = 1, limit = 10 } = req.query;
    const targetUserId = userId || requestingUserId;
  

    if (!isValidObjectId(targetUserId)) {
        throw new ApiError(400, "Invalid user ID.");
    }


    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;


    const totalSubscribedChannels = await Subscription.countDocuments({ subscriber: targetUserId });
  
      
    const subscribedChannels = await Subscription.aggregate([
        { 
            $match: { subscriber: new mongoose.Types.ObjectId(targetUserId) } 
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },
        { 
            $unwind: "$channelDetails" 
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $project: {
                _id: "$channelDetails._id",
                username: "$channelDetails.username",
                fullName: "$channelDetails.fullName",
                avatar: "$channelDetails.avatar",
                totalSubscribers: { $size: "$subscribers" },
                subscribedAt: "$createdAt",
            }
        },
        { 
            $sort: { 
                subscribedAt: -1 
            } 
        },
        { 
            $skip: skip 
        }, 
        { 
            $limit: limitNum 
        }
    ]);
  
      
    const channelIds = subscribedChannels.map(channel => channel._id);
  
    const subscriptionsByMe = await Subscription.find({
        subscriber: requestingUserId,
        channel: { $in: channelIds }
    }).select("channel");
  
    const subscribedByMeSet = new Set(subscriptionsByMe.map(sub => sub.channel.toString()));
  
    const result = subscribedChannels.map(channel => ({
        ...channel,
        isSubscribedByMe: subscribedByMeSet.has(channel._id.toString())
    }));
  
  
    const totalPages = Math.ceil(totalSubscribedChannels / limitNum);
  
  
  
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    subscribedChannels: result,
                    currentPage: pageNum,
                    totalPages,
                    totalSubscribedChannels
                },
                "Fetched subscribed channels successfully"
            )
        )
});


/* The above code is a JavaScript function that searches for channels that a user is subscribed to
based on the provided search criteria. Here is a breakdown of what the code is doing: */
export const searchUserSubscribedChannels = asyncHandler(async (req, res) => {
    try {
        const requestingUserId = req.user._id;
        const { userId, search = "", page = 1, limit = 10 } = req.query;
        const targetUserId = userId || requestingUserId;
        const skip = (page - 1) * limit;


        if (!isValidObjectId(targetUserId)) {
            throw new ApiError(400, "Invalid user ID.");
        }

        
        const totalSubscribedChannels = await Subscription.aggregate([
            { 
                $match: { 
                    subscriber: new mongoose.Types.ObjectId(targetUserId) 
                } 
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channelDetails"
                }
            },
            { 
                $unwind: "$channelDetails" 
            },
            {
                $match: {
                    $or: [
                        { "channelDetails.fullName": { $regex: search, $options: "i" } },
                        { "channelDetails.username": { $regex: search, $options: "i" } }
                    ]
                }
            },
            { 
                $count: "count" 
            }
        ]);

        const totalCount = totalSubscribedChannels[0]?.count || 0;

        
        const subscribedChannels = await Subscription.aggregate([
            { 
                $match: { 
                    subscriber: new mongoose.Types.ObjectId(targetUserId) 
                } 
            },
            {
                $lookup: {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "channelDetails"
                }
            },
            { 
                $unwind: "$channelDetails" 
            },
            {
                $match: {
                    $or: [
                        { "channelDetails.fullName": { $regex: search, $options: "i" } },
                        { "channelDetails.username": { $regex: search, $options: "i" } }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }, // Sort by `createdAt` in descending order
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "channel",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $project: {
                    _id: "$channelDetails._id",
                    username: "$channelDetails.username",
                    fullName: "$channelDetails.fullName",
                    avatar: "$channelDetails.avatar",
                    totalSubscribers: { $size: "$subscribers" }
                }
            },
            { $skip: skip }, 
            { $limit: parseInt(limit) }
        ]);

        
        const channelIds = subscribedChannels.map(channel => channel._id);

        const subscriptionsByMe = await Subscription.find({
            subscriber: requestingUserId,
            channel: { $in: channelIds }
        }).select("channel");

        const subscribedByMeSet = new Set(subscriptionsByMe.map(sub => sub.channel.toString()));

        const result = subscribedChannels.map(channel => ({
            ...channel,
            isSubscribedByMe: subscribedByMeSet.has(channel._id.toString())
        }));


        const totalPages = Math.ceil(totalCount / limit);


        
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        subscribedChannels: result,
                        currentPage: parseInt(page),
                        totalPages,
                        totalSubscribedChannels: totalCount
                    },
                    "Searched subscribed channels successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, error.message || "Something went wrong while searching for subscribed channels");
    }
});
