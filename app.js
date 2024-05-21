import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import dbConnect from './utils/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import errorMiddleware from './middlewares/error.js';
dotenv.config({path:"./.env"});
const app=express();

// Connecting to Database
dbConnect(process.env.MONGO_URI);

//Connecting to Cloudinary
cloudinary.config({
   cloud_name: process.env.CLOUDINARY_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
 });


// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());


//Routes
app.use("/users",userRoutes);
app.use("/chats",chatRoutes);
app.use(errorMiddleware);
app.listen(process.env.PORT||5000, ()=>{
   console.log(`Server Started at port ${process.env.PORT}`)
})


export default app;