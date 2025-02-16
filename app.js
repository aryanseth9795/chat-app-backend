import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dbConnect from "./utils/db.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import errorMiddleware from "./middlewares/error.js";
import cloudinary from "cloudinary";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import { socketAuthenticator } from "./middlewares/socketAuth.js";
import { getSockets } from "./lib/helper.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
} from "./constants/event.js";

// Integrating DotEnv File
dotenv.config({ path: "./.env" });

//Initialising server
const app = express();

//Cors option
const corsOptions = {
  origin: [
    "http://localhost:8000",
    "http://192.168.1.5:8000",
    process.env.CLIENT_URL,
  ],
  // origin:"*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

// Connecting to Database
dbConnect(process.env.MONGO_URI);

//Connecting to Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const userSocketIDs = new Map();
const onlineUsers = new Set();

// Creating Server
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

//Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/chats", chatRoutes);



// app.set("io", io);

// Configuring Sockets
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  // console.log(user);
  userSocketIDs.set(user._id.toString(), socket.id);
  console.log(userSocketIDs)

  // socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
  //   const messageForRealTime = {
  //     content: message,
  //     _id: uuid(),
  //     sender: {
  //       _id: user._id,
  //       name: user.name,
  //     },
  //     chat: chatId,
  //     createdAt: new Date().toISOString(),
  //   };

  // const messageForDB = {
  //   content: message,
  //   sender: user._id,
  //   chat: chatId,
  // };

  //   const membersSocket = getSockets(members);
  //   io.to(membersSocket).emit(NEW_MESSAGE, {
  //     chatId,
  //     message: messageForRealTime,
  //   });
  //   io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

  //   try {
  //     await Message.create(messageForDB);
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // });

  // socket.on(START_TYPING, ({ members, chatId }) => {
  //   const membersSockets = getSockets(members);
  //   socket.to(membersSockets).emit(START_TYPING, { chatId });
  // });

  // socket.on(STOP_TYPING, ({ members, chatId }) => {
  //   const membersSockets = getSockets(members);
  //   socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  // });

  // socket.on(CHAT_JOINED, ({ userId, members }) => {
  //   onlineUsers.add(userId.toString());

  //   const membersSocket = getSockets(members);
  //   io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  // });

  // socket.on(CHAT_LEAVED, ({ userId, members }) => {
  //   onlineUsers.delete(userId.toString());

  //   const membersSocket = getSockets(members);
  //   io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  // });

  // socket.on("disconnect", () => {
  //   userSocketIDs.delete(user._id.toString());
  //   onlineUsers.delete(user._id.toString());
  //   socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  // });
});
app.use(errorMiddleware);
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server Started at port ${process.env.PORT}`);
});

export default app;
