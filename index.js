"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Importing: Modules.
var redis_1 = __importDefault(require("redis"));
var moment_1 = __importDefault(require("moment"));
/**
 * This function sets limiter header value and then calls limiter function
 * that based on maximum requests for a fixed time window, accepts or not
 * incoming HTTP requests.
 *
 * @param value HTTP request header value, defaults to user IP.
 * @param maxRequests maximum number of requests.
 * @param timeWindow time window expressed in seconds.
 */
function wedont(value, maxRequests, timeWindow, redisPort) {
    if (maxRequests === void 0) { maxRequests = 150; }
    if (timeWindow === void 0) { timeWindow = 60; }
    if (redisPort === void 0) { redisPort = 6379; }
    // Creating Redis CLient.
    var redisClient = redis_1.default.createClient({ port: redisPort });
    return function (req, res, next) {
        // Sets wedont's HTTP request header.
        var key = value ? req.headers[value] : req.ip;
        // Checks if redisKey exists.
        redisClient.exists(key, function (error, reply) {
            // If there is a connection error, node process will be closed.
            if (error) {
                console.log("Problem with redis.");
                process.exit(0);
            }
            // If redis is reachable, it will send a reply of 0 or 1 (integer).
            if (reply) {
                /**
                 * If reply is 1, it states that the key:value exists in redis store.
                 * So we retrieve it.
                 */
                redisClient.get(key, function (err, value) {
                    var data = JSON.parse(value);
                    // We check if the key timestamp is in the time window yet.
                    if (data.timestamp >= moment_1.default().unix() - timeWindow) {
                        // We check that the number of requests made doesn't exceeds max.
                        if (data.counter + 1 > maxRequests) {
                            // If it does, we send an error as response.
                            return res.status(403).json({
                                data: {},
                                errors: [
                                    {
                                        error: "Max requests per minute reached.",
                                        description: "Unauthorized.",
                                        status: 403,
                                    },
                                ],
                            });
                        }
                        // If everything is good, we increment counter and set new key.
                        setRedisKey(key, data.counter + 1, data.timestamp);
                        return next();
                    }
                    else {
                        // If timestamp is not in time window anymore, we create a new key.
                        setRedisKey(key);
                        return next();
                    }
                });
            }
            else {
                // If reply is equal to 0, we create a new key in redis store.
                setRedisKey(key);
                return next();
            }
        });
    };
    /**
     * This function is used to set a redis key with a counter and a timestamp.
     *
     * @param key Redis Store key.
     * @param count Key's request counter.
     * @param time Key's timestamp.
     */
    function setRedisKey(key, count, time) {
        if (count === void 0) { count = 1; }
        if (time === void 0) { time = moment_1.default().unix(); }
        // Declaration spot.
        var data = {
            timestamp: time,
            counter: count,
        };
        // Setting redis key.
        redisClient.set(key, JSON.stringify(data));
        // Returning context back.
        return;
    }
}
exports.default = wedont;
