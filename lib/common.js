
import chalk from "chalk";
chalk.enabled = true;
let lg = false;

const allowLog = () => (lg = true);
const l = (...args) => {
    if (lg) {
        console.log(...args);
    }
};
const js = o => JSON.stringify(o);
const microtime = () => Math.abs(new Date().getTime());
const apiUrl =
    "http://" +
    process.env.API_HOST_PRIMARY +
    ":" +
    process.env.API_PORT_PRIMARY;

function logTime({ t1, threadid, name }) {
    const t2 = microtime(true);
    l(chalk.green(`QAPI RETURN ${name}(${threadid}):${t2 - t1} ms`));
}

function logEnter(name, url) {
    const threadid = Math.floor(Math.random() * 10000);
    const t1 = microtime(true);
    l(chalk.blue(`QAPI ENTER ${name}(${threadid})`), { url });
    return { threadid, t1, name };
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function quoteFields(object) {
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
const ds = s => s || "";

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
