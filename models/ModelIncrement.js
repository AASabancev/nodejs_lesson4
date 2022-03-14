const mongoose = require("mongoose");
const { Schema } = mongoose;

const ModelIncrementSchema = new Schema({
	model: { type: String, required: true, index: { unique: true } },
	idx: { type: Number, default: 0 }
});

ModelIncrementSchema.statics.getNextId = async function(modelName, callback) {
	let incr = await this.findOne({ model: modelName });

	if (!incr) incr = await new this({ model: modelName }).save();
	incr.idx++;
	incr.save();
	return incr.idx;
};

module.exports = mongoose.model("ModelIncrement", ModelIncrementSchema);

