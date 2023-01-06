import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
import {Newsline,NewslineDefinition,Tag,Publications} from "../types/newsline"

export const getNewslineDefaultTags = async ({
    threadid,
    newsline
}: {
    threadid: number,
    newsline: string
}):Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag, c.text as name, c.icon from pov_v30_newsline_default_tags n INNER JOIN pov_categories c on c.shortname=n.tag  where n.newsline='${newsline}' order by c.text`;
    rows = await query(`SELECT n.tag, c.text, c.icon as name from pov_v30_newsline_default_tags n INNER JOIN pov_categories c on c.shortname=n.tag  where n.newsline=? order by c.text`, [newsline]);
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
    let inStr = filter?.join(',')
    let query = await dbGetQuery("povdb", threadid);
    if (filter && !q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in '${inStr}' and c.newsline='${newsline}' and p.newsline='${newsline}'  order by p.name asc `;
        rows = await query(`SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in '${inStr}' and c.newsline=? and p.newsline=? order by p.name asc `, [newsline, newsline]);
    }
    else  if(filter &&q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description,c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in '${inStr}' and c.newsline='${newsline}' and p.newsline='${newsline}' and p.name like '%${q}%'order by p.name asc `;
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag c.tag in '${inStr}' and c.newsline=? and p.newsline=? and p.name like '%${q}%' order by p.name asc `, [newsline, newsline]);
    }
    else if(!filter && q){
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag c.newsline='${newsline}' and p.newsline='${newsline}' and p.name like '%${q}%'order by p.name asc `;
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag c.newsline=? and p.newsline=? and p.name like '%${q}%' order by p.name asc `, [newsline, newsline]);
    }
    else {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag c.newsline='${newsline}' and p.newsline='${newsline}'  order by p.name asc `;
        rows = await query(`SELECT cc.text as name, cc.icon,p.tag,p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag  c.newsline=? and p.newsline=? order by p.name asc `, [newsline, newsline]);
    }
    l(chalk.green(sql, rows))
    return rows;
}
export const updateSessionNewsline = async ({
    threadid,
    key,
    action,
    tag
}: {
    threadid: number,
    key: string,
    action:string,
    tag:Tag
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT definition from pov_v30_session_newsline where slug='${key}'`;
    rows = await query(`SELECT definition from pov_v30_session_newsline where slug=?`, [key]);
    l(chalk.green(sql,rows[0]))
    let currentNewslineRaw= rows[0]['definition'];
    const currentNewsline=JSON.parse(currentNewslineRaw);
    if(action=='add')
    currentNewsline.push(tag);
    currentNewslineRaw=JSON.stringify(currentNewsline);
    sql = `UPDATE pov_v30_session_newsline set definition='${currentNewslineRaw}' where slug='${key}'`;
    await query(`UPDATE pov_v30_session_newsline set definition=? where slug=?`, [currentNewslineRaw,key]);
    sql = `SELECT definition from pov_v30_session_newsline where slug='${key}'`;
    rows = await query(`SELECT definition from pov_v30_session_newsline where slug=?`, [key]);
    l(chalk.green(sql,rows[0]))
    return rows[0]['definition'];
}

export const updateUserNewsline = async ({
    threadid,
    key,
    action,
    tag
}: {
    threadid: number,
    key: string,
    action:string,
    tag:Tag
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT definition from pov_v30_user_newsline where slug='${key}'`;
    rows = await query(`SELECT definition from pov_v30_user_newsline where slug=?`, [key]);
    l(chalk.green(sql,rows[0]))
    let currentNewslineRaw= rows[0]['definition'];
    const currentNewsline=JSON.parse(currentNewslineRaw);
    if(action=='add')
    currentNewsline.push(tag);
    currentNewslineRaw=JSON.stringify(currentNewsline);
    sql = `UPDATE pov_v30_user_newsline set definition='${currentNewslineRaw}' where slug='${key}'`;
    await query(`UPDATE pov_v30_user_newsline set definition=? where slug=?`, [currentNewslineRaw,key]);
    sql = `SELECT definition from pov_v30_user_newsline where slug='${key}'`;
    rows = await query(`SELECT definition from pov_v30_usern_newsline where slug=?`, [key]);
    l(chalk.green(sql,rows[0]))
    return rows[0]['definition'];
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