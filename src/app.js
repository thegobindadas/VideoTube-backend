import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import config from "./config/index.js"


const app = express()



app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())





// import routes
import userRouter from "./routes/user.route.js"
import videoRouter from "./routes/video.route.js"
import likeDislikeRouter from "./routes/likeDislike.route.js"
import commentRouter from "./routes/comment.route.js"
import playlistRouter from "./routes/playlist.route.js"
import tweetRouter from "./routes/tweet.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import dashboardRouter from "./routes/dashboard.route.js"





// use routes
app.use("/api/v2/users", userRouter)
app.use("/api/v2/videos", videoRouter)
app.use("/api/v2/likedislikes", likeDislikeRouter)
app.use("/api/v2/comments", commentRouter)
app.use("/api/v2/playlists", playlistRouter)
app.use("/api/v2/tweets", tweetRouter)
app.use("/api/v2/subscriptions", subscriptionRouter)
app.use("/api/v2/dashboards", dashboardRouter)










export { app }