import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import dbConnect from './utils/db.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import errorMiddleware from './middlewares/error.js';
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import { socketAuthenticator } from './middlewares/socketAuth.js';
dotenv.config({path:"./.env"});
const app=express();


//Cors option 

const corsOptions = {
   origin: [
     "http://localhost:5173",
     "http://localhost:4173",
     process.env.CLIENT_URL,
   ],
   methods: ["GET", "POST", "PUT", "DELETE"],
   credentials: true,
 };
 
 
 
// Connecting to Database
dbConnect(process.env.MONGO_URI);


const userSocketIDs = new Map();
const onlineUsers = new Set();
//Connecting to Cloudinary
cloudinary.config({
   cloud_name: process.env.CLOUDINARY_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
 });

// Creating Server
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);
// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());


//Routes
app.use("/users",userRoutes);
app.use("/chats",chatRoutes);

// Configuring Sockets
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});





app.use(errorMiddleware);
server.listen(process.env.PORT||5000, ()=>{
   console.log(`Server Started at port ${process.env.PORT}`)
})


export default app;