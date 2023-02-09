import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getUser = async ({
    threadid,
    slug
}:{
    threadid:number,
    slug:string
}) => {
    let sql, result;
    /// l("fetchSubroots");
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT user_name,avatar,subscr_status from pov_v10_users where slug='${slug}'`;
    let rows = await query(`SELECT user_name,avatar,subscr_status from pov_v10_users where slug=?`,[slug]);
    l(chalk.green(sql))
    return rows[0]
}
export const getUserSession = async ({
    threadid,
    userslug
}:{
    threadid:number,
    userslug:string
}) => {
    let sql, result;
    /// l("fetchSubroots");
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT options from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT options from pov_v30_user_sessions where userslug=?`,[userslug]);
    l(chalk.green(sql,rows))
    if(rows&&rows.length>0)
        return rows[0]
    return null;
}
export const saveUserSession = async ({
    threadid,
    userslug,
    options
}:{
    threadid:number,
    userslug:string,
    options:string
}) => {
    let sql, result;
    /// l("fetchSubroots");
    l("saveUserSession",userslug,js(options))
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT xid  from pov_v30_user_sessions where userslug=?`,[userslug]);
    l(chalk.green(sql,rows))
    if(rows&&rows.length>0){
        const xid=rows[0]['xid'];
        sql=`UPDATE pov_v30_user_sessions set options='${options}' where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_sessions set options=? where userslug=?`,[options,userslug]);
    }
    else {
        const micros=microtime();
        sql=`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES('${options}','${userslug}','${micros}',now())`;
        l(chalk.green(sql))
        await query(`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES(?,?,?,now())`,[options,userslug,micros]);
        l("after insert")

    }
}
export const updateSession = async ({
    threadid,
    sessionid,
}:{
    threadid:number,
    sessionid:string
}) => {
    let sql, result;
    /// l("fetchSubroots");
    l("updateSession",sessionid)
    const millis=microtime();
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_sessions where sessionid='${sessionid}'`;
    let rows = await query(`SELECT xid from pov_v30_sessions where sessionid=?`,[sessionid]);
    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_sessions set millis=${millis} where sessionid='${sessionid}'`;
        await query(`UPDATE pov_v30_sessions set millis=? where sessionid=?`,[millis,sessionid]);
    }
    else {
        sql=`INSERT INTO pov_v30_sessions (sessionid,millis,created) VALUES ('${sessionid}',${millis},now())`;
        await query(`INSERT INTO pov_v30_sessions (sessionid,millis,created) VALUES (?,?,now())`,[sessionid,millis]);

    }
}