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
import { User } from "./models/userModels.js";
import axios from "axios";
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
  sameSite:  "None", // for dev it will commented
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

// Creating Socket Map and Set of Online User
export const userSocketIDs = new Map();
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

//setting up io socket to access in controller and middlewares
app.set("io", io);

// Configuring Sockets
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

// Connecting Connection
io.on("connection", (socket) => {
  const user = socket.user;

  // Remove old socket ID if the user was already connected
  if (userSocketIDs.has(user._id.toString())) {
    console.count(`User ${user._id} reconnected, replacing old socket.`);
    userSocketIDs.delete(user._id);
  }

  userSocketIDs.set(user?._id.toString(), socket?.id);
  onlineUsers.add(user?._id.toString());

  // Listing All Users and Online Users
  console.log(userSocketIDs);
  console.log(onlineUsers);

  // Fetching Online Users
  socket.on(ONLINE_USERS, ({ member }) => {
    socket.member = member;
    const onlineMembers = member?.filter((user) => onlineUsers.has(user));
    const onlineMembersset = [...new Set(onlineMembers)];
    socket.emit(ONLINE_USERS, { onlineMembersset });
    const membersSockets = getSockets(onlineMembersset);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER);
  });

  // Refetching Online Users
  socket.on(REFETCH_ONLINE_USER, () => {
    const onlineMembers = socket?.member?.filter((user) =>
      onlineUsers.has(user)
    );
    const onlineMembersset = [...new Set(onlineMembers)];
    socket.emit(ONLINE_USERS, { onlineMembersset });
  });

  //Live Messages
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

  // Live Typing
  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  //Live Stop Typing
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

  // Disconnecting User From Socket
  socket.on("disconnect", async () => {
    //deleting user from socket
    userSocketIDs.delete(user._id.toString());

    // deleting user from Online User Set
    onlineUsers.delete(user._id.toString());

    // Updating Last seen
    try {
      await User.findByIdAndUpdate(user._id, { lastseen: Date.now() });
    } catch (error) {
      console.log(error);
    }

    // Refetching Other Users
    const onlineMembers = socket?.member?.filter((user) =>
      onlineUsers.has(user)
    );
    const onlineMembersset = [...new Set(onlineMembers)];
    const membersSockets = getSockets(onlineMembersset);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER);
  });
});

// Applying All ErrorHandling
app.use(errorMiddleware);

// Keeping Server Alive On Render

const keepServerAwake = () => {
  setInterval(async () => {
    try {
      await axios.get(process.env.PING_URL);
      console.log("✅ Server pinged to prevent sleep");
    } catch (error) {
      console.error("❌ Error pinging server:", error.message);
    }
  }, (process.env.PING_TIME || 12) * 60 * 1000); // Ping every 10 minutes
};

if (process.env.NODE_ENV !== "DEVELOPMENT") {
  keepServerAwake();
}

//Listening To Port
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server Started at port ${process.env.PORT}`);
});

export default app;
