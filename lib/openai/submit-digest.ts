import { l, chalk, js, sleep } from "../common";
import digest from "./digest";
import { getRedisClient } from "../redis";
const pushOutputQwiket = async ({
    input,
}: { input: any }) => {
    const username = 'digest';
    let { qwiket, silo, primaryTag, now } = input
    let { url, shared_time } = qwiket
    let result
    l("pushOutputQwiket", qwiket)

    l("qwiket stage 3", qwiket)
    qwiket.accepted = 1

    qwiket.s_un = username
    qwiket.date = qwiket.shared_time
    qwiket.sort = qwiket.shared_time
    qwiket.primary = 1
    l(chalk.yellow.bold("SILO 5 PUSHING", js(qwiket)))
    const redis = await getRedisClient({});


    try {

        l('redis.lpush', js(qwiket))
        await redis?.lpush(
            `items_output`,
            js(qwiket)
        )
        l(chalk.greenBright("adter lpush"));

    } catch (x) {
        l(chalk.red.bold("CATCH18", x))
    }
    finally {
        redis?.quit();

    }
}


function padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
}

function formatDate(date: Date) {
    let hours = date.getHours();
    let minutes = date.getMinutes()
    if (minutes > 15 && minutes < 45)
        minutes = 30
    if (minutes > 45) {
        hours += 1
        minutes = 0
    }
    if (minutes < 15)
        minutes = 0
    let day = date.getDate();
    if(hours>23){
        hours = 0
        day += 1
    }
    let month=date.getMonth() + 1;



    return (
        [
            date.getFullYear(),
            padTo2Digits(month),
            padTo2Digits(day),
        ].join('-') +
        ' ' +
        [
            padTo2Digits(hours),
            padTo2Digits(minutes),
            padTo2Digits(date.getSeconds()),
            
        ].join(':')
    );
}
export default async ({ newsline, minutes }: { newsline: string, minutes: number }) => {
    //produce a 30 min digest
    const url = `https://dev-lake-api.qwiket.com/api/v1/openai/digest?newsline=rss-qwiket&minutes=${minutes}`;
    var currentdate = new Date();
    let now = Math.floor(Date.now() / 1000);
    /* 
       var datetime = "CDT: " + (currentdate.getMonth() + 1) + "/"
           + (currentdate.getDate()) + "/"
           + currentdate.getFullYear() + " @ "
           + currentdate.getHours() - 5 + ":"
           + currentdate.getMinutes()
       console.log("datetime", datetime)")    */
    //get current date and time formatted
    const datetime =currentdate.toLocaleString('en-US', { timeZone: 'America/Chicago' })// formatDate(new Date());
    console.log("datetime", datetime)

    var randomstring = () => Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 3);

    const ret = await digest(newsline, minutes)
    l('RETURN', js(ret))
    if (!ret.success)
        return ret;
    const json = ret.json;
    const body = { blocks: [{ blockType: 'digest', json }] }
    const qwiket = {
        description: json.summary,
        body,
        title: `Real-Time News Digest for ${datetime}`,
        site_name: `America First News`,
        author: `ai.Q`,
        published_time: now,
        date: now,
        updated_time: now,
        category_xid: 293,
        reshare: 100,
        entity: 'qwiket',
        url: randomstring(),
        shared_time: now,
        tag: 'fq',
        image: `https://ucarecdn.com/3c651be1-e394-45e2-8817-af706f77df8d/`
    }
    l('call pushOutputQwiket')
    await pushOutputQwiket({

        input: { qwiket, silo: 5, primaryTag: 'fq' },
    })
    return { success: true, qwiket }
}
