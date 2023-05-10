//./lib/db/config.ts
import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getPost = async ({
    threadid,
    postid
}:{
    threadid:number,
    postid:number
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from pov_channel_posts c where id='${postid}'`;
    let rows = await query( `SELECT id as postid,parent as parentid, body, author_username, author_name,author_avatar  from pov_channel_posts c where id=?`,[postid]);
    return rows&&rows.length?rows[0]:null;
}
export const checkChatbotPost = async ({
    threadid,
    postid
}:{
    threadid:number,
    postid:number
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from pov_chatbot_posts c where postid='${postid}'`;
    let rows = await query( `SELECT postid  from pov_chatbot_posts  where postid=?`,[postid]);
    return rows&&rows.length?true:false;
}
export const setChatbotPost = async ({
    threadid,
    postid
}:{
    threadid:number,
    postid:number
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `INSERT into  pov_chatbot_posts (postid,\`timestamp\`) VALUES (${postid},now())`;
    l(chalk.greenBright("setChatbotPost",sql));
    let rows = await query( `INSERT into  pov_chatbot_posts (postid,\`timestamp\`) VALUES (?,now())`,[postid]);
}