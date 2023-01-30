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
    sql = `SELECT options from pov_v30_user_session where userslug='${userslug}'`;
    let rows = await query(`SELECT options from pov_v10_users where userslug=?`,[userslug]);
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
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_session where userslug='${userslug}'`;
    let rows = await query(`SELECT xid  from pov_v10_users where userslug=?`,[userslug]);
    l(chalk.green(sql,rows))
    if(rows&&rows.length>0){
        const xid=rows[0]['xid'];
        sql=`UPDATE pov_v30_user_session set options='${options}' where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_session set options=? where userslug=?`,[options,userslug]);
    }
    else {
        const micros=microtime();
        sql=`INSERT INTO pov_v30_user_session (options,userslug,micros,created) VALUES('${options}','${userslug}','${micros}',now())`;
        await query(`INSERT INTO pov_v30_user_session (options,userslug,micros,created) VALUES(?,?,?,now())`,[options,userslug,micros]);

    }
}