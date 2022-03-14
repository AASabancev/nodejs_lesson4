var express = require('express');
var path = require('path');
var router = express.Router();
const User = require( path.join(process.cwd(), 'models','User.js') );
const News = require( path.join(process.cwd(), 'models','News.js') );
const passport = require("passport");


router.get('/', function(req, res, next) {
  News.find()
     .populate('user', 'firstName image middleName surName username')
     .then(function(news){
       res.status(200).json(news);
     })
     .catch(function(err){
       res.json({
         error: err,
         success: false,
       });
     });
});

router.post('/', passport.authenticate("jwt", { session: false }), function(req, res, next) {

  if(!req.user) {
    return res.json({
      username: "nobody"
    })
  }

  User.findById(req.user._id, {},{}, async (err, user) => {
    if (!user) {
      return res.json({
        username: "nobody"
      })
    }

    let author = {
      firstName: user.firstName,
      _id: user._id,
      image: user.image,
      middleName: user.middleName,
      surName: user.surName,
      username: user.username
    }

    News.create({ ...req.body, user: author })
       .then(function (obj) {


         News.find()
            .populate('user', 'firstName image middleName surName username')
            .then(function(news){
               res.status(200).json(news);
            })
            .catch(function(err){
              res.json({
                error: err,
                success: false,
              });
            });


       })
       .catch(function (err) {
         res.json({
           error: err,
           success: false,
         });
       });

  });


});

router.patch('/:id', function(req, res, next) {
  News.findByIdAndUpdate(req.params.id, { ...req.body }, {}, function(err, news){
    if(err) {
      res.json({
        error: err,
        success: false,
      });
    } else {


      News.find()
         .populate('user', 'firstName image middleName surName username')
         .then(function(news){
            res.status(200).json(news);
         })
         .catch(function(err){
           res.json({
             error: err,
             success: false,
           });
         });

    }
  })
});

router.delete('/:id', function(req, res, next) {
  News.findByIdAndDelete( req.params.id, {}, function(err, news){
    if(err) {
      res.json({
        error: err,
        success: false,
      });
    } else {

      News.find()
         .populate('user', 'firstName image middleName surName username')
         .then(function(news){
            res.status(200).json(news);
         })
         .catch(function(err){
           res.json({
             error: err,
             success: false,
           });
         });

    }
  });
});

module.exports = router;
