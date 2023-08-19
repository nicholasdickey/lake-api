import { l, chalk, microtime, js, ds, fillInParams,randomstring } from "../common";
import { dbGetQuery, dbLog } from "../db";
import ImageData from "../types/image-data";
import CardData from "../types/card-data";
import { Cardo } from "@next/font/google";
import { StringMappingType } from "typescript";
export const getUser = async ({
    threadid,
    slug
}: {
    threadid: number,
    slug: string
}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT user_name,avatar,subscr_status from pov_v10_users where slug='${slug}'`;
    let rows = await query(`SELECT user_name,avatar,subscr_status from pov_v10_users where slug=?`, [slug]);
    return rows[0]
}

export const getUserSession = async ({
    threadid,
    userslug
}: {
    threadid: number,
    userslug: string
}) => {
    let sql, result;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT options from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT options from pov_v30_user_sessions where userslug=?`, [userslug]);

    if (rows && rows.length > 0)
        return rows[0]
    return null;
}

export const saveUserSession = async ({
    threadid,
    userslug,
    options
}: {
    threadid: number,
    userslug: string,
    options: string
}) => {
    let sql, result;

    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from pov_v30_user_sessions where userslug='${userslug}'`;
    let rows = await query(`SELECT xid  from pov_v30_user_sessions where userslug=?`, [userslug]);

    if (rows && rows.length > 0) {
        const xid = rows[0]['xid'];
        sql = `UPDATE pov_v30_user_sessions set options='${options}' where userslug='${userslug}'`;
        await query(`UPDATE pov_v30_user_sessions set options=? where userslug=?`, [options, userslug]);
    }
    else {
        const micros = microtime();
        sql = `INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES('${options}','${userslug}','${micros}',now())`;
        await query(`INSERT INTO pov_v30_user_sessions (options,userslug,micros,created) VALUES(?,?,?,now())`, [options, userslug, micros]);
    }
}

export const updateSession = async ({
    threadid,
    sessionid,
    config
}: {
    threadid: number,
    sessionid: string,
    config: string
}) => {

    //TBD: parse images, make sure that images and session_images has all of them
    //console.log("updateSession", sessionid, config);
    let query = await dbGetQuery("wt", threadid);
    let sql = `SELECT xid from session_configs where sessionid='${sessionid}'`;
    let rows = await query(`SELECT xid from session_configs where sessionid=?`, [sessionid]);
    if (rows && rows.length > 0) {
        sql = `UPDATE session_configs set lastUsed=now(), config='${config}' where sessionid='${sessionid}'`;
        await query(`UPDATE session_configs set lastUsed=now(), config=? where sessionid=?`, [config, sessionid]);
    }
    else {
        sql = `INSERT INTO session_configs (sessionid,lastUsed,config) VALUES ('${sessionid}',now(),'${config}')`;
        await query(`INSERT INTO session_configs (sessionid,lastUsed,config) VALUES (?,now(),?)`, [sessionid, config]);
    }
    //  console.log("updateSession", sql);
}
export const fetchSession = async ({
    threadid,
    sessionid,

}: {
    threadid: number,
    sessionid: string,

}) => {
    // console.log("fetchSession API", sessionid);
    let query = await dbGetQuery("wt", threadid);
    const sql = `SELECT config from session_configs where sessionid='${sessionid}' `;
    let rows = await query(`SELECT config from session_configs where sessionid=?`, [sessionid]);
    if (rows && rows.length > 0) {
        await query(`UPDATE session_configs set lastUsed=now() where sessionid=?`, [sessionid]);
        //blend in shared_images:
        let configString= rows[0]['config'];
      
        return configString;
    }
    // console.log
    return null;
}
export const fetchSharedImages=async({
    threadid
}:{
    threadid:number
})=>{
    try{
        let query = await dbGetQuery("wt", threadid);
        const sql=`SELECT config from shared_images where tags like '%all%' order by ordinal`;
        const sharedRows =await query(sql);
        return sharedRows.map((r:{config:string})=>r['config']);
    }
    catch(x){
        l(chalk.redBright(x));
    }
}
export const fetchHistory = async ({
    threadid,
    username,

}: {
    threadid: number,
    username: string,

}) => {
    let query = await dbGetQuery("wt", threadid);
    /*
    SELECT `history`.`xid`,
    `history`.`username`,
    `history`.`time`,
    `history`.`to`,
    `history`.`greeting`,
    `history`.`occasion`,
    `history`.`image`,
    `history`.`gift`
     FROM `history`;
*/
    const sql = `SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username='${username}' order by time desc limit 1`;
    let rows = await query(`SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username=? order by time desc limit 1`, [username]);
    if (rows && rows.length > 0) {
        return rows[0]
    }
    return null;

}
// generate list of histories for a user with a given username, start position, page, page size
export const getHistories = async ({
    threadid,
    username,
    page,
    pagesize
}: {
    threadid: number,
    username: string,

    page: number,
    pagesize: number
}) => {
    const start = page * pagesize;
    let query = await dbGetQuery("wt", threadid);
    const sql = `SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username='${username}' order by time desc limit ${start},${pagesize}`;
    let rows = await query(`SELECT xid,username,time,\`to\`,greeting,occasion,image,gift from history where username=? order by time desc limit ?,?`, [username, start, pagesize]);
    l(chalk.greenBright("fetchHistories", sql, rows));
    if (rows && rows.length > 0) {
        return rows
    }
    return null;
}
// generate CRUD functions for history (read already done), use username, time, to as key, use upsert for create/update
export const upsertHistory = async ({
    threadid,
    username,
    time,
    to,
    greeting,
    occasion,
    image,
    gift
}: {
    threadid: number,
    username: string,
    time: number,
    to: string,
    greeting: string,
    occasion: string,
    image: string,
    gift: string
}) => {
    if (!time)
        time = microtime();
    let query = await dbGetQuery("wt", threadid);
    const sql = `
      INSERT INTO history (username, time, \`to\`, greeting, occasion, image, gift)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        time = VALUES(time),
        \`to\` = VALUES(\`to\`),
        greeting = VALUES(greeting),
        occasion = VALUES(occasion),
        image = VALUES(image),
        gift = VALUES(gift)
    `;
    const params = [username, time, to, greeting, occasion, image, gift];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("upsertHistory", filledSql));
}
export const deleteHistory = async ({
    threadid,
    username,
    time,
    to,

}: {
    threadid: number,
    username: string,
    time: number,
    to: string,

}) => {
    let query = await dbGetQuery("wt", threadid);
    const sql = `
        DELETE FROM history
        WHERE username = ?
        AND time = ?
        AND \`to\` = ?
    `;
    const params = [username, time, to];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("deleteHistory", filledSql));
}
export const recordEvent = async ({
    threadid,
    name,
    sessionid,
    params
}: {
    threadid: number,
    name: string,
    sessionid: string,
    params: string
}) => {
    try {
        console.log("PARSING PARAMS", params);
        let { fbclid, utm_content } = params.trim().indexOf('{"fbclid"') == 0 ? JSON.parse(params) : params;
        fbclid = ds(fbclid);
        utm_content = ds(utm_content);
        let sql, result;
        const millis = microtime();
        let query = await dbGetQuery("wt", threadid);
        sql = `INSERT INTO events (name,sessionid,params,millis,stamp) VALUES('${name}','${sessionid}','${params}','${millis}',now())`;
        let rows = await query(`INSERT INTO events (name,sessionid,params,millis,stamp,fbclid,ad) VALUES(?,?,?,?,now(),?,?)`, [name, sessionid, params, millis, fbclid, utm_content]);
        // l(chalk.greenBright("recordEvent", sql, rows));
        const old = millis - 10 * 24 * 3600 * 1000;
        sql = `DELETE FROM events where millis<${old}`;
        await query(`DELETE FROM events where millis<?`, [old]);
    } catch (e) {
        console.log(chalk.redBright("ERROR", e));
    }

}
export const searchCombo = async ({
    threadid,
    id,
    text,
}: {
    threadid: number,
    id: string,
    text: string,
}) => {

    let query = await dbGetQuery("wt", threadid);
    let sql = "", rows: any[] = [];
    if (id == "occasion") {
        if (!text) {
            sql = `SELECT DISTINCT name from default_occasions order by name`;
            rows = await query(sql);

        }
        else {
            sql = `SELECT name from default_occasions where name like ? order by name`;
            rows = await query(sql, [`%${text}%`]);
        }
    }

    // l(chalk.greenBright("searchCombo", sql, rows.map((row: any) => row['name'])));
    if (rows && rows.length > 0) {
        return rows.map((row: any) => row['name']);
    }
    return [];
}
export const recordSessionHistory = async ({
    threadid,
    greeting,
    sessionid,
    occasion,
    params
}: {
    threadid: number,
    greeting: string,
    sessionid: string,
    occasion: string,
    params: string
}) => {
    let sql, rows;
    const millis = microtime();
    let query = await dbGetQuery("wt", threadid);

    sql = `SELECT max(num) as num from session_history where sessionid=?`;
    rows = await query(sql, [sessionid]);
    let num = 0;
    if (rows && rows.length > 0) {
        num = rows[0]['num'];
    }
    num++;
    sql = `INSERT INTO session_history (greeting,sessionid,params,num,stamp) VALUES(?,?,?,?,now())`;
    await query(sql, [greeting, sessionid, params, num]);
    //l(chalk.redBright("recordSessionHistory", sql, rows));
    return num;
}

export const getSessionHistory = async ({
    threadid,
    num,
    sessionid,
}: {
    threadid: number,
    num: number,
    sessionid: string,
}) => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT greeting,params,stamp, max(num) as max from session_history where sessionid=? and num=?`;
    let rows = await query(sql, [sessionid, num]);
    const filledSql = fillInParams(sql, [sessionid, num]);
    l(chalk.greenBright("getSessionHistory", sessionid, num, filledSql, js(rows[0])));
    return rows[0];
}
export const deleteSessionHistories = async ({
    threadid,
    sessionid,
}: {
    threadid: number,
    sessionid: string,
}) => {
    let query = await dbGetQuery("wt", threadid);
    const sql = `
        DELETE FROM session_history
        WHERE sessionid = ?
    `;
    const params = [sessionid];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("deleteSessionHistories", filledSql));
}

export const checkSessionHistory = async ({
    threadid,
    sessionid,
    occasion,
}: {
    threadid: number,
    sessionid: string,
    occasion: string,
}) => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT greeting from session_history where sessionid=? and occasion=?`;
    let rows = await query(sql, [sessionid, occasion]);
    const filledSql = fillInParams(sql, [sessionid, occasion]);
    l(chalk.greenBright("checkSessionHistory", sessionid, occasion, filledSql, js(rows)));
    return rows;
}

export const recordSessionCard = async ({
    threadid,
    sessionid,
    card,
   
}: {
    threadid: number,
    sessionid:string,
    card:CardData,
   

}):Promise<{cardNum:number,linkid:string}> => {
    const { image,num,signature,greeting,metaimage} = card;
    const linkid=randomstring();
    l(chalk.yellowBright("recordSessionCard",sessionid,linkid,js(card),js(image)));
    //const {url:image_url,publicId:image_publicId,height:image_height,width:image_width,thumbnailUrl:image_thumbnailUrl,original_filename:image_original_filename} = image;
    const {url,publicId,height,width,thumbnailUrl,original_filename} = image;
    l(chalk.yellowBright("recordSessionCard2",{url,publicId,height,width,thumbnailUrl,original_filename}));
    let sql, rows;
    const millis = microtime();
    let query = await dbGetQuery("wt", threadid);
    let xid=0;
    sql=`SELECT xid from images where publicId=?`;
    rows = await query(sql, [publicId]);
    if(rows&&rows.length>0){
        xid=rows[0]['xid'];
    }
    else {
        sql=`INSERT INTO images (url,publicId,height,width,thumbnailUrl,original_filename) VALUES(?,?,?,?,?,?)`;
        const result=await query(sql, [url,publicId,height,width,thumbnailUrl,original_filename]);
        xid=result.insertId;
    }
    sql = `SELECT max(cardNum) as cardNum from session_cards where sessionid=?`;
    rows = await query(sql, [sessionid]);
    let cardNum = 0;
    if (rows && rows.length > 0) {
        cardNum = rows[0]['cardNum'];
    }
    cardNum++;
    sql = `INSERT INTO session_cards (sessionid,num,signature,stamp,cardNum,imageid,linkid,millis) VALUES(?,?,?,now(),?,?,?,?)`;
    await query(sql, [sessionid,num,signature,cardNum,xid,linkid,millis]);
    
    sql= `INSERT INTO cards (signature,greeting,stamp,imageid,linkid,millis,author_sessionid) VALUES(?,?,now(),?,?,?,?)`;
    await query(sql, [signature,greeting,xid,linkid,millis,sessionid]);
    
    sql= `INSERT INTO card_images (stamp,image,linkid,millis) VALUES(now(),?,?,?)`;
    await query(sql, [metaimage,linkid,millis,]);
    

    return {cardNum,linkid};
}

export const getSessionCards = async ({
    threadid,
    cardNum,
    sessionid,
}: {
    threadid: number,
    cardNum: number,
    sessionid: string,
}):Promise<CardData> => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT c.num,c.signature,c.stamp, max(c.cardNum) as cardMax,c.linkid,i.url ,i.publicId,i.height, i.width,i.thumbnailUrl, i.original_filename from session_cards c, images i where sessionid=? and c.imageid=i.xid and c.cardNum=?`;
    let rows = await query(sql, [sessionid, cardNum]);
    const filledSql = fillInParams(sql, [sessionid, cardNum]);
    l(chalk.greenBright("getSessionCards", sessionid, cardNum, filledSql, js(rows[0])));

    const image={url:rows[0]['url'],publicId:rows[0]['publicId'],height:rows[0]['height'],width:rows[0]['width'],thumbnailUrl:rows[0]['thumbnailUrl'],original_filename:rows[0]['original_filename']};
    const card={num:rows[0]['num'],signature:rows[0]['signature'],image,cardNum,cardMax:rows[0]['cardMax'],linkid:rows[0]['linkid']};
    card.image=image;
    return card;
}
export const deleteSessionCards = async ({
    threadid,
    sessionid,
}: {
    threadid: number,
    sessionid: string,
}) => {
    let query = await dbGetQuery("wt", threadid);
    const sql = `
        DELETE FROM session_cards
        WHERE sessionid = ?
    `;
    const params = [sessionid];
    await query(sql, params);
    const filledSql = fillInParams(sql, params);
    l(chalk.greenBright("deleteSessionCards", filledSql));
}
export const addSessionImage = async ({
    threadid,
    sessionid,
    image
}: {
    threadid: number,
    sessionid:string,
    image:ImageData

}):Promise<ImageData[]> => {
    const { url,publicId,height,width,thumbnailUrl,original_filename} = image;
;
    l(chalk.yellowBright("addSessionImage",sessionid,publicId,js(image)));
    //const {url:image_url,publicId:image_publicId,height:image_height,width:image_width,thumbnailUrl:image_thumbnailUrl,original_filename:image_original_filename} = image;
  
   // l(chalk.yellowBright("recordSessionCard2",{url,publicId,height,width,thumbnailUrl,original_filename}));
    let sql, rows;
   // const millis = microtime();
    let query = await dbGetQuery("wt", threadid);
    let xid=0;
    sql=`SELECT xid from images where publicId=?`;
    rows = await query(sql, [publicId]);
    if(rows&&rows.length>0){
        xid=rows[0]['xid'];
    }
    else {
        sql=`INSERT INTO images (url,publicId,height,width,thumbnailUrl,original_filename) VALUES(?,?,?,?,?,?)`;
        const result=await query(sql, [url,publicId,height,width,thumbnailUrl,original_filename]);
        xid=result.insertId;
    }
    sql = `SELECT max(ordinal) as maxOrdinal from session_images where sessionid=?`;
    rows = await query(sql, [sessionid]);
    let maxOrdinal = 0;
    if (rows && rows.length > 0) {
        maxOrdinal = rows[0]['maxOrdinal'];
    }
    maxOrdinal++;
    sql = `INSERT INTO session_images(sessionid,ordinal,imageid,stamp) VALUES(?,?,?,now())`;
    await query(sql, [sessionid,maxOrdinal,xid]);

    sql = `SELECT * from session_images si, images i where si.sessionid=? and si.imageid=i.xid order by  si.ordinal desc`;
    rows=await query(sql, [sessionid]);

    return rows;
}
export const fetchSessionImages = async ({
    threadid,
    sessionid,
   
}: {
    threadid: number,
    sessionid:string,
   
}):Promise<ImageData[]> => {
    let sql, rows;
   // const millis = microtime();
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT * from session_images si, images i where si.sessionid=? and si.imageid=i.xid order by  si.ordinal desc`;
    rows=await query(sql, [sessionid]);
    return rows;
}
export const deleteSessionImages = async ({
    threadid,
    sessionid,
   
}: {
    threadid: number,
    sessionid:string,
   
}):Promise<void> => {
    let sql, rows;
   // const millis = microtime();
    let query = await dbGetQuery("wt", threadid);
    sql = `DELETE from session_images  where sessionid=?`;
    await query(sql, [sessionid]);
}


export const getSharedCard = async ({
    threadid,
    id,
    sessionid,
}: {
    threadid: number,
    id: string,
    sessionid: string,
}):Promise<CardData> => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT c.greeting,c.signature,c.stamp,c.linkid,i.url ,i.publicId,i.height, i.width,i.thumbnailUrl, i.original_filename from cards c, images i where c.linkid=? and c.imageid=i.xid`;
    let rows = await query(sql, [id]);
    const filledSql = fillInParams(sql, [id]);
    l(chalk.greenBright("getSharedCard", sessionid, id, filledSql, js(rows[0])));

    const image={url:rows[0]['url'],publicId:rows[0]['publicId'],height:rows[0]['height'],width:rows[0]['width'],thumbnailUrl:rows[0]['thumbnailUrl'],original_filename:rows[0]['original_filename']};
    const card={greeting:rows[0]['greeting'],signature:rows[0]['signature'],image,linkid:rows[0]['linkid']};
    card.image=image;
    return card;
}

export const getMetaimage = async ({
    threadid,
    linkid,
}: {
    threadid: number,
    linkid: string,
    
}):Promise<string> => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    sql = `SELECT image from card_images where linkid=?`;
    let rows = await query(sql, [linkid]);
    const filledSql = fillInParams(sql, [linkid]);
    l(chalk.blueBright("getMetaimage",linkid, filledSql, js(rows[0])));
    return rows[0]['image'];
}

interface ReportItem{
    name:string,
    params:string,
    fbclid:string,
    ad:string,
    stamp:string
}

export const reportEvents = async ({
    threadid,
}: {
    threadid: number,
    
}):Promise<any> => {
    let sql, result;
    let query = await dbGetQuery("wt", threadid);
    const millis=microtime();
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

    sql = `select distinct sid from wt.events where sessionid like '%PROD%' and millis>? order by millis desc`;
    let rows = await query(sql, [millis-24*3600*1000]);
    l(chalk.yellow(sql))
    const filledSql = fillInParams(sql, [millis-24*3600*1000]);
    l(chalk.blueBright("reportEvents", filledSql, js(rows)));
    let retval:any={};
    for(let i=0;i<rows.length;i++){
        const sessionid=rows[i]['sid'];
        let itemRetval:any={};
        itemRetval.sessionid=sessionid;
        retval[sessionid]=itemRetval;
        itemRetval.items=[];
        const filledSql = fillInParams(sql, [sessionid]);
        sql = `select distinct name,params,fbclid,ad,stamp  from wt.events where sid =? order by millis desc`;
        let rows2 = await query(sql, [sessionid]);
       // l(js(rows2));
        for(let j=0;j<rows2.length;j++){
        let record:any={}
        const name=rows2[j]['name'];
        let constRecord=false;
        record['fbclid']=rows2[j]['fbclid'];
        record['ad']=rows2[j]['ad'];
        record['stamp']=rows2[j]['stamp'];
        switch(name){
            case 'stripClickHandler':
                record['name']='stripClick';
                record['image']=rows2[j]['params'];
                constRecord=true;
                break;
            case 'generate':{
                record['name']='generate-text';
                const params=JSON.parse(rows2[j]['params']);
                record['occasion']=params['occasion'];
                record['naive']=params['naive'];
                constRecord=true;
                break;
            }
            case 'create-card':{
                const id=rows2[j]['params'];
                sql=`select * from cards where linkid=?`;
                break;
            }
            case 'createChatCompletion' : {
                record['name']='text-completion';
                const params=rows2[j]['params'];
                l(chalk.red.bold("params",params)   );
                const completion=params?.split('===>Completion:')[1]; 
                l(chalk.green.bold("completion",completion)   );
                record['text']=completion;
                constRecord=true;
                break;
            }
            case 'ssr-bot-landing-init':
            case 'ssr-bot-card-init':
            case 'ssr-card-init':
            case 'ssr-index-init':
            case 'ssr-landing-init':
                record['name']=rows2[j]['name'];
                l(chalk.grey("params",rows2[j]['params'])   );
               // const params=JSON.parse(rows2[j]['params']);
                record['params']=rows2[j]['params'];
                constRecord=true;
                break;
            }
            if(constRecord){
                itemRetval.items.push(record);
                l(chalk.yellowBright("reportEventsInner", filledSql, js(record)));  
            } 
            
        }
    }
    l(chalk.greenBright("retval",js(retval)));
    return retval;
}