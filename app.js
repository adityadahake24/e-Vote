/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const { Admin, newelection, question, choice } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
app.set("views", path.join(__dirname, "views"));
const admin = require("./models/admin");
const { title } = require("process");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string "));
app.use(csrf("this_should_be_32_character_long", ["PUT", "POST", "DELETE"]));

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

const saltRounds = 10;
app.set("view engine", "ejs");
app.use(flash());
app.use(
  session({
    secret: "my-super-secret-key-644622414218453177816884",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/elections");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.use(express.static(path.join(__dirname, "public")));

//landing page Index.ejs
app.get("/", async (request, response) => {
  if (request.user) {
  if (request.user.case === "admins") {
    return response.redirect("/elections");
  } else {
  response.render("./views/index.ejs", {
    title: "Online Voting Platform",
    csrfToken: request.csrfToken(),
  });
}}
});



app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});


app.post("/admins", async (request, response) => {
  if (!request.body.name) {
    request.flash("error", "Please enter your Name");
    return response.redirect("/signup");
  }
  if (!request.body.email) {
    request.flash("error", "Please enter email ID");
    return response.redirect("/signup");
  }
  if (!request.body.password < 1 ) {
    request.flash("error", "Please enter your password");
    return response.redirect("/signup");
  }
  if (request.body.password < 8) {
    request.flash("error", "Minimum 8 characters required!");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await Admin.create({
      firstName: request.body.name,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/elections");
    });
  } catch (error) {
    request.flash(
      "error",
      "This mail already has a account, try another mail!"
    );
    return response.redirect("/signup");
  }
});

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

////////////////////////////////////////////////////////////////////////////////////

//password reset page
app.get(
  "/password-reset",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    response.render("password-reset", {
      title: "Reset your password",
      csrfToken: request.csrfToken(),
    });
  }
);

//reset user password
app.post(
  "/password-reset",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.old_password) {
      request.flash("error", "Please enter your old password");
      return response.redirect("/password-reset");
    }
    if (!request.body.new_password) {
      request.flash("error", "Please enter a new password");
      return response.redirect("/password-reset");
    }
    if (request.body.new_password.length < 8) {
      request.flash("error", "Password length should be atleast 8");
      return response.redirect("/password-reset");
    }
    const hashedNewPwd = await bcrypt.hash(
      request.body.new_password,
      saltRounds
    );
    const result = await bcrypt.compare(
      request.body.old_password,
      request.user.password
    );
    if (result) {
      Admin.findOne({ where: { email: request.user.email } }).then((user) => {
        user.resetPass(hashedNewPwd);
      });
      request.flash("success", "Password changed successfully");
      return response.redirect("/elections");
    } else {
      request.flash("error", "Old password does not match");
      return response.redirect("/password-reset");
    }
  }
);

//new election page
app.get(
  "/elections/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("new_election", {
      title: "Create an election",
      csrfToken: request.csrfToken(),
    });
  }
);

//creating new election
app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.electionName.length < 5) {
      request.flash("error", "Election name length should be atleast 5");
      return response.redirect("/elections/create");
    }
    try {
      await Election.addElection({
        electionName: request.body.electionName,
        adminID: request.user.id,
      });
      response.redirect("/elections");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//election page
app.get(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const election = await Election.getElection(
        request.params.id,
        request.user.id
      );
      const numberOfQuestions = await Questions.getNumberOfQuestions(
        request.params.id
      );
      response.render("election_page", {
        id: request.params.id,
        title: election.electionName,
        nq: numberOfQuestions,
        nv: 23,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//manage questions page
app.get(
  "/elections/:id/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const election = await Election.getElection(
      request.params.id,
      request.user.id
    );
    const questions = await Questions.getQuestions(request.params.id);
    response.render("questions", {
      title: election.electionName,
      id: request.params.id,
      questions: questions,
      csrfToken: request.csrfToken(),
    });
  }
);

//add question page
app.get(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("new_question", {
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);

//add question
app.post(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.question.length < 5) {
      request.flash("error", "question length should be atleast 5");
      return response.redirect(
        `/elections/${request.params.id}/questions/create`
      );
    }
    try {
      const question = await Questions.addQuestion({
        question: request.body.question,
        description: request.body.description,
        electionID: request.params.id,
      });
      return response.redirect(
        `/elections/${request.params.id}/questions/${question.id}`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//delete question
app.delete(
  "/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await Questions.deleteQuestion(request.params.questionID);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//question page 
app.get(
  "/elections/:id/questions/:questionID", // routes to election and question id 
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const question = await Questions.getQuestion(request.params.questionID);
    const options = await Options.getOptions(request.params.questionID);
    response.render("question_page", {
      title: question.question,
      description: question.description,
      id: request.params.id,
      questionID: request.params.questionID,
      options,
      csrfToken: request.csrfToken(),
    });
  }
);

//adding options to the questions 
app.post(
  "/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.option.length) {
      request.flash("error", "Please enter options to the questions");
      return response.redirect("/todos");
    }
    try {
      await Options.addOption({
        option: request.body.option,
        questionID: request.params.questionID,
      });
      return response.redirect(
        `/elections/${request.params.id}/questions/${request.params.questionID}`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//delete choices created 
app.delete(
  "/options/:optionID", //file routes and option id address
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await Options.deleteOption(request.params.optionID); 
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);




module.exports = app;
