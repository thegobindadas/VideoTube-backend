# Video Hosting Platform Backend

This project is a **feature-rich backend** built with **Node.js**, **Express.js**, and **MongoDB** to power a complete **video hosting platform** similar to YouTube. It provides a secure, scalable, and efficient foundation for all major functionalities of a video hosting website.

## Features

### 1. **User Authentication and Authorization**
- Secure login and signup functionality.
- **JWT (JSON Web Token)**-based authentication for enhanced security.
- Access and refresh tokens for seamless session management.
- Password hashing using **bcrypt** to protect sensitive user credentials.

### 2. **Video Management**
- Upload, store, and retrieve videos with metadata (title, description, and tags).
- Integration with **Cloudinary** for efficient media storage and processing.
- Support for video thumbnails and multi-format video uploads.

### 3. **User Engagement Features**
- Like, dislike, and comment on videos.
- Subscribe and unsubscribe to channels for personalized content updates.

### 4. **Content Organization and Recommendations**
- Pagination and sorting using **mongoose-aggregate-paginate-v2** for efficient data retrieval.
- Watch history tracking and personalized video recommendations.

### 5. **Admin Features**
- Manage user content with edit and delete functionalities for videos and comments.
- Dashboard with video statistics for monitoring platform activity.

## Technology Stack

### Backend Technologies
- **Node.js**: Backend runtime environment for building scalable applications.
- **Express.js**: Web framework for creating RESTful APIs.
- **MongoDB** with **Mongoose**: Database solution for structured data storage and querying.

### Security Tools
- **JWT**: Secure authentication mechanism.
- **bcrypt**: Password hashing for user security.

### Media Management
- **Cloudinary**: Media storage and optimization.
- **multer**: Middleware for handling multipart/form-data.

### Utility Libraries
- **cookie-parser**: For managing cookies securely.
- **cors**: Enabling cross-origin resource sharing.
- **dotenv**: Managing environment variables.
- **mongoose-aggregate-paginate-v2**: Pagination and sorting for MongoDB data.

## Database
For a detailed view of the database models and relationships, refer to the [Model link](https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj?origin=share).



## Development Practices
- Following **industry-standard coding practices** to ensure scalability, maintainability, and performance.
- Secure handling of sensitive data such as passwords and tokens.
- Modular and reusable code structure for better development experience.
- API endpoints designed with REST principles.