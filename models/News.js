const mongoose = require("mongoose");
const { Schema } = mongoose;


const newsScheme = new Schema({
	// id: new mongoose.Types.ObjectId(),
	created_at: Date,
	text: String,
	title: String,
	user: { type: Schema.Types.ObjectId, ref: 'User' },
});


module.exports = mongoose.model("News", newsScheme);

