var express = require("express");
var router = express.Router();
const axios = require("axios");


//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var Analyzer = require('natural').SentimentAnalyzer;



router.get("/tweet", async function (req, res, next) {
    console.log("amogus")
    const { query } = req.params;
    const API_KEY = "BPyJmUkYDkIVh4FWtsM1Sn2RJ"
    const SECRET = "cWHTC7Gf9W7BNmYaRLfazkuwVLUSKIoIOzRsaxiQJpSk4ptPQe";
    const TOKEN = "AAAAAAAAAAAAAAAAAAAAAC7LUgEAAAAAb7O5rUKmJ0ryGMn%2Bdo879G8Ur4E%3DzgI99rheUmOefRyBbKll8tnY9oG6ExZUGhtBkyWi9XOfxctIjk";
    const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

    const search = "POTUS";
    const test_endpoint = `https://api.twitter.com/2/tweets/search/recent?query=from:${search}&tweet.fields=created_at&expansions=author_id&user.fields=created_at&max_results=10`;

    let tweets = await axios
        .get(test_endpoint, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        })
        .then((res) => res.data)

    console.log(tweets);

    var tokenizer = new natural.WordTokenizer();
    var analyzer = new Analyzer("English", stemmer, "afinn");

    // getSentiment expects an array of strings
    let sentence = `${tweets.data[0].text}`;

    let words = sentence.split(" ");
    //tokenizer doenst work

    console.log(words);

    let sentiment = analyzer.getSentiment(words);

    tweets.data[0].NewPropertyName = "sentiment";     //change 0 to index for multiple tweets
    tweets.data[0].sentiment = sentiment;

    console.log(analyzer.getSentiment(words));


    res.render("twitter", { tweetObj: tweets});

})

module.exports = router;