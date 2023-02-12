// ./db.js

import mysql from "mysql"
import util from "util"
import { l, chalk, microtime, js, allowLog } from "./common.js"

const _dbServer = process.env.DB_HOST
const _dbPort = process.env.DB_PORT || 3306
const _dbUser = process.env.DB_USER
const _dbPassword = process.env.DB_PASSWORD
//console.log({ _dbUser, _dbPassword })
allowLog();
/*var connection = mysql.createConnection({
        host: dbServer,db
        user: dbUser,
        password: dbPassword,
        database: dbDatabase
    });*/
//const query = util.promisify(connection.query).bind(connection);

async function checkSchema() {
    let server = {
        host: 'db',
        user: _dbUser,
        password: _dbPassword,

    }
    const threadid = "checkSchema";
    //l("dbGetQuery", js(server))
    // l("dbGetConnection lazy init", js(server), name, threadid);

    var connection = mysql.createConnection(server)
    const query = util.promisify(connection.query).bind(connection)
    try {
        connection.connect(function (err) {
            if (err) {
                return console.error("error: " + err.message)
            }

            console.log("Connected to the MySQL server.")
        })
    } catch (x) {
        l(chalk.red("FAILED CONNECTION, RETRYING"))
        try {
            connection.connect(function (err) {
                if (err) {
                    return console.error("error: " + err.message)
                }
                console.log("Connected to the MySQL server.")
            })
        } catch (x) {
            l(chalk.red("FAILED CONNECTION, 2 RETRYING"))
            await connection.connect()
            console.log("Connected 2 to the MySQL server.")
        }
    }
    l(chalk.yellow("checking the schema"))
    const SQL_TLOG = `
    SELECT SCHEMA_NAME
        FROM INFORMATION_SCHEMA.SCHEMATA
    WHERE SCHEMA_NAME='qtasklogdb'
    `;
    const rows = await query(
        SQL_TLOG
    )
    l(chalk.green("result", rows))
    if (!rows || !rows.length) {
        l(chalk.green("create"))
        const SQL_CREATE = "CREATE DATABASE qtasklogdb";
        const result = await query(
            SQL_CREATE
        )
        l(chalk.green("create result", js(result)))
    }
    const SQL_CREATE_qwl_config = "CREATE TABLE IF NOT EXISTS qtasklogdb.qwl_config (\
        `on` int(11) DEFAULT NULL   \
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;  \
      "
    const result2 = await query(
        SQL_CREATE_qwl_config
    )
    l(chalk.magenta("CREATEING TABLE qwl_log"))
    const SQL_CREATE_qwl_log = "CREATE TABLE IF NOT EXISTS qtasklogdb.qwl_log (\
        `logid` int(19) NOT NULL AUTO_INCREMENT,\
        `type` varchar(45) DEFAULT NULL,\
        `message` text,\
        `body` longtext,\
        `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\
        `micros` bigint(20) NOT NULL,\
        `username` varchar(64) DEFAULT NULL,\
        `servername` varchar(45) DEFAULT NULL,\
        `threadid` varchar(64) DEFAULT NULL,\
        PRIMARY KEY (`logid`),\
        KEY `threadid` (`logid`,`threadid`)\
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\
    \
    "
    const result3 = await query(
        SQL_CREATE_qwl_log
    )
    const SQL_CREATE_qwl_test = "CREATE TABLE IF NOT EXISTS qtasklogdb.test (\
        `body` varchar(255) DEFAULT NULL,\
        `server` varchar(255) DEFAULT NULL\
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\
      \
      "
    const result4 = await query(
        SQL_CREATE_qwl_test
    )

    l(chalk.yellow("checking the povdb schema"))
    const SQL_POVDB = `
    SELECT SCHEMA_NAME
        FROM INFORMATION_SCHEMA.SCHEMATA
    WHERE SCHEMA_NAME='povdb'
    `;
    const rowsPovdb = await query(
        SQL_POVDB
    )
    l(chalk.green("result povdb", rows))
    if (!rowsPovdb || !rowsPovdb.length) {
        l(chalk.green("create povdb"))
        const SQL_CREATE = "CREATE DATABASE povdb";
        const result = await query(
            SQL_CREATE
        )
        l(chalk.green("create povdb result", js(result)))
    }
    await connection.end();
}


/**
 *
 * Connection Pool create connections to databases on as needed bases, or if exists - increase ref count and remembers the thread that triggered the refCount increase
 * At the end of the thread, dbEnd will check if there were and connections allocated / refCount increased by this thread and release them (decrease refCounts and close connection if 0)
 *
 */
function slugify(string) {
    const a =
        "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;"
    const b =
        "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------"
    const p = new RegExp(a.split("").join("|"), "g")

    return string
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, "-and-") // Replace & with 'and'
        .replace(/[^\w\-]+/g, "") // Remove all non-word characters
        .replace(/\-\-+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, "") // Trim - from end of text
}
let connectionPool = {}
const dbGetQuery = async (name, threadid) => {
    try {
        let client = null;
        let comment = '';
        let serverName = _dbServer
        let key = `${serverName}-${name}`
        //  l('dbGetQuery',serverName)
        // console.log("dbGetQuery");
        //  1/1/2021 Refactor. Each thread / host-dbname gets one connection. Thread exits, all its connections terminated.

        let threadPool = connectionPool[threadid]
        if (threadPool && threadPool[key]) {
            client = threadPool[key]
            // console.log("existing Client", threadid);
            /*
        if (connectionPool[`${serverName}-${threadid}-${name}`]) {
            client = connectionPool[`${serverName}-${threadid}-${name}`];
            */
        } else {
            /*  console.log(
                  "new connection",
                  serverName,
                  threadid,
                  name,
                  comment
                 
              )
              l("----------------------------------------------")
              l("----------------------------------------------")*/
            let server = {
                host: serverName,
                user: _dbUser,
                port: _dbPort,
                password: _dbPassword,
                database: name,
                //debug: true,
            }
            //l("dbGetQuery", js(server))
            // l("dbGetConnection lazy init", js(server), name, threadid);

            var connection = mysql.createConnection(server)
            const query = util.promisify(connection.query).bind(connection)
            try {
                connection.connect(function (err) {
                    if (err) {
                        return console.error("error: " + err.message)
                    }

                    // console.log("Connected to  MySQL server.")
                })
            } catch (x) {
                l(chalk.red("FAILED CONNECTION, RETRYING"))
                try {
                    connection.connect(function (err) {
                        if (err) {
                            return console.error("error: " + err.message)
                        }

                        console.log("Second attempt Connected to  MySQL server.")
                    })
                } catch (x) {
                    l(chalk.red("FAILED CONNECTION, 2 RETRYING"))
                    await connection.connect()
                }
            }
            // l(chalk.green("CONNECTED"));
            // client = { connection, query, refCount: 0 };
            client = { connection, query }
            if (!threadPool) {
                threadPool = {}
                //l(chalk.green("New Thread Pool", threadid));
            }
            // console.log("pool: setting key",client?"client exists":"nothing", key, threadid);
            threadPool[key] = client
            connectionPool[threadid] = threadPool
            connection.on("error", function (error) {
                if (
                    error.code === "PROTOCOL_CONNECTION_LOST" ||
                    error.code == "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" ||
                    error.code == "ETIMEDOUT"
                ) {
                    l(chalk.red.bold("exit: connection error:\n@", error))
                    process.exit(-1)
                }
                l(chalk.red.bold("connection error:\n@", error));
            })
        }
        /* if (!client.threads) client.threads = [];
        if (client.threads.indexOf(threadid) < 0) {
            client.refCount += 1;
            client.threads.push(threadid);
        }*/
        //connectionPool[`${serverName}-${threadid}-${name}`] = client;
        return client.query
    } catch (x) {
        l(chalk.red.bold("DB getQuery Error:", x))
    }
}

const dbEnd = async (threadid) => {
    // let keys = Object.keys(connectionPool);
    //let serverName = dbServerName || _dbServer;
    //let key = `${serverName}-${threadid}-${name}`;
    // let key = `${serverName}-${name}`;

    //if (connectionPool[key]) {
    // l(chalk.yellow("dbEnd", threadid));
    //return
    let threadPool = null
    if (connectionPool[threadid]) {
        /*console.log(
            "inside connectionPool",
            threadid,
            Object.keys(connectionPool)
        )*/

        threadPool = connectionPool[threadid]

        if (threadPool) {
            // l("dbEnd", js({ threadPoolKeys: Object.keys(threadPool) }))
            //client = connectionPool[key];
            let keys = Object.keys(threadPool)
            for (var k = 0; k < keys.length; k++) {
                try {
                    const key = keys[k];
                    let client = threadPool[key]
                    // l("dbEnd got client for key ",key)
                    //for (let i = 0; i < keys.length; i++) {
                    //  let key = keys[i];
                    //let client = connectionPool[key];
                    //if (client && client.threads && client.threads.indexOf(threadid) >= 0) {
                    //  let index = client.threads.indexOf(threadid);
                    //  client.threads.splice(index, 1);
                    // client.refCount = client.refCount - 1;
                    //l("dbEnd decrease ref count", client.refCount, key, threadid);
                    // if (client.refCount <= 0) {
                    if (client) {
                        // l("dbEnd DISCONNECT", key)
                        let connection = client.connection
                        await connection.end()
                        //delete connectionPool[key];
                    }
                } catch (x) {
                    l("CATCH ERROR- dbEnd", chalk.red(x))
                }
            }
            delete connectionPool[threadid]
            //  l(chalk.green.bold("THREAD REMOVED from CONNECTION POOL", threadid))
            //} else {
            //   connectionPool[key] = client;
            //}
            //}
        }
    } else {
        //l(chalk.yellow("NO CONNECTIONS TO REMOVE", threadid));
    }
}
const ds = (s) => s || ""
const dbLog = async ({ type, body, threadid, sessionid, username, show }) => {
    let query = await dbGetQuery("povdb", threadid)
    let sql = "SELECT enabled,username from dblog_config limit 1"
    let rows = await query(sql)
    let enabled = rows ? rows[0]["enabled"] : 0
    let enabledUsername = rows ? rows[0]["username"] : ""
    username = ds(username)
    if (enabled == 1 && (!enabledUsername || enabledUsername == username)) {
        // l('sql =', `INSERT into dblog (\`type\`,threadid,body,micros,sessionid,username) VALUES ('${type}','${threadid}','${body}',${microtime()},'${sessionid}','${username}')`);
        sql = `INSERT into dblog (\`type\`,threadid,body,micros,sessionid,username) VALUES (?,?,?,?,?,?)`
        await query(sql, [
            type,
            threadid,
            `${body}`,
            microtime(),
            sessionid,
            username,
        ])
        if (show) l(chalk.red("DBLOG:", type, body))
        //  l('<<dbLog', ` ('${type}','${threadid}','${body}',${microtime()},'${sessionid}','${username}')`);
    }
}
const dbLogTruncate = async () => {
    let query = await dbGetQuery("povdb", 13)
    let sql = "truncate dblog"
    let result = await query(sql)
}
const dbFetchLogByThreadid = async ({ threadid }) => {
    let query = await dbGetQuery("povdb", threadid)
    let sql = `SELECT * from dblog where threadid='${threadid}' order by logid desc limit 10000`
    //  l(chalk.red(sql));
    let rows = await query(
        `SELECT * from dblog where threadid=? order by logid desc limit 10000`,
        [threadid]
    )
    return rows
}

const dbNewsline = async ({
    sessionid,
    threadid,
    input,
    username,
    action,
    dbServerName,
}) => {
    let { slug, channelSlug, definition, micros } = input
    definition = ds(definition)
    let result
    let query = await dbGetQuery("povdb", threadid, dbServerName)
}
const dbMetatag = async ({
    sessionid,
    threadid,
    userInput,
    username,
    action,
    dbServerName,
}) => { }
const dbAlert = async ({
    sessionid,
    threadid,
    userInput,
    username,
    action,
    dbServerName,
}) => { }

export {
    dbLog,
    dbEnd,
    dbGetQuery,
    dbFetchLogByThreadid,
    dbLogTruncate,
    slugify,
    checkSchema
}
