import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getChannelConfig = async ({
    threadid,
    channel
}) => {
    let sql, result;
   
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT n.displayName, n.twitter,n.logo,n.logo_src,c.forum,n.channelSlug,c.config from pov_v10_newsline_definitions n, pov_v10_channels c where n.slug='${channel}' and n.channelSlug=c.slug`;
    let rows = await query(`SELECT n.displayName, n.twitter,n.logo,n.logo_src,c.forum,n.channelSlug,c.config from pov_v10_newsline_definitions n, pov_v10_channels c where n.slug=? and n.channelSlug=c.slug`,[channel]);
    l(chalk.green.bold(js(rows[0])))
     l(chalk.yellow.bold(js(rows[0]['config'])))
    return {channelSlug:rows[0]['channelSlug'],config:rows[0]['config'],newsline:{slug:channel,displayName:rows[0]['displayName'],twitter:rows[0]['twitter'],logo:rows[0]['logo']},defaultForum:rows[0]['forum']}
}
export const getSessionLayout = async ({
    threadid,
    sessionid
}) => {
    let sql, result;
    /// l("fetchSubroots");
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT layout from pov_v30_session_laoyts where sessionid='${sessionid}'`;
   // l(chalk.green(sql))
    let rows = await query(`SELECT * from pov_v30_session_laoyts where sessionid=?`,[sessionid]);
    return rows[0]['layout']
}
export const getUserLayout = async ({
    threadid,
    slug
}) => {
    let sql, result;
    /// l("fetchSubroots");
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT user_config from pov_v10_users where slug='${slug}'`;
    let rows = await query(`SELECT * from pov_v30_session_laoyts where slug=?`,[slug]);
   // l(chalk.green(sql))
    return rows[0]['user_config']
}
    

