import { ALERT, REFETCH_CHATS } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import TryCatch from "../middlewares/tryCatch.js";
import Chat from "../models/chatModel.js";
import emitEvent from "../utils/emitEvent.js";

export const newgroup = TryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user];

  await Chat.create({
    name,
    members: allMembers,
    groupchat: true,
    creator: req.user,
  });

  emitEvent(req, ALERT, allMembers, `${name} Group  Created Succesfully`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created Succesfully",
  });
});


// Display7ing all chats

export const myChats = TryCatch(async (req, res, next) => {
    const { name, members } = req.body;
  
   const chats=await Chat.find({member:req.user}).populate("members","name username avatar");
  
   const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);

    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });




    return res.status(200).json({
      success: true,
      chats:transformedChats
    });
  });