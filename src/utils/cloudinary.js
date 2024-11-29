import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';
import fs from 'fs';


cloudinary.config({ 
    cloud_name: config.CLOUDINARY_CLOUD_NAME, 
    api_key: config.CLOUDINARY_API_KEY, 
    api_secret: config.CLOUDINARY_API_SECRET 
});



export const extractFilePath = (url) => {
    try {
        const regex = /\/(videohub\/[^.]+)/;
        const match = url.match(regex);
        
        return match ? match[1] : null;
    } catch (error) {
        console.log(error || "Something went wrong while extracting cloudinary file path");
        
        throw error
    }
}



export const uploadOnCloudinary = async (localFilePath, folderPath="videohub") => {
    try {
        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload( localFilePath, {
                folder: folderPath,
                resource_type: "auto",
            },
        )

        fs.unlinkSync(localFilePath)

        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}



export const deletePhotoOnCloudinary = async (cloudinaryPhotoPathUrl) => {
    try {
 
        if (!cloudinaryPhotoPathUrl) return null
            
        const result = await cloudinary.uploader.destroy(await extractFilePath(cloudinaryPhotoPathUrl), {
            resource_type: "image",
            //type: 'authenticated'
        });

        return result;
    } catch (error) {
        return null
    }
};



export const deleteVideoOnCloudinary = async (cloudinaryVideoPathUrl) => {
    try {
        
        if (!cloudinaryVideoPathUrl) return null

        const result = await cloudinary.uploader.destroy(await extractFilePath(cloudinaryVideoPathUrl), {
            resource_type: "video",
            //type: 'authenticated'
        });

        return result;
    } catch (error) {
        return null
    }
};



export const deleteFolderOnCloudinary = async (cloudinaryFolderPath) => {
    try {

        if (!cloudinaryFolderPath) return null

        const result = await cloudinary.api.delete_folder(cloudinaryFolderPath)

        return result
    } catch (error) {
        return null
    }
}