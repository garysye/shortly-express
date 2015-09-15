var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

// Chainable
// var hashWithPromise = Promise.promisify(bcrypt.hash);
// var compareWithPromise = Promise.promisify(bcrypt.compare);


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  setPassword: function(password){
    bcrypt.hash(password, null, null, function(err, hash){
      console.log(hash);
      this.set('password', hash);
      this.save();
    }.bind(this));
  },
  checkPassword: function(password, callback){
    console.log(this.get('password'));
    bcrypt.compare(password, this.get('password'), function(err, result){
      callback(result);
    });
  }
});

module.exports = User;