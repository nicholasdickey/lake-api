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
}:{
    threadid:number,
    sessionid:string
}) => {
    let sql;

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

export const updateSessionAck = async ({
    threadid,
    sessionid,
    tag
}:{
    threadid:number,
    sessionid:string,
    tag:string
}) => {
    let sql;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_session_acks where sessionid='${sessionid}'`;
    let rows = await query(`SELECT xid from pov_v30_session_acks where sessionid=?`,[sessionid]);

    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_session_acks set tag=${tag} where sessionid='${sessionid}'`;
        await query(`UPDATE pov_v30_session_acks set tag=? where sessionid=?`,[tag,sessionid]);
    }
    else {
        sql=`INSERT INTO pov_v30_session_acks (sessionid,tag) VALUES ('${sessionid}','${tag}')`;
        await query(`INSERT INTO pov_v30_session_acks (sessionid,tag) VALUES (?,?)`,[sessionid,tag]);
    }
}

export const updateUserAck = async ({
    threadid,
    userslug,
    tag
}:{
    threadid:number,
    userslug:string,
    tag:string
}) => {
    let sql;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_acks where userslug='${userslug}'`;
    let rows = await query(`SELECT xid from pov_v30_user_acks where userslug=?`,[userslug]);

    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_user_acks set tag=${tag} where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_acks set tag=? where userslug=?`,[tag,userslug]);
    }
    else {
        sql=`INSERT INTO pov_v30_user_acks (userslug,tag) VALUES ('${userslug}','${tag}')`;
        await query(`INSERT INTO pov_v30_user_acks (userslug,tag) VALUES (?,?)`,[userslug,tag]);
    }
}

export const verifyAck = async ({
    threadid,
    userslug,
    sessionid,
    tag
}:{
    threadid:number,
    userslug?:string,
    sessionid:string,
    tag:string
}) => {
    let sql;

    const table=`pov_v30_${userslug?'user':'session'}_acks`;
    const id=userslug||sessionid;
    const idField=userslug?'userslug':'sessionid';
    
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from ${table} where (tag='all' OR tag='${tag}'} and ${idField}='${id}'`;

    let rows = await query(`SELECT xid from ${table} where (tag='all' OR tag=?) and ${idField}=?`,[tag,id]);
    if(rows&&rows.length>0)
        return true
    return false;
}

export const saveSessionSubscription = async ({
    threadid,
    sessionid,
    subscription,
    subscriptionOptions
}:{
    threadid:number,
    sessionid:string,
    subscription:string,
    subscriptionOptions:string
}) => {
    let sql;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_session_subscriptions where sessionid='${sessionid}'`;
    l(chalk.green.bold(sql))
    let rows = await query(`SELECT xid pov_v30_session_subscriptions pov_v30_session_subscriptions where sessionid=?`,[sessionid]);

    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_session_subscriptions set subscription='${subscription}', subscription_options='${subscriptionOptions}' subscription_time=now() where sessionid='${sessionid}'`;
        l(chalk.green.bold(sql))
        await query(`UPDATE pov_v30_session_subscriptions set subscription=?,subscription_options=?,subscription_time=now() where sessionid=?`,[subscription,subscriptionOptions,sessionid]);
    }
    else {
        sql=`INSERT INTO pov_v30_session_subscriptions (sessionid,subscription,subscription_options,subscription_time) VALUES ('${sessionid}','${subscription}','${subscriptionOptions}',now())`;
        l(chalk.green.bold(sql))
        await query(`INSERT INTO pov_v30_session_subscriptions (sessionid,subscription,subscription_options,subscription_time) VALUES (?,?,?,now())`,[sessionid,subscription,subscriptionOptions]);
    }
}

export const getSessionSubscriptionOptions= async ({
    threadid,
    sessionid
}:{
    threadid:number,
    sessionid:string
}) => {
    let sql;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from pov_v30_session_subscriptions where sessionid='${sessionid}'`;
    let rows = await query(`SELECT * from pov_v30_session_subscriptions where sessionid=?`,[sessionid]);

    if(rows&&rows.length>0){
      const options=rows['subscription_options']
      return {
        subscription:true,
        options
      }
    }
   return {success:false};
}