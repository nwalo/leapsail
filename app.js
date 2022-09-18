// Node packages
require("dotenv").config();
const express = require("express");
const passport = require("passport");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const findOrCreate = require("mongoose-findorcreate");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");

// Set up express malware
const app = express();
app.use(express.static(path.join(__dirname + "/public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");

// Database Connection - MONGODB
// MONGO_URL is the environment variable for the mongodb atlas variable
// mongoose.connect(process.env.MONGO_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

mongoose.connect("mongodb://localhost:27017/leapSailDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema Definition

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  fname: String,
  lname: String,
  role: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// Global Passport Serialization

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// Endpoints

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    User.findById(req.user, (err, user) => {
      let userInitials = user.fname.slice(0, 1) + user.lname.slice(0, 1);
      if (user) {
        res.render("index", { userInitials, user });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: "" });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  passport.authenticate("local", function (err, user, info) {
    if (err) {
      console.log(err);
    }
    if (!user) {
      return res.render("login", {
        error: "Invalid email address or password !",
      });
    }

    req.logIn(user, function (err) {
      //This creates a log in session
      if (err) {
        console.log(err);
      } else {
        console.log("logged in");
        res.redirect("/");
      }
    });
  })(req, res);
});

app.get("/logout", function (req, res) {
  console.log("login out ...");
  req.logout((err) => {
    err ? console.log(err) : res.redirect("/login");
  });
});

app.get("/register", (req, res) => {
  res.render("register", { error: "" });
});

app.post("/register", function (req, res) {
  User.register(
    {
      username: req.body.username,
    },
    req.body.password,
    function (err) {
      if (err) {
        console.log("err");
        res.render("register", {
          error: "Error ! User registration failed.",
          title: "Register",
        });
      } else {
        passport.authenticate("local")(req, res, function () {
          User.updateOne(
            {
              _id: req.user.id,
            },
            {
              fname: _.capitalize(req.body.fname),
              lname: _.capitalize(req.body.lname),
              role: _.capitalize(req.body.role),
              phone: req.body.phone,
            },
            function (err) {
              if (!err) {
                console.log("registered");

                // // LOG IN USER AFTER REGISTRATION
                const user = new User({
                  username: req.body.username,
                  password: req.body.password,
                });

                passport.authenticate("local", function (err, user, info) {
                  if (err) {
                    res.redirect("/register");
                  }
                  if (!user) {
                    return res.render("login", {
                      error: "Invalid username or password !",
                    });
                  }

                  req.logIn(user, function (err) {
                    if (err) {
                    } else {
                      res.redirect("/");
                    }
                  });
                })(req, res);
              }
            }
          );
        });
      }
    }
  );
});

// Declaration of the port whether in deployment or local
let port = process.env.PORT;
if (port == null || port == "") {
  port = "4000";
}
app.listen(port, () => {
  console.log("server running at port " + port);
});
