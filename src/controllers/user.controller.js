import config from "../config/index.js";
import mongoose, { isValidObjectId } from "mongoose"
import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary, deletePhotoOnCloudinary } from "../utils/cloudinary.js"




const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token") 
    }
}




export const registerUser = asyncHandler(async (req, res) => {
    
    const { username, email, fullName, password } = req.body
    

    if ([username, email, fullName, password].some(field => field?.trim() === "" || field?.trim() === undefined)) {
        throw new ApiError(400, "All fields are required")
    }


    const existingUser = await User.findOne({ 
        $or: [{ username }, { email }]
    })

    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files?.avatar[0]?.path;
    }else {
        throw new ApiError(400, "Avatar file is required")
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    
    const avatar = await uploadOnCloudinary(avatarLocalPath, "videohub")
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "videohub")

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed")
    }


    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }



    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})


export const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    // if (!(username || email)) {
    //     throw new ApiError(400, "Username or email is required") 
    //}


    const user = await User.findOne({ 
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exists")
    }


    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }


    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong while logging in the user")
    }


    const options = {
        httpOnly: true,
        secure: true
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, 
            "User logged in successfully"
        )
    )
})


export const logoutUser = asyncHandler(async (req, res) => {   

    const logoutUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    if (!logoutUser) {
        throw new ApiError(500, "Something went wrong while logging out the user")
    }


    const options = {
        httpOnly: true,
        secure: true
    }

    
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200, 
            {}, 
            "User logged out successfully"
        )
    )
})


export const refreshAccessToken = asyncHandler(async (req, res) => {
    try {

        const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request")
        }


        const decodedToken = jwt.verify(incomingRefreshToken, config.REFRESH_TOKEN_SECRET)

        if (!decodedToken) {
            throw new ApiError(401, "Unauthorized request")
        }


        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }


        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }


        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
     

        const options = {
            httpOnly: true,
            secure: true
        }



        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    accessToken,
                    refreshToken: refreshToken
                }, 
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while refreshing access token")
    }
})


export const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { currentPassword, newPassword, confirmNewPassword } = req.body

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        throw new ApiError(400, "All fields are required")
    }

    if (newPassword !== confirmNewPassword) {
        throw new ApiError(400, "New password and confirm new password do not match")
    }


    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }


    const isPasswordValid = await user.isPasswordCorrect(currentPassword)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid current password")
    }


    user.password = newPassword
    await user.save({ validateBeforeSave: false })


    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {}, 
            "Password changed successfully"
        )
    )
})


export const getCurrentUserProfile = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {user: req.user}, 
            "User fetched successfully"
        )
    )
})


export const updateUserAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }


    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user, 
            "Account details updated successfully"
        )
    )
})


export const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    
    const avatar = await uploadOnCloudinary(avatarLocalPath, "videohub")

    if(!avatar) {
        throw new ApiError(500, "Something went wrong while uploading avatar")
    }


    const deleteAvatarInCloudinary = await deletePhotoOnCloudinary(req.user?.avatar)
    
    if (!deleteAvatarInCloudinary) {
        throw new ApiError(500, "Something went wrong while deleting avatar in cloudinary")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user, 
            "Avatar updated successfully"
        )
    )
})


export const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required")
    }

    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "videohub")

    if(!coverImage) {
        throw new ApiError(500, "Something went wrong while uploading cover image")
    }


    const deleteCoverImageInCloudinary = await deletePhotoOnCloudinary(req.user?.coverImage)
    
    if (!deleteCoverImageInCloudinary) {
        throw new ApiError(500, "Something went wrong while deleting cover image in cloudinary")
    }
    

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user, 
            "Cover image updated successfully"
        )
    )
})


export const getUserChannelProfile = asyncHandler(async (req, res) => {
    
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required")
    } 
    

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.trim().toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, 404, "channel does not exists")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channel[0], 
            "Channel profile fetched successfully"
        )
    )
})


export const getUserWatchHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user._id) }
        },
        {
            $project: {
                watchHistory: { $slice: ["$watchHistory", skip, parseInt(limit)] } // Skip and limit within the watch history array
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            thumbnail: 1,
                            duration: 1,
                            title: 1,
                            views: 1,
                            createdAt: 1,
                            description: 1,
                            owner: 1
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        avatar: 1,
                                        username: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    },
                    { $addFields: { owner: { $first: "$owner" } } }
                ]
            }
        }
    ]);

    if (!user?.length) {
        throw new ApiError(404, "User not found");
    }

    const totalVideos = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
        { $project: { totalVideos: { $size: "$watchHistory" } } }
    ]);

    const totalPages = Math.ceil(totalVideos[0]?.totalVideos / limit);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                watchHistory: user[0].watchHistory,
                totalPages,
                currentPage: parseInt(page),
                totalVideos: totalVideos[0]?.totalVideos
            },
            "Watch history fetched successfully"
        )
    );
});