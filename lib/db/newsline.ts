import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
import {Newsline,NewslineDefinition,Tag,Publications,TagDefinition} from "../types/newsline"

export const getNewslineDefaultTags = async ({
    threadid,
    newsline
}: {
    threadid: number,
    newsline: string
}):Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag, c.text as name, c.icon, d.description from pov_v30_newsline_default_tags n INNER JOIN pov_categories c  on c.shortname=n.tag INNER JOIN pov_v30_publications d on d.tag=n.tag  where n.newsline='${newsline}' order by c.text`;
    rows = await query(`SELECT n.tag, c.text as name, c.icon, d.description from pov_v30_newsline_default_tags n INNER JOIN pov_categories c on c.shortname=n.tag INNER JOIN pov_v30_publications d on d.tag=n.tag where n.newsline=? order by c.text`, [newsline]);
    l(chalk.green(sql,rows))
    return rows;
}
export const getUserNewslineTags = async ({
    threadid,  
    key
}: {
    threadid: number,
    key: string
}):Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_user_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key='${key}' order by c.text`;
    rows = await query(`SELECT n.tag,n.switch,c.text as name , c.icon from pov_v30_user_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key=? order by c.text`, [key]);
    l(chalk.green(sql,rows))
    return rows;
}
export const getSessionNewslineTags = async ({
    threadid,  
    key
}: {
    threadid: number,
    key: string
}):Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_session_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key='${key}' order by c.text`;
    rows = await query(`SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_session_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key=? order by c.text`, [key]);
    l(chalk.green(sql,rows))
    return rows;
}

export const getNewslinePublications = async ({
    threadid,
    newsline,
    filter,
    q
}: {
    threadid: number,
    newsline: string,
    filter?: string[],
    q?: string
}):Promise<Publications> => {
    let sql, rows;
    /// l("fetchSubroots");
    let inStr = "('"+filter?.join("','")+"')";
    console.log("insStr",inStr)
    let query = await dbGetQuery("povdb", threadid);
    if (filter&&filter.length>0 && !q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr}'and c.newsline='${newsline}' and p.category_tag=c.tag and p.newsline='${newsline}'  order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr} and c.newsline=? and p.category_tag=c.tag and p.newsline=? order by cc.text asc `, [newsline, newsline]);
    }
    else  if(filter&&filter.length>0 &&q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description,c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in '${inStr}' and c.newsline='${newsline}' and p.category_tag=c.tag and p.newsline='${newsline}' and c.text like '%${q}%'order by cc.text asc `;
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in '${inStr}' and c.newsline=? and p.category_tag=c.tag and p.newsline=? and cc.text like '%${q}%' order by cc.text asc `, [newsline, newsline]);
    }
    else if((!filter||!filter.length) && q){
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline='${newsline}'  and p.category_tag=c.tag and p.newsline='${newsline}' and p.name like '%${q}%'order by cc.text asc `;
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline=?  and p.category_tag=c.tag and p.newsline=? and p.name like '%${q}%' order by cc.text asc `, [newsline, newsline]);
    }
    else {
        sql = `SELECT DISTINCT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline='${newsline}'  and p.category_tag=c.tag and p.newsline='${newsline}'  order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT DISTINCT cc.text as name, cc.icon,p.tag,p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag  and c.newsline=?  and p.category_tag=c.tag and p.newsline=? order by cc.text asc `, [newsline, newsline]);
    }
    l(chalk.green(sql, rows))
    return rows;
}
export const updateSessionNewsline = async ({
    threadid,
    sessionid,
    key,
    switchParam,
    tag
}: {
    threadid: number,
    sessionid:string,
    key: string,
    switchParam:'on'|'off',
    tag:Tag
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
     
    sql=`SELECT xid from pov_v30_session_tags where key='${key}'`;
    rows=await query (`SELECT xid from pov_v30_session_tags where key=?`,[key])
    l(chalk.green(sql,rows))
    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_session_tags set \`switch\`='${switchParam}' where key='${key}'`;
        rows=await query(`UPDATE pov_v30_session_tags set \`switch\`=? where key=?`,[switchParam,key])
        l(chalk.green(sql,rows))
    }
    else {
        sql=`INSERT into pov_v30_session_tags (sessionid,key,\`switch\`,tag) VALUES ('${sessionid}','${key}','${switchParam}','${tag}')`;
        rows=await query(`INSERT into pov_v30_session_tags (sessionid,key,\`switch\`,tag) VALUES (?,?,?,?)`,[sessionid,key,switchParam,tag])
        l(chalk.green(sql,rows))
    }  
}

export const updateUserNewsline = async ({
    threadid,
    userslug,
    key,
    switchParam,
    tag
}: {
    threadid: number,
    userslug:string,
    key: string,
    switchParam:'on'|'off',
    tag:Tag
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
     
    sql=`SELECT xid from pov_v30_user_tags where key='${key}'`;
    rows=await query (`SELECT xid from pov_v30_user_tags where key=?`,[key])
    l(chalk.green(sql,rows))
    if(rows&&rows.length>0){
        sql=`UPDATE pov_v30_user_tags set \`switch\`='${switchParam}' where key='${key}'`;
        rows=await query(`UPDATE pov_v30_user_tags set \`switch\`=? where key=?`,[switchParam,key])
        l(chalk.green(sql,rows))
    }
    else {
        sql=`INSERT into pov_v30_user_tags (userslug,key,\`switch\`,tag) VALUES ('${userslug}','${key}','${switchParam}','${tag}')`;
        rows=await query(`INSERT into pov_v30_user_tags (userslug,key,\`switch\`,tag) VALUES (?,?,?,?)`,[userslug,key,switchParam,tag])
        l(chalk.green(sql,rows))
    }  
}

export const updateDefaultNewsline = async ({
    threadid,
    newsline,
    defaultNewsline
}: {
    threadid: number,
    newsline: string,
    defaultNewsline:Newsline

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `DELETE  from pov_v30_newsline_default_tags where newsline='${newsline}' limit 1000;`;
    await query(`DELETE  from pov_v30_newsline_default_tags where newsline=? limit 1000;`, [newsline]);
    defaultNewsline.forEach(async (tag:Tag)=>{
        sql = `INSERT into pov_v30_newsline_default_tags (newsline,tag) VALUES ('${newsline}','${tag}') `;
        await query(`INSERT into pov_v30_newsline_default_tags (newsline,tag) VALUES (?,?}')`, [newsline,tag]);
        l(chalk.green(sql));
    })
}
export const getTagDefinition = async ({
    threadid,  
    tag
}: {
    threadid: number,
    tag: string
}):Promise<TagDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT shortname as tag, text as name, icon, description from pov_categories where shortname='${tag}'`;
    rows = await query(`SELECT shortname as tag, text as name, icon, description from pov_categories where shortname=?'`, [tag]);
    l(chalk.green(sql,rows[0]))
    return rows[0];
}
export const getNewslinePublicationCategories = async ({
    threadid,  
    newsline
}: {
    threadid: number,
    newsline: string
}):Promise<string[]> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    l("PublicationCategories",newsline);
    sql = `SELECT name,tag from  pov_v30_publication_categories where newsline='${newsline}' order by xid`;
    l(chalk.green(sql))
    rows = await query(`SELECT name,tag from  pov_v30_publication_categories where newsline=? order by xid`, [newsline]);
    l(chalk.green(sql,rows))
    return rows;
}
