var express = require("express");
var router = express.Router();
const axios = require("axios");

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



})

module.exports = router;