var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

var axios = require("axios");
var cheerio = require("cheerio");

// js models
var db = require("./models");

var PORT = 3000;

var app = express();

// middleware
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/spacenews", {
    useNewUrlParser: true
});

// routes
// scraper connection
app.get("/gatherNews", function (req, res) {
    axios.get("https://spacenews.com/section/launch-section/").then(function (res) {
        var $ = cheerio.load(res.data);

        $(".launch-article").each(function (i, element) {
            // result object
            var result = {};

            result.headline = $(this)
                .children(".article-meta").children(".launch-title").children("a").text();
            result.summary = $(this)
                .children(".article-meta").children(".post-excerpt").text();
            result.url = $(this)
                .children(".article-meta").children(".launch-title").children("a").attr("href");
            result.author = $(this)
                .children(".article-meta").children(".launch-author").children("a").text();

            // Create a new Article using the `result` object built from scraping
            db.newsArticle.create(result)
                .then(function (newsArticle) {
                    console.log(newsArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });
        // Send a message to the client
        res.send("Launch articles gathered");
    });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});