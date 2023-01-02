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