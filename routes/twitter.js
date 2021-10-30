var express = require("express");
var router = express.Router();
const axios = require("axios");
const redis = require('redis');


//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();
var Analyzer = require('natural').SentimentAnalyzer;

let wordCloud = [];
let words = [];

//s3 stuff
require('dotenv').config();
const AWS = require('aws-sdk');
// Cloud Services Set-up
// Create unique bucket name
const bucketName = 'jonathan-twitter-nlp1';
// Create a promise on S3 service object
const bucketPromise = new AWS.S3({
    apiVersion: '2006-03-01'
}).createBucket({ Bucket: bucketName }).promise();
bucketPromise.then(function (data) {
    console.log("Successfully created " + bucketName);
})
    .catch(function (err) {
        console.error(err, err.stack);
    });


function generateChartData(tweets, chartObj) {
    var analyzer = new Analyzer("English", stemmer, "afinn");
    for (i in tweets.data) {
        // getSentiment expects an array of strings
        let sentence = `${tweets.data[i].text}`;
        words.push(tokenizer.tokenize(sentence));
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

        for (i in words) {
            for (j in words[i]) {
                let word = words[i][j];
                wordCloud.push({ text: word, size: 0 })
            }
        }

        // if (wordCloud[i] && !(wordCloud[i]["text"] !== words[i][j])){
        //     wordCloud[i].value ++;
        // }
        // else{
        //     wordCloud.push(Object.create({text: words[i][j], value: 1}))
        // }

       // console.log(wordCloud);
    }
}

let texts = 0; //global variable

function prepareData(tweets, chartObj) {

    generateChartData(tweets, chartObj);


    let loops = 0;
    if (tweets.data) {
        for (loops; loops < tweets.data.length; loops++) {
            texts += tweets.data[loops].sentiment;
        }

        texts = (50 + ((texts / loops) * 100))
        console.log(texts)
    }
}


router.get("/:query/:qty?", async function (req, res, next) {

    let chartObj = { Great: 0, Good: 0, Neutral: 0, Bad: 0, Terrible: 0 };

    let { query, qty } = req.params;

    const API_KEY = "BPyJmUkYDkIVh4FWtsM1Sn2RJ"
    const SECRET = "cWHTC7Gf9W7BNmYaRLfazkuwVLUSKIoIOzRsaxiQJpSk4ptPQe";
    const TOKEN = "AAAAAAAAAAAAAAAAAAAAAC7LUgEAAAAAb7O5rUKmJ0ryGMn%2Bdo879G8Ur4E%3DzgI99rheUmOefRyBbKll8tnY9oG6ExZUGhtBkyWi9XOfxctIjk";
    const TWITTER_ENDPOINT = "https://api.twitter.com/2/tweets/search/";

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

    const endpoint = `${TWITTER_ENDPOINT}recent?query=from:${query}&tweet.fields=created_at&expansions=author_id&user.fields=created_at&max_results=${qty}`;
    const redisKey = `twitter:${query}-${qty}`;
    const s3Key = `twitter-${query}-${qty}`;
    let tweets = 0;


    return redisClient.get(redisKey, (err, result) => {
        if (result) {
            //serve from redis cache
            console.log("Served from redis cache")
            tweets = JSON.parse(result);
            prepareData(tweets, chartObj);
            res.render("dashboard", { tweetObj: tweets, chartData: chartObj, path: query, average: texts });
        } else {
            //check s3
            const params = { Bucket: bucketName, Key: s3Key };
            return new AWS.S3({ apiVersion: '2006-03-01' }).getObject(params, (err, result) => {
                if (result) {
                    //serve from s3 and store in redis
                    console.log("Serving from s3");
                    tweets = JSON.parse(result.Body);
                    redisClient.setex(redisKey, 3600, JSON.stringify({
                        source: 'Redis Cache', ...tweets,
                    }));

                    prepareData(tweets, chartObj)
                    res.render("dashboard", { tweetObj: tweets, chartData: chartObj, path: query, average: texts });

                } else {
                    console.log("Serving from API and storing in s3 and redis")
                    return axios
                        .get(endpoint, {
                            headers: {
                                "Authorization": `Bearer ${TOKEN}`
                            }
                        })
                        .then((response) => {

                            //********************CODE GOES HERE **************************** */                   
                            tweets = response.data

                            //store in s3
                            const body = JSON.stringify(tweets);
                            const objectParams = { Bucket: bucketName, Key: s3Key, Body: body };
                            const uploadPromise = new AWS.S3({ apiVersion: '2006-03-01' }).putObject(objectParams).promise();

                            uploadPromise.then(function (data) {
                                console.log("Successfully uploaded data to " + bucketName + "/" + s3Key);
                            });

                            //store in redis cache
                            redisClient.setex(redisKey, 3600, JSON.stringify({
                                source: 'Redis Cache', ...tweets,
                            }));


                            prepareData(tweets, chartObj)
                            res.render("dashboard", { tweetObj: tweets, chartData: chartObj, path: query, average: texts });

                            //********CODE STOPS HERE******** */
                        })
                        .catch((error) => {
                            console.log(error + ": probably search term not found")
                            res.render("error")
                        });
                }
            });

        }





    })
})

module.exports = router;