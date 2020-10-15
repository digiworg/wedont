// Wedont Function declaration.
declare function wedont(  
  value?: string,
  maxRequests?: number,
  timeWindow?: number,
  redisPort?: number,
): any

// Declaring wedont Namespace.
declare namespace wedont {
  // Interface for Redis key.
  interface RedisKey {
    timestamp: number;
    counter: number;
  }
}

// Exporting, (why not?) We dont!
export = wedont;