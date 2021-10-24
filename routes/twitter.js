var express = require("express");
var router = express.Router();
const axios = require("axios");


//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var Analyzer = require('natural').SentimentAnalyzer;

//use version 2

router.get("/:query", async function (req, res, next) {
    console.log("amogus")
    const { query } = req.params;
    const API_KEY = "BPyJmUkYDkIVh4FWtsM1Sn2RJ"
    const SECRET = "cWHTC7Gf9W7BNmYaRLfazkuwVLUSKIoIOzRsaxiQJpSk4ptPQe";
    const TOKEN = "AAAAAAAAAAAAAAAAAAAAAC7LUgEAAAAAb7O5rUKmJ0ryGMn%2Bdo879G8Ur4E%3DzgI99rheUmOefRyBbKll8tnY9oG6ExZUGhtBkyWi9XOfxctIjk";
    const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

    const search = query;
    const test_endpoint = `https://api.twitter.com/2/tweets/search/recent?query=from:${search}&tweet.fields=created_at&expansions=author_id&user.fields=created_at&max_results=10`;


    let tweets = await axios
        .get(test_endpoint, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        })
        .then((res) => res.data)
        .catch((error)=>{
            console.log(error + ": error found")
            res.render("error")
        })

   


    console.log(tweets);

    var tokenizer = new natural.WordTokenizer();
    var analyzer = new Analyzer("English", stemmer, "afinn");




    let chartObj = { Great: 0, Good: 0, Neutral: 0, Bad: 0, Terrible: 0 };


    for (i in tweets.data) {
        // getSentiment expects an array of strings
        let sentence = `${tweets.data[i].text}`;

        let words = sentence.split(" ");
        console.log(words);
        //tokenizer doenst work

        let sentiment = analyzer.getSentiment(words);

        if (sentiment > 2) {
            chartObj.Great++;
        }
        else if (sentiment < 2 && sentiment > 0) {
            chartObj.Good++;
        }
        else if (sentiment == 0) {
            chartObj.Neutral++;
        }
        else if (sentiment < 0 && sentiment > -2) {
            chartObj.Bad++;
        }
        else if (sentiment < -2) {
            chartObj.Terrible++;
        }

        tweets.data[i].NewPropertyName = "sentiment";     //change 0 to index for multiple tweets
        tweets.data[i].sentiment = sentiment;

        console.log(analyzer.getSentiment(words));



    }


    console.log(chartObj);

    res.render("twitter", { tweetObj: tweets, chartData: chartObj });

})

module.exports = router;