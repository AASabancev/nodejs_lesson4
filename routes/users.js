var express = require('express');
var path = require('path');
var router = express.Router();

const User = require( path.join(process.cwd(), 'models','User.js') );

router.get('/', function(req, res, next) {
  User.find()
     .then(function(users){
       res.json({
          data: users
       });
     })
     .catch(function(err){
       res.json({
         error: err,
         success: false,
       });
     });
});


router.post('/', function(req, res, next) {
  User.create({ ...req.body })
     .then(function (obj) {
       res.json({
         success: true,
         data: obj
       });
     })
     .catch(function (err) {
       res.json({
         error: err,
         success: false,
       });
     });
});

router.delete('/:id', function(req, res, next) {
  User.findByIdAndDelete( req.params.id, {}, function(err, user){
    if(err) {
      res.json({
        error: err,
        success: false,
      });
    } else {
      res.json({
        message: 'user deleted',
        success: true,
        data: user
      });
    }
  });
});

router.patch('/:id/permission', function(req, res, next) {

   const toUpdate = { permission: req.body };
  User.findByIdAndUpdate(req.params.id, toUpdate, function(err, user){
     if(err) {
        return res.json({
           error: err,
           success: false,
        });
     } else {


        User.findById(req.params.id)
           .then(function(updatedUser){
              const userCredentials = { ...updatedUser.toJSON() };
              delete(userCredentials.password);
              return res.json({ ...userCredentials });
           })
           .catch(function(doc){
              return res.json({
                 error: err,
                 success: false,
              })
           });


     }
  })

});

module.exports = router;
