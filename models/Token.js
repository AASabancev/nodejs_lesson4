const mongoose = require("mongoose");
const { Schema } = mongoose;

const tokenScheme = new Schema({
	// id: new mongoose.Types.ObjectId(),
	user: { type: Schema.Types.ObjectId, ref: 'User' },
	accessToken: String,
	refreshToken: String,
	accessTokenExpiredAt: Date,
	refreshTokenExpiredAt: Date,
});

module.exports = mongoose.model("Token", tokenScheme);

