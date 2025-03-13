import mongoose, { Schema, model, Types } from "mongoose";
import { stringify } from "querystring";

const schema = new Schema(
  {
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    reciever: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageId: String,
  },
  {
    timestamps: true,
  }
);

export const UnReadMessage =
  mongoose.models.UnReadMessage || model("UnReadMessage", schema);
