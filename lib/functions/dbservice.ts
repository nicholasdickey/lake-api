//./functions/dbservice.ts
import { endOfISOWeek } from "date-fns";
import { l, chalk, microtime, js, ds, uxToMySql,slugify } from "../common";
import { dbGetQuery, dbLog } from "../db";
import { kMaxLength } from "buffer";
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
    const slug=slugify(title);
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x40_channel_items where url=? and channel=?`;
    rows = await query(sql, [url, channel]);
    if (rows && rows.length) {
        const xid = rows[0].xid;
        l("xid=", xid, rows[0]);
        sql = `UPDATE x40_channel_items set slug=?,channel=?,title=?,digest=?,body=?${digest && digest.length > 0 ? ',processedTime=now()' : ''} where xid=?`;
        rows = await query(sql, [slug,channel, title, digest, body, xid]);
    }
    else {
        sql = `INSERT into x40_channel_items (slug,channel,url,title,digest,body${digest && digest.length > 0 ? ',processedTime' : ''},createdTime) VALUES  (?,?,?,?,?,?${digest && digest.length > 0 ? ',now()' : ''},now())`;
        rows = await query(sql, [slug,channel, url, title, digest, body]);
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
    sql = `SELECT i.digest,i.digest as longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel=? and i.channel=c.channel order by i.createdTime desc limit 100`;
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
    sql = `SELECT DISTINCT i.digest,i.digest as longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel in (${channelString}) and i.channel=c.channel order by i.createdTime desc limit 100`;
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

    sql = `SELECT DISTINCT i.slug,i.xid,i.digest,i.digest as longdigest,i.title,i.url,i.createdTime,c.hashtag from x41_league_items i, x41_hashtags c where i.channel in (${channelString}) and i.channel=c.id order by i.createdTime desc limit 100`;
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
        const recorded = noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow, recorded]);
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
        const recorded = noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow, recorded]);
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
    teamid,
    userid,
}: {
    threadid: number,
    teamid: string,
    userid?: string
}) => {
    let sql, rows;
    userid = userid || "";

    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT member as name from x41_team_players where teamid=?`;
    rows = await query(sql, [teamid]);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { name } = row;
        sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
        where  team=? and name =?
        group by name`
        const currentFindexRows = await query(sql, [teamid, name]);
        const currentFindex = currentFindexRows && currentFindexRows.length ? currentFindexRows[0] : [];
        row.mentions = currentFindex.mentions;
        row.findex = currentFindex.avg_findex;
        row.tracked = false;
        if (userid) {
            sql = `SELECT xid from x41_list_members where userid=? and member=? and teamid=? limit 1`;
            const listRows = await query(sql, [userid, name, teamid]);
            row.tracked = listRows && listRows.length ? true : false;
        }
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
    name: string,
}) => {
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where  team=? and name =?
    group by name`
    const currentFindexRows = await query(sql, [teamid, name]);
    const currentFindex = currentFindexRows && currentFindexRows.length ? currentFindexRows[0] : [];
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
    name: string,
}) => {
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT DISTINCT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where  team=? and name =?
    group by name`
    //const currentFindexRows = await query(sql, [teamid,name]);
    //const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
    sql = `SELECT DISTINCT teamid,millis,recorded,findex,mentions,teams from x41_findex where teamid=? and name=? order by millis desc limit 100`;
    //const findexHistory = await query(sql, [teamid,name]);
    sql = `SELECT DISTINCT xid as findexarxid,date, league, team, type, name, url, findex,summary 
    from x41_raw_findex 
    where team=? and name=? order by date desc limit 100`;
    const mentions = await query(sql, [teamid, name]);
    return {
        currentFindex: [],
        findexHistory: [],
        mentions
    }
}
export const getDetailsFavorites = async ({
    threadid,
    teamid,
    name,
    userid
}: {
    threadid: number,
    teamid: string,
    name: string,
    userid: string,
}) => {
    if (!userid)
        return getDetails({ threadid, teamid, name });
    let sql, rows;
    teamid = teamid.toLowerCase();
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    /*sql=`SELECT DISTINCT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where  team=? and name =?
    group by name`
    //const currentFindexRows = await query(sql, [teamid,name]);
    //const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
    sql = `SELECT DISTINCT teamid,millis,recorded,findex,mentions,teams from x41_findex where teamid=? and name=? order by millis desc limit 100`;*/
    //const findexHistory = await query(sql, [teamid,name]);
    sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.url, i.findex,summary ,not f.xid is null as fav 
    from x41_raw_findex i
        LEFT OUTER JOIN x41_user_favorites f on i.XID=f.findexarxid and f.userid=?
    where team=? and name=? order by date desc limit 100`;
    const mentions = await query(sql, [userid, teamid, name]);
    return {
        currentFindex: [],
        findexHistory: [],
        mentions
    }
}

export const getAllMentions = async ({
    threadid,
    page,
}: {
    threadid: number;
    page?: string;
}) => {
    let sql, rows;
    let pageNum = 0;

    if (!page)
        pageNum = 0;
    else
        pageNum = +page;

    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT xid as findexarxid,date, league, team, type, name, url, findex,summary FROM povdb.x41_raw_findex order by date desc limit ${pageNum * 25},25 `
    const mentions = await query(sql, []);
    return mentions;
}

export const getLeagueMentions = async ({
    threadid,
    league,
    page,
}: {
    threadid: number,
    league: string,
    page?: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    let pageNum = 0;

    if (!page)
        pageNum = 0;
    else
        pageNum = +page;


    // Get current findex, findex history, and mentions
    sql = `SELECT xid as findexarxid,date, league, team, type, name, url, findex,summary  FROM povdb.x41_raw_findex where league=? order by xid desc limit ${pageNum * 25},25`;
    const mentions = await query(sql, [league]);
    return mentions;
}
export const getAllMentionsFavorites = async ({
    threadid,
    userid,
}: {
    threadid: number,
    userid: string
}) => {
    if (!userid)
        return getAllMentions({ threadid });
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary,not f.xid is null as fav 
    FROM povdb.x41_raw_findex i 
        LEFT OUTER JOIN x41_user_favorites f on i.XID=f.findexarxid and f.userid=?
    order by date desc limit 100 `
    const mentions = await query(sql, [userid]);
    l("mentions=-", mentions)
    return mentions;
}

export const getLeagueMentionsFavorites = async ({
    threadid,
    league,
    userid,
}: {
    threadid: number,
    league: string,
    userid: string
}) => {
    if (!userid) {
        return getLeagueMentions({ threadid, league });
    }
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);


    // Get current findex, findex history, and mentions
    sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary,not f.xid is null as fav  
    FROM povdb.x41_raw_findex i
        LEFT OUTER JOIN x41_user_favorites f on i.XID=f.findexarxid and f.userid=?
    where league=? order by i.xid desc limit 25`;
    const mentions = await query(sql, [userid, league]);
    return mentions;
}
export const getMetaLink = async ({
    threadid,
    xid,
    long,
}: {
    threadid: number,
    xid: string,
    long: boolean,
}) => {
    let sql, rows;
    long=false;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT i.slug,i.title, i.${long ? 'longdigest' : 'digest'} as digest, i.url, i.image,i.site_name,i.authors  FROM povdb.x41_league_items i, povdb.x41_raw_findex f where f.xid=? and f.url=i.url`;
    //l(sql,xid)
    rows = await query(sql, [xid]);
    return rows && rows.length ? rows[0] : false;
}
export const getFilteredAllMentions = async ({
    threadid,
    userid,
}: {
    threadid: number;
    userid: string
}) => {
    if (!userid)
        return getAllMentions({ threadid });
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary,not f.xid is null as fav
    FROM povdb.x41_raw_findex i
        LEFT OUTER JOIN x41_user_favorites f on i.XID=f.findexarxid and f.userid=?,
    povdb.x41_list_members m
    where m.teamid=i.team and m.member=i.name and m.userid=? order by i.date desc limit 100 `
    const mentions = await query(sql, [userid, userid]);
    return mentions;
}

export const getFilteredLeagueMentions = async ({
    threadid,
    league,
    userid,
}: {
    threadid: number,
    league: string,
    userid: string
}) => {
    if (!userid) {
        return getLeagueMentions({ threadid, league });
    }
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);


    // Get current findex, findex history, and mentions
    sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary ,not f.xid is null as fav
    FROM povdb.x41_raw_findex i
        LEFT OUTER JOIN x41_user_favorites f on i.XID=f.findexarxid and f.userid=?,
    povdb.x41_list_members m 
    where m.teamid=i.team and m.member=i.name and i.league=? and m.userid=? order by i.date desc limit 25`;
    const mentions = await query(sql, [userid, league, userid]);
    return mentions;
}


export const getAthletePhoto = async ({
    threadid,
    name,
    teamid,
}: {
    threadid: number,
    name: string,
    teamid: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql = `SELECT photo from x41_team_players where member=? and teamid=? limit 1`;
    //l(sql,xid)
    rows = await query(sql, [name, teamid]);
    return rows && rows.length ? rows[0]['photo'] : '';
}
export const getOrCreateSubscriberId = async ({
    threadid,
    userId,
    email,
}: {
    threadid: number,
    userId: string,
    email: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x41_users where userId=? limit 1`, userId, email;
    l("getOr", sql);
    rows = await query(sql, [userId]);
    if (!rows || !rows.length) {
        l("inserting")
        sql = `INSERT into x41_users (userId,subscriberId,email) values (?,?,?)`;
        await query(sql, [userId, userId, email]);
    }
    return rows && rows.length ? rows[0]['subscriberId'] : userId;
}
export const getLastUserPing = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x41_user_pings where userId=? limit 1`;
    rows = await query(sql, [userId]);

    return rows && rows.length ? rows[0]['ping'] : -1;
}
export const updateLastUserPing = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `UPDATE x41_user_pings set ping=UNIX_TIMESTAMP(now()) where userId=? limit 1`;
    rows = await query(sql, [userId]);

}
export const getUserLists = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x41_lists where userId=? limit 1000`;
    rows = await query(sql, [userId]);

    return rows;
}
export const getUserListMembers = async ({
    threadid,
    userId,
    listxid,
}: {
    threadid: number,
    userId: string,
    listxid: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT m.listxid,m.member,m.teamid,t.league from x41_list_members m, x41_teams t where m.listxid=? and m.teamid=t.id  order by member limit 1000`;
    rows = await query(sql, [listxid]);

    return rows;
}
export const updateUserList = async ({
    threadid,
    userId,
    listxid,
    name,
    description,
}: {
    threadid: number,
    userId: string,
    listxid: string,
    name: string,
    description: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `UPDATE x41_lists set name=?, description=? where listxid=?`;
    await query(sql, [name, description, listxid]);
}
export const updateUserListMembers = async ({
    threadid,
    userId,
    listxid,
    members
}: {
    threadid: number,
    userId: string,
    listxid: string,
    members: { member: string, teamid: string }[]
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `DELETE from x41_list_members where listxid=?`;
    await query(sql, [listxid]);
    for (let i = 0; i < members.length; i++) {
        const member = members[i];
        sql = `INSERT into x41_list_members (listxid,member,teamid) values (?,?,?)`;
        await query(sql, [listxid, member.member, member.teamid]);
    }
    sql = `SELECT * from x41_list_members where listxid=? order by member limit 1000`;
    rows = await query(sql, [listxid]);
    return rows;
}
export const addUserList = async ({
    threadid,
    userId,
    name,
    description,
}: {
    threadid: number,
    userId: string,
    name: string,
    description: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    var randomstring = () => Math.random().toString(36).substring(2, 24) + Math.random().toString(36).substring(2, 24);
    const listxid = randomstring();
    sql = `INSERT INTO x41_lists (name,description,userid,listxid) VALUES (?,?,?,?)`;
    await query(sql, [name, description, userId, listxid]);
    const lists = await getUserLists({ threadid, userId });
    console.log("DB get lists", lists)
    return lists;
}

export const checkFreeUser = async ({
    threadid,
    email,
}: {
    threadid: number,
    email: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x41_free_users where email=? limit 1`;
    rows = await query(sql, [email]);
    return rows && rows.length ? true : false;
}

export const addTrackerListMember = async ({
    threadid,
    userid,
    member,
    teamid
}: {
    threadid: number,
    userid: string,
    member: string,
    teamid: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x41_list_members where userid=? and member=? and teamid=? limit 1`;
    rows = await query(sql, [userid, member, teamid]);
    if (rows && rows.length)
        return false;
    sql = `INSERT INTO x41_list_members (userid,member,teamid) VALUES (?,?,?)`;
    await query(sql, [userid, member, teamid]);
    return true;
}
export const removeTrackerListMember = async ({
    threadid,
    userid,
    member,
    teamid
}: {
    threadid: number,
    userid: string,
    member: string,
    teamid: string,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `DELETE from x41_list_members where userid=? and member=? and teamid=? limit 1`;
    await query(sql, [userid, member, teamid]);
    return true;
}
export const getTrackerList = async ({
    threadid,
    userid,
    league,
}: {
    threadid: number,
    userid: string,
    league: string,
}) => {
    let sql, rows;
    league = league ? league.toUpperCase() : "";
    let query = await dbGetQuery("povdb", threadid);
    if (league && league.length > 1) {
        sql = `SELECT l.member,l.teamid, t.league from x41_list_members l,x41_teams t where t.id=l.teamid and userid=? and t.league=? limit 1000`;
        rows = await query(sql, [userid, league]);
    }
    else {
        console.log("get tracking list with no league")
        sql = `SELECT m.member,m.teamid,t.league from x41_list_members m, x41_teams t where t.id=m.teamid and userid=? limit 1000`;
        rows = await query(sql, [userid]);
    }
    return rows;
}
export const getUserOptions = async ({
    threadid,
    userid,
    email,
}: {
    threadid: number,
    userid: string,
    email: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT tracker_filter from x41_user_options where userid=? limit 1`;
    rows = await query(sql, [userid]);
    if (!rows || !rows.length) { // to keep a copy of user email locally just in case
        sql = `INSERT INTO x41_user_options (userid,email,last_access) VALUES (?,?,now())`;
        await query(sql, [userid, email]);
        sql = `SELECT tracker_filter from x41_user_options where userid=? limit 1`;
        rows = await query(sql, [userid]);
    }
    sql = `UPDATE x41_user_options set last_access=now() where userid=? limit 1`;
    await query(sql, [userid]);
    return rows[0];
}
export const updateTrackerFilterOption = async ({
    threadid,
    userid,
    tracker_filter,
}: {
    threadid: number,
    userid: string,
    tracker_filter: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `UPDATE x41_user_options set tracker_filter=? where userid=? limit 1`;
    await query(sql, [tracker_filter, userid]);
}
export const addUserFavorite = async ({
    threadid,
    userid,
    findexarxid,
}: {
    threadid: number,
    userid: string,
    findexarxid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
    rows = await query(sql, [userid, findexarxid]);
    if (rows && rows.length)
        return false;
    sql = `INSERT INTO x41_user_favorites (userid,findexarxid) VALUES (?,?)`;
    await query(sql, [userid, findexarxid]);
    return true;
}
export const removeUserFavorite = async ({
    threadid,
    userid,
    findexarxid,
}: {
    threadid: number,
    userid: string,
    findexarxid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `DELETE from x41_user_favorites where userid=? and findexarxid=? limit 1`;
    await query(sql, [userid, findexarxid]);
    return true;
}
export const getUserFavorites = async ({
    threadid,
    userid,

}: {
    threadid: number,
    userid: string,

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team,i.teamName, i.type, i.name, i.url, i.findex,i.summary,1 as fav  
        from x41_user_favorites f, 
        x41_raw_findex i
    
    where f.findexarxid=i.xid and f.userid='user_2aMwz0s7fp5y5QhzKxWbqv8frqW' order by f.xid desc limit 1000`;
    rows = await query(sql, [userid]);
    console.log("getUserFavorites", sql, rows)
    return rows;
}
export const fetchMentions = async ({
    threadid,
    teamid,
    name,
    userid,
    page,
    league,
    myteam
}: {
    threadid: number,
    teamid: string,
    name: string,
    userid: string,
    page: string,
    league: string,
    myteam: string,
}) => {
    let sql, rows;
    const pageNum = page ? +page : 0;
    const filterNum = myteam ? +myteam : 0;
    if (teamid) {
        teamid = teamid.toLowerCase();
    }
    console.log("dbservice, fetchMentions", { teamid, name, userid, page, league, myteam, pageNum, filterNum })
    let query = await dbGetQuery("povdb", threadid);
    if (!userid) {
        if (teamid && name) { //aka details
            sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary,0 as fav 
                from x41_raw_findex i
                where i.team=? and i.name=? order by i.date desc limit ${pageNum * 25},25`;
            //  console.log("db2", sql)
            rows = await query(sql, [teamid, name]);

            return rows;
        }
        else if (teamid) { // team mentions TBD mixup with player feeds
            /*sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary,0 as fav  
                from x41_raw_findex i,
                x41_teams t
                  
                where i.team=?  and t.id=i.team and i.name=t.name order by date desc limit ${pageNum * 25},25`;
            */
           sql=`SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary,0 as fav  
           from x41_raw_findex i,
           x41_teams t
           where i.team=?  and t.id=i.team and i.name=t.name 
            UNION DISTINCT
            SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary,0 as fav  
           from x41_raw_findex i,
           x41_teams t,
           x41_team_players p

           where i.team=?   and t.id=p.teamid and i.name=p.member  and i.team=t.id
           order by date desc limit ${pageNum * 25},25`;
            
                console.log("db12", sql)
            rows = await query(sql, [teamid,teamid]);
            return rows;

        }
        else {
            if (!league) {
                // Get current findex, findex history, and mentions
                sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,i.summary , 0 as fav
                    FROM povdb.x41_raw_findex i
                    order by i.date desc limit ${pageNum * 25},25 `
                console.log("db1", sql)
                return await query(sql, []);
            }
            else {
                sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,i.summary, 0 as fav  
                    FROM povdb.x41_raw_findex i
                    where i.league=? 
                    order by i.xid desc limit ${pageNum * 25},25`;
                // console.log("db2", sql)
                return await query(sql, [league]);
            }
        }
    }
    else {
        if (!filterNum) {
            if (teamid && name) { //aka details
                sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary 
                    from x41_raw_findex i
                    where i.team=? and i.name=? order by i.date desc limit ${pageNum * 25},25`;
                //  console.log("db2", sql)
                rows = await query(sql, [/*userid,*/ teamid, name]);
                if (rows && rows.length) {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        row.fav = favRows && favRows.length ? true : false;
                    }

                }
                return rows;
            }
            else if (teamid) { // team mentions TBD mixup with player feeds
                /*sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary  
                    from x41_raw_findex i,
                    x41_teams t
                      
                    where i.team=?  and t.id=i.team and i.name=t.name order by date desc limit ${pageNum * 25},25`;
                */
                    sql=`SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary,0 as fav  
                    from x41_raw_findex i,
                    x41_teams t
                    where i.team=?  and t.id=i.team and i.name=t.name 
                     UNION DISTINCT
                     SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,summary,0 as fav  
                    from x41_raw_findex i,
                    x41_teams t,
                    x41_team_players p
         
                    where i.team=?   and t.id=p.teamid and i.name=p.member and i.team=t.id
                    order by date desc limit ${pageNum * 25},25`;
                    console.log("db2", sql)
                rows = await query(sql, [teamid,teamid]);
                if (rows && rows.length) {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        row.fav = favRows && favRows.length ? true : false;
                    }
                }
                return rows;
            }
            else { //aka mentions
                if (league) {
                    sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team,i.teamName, i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i
                            
                        where i.league=?  order by i.date desc limit ${pageNum * 25},25`;
                    console.log("db3", sql)
                    rows = await query(sql, [league]);
                    if (rows && rows.length) {
                        for (let i = 0; i < rows.length; i++) {
                            const row = rows[i];
                            sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                            const favRows = await query(sql, [userid, rows[0].findexarxid]);
                            row.fav = favRows && favRows.length ? true : false;
                        }
                    }
                    return rows;
                }
                else {
                    sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i
                        order by i.date desc limit ${pageNum * 25},25`;
                    console.log("db4", sql)
                    rows = await query(sql, []);
                    if (rows && rows.length) {
                        for (let i = 0; i < rows.length; i++) {
                            const row = rows[i];
                            sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                            const favRows = await query(sql, [userid, rows[0].findexarxid]);
                            row.fav = favRows && favRows.length ? true : false;
                        }
                    }
                    return rows;
                }
            }
        }
        else { // filter to my team (tracker list) only
            if (!league) {
                sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.teamName,i.url, i.findex,i.summary 
                    FROM povdb.x41_raw_findex i,
                    povdb.x41_list_members m
                    
                    where m.teamid=i.team and m.member=i.name and m.userid=? order by i.date desc limit ${pageNum * 25},25`;
                console.log("db5", sql)
                rows = await query(sql, [userid]);
                if (rows && rows.length) {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        row.fav = favRows && favRows.length ? true : false;
                    }
                }
                return rows;
            }
            else {
                sql = `SELECT i.xid as findexarxid,i.date, i.league, i.team, i.type, i.name, i.teamName, i.url, i.findex,i.summary 
                    FROM povdb.x41_raw_findex i,
                        
                    povdb.x41_list_members m
                  
                    where m.teamid=i.team and m.member=i.name  and i.league=? and m.userid=? order by i.date desc limit ${pageNum * 25},25`;
                //  console.log("db6", sql)
                rows = await query(sql, [league, userid]);
                if (rows && rows.length) {
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sql = `SELECT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        row.fav = favRows && favRows.length ? true : false;
                    }
                }
                return rows;
            }

        }
    }
}
export const getMention = async ({
    threadid,
    findexarxid,
}: {
    threadid: number,
    findexarxid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    // Get findex
    sql = `SELECT f.xid as findexarxid,f.date, f.league, f.team,f.teamName, f.type, f.name, f.url, f.findex,f.summary,l.image  FROM povdb.x41_raw_findex f, x41_league_items l where f.xid=? and l.url=f.url limit 1`;
    const mentions = await query(sql, [findexarxid]);
    l(chalk.greenBright("getMention", sql, mentions));
    return mentions ? mentions[0] : false;
}
export const removeMention = async ({
    threadid,
    findexarxid,
}: {
    threadid: number,
    findexarxid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    // Get findex
    sql = `DELETE FROM povdb.x41_raw_findex where xid=? limit 1`;
    await query(sql, [findexarxid]);
    l(chalk.greenBright("deleteMention", sql));
    return true;
}


export const fetchStories = async ({
    threadid,
    userid,
    page,
    league,

}: {
    threadid: number,
    userid: string,
    page: string,
    league: string,

}) => {
    let sql, rows;
    const pageNum = page ? +page : 0;
    league = league ? league.toUpperCase() : '';
    console.log("dbservice, fetchStories", { userid, page, league, pageNum })
    let query = await dbGetQuery("povdb", threadid);

    let stories;
    if (!league) {
        sql = `SELECT DISTINCT i.slug,i.xid,i.title, i.digest as digest, i.url, i.image,i.site_name,i.authors,i.createdTime  FROM povdb.x41_league_items i, povdb.x41_raw_findex f where f.url=i.url order by createdTime desc limit ${pageNum * 5},5`;
        stories = await query(sql, []);
    }
    else {
        sql = `SELECT DISTINCT i.slug,i.xid,i.title, i.digest as digest, i.url, i.image,i.site_name,i.authors,i.createdTime  FROM povdb.x41_league_items i, povdb.x41_raw_findex f where f.url=i.url and f.league=? order by createdTime desc limit ${pageNum * 5},5`;
        stories = await query(sql, [league]);
    }
    l(chalk.greenBright("stories", stories));
    for (let i = 0; i < stories.length; i++) {
        let mentions;
        l(chalk.yellow("story", i, stories[i].url))
        if (!userid) {
            if (!league) {
                l(chalk.magenta("no user, no league"))
                // Get current findex, findex history, and mentions
                sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,i.summary , 0 as fav
                    FROM povdb.x41_raw_findex i,
                    povdb.x41_league_items l
                    where l.url=i.url
                    and l.url=?
                    order by i.name`
                console.log("stories db1", sql)
                mentions = await query(sql, [stories[i].url]);
                console.log("after query")
            }
            else {
                sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName, i.type, i.name, i.url, i.findex,i.summary, 0 as fav  
                    FROM povdb.x41_raw_findex i,
                    povdb.x41_league_items l
                    where l.url=i.url
                    and l.url=? 
                    and i.league=? 
                    order by i.name`;
                console.log("stories db2", sql)
                mentions = await query(sql, [stories[i].url, league]);
            }
            stories[i].mentions = mentions;
            l(chalk.cyanBright("story", i, stories[i].url, mentions))

        }
        else {
            l(chalk.magenta("story", i, stories[i].url, 'user'));
            if (league) {
                sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team,i.teamName, i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i,
                        x41_league_items l
                            
                        where i.league=? and l.url=i.url and l.url=?
                        order by i.name`;
                console.log("stories b3", sql)
                rows = await query(sql, [league, stories[i].url]);
                if (rows && rows.length) {
                    for (let j = 0; j < rows.length; j++) {
                        const row = rows[j];
                        sql = `SELECT DISTINCT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        row.fav = favRows && favRows.length ? true : false;
                    }
                }
                stories[i].mentions = rows;
            }
            else {
                l(chalk.magenta("story", i, stories[i].url, 'no league'));
                sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i,
                        x41_league_items l      
                        where l.url=i.url
                        and l.url=?
                        order by i.name`;

                console.log("stories db4", sql)
                rows = await query(sql, [stories[i].url]);
                l(chalk.magenta("story===> rows.length:", rows.length))
                if (rows && rows.length) {
                    for (let j = 0; j < rows.length; j++) {
                        l(chalk.cyanBright("getting fav mentions"))
                        const row = rows[j];
                        sql = `SELECT DISTINCT xid from x41_user_favorites where userid=? and findexarxid=? limit 1`;
                        const favRows = await query(sql, [userid, rows[0].findexarxid]);
                        l(chalk.cyanBright("mention " + j))
                        row.fav = favRows && favRows.length ? true : false;
                    }
                }
                stories[i].mentions = rows;
            }
        }
    }
    return stories;
}

export const getStory = async ({
    threadid,
    sid,
}: {
    threadid: number,
    sid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);


    sql = `SELECT DISTINCT i.slug,i.xid,i.title, i.digest as digest, i.url, i.image,i.image_width,i.image_height,i.site_name,i.authors,i.createdTime  FROM povdb.x41_league_items i where i.xid=? limit 1`;
    const stories = await query(sql, [sid]);
    if (!stories || !stories.length)
        return false;
    let story = stories[0];
    sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i,
                        x41_league_items l      
                        where l.url=i.url
                        and l.url=?
                        order by i.name`;

    console.log("stories db4", sql)
    rows = await query(sql, [story.url]);
    l(chalk.magenta("story===> rows.length:", rows.length))
    
    story.mentions = rows;
    return story;
}

export const removeStory = async ({
    threadid,
    sid,
}: {
    threadid: number,
    sid: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT i.url  FROM povdb.x41_league_items i where i.xid=? limit 1`;
    const stories = await query(sql, [sid]);
    if (!stories || !stories.length)
        return false;
    let story = stories[0];

    sql = `DELETE FROM povdb.x41_league_items where xid=? limit 1`;
    await query(sql, [sid]);
    l(chalk.greenBright("deleteStory", sql));

    sql = `DELETE FROM povdb.x41_raw_findex where url=?`;
    await query(sql, [story.url]);
   
    return true;
}

export const getSlugStory = async ({
    threadid,
    slug,
}: {
    threadid: number,
    slug: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);


    sql = `SELECT DISTINCT i.slug,i.xid,i.title, i.digest as digest, i.url, i.image,i.image_width,i.image_height,i.site_name,i.authors,i.createdTime  FROM povdb.x41_league_items i where i.slug=? limit 1`;
    const stories = await query(sql, [slug]);
    if (!stories || !stories.length)
        return false;
    let story = stories[0];
    sql = `SELECT DISTINCT i.xid as findexarxid,i.date, i.league, i.team, i.teamName,i.type, i.name, i.url, i.findex,summary 
                        from x41_raw_findex i,
                        x41_league_items l      
                        where l.url=i.url
                        and l.url=?
                        order by i.name`;

    console.log("stories db4", sql)
    rows = await query(sql, [story.url]);
    l(chalk.magenta("story===> rows.length:", rows.length))
    
    story.mentions = rows;
    return story;
}

export const removeSlugStory = async ({
    threadid,
    slug,
}: {
    threadid: number,
    slug: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT i.url  FROM povdb.x41_league_items i where i.slug=? limit 1`;
    const stories = await query(sql, [slug]);
    if (!stories || !stories.length)
        return false;
    let story = stories[0];

    sql = `DELETE FROM povdb.x41_league_items where slug=? limit 1`;
    await query(sql, [slug]);
    l(chalk.greenBright("deleteStory", sql));

    sql = `DELETE FROM povdb.x41_raw_findex where url=?`;
    await query(sql, [story.url]);
   
    return true;
}

export const getSlugLeagues = async ({
    threadid,
    slug,
}: {
    threadid: number,
    slug: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT DISTINCT f.league FROM povdb.x41_league_items i, povdb.x41_raw_findex f where f.url=i.url and i.slug=? `;
    const leagues = await query(sql, [slug]);
    return leagues.map((l: any) => l.league);
}
       
export const fetchLeagueStorySlugs = async ({
    threadid,
    league,
    timeStart,
    timeEnd

}: {
    threadid: number,
    league: string,
    timeStart:number;
    timeEnd:number;

}) => {
    let sql, rows;
  
    league = league ? league.toUpperCase() : '';
    let query = await dbGetQuery("povdb", threadid);
    let stories;

    sql = `SELECT DISTINCT i.slug,i.createdTime  FROM povdb.x41_league_items i, povdb.x41_raw_findex f where i.slug is not null and f.url=i.url and f.league=? and unix_timestamp(i.createdTime)>? and unix_timestamp(i.createdTime)<=? order by createdTime desc limit 10000`;
   
    stories = await query(sql, [league,timeStart,timeEnd]);
    console.log("fetchLeagueStorySlugs",sql,league,timeStart,timeEnd,stories.length)
    return stories;
}

export const reportEvents = async ({
    threadid,
}: {
    threadid: number,

}): Promise<any> => {
    let sql, result;
    let query = await dbGetQuery("povdb", threadid);
    const millis = microtime();
    /* sql='select distinct sessionid, xid from wt.events order by millis desc';
     let rows = await query(sql);
     l(chalk.red(sql))
     for(let i=0;i<rows.length;i++){
         const sessionid=rows[i]['sessionid'];
         const xid=rows[i]['xid'];
         const sid=sessionid?.split(':')[1];
         sql='update wt.events set sid=? where xid=?';
         await query(sql,[sid,xid]);
     }*/

    sql = `select distinct sid,from_unixtime(millis/1000) stamp from x41_events where name not like '%bot%' and name not like '%prayer%' and name not like '%ssr%' and  millis>? group by sid   order by millis desc `;
    if (process.env.event_env != 'DEV') {
        sql = `select distinct sid,from_unixtime(millis/1000) stamp from x41_events where not name like '%bot%' and name not like '%ssr%' and name not like '%prayer%' and params not like '%test%' and sessionid not like '%dev%' and  millis>? group by sid   order by millis desc `;
    }
    let rows = await query(sql, [millis - 24 * 3600 * 1000]);
    // l(chalk.yellow(sql))
    //const filledSql = fillInParams(sql, [millis - 24 * 3600 * 1000]);
   // l(chalk.blueBright("reportEvents", filledSql, js(rows)));
    let retval: any = {};
    for (let i = 0; i < rows.length; i++) {
        const sessionid = rows[i]['sid'];
        let itemRetval: any = {};
        itemRetval.sessionid = sessionid;
        retval[sessionid] = itemRetval;
        itemRetval.items = [];
        //const filledSql = fillInParams(sql, [sessionid]);
        sql = `select distinct name,params,fbclid,ad,from_unixtime(millis/1000) stamp  from x41_events where sid =? and name not like '%auth%'  and name not like '%prayer%'  order by millis desc`;
        let rows2 = await query(sql, [sessionid]);
        // l(js(rows2));
        for (let j = 0; j < rows2.length; j++) {
            let record: any = {}
            const name = rows2[j]['name'];
            let constRecord = false;
            record['fbclid'] = rows2[j]['fbclid'];
           // record['params'] = rows2[j]['params'];
            record['name'] = rows2[j]['name'];
            record['sessionid']=sessionid;
            record['stamp'] = rows2[j]['stamp'];
            l(chalk.yellowBright("params", record['name'], rows2[j]['params']));
            let params={"empty":""};
            try{
                params=JSON.parse(rows2[j]['params']);
            }
            catch(e){
                l(chalk.redBright("error parsing params",e,rows2[j]['params']));
            }

            l(chalk.magentaBright("oarams",js( {name,...params})));
           // record.add(...params);
            for (const key in params) {
                //@ts-ignore
                record[key] = params[key];
              }
            l(chalk.greenBright("record",js(record)));  
            itemRetval.items.push(record);
         

        }
    }
    l(chalk.greenBright("retval",js(retval)));
    return retval;
}
export const reportPrayerEvents = async ({
    threadid,
}: {
    threadid: number,

}): Promise<any> => {
    let sql, result;
    let query = await dbGetQuery("povdb", threadid);
    const millis = microtime();
    /* sql='select distinct sessionid, xid from wt.events order by millis desc';
     let rows = await query(sql);
     l(chalk.red(sql))
     for(let i=0;i<rows.length;i++){
         const sessionid=rows[i]['sessionid'];
         const xid=rows[i]['xid'];
         const sid=sessionid?.split(':')[1];
         sql='update wt.events set sid=? where xid=?';
         await query(sql,[sid,xid]);
     }*/

    sql = `select distinct sid,from_unixtime(max(millis)/1000) stamp from x41_events where name not like '%bot%' and params not like '%censys%' and params not like '%SEO%'  and name  like '%prayer%' ${process.env.event_env != 'DEV'?"and sessionid not like '%dev%'":""} and  millis>? group by sid   order by stamp desc `;
    /*if (process.env.event_env != 'DEV') {
        sql = `select distinct sid,from_unixtime(max(millis)/1000) stamp from x41_events where not name like '%bot%' and name like '%prayer%' and params not like '%test%' and sessionid not like '%dev%' and  millis>? group by sid   order by stamp desc `;
    }*/
    let rows = await query(sql, [millis - 12 * 3600 * 1000]);
    // l(chalk.yellow(sql))
    //const filledSql = fillInParams(sql, [millis - 24 * 3600 * 1000]);
   // l(chalk.blueBright("reportEvents", filledSql, js(rows)));
    let retval: any = {};
    for (let i = 0; i < rows.length; i++) {
        const sessionid = rows[i]['sid'];
        let itemRetval: any = {};
        itemRetval.sessionid = sessionid;
        retval[sessionid] = itemRetval;
        itemRetval.items = [];
        //const filledSql = fillInParams(sql, [sessionid]);
        sql = `select distinct name,params,fbclid,ad,from_unixtime(millis/1000) stamp  from x41_events where sid =? and name not like '%auth%'  and name like '%prayer%'  order by millis desc`;
        let rows2 = await query(sql, [sessionid]);
        // l(js(rows2));
        for (let j = 0; j < rows2.length; j++) {
            let record: any = {}
            const name = rows2[j]['name'];
            let constRecord = false;
            record['fbclid'] = rows2[j]['fbclid'];
           // record['params'] = rows2[j]['params'];
            record['name'] = rows2[j]['name'];
            record['sessionid']=sessionid;
            record['stamp'] = rows2[j]['stamp'];
            l(chalk.yellowBright("params", record['name'], rows2[j]['params']));
            let params={"empty":""};
            try{
                params=JSON.parse(rows2[j]['params']);
            }
            catch(e){
                l(chalk.redBright("error parsing params",e,rows2[j]['params']));
            }

            l(chalk.magentaBright("oarams",js( {name,...params})));
           // record.add(...params);
            for (const key in params) {
                //@ts-ignore
                record[key] = params[key];
              }
            l(chalk.greenBright("record",js(record)));  
            itemRetval.items.push(record);
         

        }
    }
    l(chalk.greenBright("retval",js(retval)));
    return retval;
}

export const reportSessionEvents = async ({
    threadid,
    sessionid,
}: {
    threadid: number,
    sessionid: string,

}): Promise<any> => {
    let sql, result;
    let query = await dbGetQuery("povdb", threadid);
    const millis = microtime();



    let itemRetval: any = {};
    itemRetval.sessionid = sessionid;

    itemRetval.items = [];
    //const filledSql = fillInParams(sql, [sessionid]);
    sql = `select distinct name,params,fbclid,ad,stamp  from x41_events where sid =? order by millis desc`;
    let rows2 = await query(sql, [sessionid]);
    // l(js(rows2));
    for (let j = 0; j < rows2.length; j++) {
        let record: any = {}
        const name = rows2[j]['name'];
        let constRecord = false;
        record['fbclid'] = rows2[j]['fbclid'];
        record['params'] = rows2[j]['params'];
        record['name'] = rows2[j]['name'];
        record['sessionid']=sessionid;
        record['stamp'] = rows2[j]['stamp'];
        let params=JSON.parse(rows2[j]['params']);
        l(chalk.magentaBright("oarams", name,params));
        for (const key in params) {
            record[key] = params[key];
          }
        itemRetval.items.push(record);
        /*switch (name) {
            case 'ssr-pub':
            case 'ssr-pub-init':    
                record['ssrTime'] = params.ssrTime;
                record['image'] = rows2[j]['params'];
                constRecord = true;
                break;
            case 'generate': {
                record['name'] = 'generate-text';
                const params = JSON.parse(rows2[j]['params']);
                record['occasion'] = params['occasion'];
                record['naive'] = params['naive'];
                constRecord = true;
                break;
            }
            case 'create-card': {
                record['name'] = 'create-card';
                const linkid = rows2[j]['params'];
                sql = `select * from cards where linkid=?`
                let rows3 = await query(sql, [linkid]);
                if (rows3 && rows3.length > 0) {
                    record['signature'] = rows3[0]['signature'];
                    record['greeting'] = rows3[0]['greeting'];
                    sql = `select * from card_images where linkid=?`
                    let rows4 = await query(sql, [linkid]);
                    if (rows4 && rows4.length > 0) {
                        record['metaimage'] = rows4[0]['image'];
                    }
                }
                constRecord = true;
                break;
            }
            case 'ssr-card-init': {
                record['name'] = 'ssr-card-init';
                let srcParams = rows2[j]['params'];
                //  console.log("==================================================>>>srcParams",srcParams);

                if (srcParams.indexOf('"id"') < 0)
                    srcParams = srcParams.replace("id", "\"id\"")
                //   l("after replace",srcParams)
                const params = JSON.parse(srcParams);
                const linkid = params['id'];
                sql = `select * from cards where linkid=?`
                let rows3 = await query(sql, [linkid]);
                if (rows3 && rows3.length > 0) {
                    record['signature'] = rows3[0]['signature'];
                    record['greeting'] = rows3[0]['greeting'];
                    sql = `select * from card_images where linkid=?`
                    let rows4 = await query(sql, [linkid]);
                    if (rows4 && rows4.length > 0) {
                        record['metaimage'] = rows4[0]['image'];
                    }
                }
                constRecord = true;
                //  l(chalk.yellowBright("reportEventsInner",  js(record)));
                break;
            }
            case 'ssr-bot-card-init': {
                record['name'] = 'ssr-bot-card-init';
                let srcParams = rows2[j]['params'];
                console.log("srcParams", srcParams);
                if (srcParams.indexOf('{{') == 0)
                    srcParams = srcParams.replace("{{", "{");
                if (srcParams.indexOf('"id"') < 0)
                    srcParams = srcParams.replace("id", "\"id\"")
                l("after replace", srcParams)
                const params = JSON.parse(srcParams);
                const linkid = params['id'];
                sql = `select * from cards where linkid=?`
                let rows3 = await query(sql, [linkid]);
                if (rows3 && rows3.length > 0) {
                    record['signature'] = rows3[0]['signature'];
                    record['greeting'] = rows3[0]['greeting'];
                    sql = `select * from card_images where linkid=?`
                    let rows4 = await query(sql, [linkid]);
                    if (rows4 && rows4.length > 0) {
                        record['metaimage'] = rows4[0]['image'];
                    }
                }
                constRecord = true;
                break;
            }
            case 'createChatCompletion': {
                record['name'] = 'text-completion';
                const params = rows2[j]['params'];
                // l(chalk.red.bold("params",params)   );
                const completion = params?.split('===>Completion:')[1];
                // l(chalk.green.bold("completion",completion)   );
                record['text'] = completion;
                constRecord = true;
                break;
            }
            case 'ssr-bot-landing-init':
            case 'ssr-index-init':
            case 'ssr-bot-index-init':
            case 'ssr-landing-init':
                record['name'] = rows2[j]['name'];
                // l(chalk.grey("params",rows2[j]['params'])   );
                // const params=JSON.parse(rows2[j]['params']);
                record['params'] = rows2[j]['params'];
                constRecord = true;
                break;
        }*/
       /* if (constRecord) {
            itemRetval.items.push(record);
            // l(chalk.yellowBright("reportEventsInner", filledSql, js(record)));  
        }*/

    }

    //l(chalk.greenBright("retval",js(retval)));
    return itemRetval;
}

export const reportsSessionids = async ({
    threadid,
}: {
    threadid: number,

}): Promise<any> => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    const millis = microtime();
    /* sql='select distinct sessionid, xid from wt.events order by millis desc';
     let rows = await query(sql);
     l(chalk.red(sql))
     for(let i=0;i<rows.length;i++){
         const sessionid=rows[i]['sessionid'];
         const xid=rows[i]['xid'];
         const sid=sessionid?.split(':')[1];
         sql='update wt.events set sid=? where xid=?';
         await query(sql,[sid,xid]);
     }*/

    sql = `select sid,stamp from wt.events where millis>? group by millis,sid   order by millis desc `;
    if (process.env.event_env != 'DEV') {
        sql = `select sid,stamp from wt.events where not name like '%bot%' and  millis>? group by millis,sid   order by millis desc `;
    }
    let rows = await query(sql, [millis - 24 * 3600 * 1000]);
    // l(chalk.yellow(sql))
   
    //l(chalk.greenBright("retval",js(retval)));
    return rows;
}

