// ./redis.js
import { l, chalk, js } from "./common";
import Redis from 'ioredis';
import { dbLog } from "./db";

const redisServer = process.env.REDIS_HOST||'';
const redisPort = +(process.env.REDIS_PORT||6379);
const redisNodes = process.env.REDIS_NODES||'';
let cluster=process.env.REDIS_CLUSTER||'0';

const startupNodes=[
    {
        host:'192.168.1.16',
        port:6379
    },
    {
        host:'192.168.1.30',
        port:6379
    },
    {
        host:'192.168.1.31',
        port:6379
    }
]

/**
 * 
 * server, port - single redis server
 * nodes - cluster, comma separated list of host:port
 * 
 * if missing, overriden by env defaults, cluster has priority
 * Each client is cached based on connection string
 * 
 *  
 */
const getRedisClient = async ({ server = redisServer, port = redisPort, nodes = redisNodes, x = false }) => {
   // console.log("REDIS:",redisServer,redisPort)
try{
    if (!x)
        x = false;
    nodes = nodes || redisNodes;
    let clusterConnectionStrings = nodes ? nodes.split(',') : [];

    let rootNodes = [];

    for (let i = 0; i < clusterConnectionStrings.length; i++) {
        rootNodes.push(`redis://${clusterConnectionStrings[i]}`);
    }
    server = server || redisServer;
    port = +port || redisPort;

    let client;
   // l("getRedisClient cluster=",cluster)
    if (false) {
        l("connectCluster",rootNodes)
        client = new Redis.Cluster(startupNodes, {
            retryDelayOnFailover: 100,
            enableAutoPipelining: true,
            slotsRefreshTimeout: 100000,
        })
    }
    else {
       // l(chalk.yellow.bold("X REDIS, ", port, server))
        client = new Redis(port, server, {retryStrategy() {
            return 10
          }}) //redis.createClient(port, server);
    }
    client.on("error", (error) => {
        console.error("Redis Error", error);
      });
      client.on("connected", (error) => {
       // console.error("Redis connected", error);
      });
      client.on("node error", (error, node) => {
        console.error(`Redis error in node ${node}`, error);
      });
    //client.connect();
    return client;
}
catch(error){
    l(chalk.red.bold(error))

}
    
};
const resultToObject = (result:any) => {
    if (!result) return [];
    let numObjects = result[0];
    let results = [];
    // l(111, numObjects)
    for (var i = 0; i < numObjects; i++) {
        //  l(112, i)
        let slug = result[1 + 2 * i];
        if (!slug) break;
        let fields = result[2 + 2 * i];
        // l(113, fields)
        let object = {};
        for (var j = 0; j < fields.length; j++) {
            let name = fields[j];
            let value = fields[++j];
            //@ts-ignore
            object[name] = value;
        }
        results.push(object);
    }
    return results;
};
const resultInfoToObject = (result:any) => {
    if (!result) return [];
    let numObjects = result.length;
    let results = {};
    // l(111, numObjects)
    for (var i = 0; i < numObjects; i++) {
        //  l(112, i)
        let name = result[i];

        let value = result[++i];
        //@ts-ignore
        results[name] = value;
    }
    return results;
};

export { getRedisClient,resultToObject };
