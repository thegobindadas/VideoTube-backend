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
import likeRouter from "./routes/like.route.js"
import commentRouter from "./routes/comment.route.js"
import playlistRouter from "./routes/playlist.route.js"
import tweetRouter from "./routes/tweet.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import dashboardRouter from "./routes/dashboard.route.js"



// use routes
app.use("/api/v2/user", userRouter)
app.use("/api/v2/video", videoRouter)
app.use("/api/v2/like", likeRouter)
app.use("/api/v2/comment", commentRouter)
app.use("/api/v2/playlist", playlistRouter)
app.use("/api/v2/tweet", tweetRouter)
app.use("/api/v2/subscription", subscriptionRouter)
app.use("/api/v2/dashboard", dashboardRouter)





export { app }