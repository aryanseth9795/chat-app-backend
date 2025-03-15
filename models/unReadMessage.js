import mongoose, { Schema, model, Types } from "mongoose";

const schema = new Schema(
  {
    _id: { type: String, required: true },

    chatId: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const UnReadMessage =
  mongoose.models.UnReadMessage || model("UnReadMessage", schema);
