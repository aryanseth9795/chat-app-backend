import { ALERT, NEW_MESSAGE, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import errorMiddleware from "../middlewares/error.js";
import TryCatch from "../middlewares/tryCatch.js";
import { Chat } from "../models/chatModel.js";
import { Message } from "../models/messageModel.js";
import { User } from "../models/userModels.js";
import UploadToCloudinary from "../utils/cloudinary.js";
import emitEvent from "../utils/emitEvent.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { DeleteAttachments } from "../utils/messageattchmentdel.js";

export const newgroup = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user.id];

  await Chat.create({
    name,
    members: allMembers,
    groupChat: true,
    creator: req.user.id,
  });

  emitEvent(req, ALERT, allMembers, `${name} Group  Created Succesfully`);
  emitEvent(req, REFETCH_CHATS, members);
  return res.status(201).json({
    success: true,
    message: "Group Created Succesfully",
  });
});

// Displaying all chats

export const myChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user.id }).populate(
    "members",
    "name username avatar"
  );
  // This is Comment section
  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user.id);

    return {
      _id,
      groupChat,

      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      username: groupChat ? "" : otherMember.username,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.id.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

// My Groups
export const getMyGroups = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user.id,
    groupChat: true,
    creator: req.user.id,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));
  return res.status(200).json({
    success: true,
    groups,
  });
});

// adding members

export const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user?.id.toString())
    return next(new ErrorHandler("You are not allowed to add members", 403));

  chat.members.push(...members);

  if (chat.members.length > 100)
    return next(new ErrorHandler("Group members limit reached", 400));

  await chat.save();

  // const allUsersName = members.map((i) => i.name).join(", ");

  emitEvent(
    req,
    ALERT,
    chat.members
    // `${allUsersName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Members added successfully",
  });
});

// removing members

export const removeMember = TryCatch(async (req, res, next) => {
  const { members, chatId } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user?.id.toString())
    return next(new ErrorHandler("You are not allowed to Remove members", 403));

  if (chat.members.length <= 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  const allChatMembers = chat.members.map((i) => i.toString());

  chat.members = allChatMembers.filter((member) => !members.includes(member));

  await chat.save();

  // emitEvent(req, ALERT, chat.members, {
  //   message: `${userThatWillBeRemoved.name} has been removed from the group`,
  //   chatId,
  // });

  // emitEvent(req, REFETCH_CHATS, allChatMembers);

  return res.status(200).json({
    success: true,
    message: "Selected member removed successfully",
  });
});

// delete whole group
export const DeleteGroup = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user.id.toString())
    return next(new ErrorHandler("You are Not Admin of this Grp", 403));

  const deleted = await DeleteAttachments(chatId);

  if (!deleted) return next(new ErrorHandler("Unable to Delete", 401));

  await Promise.all([Chat.deleteOne({_id:chatId}), Message.deleteMany({ chat: chatId })]);
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Group Deleted Successfully",
  });
});

export const RenameGroup = TryCatch(async (req, res, next) => {
  const { chatId, name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (chat.creator.toString() !== req.user.id)
    return next(new ErrorHandler("You are Not Admin", 401));

  chat.name = name;
  chat.save();

  return res.status(200).json({
    success: true,
    message: "Group Name Changed Successfully ",
  });
});

// Leaving Groups
export const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `User ${user.name} has left the group`,
  });

  return res.status(200).json({
    success: true,
    message: "Leave Group Successfully",
  });
});

//adding attachments to message
export const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("Please Upload Attachments", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Files Can't be more than 5", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user.id, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachments", 400));

  //   Upload files here
  const attachments = await UploadToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  try {
    const message = await Message.create(messageForDB);
    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });

    // emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.log(error);
  }
});

export const getChatDetails = TryCatch(async (req, res, next) => {
  const membersArray = await Chat.findById(req.params.id).select(
    "members groupChat name "
  );
  let chatDetails = {};
  const othermember = membersArray.members.filter(
    (mem) => mem._id.toString() !== req.user.id.toString()
  );
  const OtherUserDetail = await User.find({ _id: othermember }).select(
    "name username avatar lastseen"
  );

  if (!OtherUserDetail[0].name)
    return next(new ErrorHandler("No User Found", 401));

  if (!membersArray?.groupChat) {
    chatDetails = {
      chatId: membersArray._id,
      name: OtherUserDetail[0].name,
      members: membersArray.members,
      avatar: OtherUserDetail[0].avatar.url,
      username: OtherUserDetail[0].username,
      groupChat: membersArray.groupChat,
      lastseen:OtherUserDetail[0].lastseen
    };
  } else {
    chatDetails = {
      chatId: membersArray._id,
      name: membersArray.name,
      members: membersArray?.members,
      avatar: OtherUserDetail.slice(0, 4).map((user) => user?.avatar?.url),
      groupChat: membersArray.groupChat,
   
    };
  }
  return res.status(200).json({
    success: true,
    chatDetails,
  });
});

export const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  if (chat.creator.toString() !== req.user?.id.toString())
    return next(
      new ErrorHandler("You are not allowed to rename the group", 403)
    );

  chat.name = name;

  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

export const deleteChat = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;

  if (chat.groupChat)
    return next(
      new ErrorHandler(
        "You are not allowed to delete the group, You may try to leave the group",
        403
      )
    );

  const deleted = await DeleteAttachments(chatId);

  if (!deleted) return next(new ErrorHandler("Unable to Delete", 401));

  await Promise.all([
    Chat.deleteOne({ _id: chatId }),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

// Sending messages in chunk
export const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user?.id.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 403)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});

export const getUserForGroup = TryCatch(async (req, res, next) => {
  const resp = await Chat.find({ members: req.user.id, groupChat: false })
    .select("members")
    .populate("members", " avatar name ");

  const users = resp
    .flatMap((user) => user.members)
    .filter((use) => use._id.toString() !== req.user.id.toString());

  if (!users) {
    return next(new ErrorHandler("No Friends to add", 401));
  }
  res.status(200).json({
    success: true,
    users,
  });
});

export const getUserForaddinUser = TryCatch(async (req, res, next) => {
  const resp = await Chat.find({ members: req.user.id, groupChat: false })
    .select("members")
    .populate("members", " avatar name username ");

  const users = resp
    .flatMap((user) => user.members)
    .filter((use) => use._id.toString() !== req.user.id.toString());

  const allgrpMembers = await Chat.findById(req.params.id).select("members");
  const groupMemberIds = new Set(
    allgrpMembers.members.map((member) => member.toString())
  );
  const leftmembersforadd = users.filter(
    (user) => !groupMemberIds.has(user._id.toString())
  );

  if (!leftmembersforadd) {
    return next(new ErrorHandler("No Friends to add", 401));
  }
  res.status(200).json({
    success: true,
    leftmembersforadd,
  });
});

export const groupDetails = TryCatch(async (req, res, next) => {
  const groupDetail = await Chat.findById(req.params.id)
    .select("name members")
    .populate("members", "name avatar username ");
  if (!groupDetails) return next(new ErrorHandler("No Members ", 401));
  res.status(200).json({
    success: true,
    groupDetail,
  });
});
