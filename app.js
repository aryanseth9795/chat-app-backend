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
  FETCH_UNREAD_MESSAGES,
  MARK_ALL_READ_MESSAGE,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  PROFILE_UPDATED,
  REFETCH_CHATS,
  REFETCH_MESSAGE,
  REFETCH_ONLINE_USER,
  SEEN_MESSAGE,
  START_TYPING,
  STOP_TYPING,
  UPDATE_SEEN_MESSAGE,
} from "./constants/event.js";
import { Message } from "./models/messageModel.js";
import { UnReadMessage } from "./models/unReadMessage.js";
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
  sameSite: "None", // for dev it will commented
};

// Cookies Option
export const cookieOptions = {
  maxAge:
    process.env.COOKIE_EXPIRY * 24 * 60 * 60 * 1000 || 3 * 24 * 60 * 60 * 1000,
  sameSite: "None", // for dev it will commented
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
const FetchList = () => {
  console.log(userSocketIDs);
  console.log(onlineUsers);
};

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
  FetchList();

  // Fetching Online Users
  socket.on(ONLINE_USERS, ({ member }) => {
    socket.member = member;
    const onlineMembers = member?.filter((user) => onlineUsers.has(user));
    const onlineMembersset = [...new Set(onlineMembers)];
    socket.emit(ONLINE_USERS, { onlineMembersset });
    const membersSockets = getSockets(onlineMembersset);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER);
  });

  socket.on(FETCH_UNREAD_MESSAGES, async () => {
    const unreaddata = await UnReadMessage.aggregate([
      { $match: { receiver: user._id } },
      {
        $group: {
          _id: { chatId: "$chatId", sender: "$sender" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          chatId: "$_id.chatId",
          sender: "$_id.sender",
          count: 1,
        },
      },
    ]);

    socket.emit(FETCH_UNREAD_MESSAGES, { unreaddata });
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
    const onlineMembers = members?.filter((id) => onlineUsers.has(id));
    const membersSocket = getSockets(onlineMembers);

    const receiver = members.filter((id) => id !== user._id.toString());

    const otherUserOnline = receiver.some((id) => onlineUsers.has(id));

    const messageId = uuid();

    const messageForRealTime = {
      content: message,
      _id: messageId,
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
      status: otherUserOnline ? "Recieved" : "Sent",
    };

    const messageForDB = {
      _id: messageId,
      content: message,
      sender: user._id,
      chat: chatId,
      status: otherUserOnline ? "Recieved" : "Sent",
    };

    const messageForUnread = {
      _id: messageId,
      receiver,
      sender: user._id,
      chatId,
    };

    if (otherUserOnline) {
      const memberSoc = getSockets(members);
      io.to(memberSoc).emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
      });
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {
        chatId,
        sender: user._id,
      });
    } else {
      socket.emit(NEW_MESSAGE, {
        chatId,
        message: messageForRealTime,
      });
      try {
        await UnReadMessage.create(messageForUnread);
      } catch (error) {
        throw new Error(error);
      }
    }

    try {
      await Message.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }
  });

  socket.on(SEEN_MESSAGE, async ({ chatId, messageId, sender }) => {
    const membersSockets = getSockets([sender]);
    if (membersSockets)
      socket
        .to(membersSockets)
        .emit(UPDATE_SEEN_MESSAGE, { chatId, messageId });
    try {
      await Message.findOneAndUpdate(
        { chat: chatId, _id: messageId },
        { status: "Seen" }
      );
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(MARK_ALL_READ_MESSAGE, async ({ chatId, reciever, sender }) => {
    if (sender === user._id.toString()) return;
    try {
      await Promise.all([
        Message.updateMany(
          { chat: chatId, $or: [{ status: "Recieved" }, { status: "Sent" }] },
          { $set: { status: "Seen" } }
        ),
        UnReadMessage.deleteMany({ chatId, reciever }),
      ]);
    } catch (error) {
      console.log(error, "Error in deleting Temp messages");
    }
    const senderOnline = onlineUsers.has(sender);

    if (senderOnline) {
      const senderSocket = getSockets([sender]);
      socket.to(senderSocket).emit(REFETCH_MESSAGE, { refetchId: chatId });
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

    // Refetching Other Users
    const onlineMembers = socket?.member?.filter((user) =>
      onlineUsers.has(user)
    );
    const onlineMembersset = [...new Set(onlineMembers)];
    const membersSockets = getSockets(onlineMembersset);
    socket.to(membersSockets).emit(REFETCH_ONLINE_USER);

    // Updating Last seen
    try {
      await User.findByIdAndUpdate(user._id, { lastseen: Date.now() });
    } catch (error) {
      console.log(error);
    }

    FetchList();
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
