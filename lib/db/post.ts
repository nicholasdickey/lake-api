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