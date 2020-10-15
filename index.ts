// Importing: Modules.
import redis from "redis";
import moment from "moment";

// Importing: Interfaces.
import { Request } from "express";
import { Response } from "express";
import { NextFunction } from "express";
import { RedisKey } from "./index.d";

// Creating Redis CLient.
let redisClient = redis.createClient();

/**
 * This function sets limiter header value and then calls limiter function
 * that based on maximum requests for a fixed time window, accepts or not
 * incoming HTTP requests.
 *
 * @param value HTTP request header value, defaults to user IP.
 * @param maxRequests maximum number of requests.
 * @param timeWindow time window expressed in seconds.
 */
export default function strongbox(
  value?: string,
  maxRequests: number = 2,
  timeWindow: number = 5
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sets strongbox's HTTP request header.
    let key: any = value 
      ? req.headers[value]
      : req.ip;

    // Checks if redisKey exists.
    redisClient.exists(key, (error: any, reply: any) => {
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
        redisClient.get(key, function (err: any, value: any) {
          let data = JSON.parse(value);

          // We check if the key timestamp is in the time window yet.
          if (data.timestamp >= moment().unix() - timeWindow) {
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
          } else {
            // If timestamp is not in time window anymore, we create a new key.
            setRedisKey(key);
            return next();
          }
        });
      } else {
        // If reply is equal to 0, we create a new key in redis store.
        setRedisKey(key); 
        return next();
      }
    });
  };
}

/**
 * This function is used to set a redis key with a counter and a timestamp.
 *
 * @param key Redis Store key.
 * @param count Key's request counter.
 * @param time Key's timestamp.
 */
function setRedisKey(
  key: string,
  count: number = 1,
  time: number = moment().unix()
) {
  // Declaration spot.
  let data: RedisKey = {
    timestamp: time,
    counter: count,
  };

  // Setting redis key.
  redisClient.set(key, JSON.stringify(data));

  // Returning context back.
  return;
}
