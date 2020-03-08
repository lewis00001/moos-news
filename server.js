var express = require("express");
var exphbs = require("express-handlebars");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");
var db = require("./models")

var port = process.env.PORT || 3010;

var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.set('index', __dirname + '/views');

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/spacenews";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
var results = [];

// Start routes here...
app.get("/", function (req, res) {
    db.Article.find({ saved: false }, function (err, result) {
        if (err) throw err;
        res.render("index", { result });
    });
});
app.get("/newscrape", function (req, res) {
    axios.get("https://spacenews.com/section/launch-section/").then(function (response) {
        var $ = cheerio.load(response.data);
            $(".launch-article").each(function (i, element) {
                let headline = $(this)
                    .children(".article-meta").children(".launch-title").children("a").text();
                let summary = $(this)
                    .children(".article-meta").children(".post-excerpt").text();
                let link = $(this)
                    .children(".article-meta").children(".launch-title").children("a").attr("href");
                let author = $(this)
                    .children(".article-meta").children(".launch-author").children("a").text();

            if (headline && summary && link && author) {
                results.push({
                    headline: headline,
                    summary: summary,
                    link: link,
                    author: author
                });
            }
        });
        db.Article.create(results)
            .then(function (dbArticle) {
                res.render("index", { dbArticle });
                console.log(dbArticle);
            })
            .catch(function (err) {
                console.log(err);
            });
        app.get("/", function (req, res) {
            res.render("index");
        });
    });
});

app.put("/update/:id", function (req, res) {
    db.Article.updateOne({ _id: req.params.id }, { $set: { saved: true } }, function (err, result) {
        if (result.changedRows == 0) {
            return res.status(404).end();
        } else {
            res.status(200).end();
        }
    });
});

app.put("/newnote/:id", function(req, res) {
    console.log("*** note added ***");
    console.log(req.body._id);
    console.log(req.body.note);
    db.Article.updateOne({ _id: req.body._id }, { $push: { note: req.body.note }}, function(err, result) {
        if (result.changedRows === 0) {
            return res.status(404).end();
        } else {
            res.status(200).end();
        } 
    });
});

app.get("/saved", function (req, res) {
    var savedArticles = [];
    db.Article.find({ saved: true }, function (err, saved) {
        if (err) throw err;
        savedArticles.push(saved)
        res.render("saved", { saved })
    });
});

app.put("/unsave/:id", function(req, res) {
    console.log("*** removed from saved ***");
    db.Article.updateOne({ _id: req.params.id }, { $set: { saved: false }}, function(err, result) {
        if (result.changedRows == 0) {
            return res.status(404).end();
        } else {
            res.status(200).end();
        }
    });
});

app.listen(port, function () {
    console.log("Server listening on: http://localhost:" + port);
});
