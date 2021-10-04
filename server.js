const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

//Import mongoose and connect to MongoDB with URI store in secret
const mongoose = require('mongoose');
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true });
//Import body-parser and add middleware
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
//Create Schema and Model
const userSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: Date
    }
  ]
});
const User = mongoose.model('User', userSchema);

app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').get((req, res) => {
  //Find and return 'username' and '_id' of all users
  User.find({}).select('username _id').exec((err, data) => {
    if (err) return console.log(err);
    res.json(data);
  });
}).post((req, res) => {
  //Find if the creating user is exist or not
  User.findOne({username: req.body.username}, (err, user) => {
    if (err) return console.log(err);
    if (user == null) {
      let newUser = new User({username: req.body.username, count: 0});
      newUser.save((err, doc) => {
        if (err) return console.log(err);
        res.json({username: doc.username, _id: doc._id});
      });
    }
    else {
      res.json({'Error': `${user.username} existed. Please choose another one`});
    }
  })
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let newDate = new Date(req.body.date);
  //Use current date if no date submitted
  if (newDate == 'Invalid Date') {
    newDate = new Date();
  }
  let newLog = {description: req.body.description, duration: req.body.duration, date: newDate};
  User.findByIdAndUpdate(req.params._id, {$inc: {count: 1}, $push: {log: newLog}}, {new: true}, (err, doc) => {
    if (err) return console.log(err);
    res.json({username: doc.username, description: doc.log[doc.log.length - 1].description,duration: doc.log[doc.log.length - 1].duration, date: doc.log[doc.log.length - 1].date.toDateString(), _id: doc._id});
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  User.findById(req.params._id, (err, doc) => {
    if (err) return console.log(err);
    let displayLog = doc.log;
    //Only get log from date if asked
    if (req.query.from) {
      let beginning = new Date(req.query.from);
      if (beginning !== 'Invalid Date') {
        let resultFrom = [];
        for (let i of displayLog) {
          if (i.date >= beginning) {
            resultFrom.push(i);
          }
        }
        displayLog = resultFrom;
      }
    }
    //Only get log to date if asked
    if (req.query.to) {
      let ending = new Date(req.query.to);
      if (ending !== 'Invalid Date') {
        let resultTo = [];
        for (let i of displayLog) {
          if (i.date <= ending) {
            resultTo.push(i);
          }
        }
        displayLog = resultTo;
      }
    }
    //Limit the display log if asked
    if (req.query.limit) {
      displayLog = displayLog.slice(0, req.query.limit);
    }
    //Convert log.date to string
    displayLog = displayLog.map(obj => ({
      description: obj.description,
      duration: obj.duration,
      date: obj.date.toDateString()
    }));
    res.json({username: doc.username, count: doc.count, _id: doc._id, log: displayLog});
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
