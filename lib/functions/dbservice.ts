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
    teamid,
    userid,
}: {
    threadid: number,
    teamid: string,
    userid?:string
}) => {
    let sql, rows;
    userid=userid||"";

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
        row.tracked=false;
        if(userid){
            sql=`SELECT xid from x41_list_members where userid=? and member=? and teamid=? limit 1`;
            const listRows = await query(sql, [userid,name,teamid]);
            row.tracked=listRows&&listRows.length?true:false;
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
    //const currentFindexRows = await query(sql, [teamid,name]);
    //const currentFindex=currentFindexRows&&currentFindexRows.length?currentFindexRows[0]:[];
    sql = `SELECT DISTINCT teamid,millis,recorded,findex,mentions,teams from x41_findex where teamid=? and name=? order by millis desc limit 100`;
    //const findexHistory = await query(sql, [teamid,name]);
    sql = `SELECT DISTINCT xid,date, league, team, type, name, url, findex,summary from x41_raw_findex where team=? and name=? order by date desc limit 100`;
    const mentions = await query(sql, [teamid,name]);
    return {
        currentFindex:[],
        findexHistory:[],
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
    sql=`SELECT xid,date, league, team, type, name, url, findex,summary FROM povdb.x41_raw_findex order by date desc limit 100 `
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
    sql=`SELECT xid,date, league, team, type, name, url, findex,summary  FROM povdb.x41_raw_findex where league=? order by xid desc limit 25`;
    const mentions = await query(sql, [league]);
    return mentions; 
}

export const getMetaLink = async ({
    threadid,
    xid,
}: {
    threadid: number,
    xid:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT i.title, i.digest as digest, i.url, i.image,i.site_name,i.authors  FROM povdb.x41_league_items i, povdb.x41_raw_findex f where f.xid=? and f.url=i.url`;
    //l(sql,xid)
    rows = await query(sql, [xid]);
    return rows&&rows.length?rows[0]:false; 
}
export const getFilteredAllMentions = async ({
    threadid,  
    userid, 
}: {
    threadid: number;
    userid:string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary FROM povdb.x41_raw_findex i, povdb.x41_list_members m where m.teamid=i.team and m.member=i.name and m.userid=? order by i.date desc limit 100 `
    const mentions = await query(sql, [userid]);
    return  mentions;   
}

export const getFilteredLeagueMentions = async ({
    threadid,
    league,
    userid,
}: {
    threadid: number,
    league:string,
    userid:string
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    

    // Get current findex, findex history, and mentions
    sql=`SELECT i.date, i.league, i.team, i.type, i.name, i.url, i.findex,i.summary FROM povdb.x41_raw_findex i,povdb.x41_list_members m where m.teamid=i.team and m.member=i.name and i.league=? and m.userid=? order by i.date desc limit 25`;
    const mentions = await query(sql, [league,userid]);
    return mentions; 
}


export const getAthletePhoto = async ({
    threadid,
    name,
    teamid,
}: {
    threadid: number,
    name:string,
    teamid:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    // Get current findex, findex history, and mentions
    sql=`SELECT photo from x41_team_players where member=? and teamid=? limit 1`;
    //l(sql,xid)
    rows = await query(sql, [name,teamid]);
    return rows&&rows.length?rows[0]['photo']:''; 
}
export const getOrCreateSubscriberId = async ({
    threadid,
    userId,
    email,
}: {
    threadid: number,
    userId:string,
    email:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT * from x41_users where userId=? limit 1`,userId,email;
    l("getOr",sql);
    rows = await query(sql, [userId]);
    if(!rows||!rows.length){
        l("inserting")
        sql=`INSERT into x41_users (userId,subscriberId,email) values (?,?,?)`;
        await query(sql, [userId,userId,email]);
    }
    return rows&&rows.length?rows[0]['subscriberId']:userId; 
}
export const getLastUserPing = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT * from x41_user_pings where userId=? limit 1`;
    rows = await query(sql, [userId]);
    
    return rows&&rows.length?rows[0]['ping']:-1; 
}
export const updateLastUserPing = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`UPDATE x41_user_pings set ping=UNIX_TIMESTAMP(now()) where userId=? limit 1`;
    rows = await query(sql, [userId]);
    
}
export const getUserLists = async ({
    threadid,
    userId,
}: {
    threadid: number,
    userId:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT * from x41_lists where userId=? limit 1000`;
    rows = await query(sql, [userId]);
    
    return rows;
}
export const getUserListMembers = async ({
    threadid,
    userId,
    listxid,
}: {
    threadid: number,
    userId:string,
    listxid:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT m.listxid,m.member,m.teamid,t.league from x41_list_members m, x41_teams t where m.listxid=? and m.teamid=t.id  order by member limit 1000`;
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
    userId:string,
    listxid:string,
    name:string,
    description:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`UPDATE x41_lists set name=?, description=? where listxid=?`;
    await query(sql, [name,description,listxid]);
}
export const updateUserListMembers = async ({
    threadid,
    userId,
    listxid,
    members
}: {
    threadid: number,
    userId:string,
    listxid:string,
    members:{member:string,teamid:string}[]
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`DELETE from x41_list_members where listxid=?`;
    await query(sql, [listxid]);
    for(let i=0;i<members.length;i++){
        const member=members[i];
        sql=`INSERT into x41_list_members (listxid,member,teamid) values (?,?,?)`;
        await query(sql, [listxid,member.member,member.teamid]);
    }
    sql=`SELECT * from x41_list_members where listxid=? order by member limit 1000`;
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
    userId:string,
    name:string,
    description:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    var randomstring = () => Math.random().toString(36).substring(2, 24) + Math.random().toString(36).substring(2, 24);
    const listxid=randomstring();
    sql=`INSERT INTO x41_lists (name,description,userid,listxid) VALUES (?,?,?,?)`;
    await query(sql, [name,description,userId,listxid]);
    const lists= await getUserLists({threadid,userId});
    console.log("DB get lists",lists)
    return lists;
}

export const checkFreeUser = async ({
    threadid,
    email,
}: {
    threadid: number,
    email:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT xid from x41_free_users where email=? limit 1`;
    rows=await query(sql, [email]);
    return rows&&rows.length?true:false; 
}

export const addTrackerListMember = async ({
    threadid,
    userid,
    member,
    teamid
}: {
    threadid: number,
    userid:string,
    member:string,
    teamid:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT xid from x41_list_members where userid=? and member=? and teamid=? limit 1`;
    rows=await query(sql, [userid,member,teamid]);
    if(rows&&rows.length)
        return false;
    sql=`INSERT INTO x41_list_members (userid,member,teamid) VALUES (?,?,?)`;
    await query(sql, [userid,member,teamid]);
    return true;
}
export const removeTrackerListMember = async ({
    threadid,
    userid,
    member,
    teamid
}: {
    threadid: number,
    userid:string,
    member:string,
    teamid:string,
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`DELETE from x41_list_members where userid=? and member=? and teamid=? limit 1`;
    await query(sql, [userid,member,teamid]);
    return true;
}
export const getTrackerList = async ({
    threadid,
    userid,
    league,
}: {
    threadid: number,
    userid:string,
    league:string,
}) => {
    let sql, rows;
    league=league?league.toUpperCase():"";   
    let query = await dbGetQuery("povdb", threadid);
    if(league){
        sql=`SELECT l.member,l.teamid from x41_list_members l,x41_teams t where t.id=l.teamid and userid=? and t.league=? limit 1000`;
        rows=await query(sql, [userid,league]);
    }
    else {
        console.log ("get tracking list with no league")
        sql=`SELECT member,teamid from x41_list_members where userid=? limit 1000`;
        rows=await query(sql, [userid]);
    }
    return rows;
}
export const getUserOptions = async ({
    threadid,
    userid,
    email,
}: {
    threadid: number,
    userid:string,
    email:string
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT tracker_filter from x41_user_options where userid=? limit 1`;
    rows=await query(sql, [userid]);
    if(!rows||!rows.length){ // to keep a copy of user email locally just in case
        sql=`INSERT INTO x41_user_options (userid,email,last_access) VALUES (?,?,now())`;
        await query(sql, [userid,email]); 
        sql=`SELECT tracker_filter from x41_user_options where userid=? limit 1`;
        rows=await query(sql, [userid]); 
    }
    sql=`UPDATE x41_user_options set last_access=now() where userid=? limit 1`;
    await query(sql, [userid]);
    return rows[0]; 
}
export const updateTrackerFilterOption = async ({
    threadid,
    userid,
    tracker_filter,
}: {
    threadid: number,
    userid:string,
    tracker_filter:string
}) => {
    let sql, rows;   
    let query = await dbGetQuery("povdb", threadid);
    sql=`UPDATE x41_user_options set tracker_filter=? where userid=? limit 1`;
    await query(sql, [tracker_filter,userid]);
}