import { Message } from "../models/messageModel.js";
import { v2 as cloudinary } from "cloudinary";

export const DeleteAttachments = async (chatId) => {
  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  // await cloudinary.uploader.destroy()

  if (public_ids.length === 0) {
    console.log("No attachments to delete.");
    return true;
  }
  try {
    const result = await cloudinary.api.delete_resources(public_ids);
    console.log("Deleted Attachments:", result);
    return true;
  } catch (error) {
    console.error("Error deleting attachments:", error);
    return false;
  }
};
