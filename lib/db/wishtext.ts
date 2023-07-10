import { l, chalk, microtime, js, ds, fillInParams } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getUser = async ({
    threadid,
    slug
}: {
    threadid: number,
    slug: string
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT user_name,avatar,subscr_status from pov_v10_users where slug='${slug}'`;
    let rows = await query(`SELECT user_name,avatar,subscr_status from pov_v10_users where slug=?`, [slug]);
    return rows[0]
}

export const getUserSession = async ({
    threadid,
    userslug
}: {
    threadid: number,
    userslug: string
}) => {
    let sql, result;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT options from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT options from pov_v30_user_sessions where userslug=?`, [userslug]);

    if (rows && rows.length > 0)
        return rows[0]
    return null;
}

export const saveUserSession = async ({
    threadid,
    userslug,
    options
}: {
    threadid: number,
    userslug: string,
    options: string
}) => {
    let sql, result;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT xid  from pov_v30_user_sessions where userslug=?`, [userslug]);

    if (rows && rows.length > 0) {
        const xid = rows[0]['xid'];
        sql = `UPDATE pov_v30_user_sessions set options='${options}' where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_sessions set options=? where userslug=?`, [options, userslug]);
    }
    else {
        const micros = microtime();
        sql = `INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES('${options}','${userslug}','${micros}',now())`;
        await query(`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES(?,?,?,now())`, [options, userslug, micros]);
    }
}

export const updateSession = async ({
    threadid,
    sessionid,
    config
}: {
    threadid: number,
    sessionid: string,
    config: string
}) => {



    let query = await dbGetQuery("wt", threadid);
    let sql = `SELECT xid from session_configs where sessionid='${sessionid}'`;
    let rows = await query(`SELECT xid from session_configs where sessionid=?`, [sessionid]);
    if (rows && rows.length > 0) {
        sql = `UPDATE session_configs set lastUsed=now(), config='${config}' where sessionid='${sessionid}'`;
        await query(`UPDATE session_configs set lastUsed=now(), config=? where sessionid=?`, [config, sessionid]);
    }
    else {
        sql = `INSERT INTO session_configs (sessionid,lastUsed,config) VALUES ('${sessionid}',now(),'${config}')`;
        await query(`INSERT INTO session_configs (sessionid,lastUsed,config) VALUES (?,now(),?)`, [sessionid, config]);
    }
}
export const fetchSession = async ({
    threadid,
    sessionid,

}: {
    threadid: number,
    sessionid: string,

}) => {

    let query = await dbGetQuery("wt", threadid);
    const sql = `SELECT config from session_configs where sessionid='${sessionid}' `;
    let rows = await query(`SELECT config from session_configs where sessionid=?`, [sessionid]);
    if (rows && rows.length > 0) {
        await query(`UPDATE session_configs set lastUsed=now() where sessionid=?`, [sessionid]);
        return rows[0]['config']
    }
    return null;
}

export const fetchHistory = async ({
    threadid,
    username,

}: {
    threadid: number,
    username: string,

}) => {
    let query = await dbGetQuery("wt", threadid);
    /*
    SELECT `history`.`xid`,
    `history`.`username`,
    `history`.`time`,
    `history`.`to`,
    `history`.`greeting`,
    `history`.`occasion`,
    `history`.`image`,
    `history`.`gift`
     FROM `history`;
*/
    const sql = `SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username='${username}' order by time desc limit 1`;
    let rows = await query(`SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username=? order by time desc limit 1`, [username]);
    if (rows && rows.length > 0) {
        return rows[0]
    }
    return null;

}
// generate list of histories for a user with a given username, start position, page, page size
export const getHistories = async ({
    threadid,
    username,
    page,
    pagesize
}: {
    threadid: number,
    username: string,

    page: number,
    pagesize: number
}) => {
    const start=page*pagesize;
    let query = await dbGetQuery("wt", threadid);
    const sql = `SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username='${username}' order by time desc limit ${start},${pagesize}`;
    let rows = await query(`SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username=? order by time desc limit ?,?`, [username, start, pagesize]);
    l(chalk.greenBright("fetchHistories", sql, rows));
    if (rows && rows.length > 0) {
        return rows
    }
    return null;
}
// generate CRUD functions for history (read already done), use username, time, to as key, use upsert for create/update
export const upsertHistory = async ({
    threadid,
    username,
    time,
    to,
    greeting,
    occasion,
    image,
    gift
}: {
    threadid: number,
    username: string,
    time: number,
    to: string,
    greeting: string,
    occasion: string,
    image: string,
    gift: string
}) => {
    if(!time)
    time=microtime();
    let query = await dbGetQuery("wt", threadid);
    const sql = `
      INSERT INTO history (username, time, \`to\`, greeting, occasion, image, gift)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        time = VALUES(time),
        \`to\` = VALUES(\`to\`),
        greeting = VALUES(greeting),
        occasion = VALUES(occasion),
        image = VALUES(image),
        gift = VALUES(gift)
    `;
    const params = [username, time, to, greeting, occasion, image, gift];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("upsertHistory", filledSql));
}
export const deleteHistory = async ({
    threadid,
    username,
    time,
    to,
   
}: {
    threadid: number,
    username: string,
    time: number,
    to: string,
  
}) => {
    let query = await dbGetQuery("wt", threadid);
    const sql = `
        DELETE FROM history
        WHERE username = ?
        AND time = ?
        AND \`to\` = ?
    `;
    const params = [username, time, to];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("deleteHistory", filledSql));
}
export const recordEvent = async ({
    threadid,
    name,
    sessionid,
    params
}: {
    threadid: number,
    name: string,
    sessionid: string,
    params: string
}) => {
    let sql, result;
    const millis=microtime();
    let query = await dbGetQuery("wt", threadid);
    sql = `INSERT INTO events (name,sessionid,params,millis,stamp) VALUES('${name}','${sessionid}','${params}','${millis}',now())`;
    let rows = await query(`INSERT INTO events (name,sessionid,params,millis,stamp) VALUES(?,?,?,?,now())`, [name, sessionid, params, millis]);
    l(chalk.greenBright("recordEvent", sql, rows));
    const old=millis-10*24*3600*1000;
    sql = `DELETE FROM events where millis<${old}`;
    await query(`DELETE FROM events where millis<?`, [old]);
}

   





