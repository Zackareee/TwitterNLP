var express = require("express");
var router = express.Router();
const axios = require("axios");
const redis = require('redis');


//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var Analyzer = require('natural').SentimentAnalyzer;


function generateChartData(tweets, chartObj) {

    var analyzer = new Analyzer("English", stemmer, "afinn");

    for (i in tweets.data) {
        // getSentiment expects an array of strings
        let sentence = `${tweets.data[i].text}`;

        let words = sentence.split(" ");
        //console.log(words);
        //tokenizer doenst work

        let sentiment = analyzer.getSentiment(words);

        if (sentiment > 0.2) {
            chartObj.Great++;
        }
        else if (sentiment < 0.2 && sentiment > 0.05) {
            chartObj.Good++;
        }
        else if (sentiment > -0.05 && sentiment < 0.05) {
            chartObj.Neutral++;
        }
        else if (sentiment < -0.05 && sentiment > -0.2) {
            chartObj.Bad++;
        }
        else if (sentiment < -0.2) {
            chartObj.Terrible++;
        }

        tweets.data[i].NewPropertyName = "sentiment";     //change 0 to index for multiple tweets
        tweets.data[i].sentiment = sentiment;

        //console.log(analyzer.getSentiment(words));
    }
}



router.get("/:query/:qty?", async function (req, res, next) {

    let chartObj = { Great: 0, Good: 0, Neutral: 0, Bad: 0, Terrible: 0 };

    let { query, qty } = req.params;

    const API_KEY = "BPyJmUkYDkIVh4FWtsM1Sn2RJ"
    const SECRET = "cWHTC7Gf9W7BNmYaRLfazkuwVLUSKIoIOzRsaxiQJpSk4ptPQe";
    const TOKEN = "AAAAAAAAAAAAAAAAAAAAAC7LUgEAAAAAb7O5rUKmJ0ryGMn%2Bdo879G8Ur4E%3DzgI99rheUmOefRyBbKll8tnY9oG6ExZUGhtBkyWi9XOfxctIjk";
    const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent";

    console.log("qty: " + qty)
    // validation
    if (!query.match("^[a-zA-Z0-9_]*$")) {
        return res.render("error");
    }

    if (!qty) {
        qty = 10;
    }
    if (qty < 10) {
        qty = 10;
    }
    else if (qty > 100) {
        qty = 100;
    }

    const redisClient = redis.createClient();
    redisClient.on('error', (err) => {
        console.log("Error " + err);
    })

    const endpoint = `https://api.twitter.com/2/tweets/search/recent?query=from:${query}&tweet.fields=created_at&expansions=author_id&user.fields=created_at&max_results=${qty}`;
    const redisKey = `twitter:${query}-${qty}`;
    const s3Key = `twitter-${query}`;
    let tweets = 0;

    return redisClient.get(redisKey, (err, result) => {
        if (result) {
            //serve from redis cache
            console.log("Served from redis cache")
            const resultJSON = JSON.parse(result);
            tweets = resultJSON;
            generateChartData(tweets, chartObj);
            res.render("twitter", { tweetObj: tweets, chartData: chartObj });

        } else {

            return axios
                .get(endpoint, {
                    headers: {
                        "Authorization": `Bearer ${TOKEN}`
                    }
                })
                .then((response) => {

                    //********************CODE GOES HERE **************************** */                   
                    tweets = response.data

                    //store in redis cache
                    redisClient.setex(redisKey, 3600, JSON.stringify({
                        source: 'Redis Cache', ...tweets,
                    }));

                    //Get sentiment on tweet sample
                    generateChartData(tweets, chartObj);

                    //debug
                    console.log(chartObj);

                    //display page
                    res.render("twitter", { tweetObj: tweets, chartData: chartObj });

                    //********CODE STOPS HERE******** */
                })
                .catch((error) => {
                    console.log(error + ": probably search term not found")
                    res.render("error")
                })

        }





    })
})

module.exports = router;