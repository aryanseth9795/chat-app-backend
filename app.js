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
  PROFILE_UPDATED,
  REFETCH_CHATS,
  REFETCH_ONLINE_USER,
  START_TYPING,
  STOP_TYPING,
} from "./constants/event.js";
import { Message } from "./models/messageModel.js";

// Integrating DotEnv File
dotenv.config({ path: "./.env" });

//Initialising server
const app = express();

//Cors option
const corsOptions = {
  origin: ["https://chatsup.aryanseth.in", process.env.CLIENT_URL],

  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  sameSite: "None",
};

// Cookies Option

export const cookieOptions = {
  maxAge:
    process.env.COOKIE_EXPIRY * 24 * 60 * 60 * 1000 || 3 * 24 * 60 * 60 * 1000,
  // sameSite: "none",
  httpOnly: true,
  secure: process.env.NODE_ENV !== "DEVELOPMENT",
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

export const userSocketIDs = new Map();
console.log(userSocketIDs);
const onlineUsers = new Set();

// Creating Server
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

//Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/chats", chatRoutes);
app.get("/", (req, res) => {
  res.send("Server is running....");
});

//settint up io socket to access in controller and middlewares
app.set("io", io);

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

  // Remove old socket ID if the user was already connected
  if (userSocketIDs.has(user._id.toString())) {
    console.count(`User ${user._id} reconnected, replacing old socket.`);
    userSocketIDs.delete(user._id);
  }

  userSocketIDs.set(user?._id.toString(), socket?.id);
  onlineUsers.add(user._id.toString());
  


  console.log(userSocketIDs);
  console.log(onlineUsers);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSocket = getSockets(members);

    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });

    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });


  // Real time Updates on Profile Updatation
  socket.on(PROFILE_UPDATED, ({ member }) => {
    const onlineMembers = member.filter((user) => onlineUsers.has(user));
    const membersSockets = getSockets(onlineMembers);
    io.to(membersSockets).emit(REFETCH_CHATS);
  });

  socket.on(ONLINE_USERS, ({ member }) => {
    socket.member=member;
    const onlineMembers = member?.filter((user) => onlineUsers.has(user));
    socket.emit(ONLINE_USERS,{onlineMembers}); 
  });
  
  socket.on(REFETCH_ONLINE_USER, ({member}) => {
  const onlineMembers = member?.filter((user) => onlineUsers.has(user));
   const onlineMembersset = [...new Set(onlineMembers)];
    const membersSockets = getSockets(onlineMembersset);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER);
    console.log(onlineMembers,"at refetch")
  });


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

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    const onlineMembers = socket?.member?.filter((user) => onlineUsers.has(user));

    console.log("disconne", socket.member)
    const membersSockets = getSockets(onlineMembers);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER,{onlineMembers});

    // socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});
app.use(errorMiddleware);
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server Started at port ${process.env.PORT}`);
});

export default app;
