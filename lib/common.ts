//./lib.common.ts
import chalk from "chalk";

let lg = false;

const allowLog = () => (lg = true);
//@ts-ignore
const l = (...args) => {
    if (lg) {
        console.log(...args);
    }
};
//@ts-ignore
const js = o => JSON.stringify(o);
const microtime = () => Math.abs(new Date().getTime());
const apiUrl =
    "http://" +
    process.env.API_HOST_PRIMARY +
    ":" +
    process.env.API_PORT_PRIMARY;
//@ts-ignore
function logTime({ t1, threadid, name }) {
    //@ts-ignore
    const t2 = microtime();
    l(chalk.green(`QAPI RETURN ${name}(${threadid}):${t2 - t1} ms`));
}

function logEnter(name: string, url: string) {
    const threadid = Math.floor(Math.random() * 10000);
    const t1 = microtime();
    l(chalk.blue(`QAPI ENTER ${name}(${threadid})`), { url });
    return { threadid, t1, name };
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function quoteFields(object: any) {
    let keys = Object.keys(object);
    keys.forEach(key => {
        let value = object[key];
        if (!value && value !== 0) {
            value = `""`;
            object[key] = value;
        }
    });
    return object;
}

const ds = (s: string) => s || "";
const fillInParams = (sql: string, params: any[]) => {
    let filledSql = sql;
    params.forEach((param, index) => {
        const paramPlaceholder = `?${index + 1}`;
        filledSql = filledSql.replace(paramPlaceholder, stringifyParam(param));
    });
    return filledSql;
}

const stringifyParam = (param: any) => {
    if (typeof param === 'string') {
        return `'${param}'`;
    }
    return param;
}
const randomstring = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
function uxToMySql(unixTime: number): string {
    const date = new Date(unixTime * 1000); // Convert seconds to milliseconds
    return date.toISOString().slice(0, 19).replace('T', ' ');
}
function slugify(s:string) {
    const a =
        "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;"
    const b =
        "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------"
    const p = new RegExp(a.split("").join("|"), "g")

    return s
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, "-and-") // Replace & with 'and'
        .replace(/[^\w\-]+/g, "") // Remove all non-word characters
        .replace(/\-\-+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start of text
        .replace(/-+$/, "") // Trim - from end of text
}
export {
    l,
    allowLog,
    chalk,
    microtime,
    apiUrl,
    logTime,
    logEnter,
    sleep,
    quoteFields,
    js,
    ds,
    fillInParams,
    randomstring,
    uxToMySql,
    slugify
};
