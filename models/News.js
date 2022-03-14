const mongoose = require("mongoose");
const { Schema } = mongoose;
const path = require("path");

const ModelIncrement = require( path.join(process.cwd(), 'models','ModelIncrement.js') );

const newsScheme = new Schema({
	// id: new mongoose.Types.ObjectId(),
	id: Number,
	created_at: Date,
	text: String,
	title: String,
	user: { type: Schema.Types.ObjectId, ref: 'User' },
});

newsScheme.pre('save', async function(next) {
	if (this.isNew) {
		const id = await ModelIncrement.getNextId('News');
		this.id = id; // Incremented
	}
	next();
});


module.exports = mongoose.model("News", newsScheme);

