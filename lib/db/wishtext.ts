import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getUser = async ({
    threadid,
    slug
}:{
    threadid:number,
    slug:string
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT user_name,avatar,subscr_status from pov_v10_users where slug='${slug}'`;
    let rows = await query(`SELECT user_name,avatar,subscr_status from pov_v10_users where slug=?`,[slug]);
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
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT options from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT options from pov_v30_user_sessions where userslug=?`,[userslug]);

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

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT xid  from pov_v30_user_sessions where userslug=?`,[userslug]);

    if(rows&&rows.length>0){
        const xid=rows[0]['xid'];
        sql=`UPDATE pov_v30_user_sessions set options='${options}' where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_sessions set options=? where userslug=?`,[options,userslug]);
    }
    else {
        const micros=microtime();
        sql=`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES('${options}','${userslug}','${micros}',now())`;
        await query(`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES(?,?,?,now())`,[options,userslug,micros]);
    }
}

export const updateSession = async ({
    threadid,
    sessionid,
    config
}:{
    threadid:number,
    sessionid:string,
    config:string
}) => {
  


    let query = await dbGetQuery("wt", threadid);
    let sql = `SELECT xid from session_configs where sessionid='${sessionid}'`;
    let rows = await query(`SELECT xid from session_configs where sessionid=?`,[sessionid]);
    if(rows&&rows.length>0){
        sql=`UPDATE session_configs set lastUsed=now(), config='${config}' where sessionid='${sessionid}'`;
        await query(`UPDATE session_configs set lastUsed=now(), config=? where sessionid=?`,[config,sessionid]);
    }
    else {
        sql=`INSERT INTO session_configs (sessionid,lastUsed,config) VALUES ('${sessionid}',now(),'${config}')`;
        await query(`INSERT INTO session_configs (sessionid,lastUsed,config) VALUES (?,now(),?)`,[sessionid,config]);
    }
}
export const fetchSession = async ({
    threadid,
    sessionid,
 
}:{
    threadid:number,
    sessionid:string,
   
}) => {
  
    let query = await dbGetQuery("wt", threadid);
    const sql = `SELECT config from session_configs where sessionid='${sessionid}' `;
    let rows = await query(`SELECT config from session_configs where sessionid=?`,[sessionid]);
    if(rows&&rows.length>0){
       await query(`UPDATE session_configs set lastUsed=now() where sessionid=?`,[sessionid]);
       return rows[0]['config']
    }
return null;
}
