var express = require('express');
var path = require('path');
var crypto = require('crypto');
const chance = require('chance')();
const passport = require("passport")
const jwt = require("jsonwebtoken")
const formidable = require('formidable')
var router = express.Router();
var Jimp = require('jimp');

const User = require( path.join(process.cwd(), 'models','User.js') );
const Token = require( path.join(process.cwd(), 'models','Token.js') );
const fs = require("fs");
const bcrypt = require("bcrypt");

const JWT_SECRET = "jwt_secret";
const POSTFIX_THUMB = '_thumb';
const POSTFIX_FULL = '_full';
const PATH_UPLOAD = path.join('./public', 'upload','images');

const authMiddleware = (req, res, next) => {
  passport.authenticate('jwt', {session: false}, (err, user) => {
    if (!user || err){
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized'
      })
    }

    req.user = user
    next()
  })(req, res, next)
}


function generateJwtToken(user, expiritySeconds) {
  const body = { _id: user._id, username: user.username };
  return jwt.sign({user:body}, JWT_SECRET, { expiresIn: expiritySeconds });
}

async function findAccessToken(user, token) {
  return new Promise(function (resolve, reject) {
    const search = {
      user: user._id,
      accessToken: token
    };

    Token.findOne(search, "accessToken refreshToken accessTokenExpiredAt refreshTokenExpiredAt")
       .then(function (token) {
         resolve(token);
       })
       .catch(function (err) {
         reject(err);
       })
  });
}

async function generateToken(user) {
  return new Promise(function (resolve, reject) {
    const accessTokenExpiritySeconds = 86400;
    const refreshTokenExpiritySeconds = 86400 * 30;

    const accessToken = generateJwtToken(user, accessTokenExpiritySeconds);
    const refreshToken = generateJwtToken(user, refreshTokenExpiritySeconds);

    const decodedToken = jwt.decode(accessToken, JWT_SECRET)
    const decodedRefresh = jwt.decode(refreshToken, JWT_SECRET)

    const tokenBody = {
      user: user._id,
      /**
       * TODO: костыль с Bearer, без него фронт не авторизуется
       */
      accessToken: "Bearer " + accessToken,
      refreshToken: refreshToken,
      accessTokenExpiredAt: decodedToken.exp * 1000,
      refreshTokenExpiredAt: decodedRefresh.exp * 1000,
    };

    // resolve(tokenBody);
    Token.create(tokenBody)
       .then(function (token) {
         resolve(token);
       })
       .catch(function (err) {
         reject(err);
       })
  });


}

async function refreshTokens(refreshToken){
  /**
   * TODO: костыль с Bearer, с ним проверку не проходит
   */
  const user_id = jwt.verify( refreshToken.replace('Bearer ', ''), JWT_SECRET).user._id

  console.log('user_id', user_id)
  if(!user_id) {
    return;
  }

  const user = await User.findById({_id: user_id});

  console.log('user', user)
  if(!user) {
    return;
  }

  return await generateToken(user);
}


router.post('/registration', function(req, res, next) {
    let newUser = {
      ...req.body
    };
    User.create(newUser)
       .then(function (user) {

         req.login(user, async function(err){
           if(err){
             console.log('error1', err)
             next(err);
           }

           const token = await generateToken(user);


           let userCredentials = { ...user.toJSON(), ...token.toJSON() };
           delete(userCredentials.password);

           const send = res.json({
             ...userCredentials
           });

           // user.delete();
           return send;
         })


       })
       .catch(function (err) {
         res.json({
           error: err.name == "ValidationError" ? "Sorry, that username is already taken" : err,
           success: false,
         });



       });
});


router.post('/login', function(req, res, next) {

  passport.authenticate("local", (err, user) => {
    if(err){
      return next(err)
    }
    if(!user){
      return next({status:403, message: "Wrong email or password"});
    }

    req.login(user, async () => {
      const token = await generateToken(user);

      let userCredentials = { ...user.toJSON(), ...token.toJSON() };
      delete(userCredentials.password);

      return res.json({
        ...userCredentials
      })
    })
  })(req, res, next)


});


router.post('/refresh-token', async function(req, res, next) {
  const refreshToken = req.headers['authorization'];
  const token = await refreshTokens(refreshToken)
  if (!token){
    return res.status(401).json({
      code: 401,
      message: 'refreshToken not found'
    })
  }

  let userCredentials = { ...req.user.toJSON(), ...token.toJSON() };
  delete(userCredentials.password);

  res.json({
    ...userCredentials
  })
});


router.get('/profile', authMiddleware, function(req, res, next) {
  if(!req.user) {
    res.json({
      username: "nobody"
    })
  }

  User.findById(req.user._id, async (err, user) => {
    if(!user) {
      return res.json({
        username: "nobody"
      })
    }

    const token = await findAccessToken(user, req.headers.authorization);
    if(!token){
      return res.json({
        username: "nobody"
      })
    }

    let userCredentials = { ...user.toJSON(), ...token.toJSON() };
    delete(userCredentials.password);

    return res.json({
      ...userCredentials
    })
  })
});

/**
 * Чтобы не дублировать переменные для FULL и THUMB, сделаем функцию возврата имени с постфиксом и расширением
 * @param fileName название файла
 * @param postfix постфикс добавляемый к названию файла до расширения
 * @param ext расширение файла
 * @returns {string} название файла
 */
const getFileName = (fileName, postfix = POSTFIX_FULL, ext) => {
  return fileName + postfix + ext;
}

/**
 * Чтобы не дублировать переменные для FULL и THUMB, сделаем функцию возврата путь
 * @param fileName название файла
 * @param postfix постфикс добавляемый к названию файла до расширения
 * @param ext расширение файла
 * @returns {string} путь к файлу
 */
const getFilePath = (fileName, postfix = POSTFIX_FULL, ext) => {
  return path.join(process.cwd(), PATH_UPLOAD, getFileName(fileName, postfix, ext));
}

router.patch('/profile', authMiddleware, function(req, res, next) {
  if(!req.user) {
    res.json({
      username: "nobody"
    })
  }

  const form = new formidable.IncomingForm()

  if (!fs.existsSync(PATH_UPLOAD)) {
    fs.mkdirSync(PATH_UPLOAD, {recursive: true});
  }

  form.parse(req, async function (err, fields, files) {
    if (err) {
      return next(err)
    }

    let dataUser = { ...fields };

    //  &&  != fields.newPassword
    if(fields.oldPassword && fields.newPassword) {

      const isMatch = await bcrypt.compare(fields.oldPassword, req.user.password);
      console.log('isMatch', isMatch)
      // if(!isMatch) {
      //   return next({status: 400, message: "Invalid old password"});
      // }

      if (isMatch) {
        const newHash = await req.user.createHashPassword(fields.newPassword);
        if (newHash) {
          dataUser.password = newHash
        }
      }
    }

    delete(dataUser.avatar);
    if (files.avatar && files.avatar.filepath) {

      /**
       * Удаляем старые аватары
       * @type {string}
       */
      const oldAvatar = path.join('./public', req.user.image);
      const oldAvatar_full = oldAvatar.replace('_thumb','_full');
      for ( const file of [oldAvatar, oldAvatar_full] ){
        if(fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }

      const fileName = chance.string({
        pool: 'qwertyuiopasdfghjklzxcvbnm',
        length: 15
      });

      const ext = path.extname(files.avatar.originalFilename);

      await fs.copyFileSync(files.avatar.filepath, getFilePath(fileName, POSTFIX_FULL, ext));

      /**
       * создаем квадратную фотографию
       */

      dataUser.image = `/upload/images/${getFileName(fileName, POSTFIX_THUMB, ext)}`;
      await Jimp.read(getFilePath(fileName, POSTFIX_FULL, ext))
         .then(imageResource => {
           return imageResource
              .resize(256, 256) // resize
              .quality(60) // set JPEG quality
              .greyscale() // set greyscale
              .write(getFilePath(fileName, POSTFIX_THUMB, ext)); // save
         })
         .catch(err => {
           console.log('error Jimp', err)
           /**
            * Если вышла ошибка, можем сохранить большое фото без ресайза
            */
           dataUser.image = `/upload/images/${getFileName(fileName, POSTFIX_FULL, ext)}`;
         });

    }

    delete(dataUser.oldPassword);
    delete(dataUser.newPassword);
    const userOrError = await updateUser(req.user, dataUser)
    res.json(userOrError);
  });
});

const updateUser = async (user, dataUser) => {
  return new Promise(function(resolve, reject){
    User.findByIdAndUpdate(user._id, dataUser, function(err, user){
      if(err) {
        return reject({
          error: err,
          success: false,
        })
      }

      User.findById(user._id)
         .then(function(updatedUser){
           const userCredentials = { ...updatedUser.toJSON() };
           delete(userCredentials.password);
           return resolve({ ...userCredentials });
         })
         .catch(function(doc){
           return reject({
             error: err,
             success: false,
           })
         });
    })
  })
}



module.exports = router;
