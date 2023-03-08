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

function logEnter(name:string, url:string) {
    const threadid = Math.floor(Math.random() * 10000);
    const t1 = microtime();
    l(chalk.blue(`QAPI ENTER ${name}(${threadid})`), { url });
    return { threadid, t1, name };
}

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function quoteFields(object:any) {
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

const ds = (s:string) => s || "";

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
};
