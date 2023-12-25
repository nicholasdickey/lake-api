//./functions/dbservice.ts
import { l, chalk, microtime, js, ds, uxToMySql, } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getChannelItem = async ({
    threadid,
    url,
    channel
}: {
    threadid: number,
    url: string,
    channel: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x40_channel_items where url=? and channel=?`;
    rows = await query(sql, [url, channel]);
    return rows && rows.length ? rows[0] : false
}

export const saveChannelItem = async ({
    threadid,
    url,
    title,
    digest,
    body,
    channel,
}: {
    threadid: number,
    url: string,
    title: string,
    digest: string,
    body: string,
    channel: string,

}) => {
    digest = digest || "";
    body = body || "";
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x40_channel_items where url=? and channel=?`;
    rows = await query(sql, [url, channel]);
    if (rows && rows.length) {
        const xid = rows[0].xid;
        l("xid=", xid, rows[0]);
        sql = `UPDATE x40_channel_items set channel=?,title=?,digest=?,body=?${digest && digest.length > 0 ? ',processedTime=now()' : ''} where xid=?`;
        rows = await query(sql, [channel, title, digest, body, xid]);
    }
    else {
        sql = `INSERT into x40_channel_items (channel,url,title,digest,body${digest && digest.length > 0 ? ',processedTime' : ''},createdTime) VALUES  (?,?,?,?,?${digest && digest.length > 0 ? ',now()' : ''},now())`;
        rows = await query(sql, [channel, url, title, digest, body]);
    }
    return rows && rows.length ? rows[0] : false
}

export const getChannel = async ({
    threadid,
    channel
}: {
    threadid: number,
    url: string,
    channel: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    let chan;
    if (!channel) {
        sql = `SELECT DISTINCT channel from x40_channels order by lastProcessed limit 1`;
        rows = await query(sql, []);
        chan = rows[0];
    }
    sql = `SELECT DISTINCT * from x40_channels where channel=?`;
    rows = await query(sql, [channel]);
    chan = rows && rows.length ? rows[0] : null;
}
export const checkFeedItem = async ({
    threadid,
    url,
    feed
}: {
    threadid: number,
    url: string,
    feed: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x40_feed_items where url=? and feed=? limit 1`;
    rows = await query(sql, [url, feed]);
    return rows && rows.length ? true : false
}
interface Filter {
    value: string,
    sign: number
}
interface Channel {
    channel: string,
    filters: Filter[],
}
export const getChannels = async ({
    threadid,
}: {
    threadid: number,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT channel from x40_channels where UNIX_TIMESTAMP(lastProcessed)+5*60<UNIX_TIMESTAMP(now()) order by lastProcessed limit 10`;
    rows = await query(sql, []);

    let channels: Channel[] = []
    for (let i = 0; i < rows.length; i++) {
        const channel = rows[i].channel;
        sql = `SELECT DISTINCT filter as value, sign from x40_channel_filters where channel=?`;
        const filters = await query(sql, [channel]);
        let chan: Channel = { channel, filters };
        channels.push(chan);
    }
    return channels;
}

export const getFeeds = async ({
    threadid,
    force
}: {
    threadid: number,
    force: number;
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    if (force == 1)
        sql = `SELECT * from x40_feeds where active=1  limit 100`;
    else
        sql = `SELECT * from x40_feeds where active=1 and UNIX_TIMESTAMP(lastprocessed)+5*60<UNIX_TIMESTAMP(now()) limit 100`;
    rows = await query(sql, []);
    return rows;
}

export const setProcessedFeed = async ({
    threadid,
    feed
}: {
    threadid: number,
    feed: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `UPDATE x40_feeds  set lastprocessed=now() where feed=? limit 1`;
    await query(sql, [feed]);
}
export const getChannelItems = async ({
    threadid,
    channel
}: {
    threadid: number,
    channel: string;
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel=? and i.channel=c.channel order by i.createdTime desc limit 100`;
    l(chalk.green(sql))
    rows = await query(sql, [channel]);
    l("RESULT:", rows);
    return rows;
}
export const getOutfeeds = async ({
    threadid,
}: {
    threadid: number,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT DISTINCT outfeed from x40_outfeeds limit 1000`;
    rows = await query(sql, []);
    interface Outfeed {
        outfeed: string,
        channels: string[]
    }

    let outfeeds: Outfeed[] = []
    if (rows && rows.length) {
        for (let i = 0; i < rows.length; i++) {
            const outfeed = rows[i].group;
            sql = `SELECT DISTINCT channel from x40_outfeeds where outfeed=?`;
            const channels = await query(sql, [outfeed]);
            let g: Outfeed = { outfeed, channels };
            outfeeds.push(g);
        }
    }
    return outfeeds;
}

export const getOutfeedItems = async ({
    threadid,
    outfeed
}: {
    threadid: number,
    outfeed: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT DISTINCT channel from x40_outfeeds where outfeed=?`;
    const channels = await query(sql, [outfeed]);
    let chans: string[] = [];

    for (let j = 0; j < channels.length; j++) {
        chans.push(`'${channels[j].channel}'`);
    }
    let channelString = chans.join(",");
    sql = `SELECT DISTINCT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel in (${channelString}) and i.channel=c.channel order by i.createdTime desc limit 100`;
    const items = await query(sql, []);
    return items;
}

export const getLeagueItems = async ({
    threadid,
    league
}: {
    threadid: number,
    league: string
}) => {
    let sql, rows;
    league = league.toUpperCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT id from x41_teams where league=?`;
    const channels = await query(sql, [league]);
    let chans: string[] = [];
    for (let j = 0; j < channels.length; j++) {
        chans.push(`'${channels[j].id}'`);
    }
    let channelString = chans.join(",");

    sql = `SELECT DISTINCT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x41_league_items i, x41_hashtags c where i.channel in (${channelString}) and i.channel=c.id order by i.createdTime desc limit 100`;
    const items = await query(sql, []);

    return items;
}

//to be called once an hour using redis as a timer
export const findexCalc = async ({
    threadid,
}: {
    threadid: number,

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where team in (select id from x41_teams )
    group by name`;
    rows = await query(sql, []);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { name, team_menions, mentions, avg_findex, team, league } = row;
        sql = `SELECT millis from x41_findex where name=? and teamid=?`;
        const findexRows = await query(sql, [name, team]);
        let millis = 0;
        if (findexRows && findexRows.length) {
            millis = findexRows[0].millis || 0;
        }
        let millisNow = microtime();       
        if (millisNow - millis < 1000 * 60 * 60 * 24)
            continue;
        //need to set millisNow to milliseconds of noon today
        const now = new Date();
        const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        const recorded=noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow,recorded]);
    }

    sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where name in (select name from x41_teams )
    group by name`;
    rows = await query(sql, []);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { name, team_menions, mentions, avg_findex, team, league } = row;
        sql = `SELECT millis from x41_findex where name=? and teamid=?`;
        const findexRows = await query(sql, [name, team]);
        let millis = 0;
        if (findexRows && findexRows.length) {
            millis = findexRows[0].millis || 0;
        }
        let millisNow = microtime();
        if (millisNow - millis < 1000 * 60 * 60 * 24)
            continue;

        //need to set millisNow to milliseconds of noon today
        const now = new Date();
        const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        const recorded=noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow,recorded]);
    }
}

/*******************************************************************/
export const getLeagues = async ({
    threadid,
}: {
    threadid: number,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT name from x41_leagues limit 100`;
    rows = await query(sql, []);
    let leagues: string[] = [];
    
    for (let j = 0; j < rows.length; j++) {
        leagues.push(`${rows[j].name}`);
    }
    return leagues;
}

export const getLeagueTeams = async ({
    threadid,
    league
}: {
    threadid: number,
    league: string
}) => {
    let sql, rows;
    league = league.toUpperCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT id,name from x41_teams where league=?`;
    rows = await query(sql, [league]);
    return rows;
}

export const getTeamPlayers = async ({
    threadid,
    teamid
}: {
    threadid: number,
    teamid: string
}) => {
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT member as name from x41_team_players where teamid=?`;
    rows = await query(sql, [teamid]);
    for(let i=0;i<rows.length;i++){
        const row=rows[i];
        const {name}=row;
        sql=`SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
        where  team=? and name =?
        group by name`
        const currentFindexRows = await query(sql, [teamid,name]);
        const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
        row.mentions=currentFindex.mentions;
        row.findex=currentFindex.avg_findex;
    }
    return rows;
}

export const recordEvent = async ({
    threadid,
    name,
    sessionid,
    sid,
    params
}: {
    threadid: number,
    name: string,
    sessionid: string,
    sid: string,
    params: string
}) => {
    try {
        let { fbclid, utm_content } = params.trim().indexOf('{"fbclid"') == 0 ? JSON.parse(params) : params;
        fbclid = ds(fbclid);
        utm_content = ds(utm_content);
        let sql, result;
        const millis = microtime();
        let query = await dbGetQuery("povdb", threadid);
        sql = `INSERT INTO x41_events (name,sessionid,sid.params,millis,stamp) VALUES('${name}','${sessionid}','${sid}','${params}','${millis}',now())`;
        let rows = await query(`INSERT INTO x41_events (name,sessionid,sid,params,millis,stamp,fbclid,ad) VALUES(?,?,?,?,?,now(),?,?)`, [name, sessionid, sid, params, millis, fbclid, utm_content]);
        const old = millis - 10 * 24 * 3600 * 1000;
        sql = `DELETE FROM events where millis<${old}`;
        await query(`DELETE FROM x41_events where millis<?`, [old]);
    } catch (e) {
        console.log(chalk.redBright("ERROR", e));
    }
}

export const getPlayerDetails = async ({
    threadid,
    teamid,
    name
}: {
    threadid: number,
    teamid: string,
    name:string,
}) => {
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where  team=? and name =?
    group by name`
    const currentFindexRows = await query(sql, [teamid,name]);
    const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
    sql = `SELECT DISTINCT * from x41_findex where teamid=? and name=? order by millis desc limit 100`;
    const findexHistory = await query(sql, [teamid]);
    sql = `SELECT DISTINCT * from x41_findex where team=? and name=? order by millis desc limit 100`;
    const mentions = await query(sql, [teamid]);
    return {
        currentFindex,
        findexHistory,
        mentions
    }
}

export const getDetails = async ({
    threadid,
    teamid,
    name
}: {
    threadid: number,
    teamid: string,
    name:string,
}) => {
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT DISTINCT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where  team=? and name =?
    group by name`
    const currentFindexRows = await query(sql, [teamid,name]);
    const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
    sql = `SELECT DISTINCT teamid,millis,recorded,findex,mentions,teams from x41_findex where teamid=? and name=? order by millis desc limit 100`;
    const findexHistory = await query(sql, [teamid,name]);
    sql = `SELECT DISTINCT * from x41_raw_findex where team=? and name=? order by date desc limit 100`;
    const mentions = await query(sql, [teamid,name]);
    return {
        currentFindex,
        findexHistory,
        mentions
    }
}

export const getAllMentions = async ({
    threadid,   
}: {
    threadid: number,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT date, league, team, type, name, url, findex,summary FROM povdb.x41_raw_findex order by xid desc limit 25 `
    const mentions = await query(sql, []);
    return  mentions;   
}

export const getLeagueMentions = async ({
    threadid,
    league,
}: {
    threadid: number,
    league:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT date, league, team, type, name, url, findex,summary  FROM povdb.x41_raw_findex where league=? order by xid desc limit 25`;
    const mentions = await query(sql, [league]);
    return mentions; 
}