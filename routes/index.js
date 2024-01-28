var express = require('express');
var router = express.Router();
const passport = require('passport');
const localStrategy = require('passport-local');
const userModel = require('./users');
const postModel = require('./posts');
passport.use(new localStrategy(userModel.authenticate()));
const upload = require("./multer");
const utils = require('../utils/utils');

// GET
router.get('/', function (req, res) {
  res.render('index', { footer: false });
});

router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});

router.get('/like/:postid', async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid });
  const user = await userModel.findOne({ username: req.session.passport.user });
  post.like.push(user._id);
  await post.save();
  res.json(post);
});

router.get('/feed', isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  let posts = await postModel
    .find()
    .populate("user");


  res.render('feed', { footer: true, user, posts, dater: utils.formatRelativeTime });
});

router.get('/profile', isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  res.render('profile', { footer: true, user });
});

router.get('/search', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('search', { footer: true, user });
});


router.get('/like/post/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id })


  // if not like then like it
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id)
  }
  // if already like then remove like
  else {
    post.likes.splice(post.likes.indexOf(user._id), 1)
  }

  await post.save()
  res.redirect("/feed")

});


router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('edit', { footer: true, user });
});

router.get('/upload', isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
  res.render('upload', { footer: true, user });
});


router.post('/update', isLoggedIn, upload.single("image"), async function (req, res) {
  const user = await userModel.
    findOneAndUpdate({ username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    )

  if (req.file) {
    user.profileImage = req.file.filename;
  }
  await user.save()
  res.redirect("/profile")
})


router.post('/post', isLoggedIn, upload.single("image"), async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    user: user._id,
    caption: req.body.caption,
    picture: req.file.filename,
  })
  user.posts.push(post._id);
  await user.save();
  res.redirect("/feed");
});


router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, 'i')
  const users = await userModel.find({ username: regex })
  res.json(users)
})


// POST

router.post("/register", function (req, res) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  })

  userModel.register(userData, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile")
      })
    })
})


router.post("/login", passport.authenticate("local", {
  successRedirect: "/feed",
  failureRedirect: "/login"
}), function (req, res) { });

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect("/login");
  }
}

module.exports = router;
