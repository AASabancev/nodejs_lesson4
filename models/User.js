const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const SALT_WORK_FACTOR = 10;

const userScheme = new Schema({
	// id: new mongoose.Types.ObjectId(),
	firstName: String,
	image: String,
	middleName: String,
	permission: {
		chat: {
			C: {type: Boolean, default: true},
			R: {type: Boolean, default: true},
			U: {type: Boolean, default: true},
			D: {type: Boolean, default: true}
		},
		news: {
			C: {type: Boolean, default: true},
			R: {type: Boolean, default: true},
			U: {type: Boolean, default: true},
			D: {type: Boolean, default: true}
		},
		settings: {
			C: {type: Boolean, default: true},
			R: {type: Boolean, default: true},
			U: {type: Boolean, default: true},
			D: {type: Boolean, default: true}
		}
	},
	surName: String,
	username: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true }
});

userScheme.pre('save', async function (next) {
	console.log('pre save', this);
	const user = this;
	if (!user.isModified("password")) return next();

	const newHash = await user.createHashPassword(user.password);
	if(newHash){
		user.password = newHash
	}
	next();
})


userScheme.methods.createHashPassword = async (newPassword) => {
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
			if (err) {
				return reject(err);
			}

			bcrypt.hash(newPassword, salt, function (err, hash) {
				if (err) {
					return reject(err);
				}
				resolve(hash);
			})
		})
	})
}

userScheme.methods.comparePassword = function (checkPass, next) {
	bcrypt.compare(checkPass, this.password, function (err, isMatch) {
		if (err) {
			return next(err);
		}

		next(null, isMatch);
	})
}

module.exports = mongoose.model("User", userScheme);

