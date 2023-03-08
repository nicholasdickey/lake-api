// ./lib/db.ts
//@ts-ignore
import mysql from "mysql" 
import util from "util"
import { l, chalk, microtime, js, ds, allowLog } from "./common"

const _dbServer = process.env.DB_HOST
const _dbPort = process.env.DB_PORT || 3306
const _dbUser = process.env.DB_USER
const _dbPassword = process.env.DB_PASSWORD

allowLog();

/**
 *
 * Connection Pool create connections to databases on as needed bases, or if exists - increase ref count and remembers the thread that triggered the refCount increase
 * At the end of the thread, dbEnd will check if there were and connections allocated / refCount increased by this thread and release them (decrease refCounts and close connection if 0)
 *
 */
function slugify(string:string) {
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
const dbGetQuery = async (name:String, threadid:number) => {
    try {
        let client = null;
        let comment = '';
        let serverName = _dbServer
        let key = `${serverName}-${name}`
       
        //  1/1/2021 Refactor. Each thread / host-dbname gets one connection. Thread exits, all its connections terminated.
        
        //@ts-ignore
        let threadPool = connectionPool[threadid]
        if (threadPool && threadPool[key]) {
            client = threadPool[key]

        } else {
            let server = {
                host: serverName,
                user: _dbUser,
                port: _dbPort,
                password: _dbPassword,
                database: name,
            }
 
            var connection = mysql.createConnection(server)
            const query = util.promisify(connection.query).bind(connection)
            try {
                connection.connect(function (err:any) {
                    if (err) {
                        return console.error("error: " + err.message)
                    }
                })
            } catch (x) {
                l(chalk.red("FAILED CONNECTION, RETRYING"))
                try {
                    connection.connect(function (err:any) {
                        if (err) {
                            return console.error("error: " + err.message)
                        }
                    })
                } catch (x) {
                    l(chalk.red("FAILED CONNECTION, 2 RETRYING"))
                    await connection.connect()
                }
            }
            client = { connection, query }
            if (!threadPool) {
                threadPool = {}
            }

            threadPool[key] = client
            //@ts-ignore
            connectionPool[threadid] = threadPool
            connection.on("error", function (error:any) {
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
        return client.query
    } catch (x) {
        l(chalk.red.bold("DB getQuery Error:", x))
    }
}

const dbEnd = async (threadid:number) => {
    let threadPool = null
    //@ts-ignore
    if (connectionPool[threadid]) {
       
        //@ts-ignore
        threadPool = connectionPool[threadid]

        if (threadPool) {
            let keys = Object.keys(threadPool)
            for (var k = 0; k < keys.length; k++) {
                try {
                    const key = keys[k];
                    let client = threadPool[key]

                    if (client) {
                        let connection = client.connection
                        await connection.end()
                    }
                } catch (x) {
                    l("CATCH ERROR- dbEnd", chalk.red(x))
                }
            }
            //@ts-ignore
            delete connectionPool[threadid]
        }
    } 
}

const dbLog = async ({ type, body, threadid, sessionid, username, show }:{type:string,body:string,threadid:number,sessionid:string,username:string,show:boolean}) => {
    let query = await dbGetQuery("povdb", threadid)
    let sql = "SELECT enabled,username from dblog_config limit 1"
    let rows = await query(sql)
    let enabled = rows ? rows[0]["enabled"] : 0
    let enabledUsername = rows ? rows[0]["username"] : ""
    username = ds(username)
    if (enabled == 1 && (!enabledUsername || enabledUsername == username)) {
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
    }
}
const dbLogTruncate = async () => {
    let query = await dbGetQuery("povdb", 13)
    let sql = "truncate dblog"
    let result = await query(sql)
    await dbEnd(13);
}
const dbFetchLogByThreadid = async ({ threadid }:{threadid:number}) => {
    let query = await dbGetQuery("povdb", threadid)
    let sql = `SELECT * from dblog where threadid='${threadid}' order by logid desc limit 10000`

    let rows = await query(
        `SELECT * from dblog where threadid=? order by logid desc limit 10000`,
        [threadid]
    )
    return rows;
}


export {
    dbLog,
    dbEnd,
    dbGetQuery,
    dbFetchLogByThreadid,
    dbLogTruncate,
    slugify
}
