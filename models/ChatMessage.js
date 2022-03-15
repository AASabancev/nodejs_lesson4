const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatMessageScheme = new Schema({
	recipientId: Number,
	senderId: Number,
	text: String,
});

module.exports = mongoose.model("ChatMessage", chatMessageScheme);

