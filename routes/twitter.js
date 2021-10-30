var express = require("express");
var router = express.Router();
const axios = require("axios");
const redis = require('redis');


//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();
var Analyzer = require('natural').SentimentAnalyzer;

// if (!query.match("^[a-zA-Z0-9_]*$")) {
//     return res.render("error");
// }

function generateChartData(tweets, chartObj) {
    var analyzer = new Analyzer("English", stemmer, "afinn");
    for (i in tweets.data) {
        // getSentiment expects an array of strings
        let sentence = `${tweets.data[i].text}`;
        let sentiment = analyzer.getSentiment(tokenizer.tokenize(sentence));

        if (sentiment > 0.2) {
            chartObj.Great++;
        }
        else if (sentiment > 0.05) {
            chartObj.Good++;
        }
        else if (sentiment > -0.05) {
            chartObj.Neutral++;
        }
        else if (sentiment > -0.2) {
            chartObj.Bad++;
        }
        else if (sentiment <= -0.2) {
            chartObj.Terrible++;
        }

        tweets.data[i].sentiment = sentiment;
    }
}



router.get("/:query/:qty?", async function (req, res, next) {

    let chartObj = { Great: 0, Good: 0, Neutral: 0, Bad: 0, Terrible: 0 };

    let { query, qty } = req.params;

    const API_KEY = "BPyJmUkYDkIVh4FWtsM1Sn2RJ"
    const SECRET = "cWHTC7Gf9W7BNmYaRLfazkuwVLUSKIoIOzRsaxiQJpSk4ptPQe";
    const TOKEN = "AAAAAAAAAAAAAAAAAAAAAC7LUgEAAAAAb7O5rUKmJ0ryGMn%2Bdo879G8Ur4E%3DzgI99rheUmOefRyBbKll8tnY9oG6ExZUGhtBkyWi9XOfxctIjk";
    const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/";
    console.log(`recent?query=${encodeURIComponent(query)}&max_results=${qty}`)
    console.log("qty: " + qty)
    // validation


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
    let endpoint = "";
    if(query.substring(0,1) === "@"){ endpoint = `${TWITTER_ENDPOINT}recent?query=from:${query.substring(1)}&max_results=${qty}`;}
    else {endpoint = `${TWITTER_ENDPOINT}recent?query=${encodeURIComponent(query)}&max_results=${qty}`;}
    


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
            let texts = 0;
            let loops = 0;
            if (tweets.data) {
                for (loops; loops < tweets.data.length; loops++) {
                    texts += tweets.data[loops].sentiment;
                }   

                texts= (50 + ((texts/loops)*100))
                console.log(texts)
            }
            console.log(tweets)
            res.render("dashboard", { tweetObj: tweets, chartData: chartObj, path:query, average:texts});

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
                    let texts = 0;
                    let loops = 0;
                    if (tweets.data) {
                        for (loops; loops < tweets.data.length; loops++) {
                            texts += tweets.data[loops].sentiment;
                        }   

                        texts= (50 + ((texts/loops)*100))

                    }
                    
                    res.render("dashboard", { tweetObj: tweets, chartData: chartObj, path:query, average:texts});

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