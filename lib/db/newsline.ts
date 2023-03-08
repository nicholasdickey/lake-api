//./lib/db/newsline.ts
import { l, chalk,  js } from "../common";
import { dbGetQuery } from "../db";
import { Newsline, NewslineDefinition, Tag, Publications, TagDefinition } from "../types/newsline"

export const getNewslineDefaultTags = async ({
    threadid,
    newsline
}: {
    threadid: number,
    newsline: string
}): Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag, c.text as name, c.icon, d.description from pov_v30_newsline_default_tags n 
    INNER JOIN pov_categories c  on c.shortname=n.tag 
    LEFT OUTER JOIN pov_v30_publications d on d.tag=n.tag   and d.newsline=n.newsline
    where n.newsline='${newsline}' order by c.text`;

    rows = await query(`SELECT n.tag, c.text as name, c.icon, d.description from pov_v30_newsline_default_tags n 
    INNER JOIN pov_categories c on c.shortname=n.tag 
    LEFT OUTER JOIN pov_v30_publications d on d.tag=n.tag and d.newsline=n.newsline
    where n.newsline=? order by c.text`, [newsline]);

    return rows;
}

export const getUserTags = async ({
    type,
    threadid,
    key
}: {
    type: string,
    threadid: number,
    key: string
}) => {
    const table = `pov_v30_${type}_tags`;
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT tag,switch as switchParam from ${table} where \`key\`='${key}' `;
    rows = await query(`SELECT tag,switch as switchParam from ${table} where \`key\`=?`, [key]); 
    return rows;
}

export const getUserNewslineTags = async ({
    threadid,
    key
}: {
    threadid: number,
    key: string
}): Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_user_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key='${key}' order by c.text`;
    rows = await query(`SELECT n.tag,n.switch,c.text as name , c.icon from pov_v30_user_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key=? order by c.text`, [key]);  
    return rows;
}

export const getSessionNewslineTags = async ({
    threadid,
    key
}: {
    threadid: number,
    key: string
}): Promise<NewslineDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
 
    sql = `SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_session_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key='${key}' order by c.text`;
    rows = await query(`SELECT n.tag,n.switch,c.text as name, c.icon from pov_v30_session_tags n INNER JOIN pov_categories c ON c.shortname=n.tag  where n.key=? order by c.text`, [key]); 
    return rows;
}

export const getNewslinePublications = async ({
    threadid,
    newsline,
    filters,
    q
}: {
    threadid: number,
    newsline: string,
    filters?: string[],
    q?: string
}): Promise<Publications> => {
    let sql, rows;
  
    let inStr = "('" + filters?.join("','") + "')";
  
    let query = await dbGetQuery("povdb", threadid);
    if (filters && filters.length > 0 && !q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr} and c.newsline='${newsline}' and p.category_tag=c.tag and p.newsline='${newsline}'  order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr} and c.newsline=? and p.category_tag=c.tag and p.newsline=? order by cc.text asc `, [newsline, newsline]);
    }
    else if (filters && filters.length > 0 && q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description,c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr} and c.newsline='${newsline}' and p.category_tag=c.tag and p.newsline='${newsline}' and c.text like '%${q}%' order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.tag in ${inStr} and c.newsline=? and p.category_tag=c.tag and p.newsline=? and cc.text like '%${q}%' order by cc.text asc `, [newsline, newsline]);
    }
    else if ((!filters || !filters.length) && q) {
        sql = `SELECT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline='${newsline}'  and p.category_tag=c.tag and p.newsline='${newsline}' and p.name like '%${q}%'order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT cc.text as name, cc.icon, p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline=?  and p.category_tag=c.tag and p.newsline=? and p.name like '%${q}%' order by cc.text asc `, [newsline, newsline]);
    }
    else {
        sql = `SELECT DISTINCT cc.text as name, cc.icon,p.tag, p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag and c.newsline='${newsline}'  and p.category_tag=c.tag and p.newsline='${newsline}'  order by cc.text asc `;
        l(chalk.green(sql))
        rows = await query(`SELECT DISTINCT cc.text as name, cc.icon,p.tag,p.description, c.tag as category_tag, c.name as category_name from pov_v30_publications p, pov_v30_publication_categories c,pov_categories cc where cc.shortname=p.tag  and c.newsline=?  and p.category_tag=c.tag and p.newsline=? order by cc.text asc `, [newsline, newsline]);
    } 
    return rows;
}

export const updateUserNewsline = async ({
    type,
    threadid,
    sessionid,
    userslug,
    key,
    switchParam,
    tag,
    newsline,
}: {
    type: string,
    threadid: number,
    sessionid?: string,
    userslug?: string,
    key: string,
    switchParam: 'on' | 'off',
    tag: Tag,
    newsline: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    const table = `pov_v30_${type}_tags`;

    sql = `SELECT xid from pov_v30_newsline_default_tags where newsline='${newsline}' and tag='${tag}'`;
    rows = await query(`SELECT xid from pov_v30_newsline_default_tags where newsline=? and tag=?`, [newsline, tag])
    const isDefault = rows && rows.length;

    sql = `SELECT xid from ${table} where \`key\`='${key}' and tag='${tag}'`;
    rows = await query(`SELECT xid from ${table} where \`key\`=? and tag=?`, [key, tag])
    if (rows && rows.length > 0) {
        if (switchParam == 'off' && !isDefault || switchParam == 'on' && isDefault) {
            sql = `DELETE from  ${table} where \`key\`='${key}' and tag='${tag}'`;
            rows = await query(`DELETE from ${table}  where \`key\`=? and tag=?`, [key, tag])
        }
        else {
            sql = `UPDATE ${table} set \`switch\`='${switchParam}' where \`key\`='${key}' and tag='${tag}'`;
            rows = await query(`UPDATE ${table} set \`switch\`=? where \`key\`=? and tag=?`, [switchParam, key, tag])
        }
    }
    else {
        if (type == 'session') {
            sql = `INSERT into ${table} (sessionid,\`key\`,\`switch\`,tag) VALUES ('${sessionid}','${key}','${switchParam}','${tag}')`;
            rows = await query(`INSERT into ${table} (sessionid,\`key\`,\`switch\`,tag) VALUES (?,?,?,?)`, [sessionid, key, switchParam, tag])
        }
        else {
            sql = `INSERT into ${table} (userslug,\`key\`,\`switch\`,tag) VALUES ('${userslug}','${key}','${switchParam}','${tag}')`;
            rows = await query(`INSERT into ${table} (userslug,\`key\`,\`switch\`,tag) VALUES (?,?,?,?)`, [userslug, key, switchParam, tag])
        }
    }
}

export const updateDefaultNewsline = async ({
    threadid,
    newsline,
    defaultNewsline
}: {
    threadid: number,
    newsline: string,
    defaultNewsline: Newsline

}) => {
    let sql;
    let query = await dbGetQuery("povdb", threadid);

    sql = `DELETE  from pov_v30_newsline_default_tags where newsline='${newsline}' limit 1000;`;
    await query(`DELETE  from pov_v30_newsline_default_tags where newsline=? limit 1000;`, [newsline]);
    defaultNewsline.forEach(async (tag: Tag) => {
        sql = `INSERT into pov_v30_newsline_default_tags (newsline,tag) VALUES ('${newsline}','${tag}') `;
        await query(`INSERT into pov_v30_newsline_default_tags (newsline,tag) VALUES (?,?}')`, [newsline, tag]);
    })
}

export const getTagDefinition = async ({
    threadid,
    tag
}: {
    threadid: number,
    tag: string
}): Promise<TagDefinition> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT shortname as tag, text as name, icon, description from pov_categories where shortname='${tag}'`;
    rows = await query(`SELECT shortname as tag, text as name, icon, description from pov_categories where shortname=?`, [tag]);
    return rows[0];
}

export const getNewslinePublicationCategories = async ({
    threadid,
    newsline
}: {
    threadid: number,
    newsline: string
}): Promise<string[]> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
 
    sql = `SELECT name,tag from  pov_v30_publication_categories where newsline='${newsline}' order by xid`;
    rows = await query(`SELECT name,tag from  pov_v30_publication_categories where newsline=? order by xid`, [newsline]);
    return rows;
}

export const getPublicationNewslines= async ({
    threadid,
    tag
}: {
    threadid: number,
    tag: string
}): Promise<Array<{newsline:string}>> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT DISTINCT newsline from  pov_v30_publications where tag='${tag}'`;
    rows = await query(`SELECT DISTINCT newsline from  pov_v30_publications where tag=? `, [tag]);
    return rows;
}

export const getNewslineForumAndDomain= async ({
    threadid,
    newsline
}: {
    threadid: number,
    newsline: string
}): Promise<{domain:string,forum:string}|null> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT domain,forum from  pov_v30_forums where channel='${newsline}' `;
    rows = await query(`SELECT domain,forum from  pov_v30_forums where channel=?`, [newsline]);
    return rows&&rows.length>0?rows[0]:null;
}