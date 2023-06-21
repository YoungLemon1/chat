import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  recipient: {
    type: Schema.Types.ObjectId,
  },
  text: {
    type: String,
  },
  CreatedAt: {
    type: Date,
  },
});

const MessageModel = model("Message", MessageSchema);

export default MessageModel;
