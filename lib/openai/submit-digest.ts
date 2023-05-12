import { l, chalk, js, sleep } from "../common";
import digest from "./digest";
import { getRedisClient } from "../redis";
import { min } from "date-fns";
import generateLabel from "./generate-label";
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


/**
 * Images:    0: https://ucarecdn.com/3ef02855-4207-4632-8875-7216dd2f5d5a/am1clock0.png
 *         0-30: https://ucarecdn.com/9208c360-4917-4db9-846e-ba95efc43032/am1clock030.png
 *            1: https://ucarecdn.com/db753312-f036-4f15-baee-b93a9bde76a9/am1clock1.png
 *         1:30: https://ucarecdn.com/74ceed01-f6ca-4923-ade6-6e947bd3b8c6/am1clock130.png
 *            2: https://ucarecdn.com/2b2567ac-e5ea-4c70-9aac-957b8aeaebb8/am1clock2.png
 *         2:30: https://ucarecdn.com/389a31d5-36ac-4455-8edb-63a097c17fda/am1clock230.png
 *            3: https://ucarecdn.com/fdda6172-78a1-45c9-8fb9-280ab3eb72a1/am1clock3.png
 *         3:30: https://ucarecdn.com/0dff9a8c-edfc-434c-b99a-6031258d2f0a/am1clock330.png
 *            4: https://ucarecdn.com/6c63b16a-be13-44dd-8ff0-2e8076c10cc2/am1clock4.png
 *         4:30: https://ucarecdn.com/f0608de6-8880-451e-8167-d590648582e9/am1clock430.png
 *            5: https://ucarecdn.com/e6277f3c-dd6e-4df6-a28c-78691710c9c6/am1clock5.png
 *         5:30: https://ucarecdn.com/92f2dea6-b4bb-4651-b278-18b6650fb79a/am1clock530.png
 *            6: https://ucarecdn.com/465e6b20-5043-4bc3-855c-3974210f91ca/am1clock6.png
 *         6:30: https://ucarecdn.com/0a5e3c5f-4e51-4c9c-b878-d80d707b1aad/am1clock630.png
 *            7: https://ucarecdn.com/a14f1e49-5ed9-447a-a7a4-0659bc87b1c7/am1clock7.png
 *         7:30: https://ucarecdn.com/6dce4f60-b1e5-4e3f-8e16-3f5b9a891837/am1clock730.png
 *            8: https://ucarecdn.com/0c99474d-9f17-42c3-9df4-23faa5563efd/am1clock8.png
 *         8:30: https://ucarecdn.com/103bdcc7-a526-445a-9625-a6ab23886a95/am1clock830.png
 *            9: https://ucarecdn.com/d885a101-5939-4f5d-a53f-86df79cdba6e/am1clock9.png
 *         9:30: https://ucarecdn.com/0e4eae0c-09f8-437e-9162-cc415dc4b6c8/am1clock930.png
 *           10: https://ucarecdn.com/e0b7dfee-3b3f-4694-996b-03f4b49864a6/am1clock10.png
 *        10:30: https://ucarecdn.com/a2fd9401-c4fe-4f1c-8b46-b2aea88558e1/am1clock1030.png
 *           11: https://ucarecdn.com/4f3be0b7-d903-49e6-99a5-3e4800ead17e/am1clock11.png
 *        11:30: https://ucarecdn.com/163188aa-9ca0-4020-8b75-261b6f08c1e3/am1clock1130.png
 * 
 */
const hourImages={
    "0": 'https://ucarecdn.com/3ef02855-4207-4632-8875-7216dd2f5d5a/am1clock0.png',
    "30": 'https://ucarecdn.com/9208c360-4917-4db9-846e-ba95efc43032/am1clock030.png',
    "100": 'https://ucarecdn.com/db753312-f036-4f15-baee-b93a9bde76a9/am1clock1.png',
    "130": 'https://ucarecdn.com/74ceed01-f6ca-4923-ade6-6e947bd3b8c6/am1clock130.png',
    "200": 'https://ucarecdn.com/2b2567ac-e5ea-4c70-9aac-957b8aeaebb8/am1clock2.png',
    "230": 'https://ucarecdn.com/389a31d5-36ac-4455-8edb-63a097c17fda/am1clock230.png',
    "300": 'https://ucarecdn.com/fdda6172-78a1-45c9-8fb9-280ab3eb72a1/am1clock3.png',
    "330": 'https://ucarecdn.com/0dff9a8c-edfc-434c-b99a-6031258d2f0a/am1clock330.png',
    "400": 'https://ucarecdn.com/6c63b16a-be13-44dd-8ff0-2e8076c10cc2/am1clock4.png',
    "430": 'https://ucarecdn.com/f0608de6-8880-451e-8167-d590648582e9/am1clock430.png',
    "500": 'https://ucarecdn.com/e6277f3c-dd6e-4df6-a28c-78691710c9c6/am1clock5.png',
    "530": 'https://ucarecdn.com/92f2dea6-b4bb-4651-b278-18b6650fb79a/am1clock530.png',
    "600": 'https://ucarecdn.com/465e6b20-5043-4bc3-855c-3974210f91ca/am1clock6.png',
    "630": 'https://ucarecdn.com/0a5e3c5f-4e51-4c9c-b878-d80d707b1aad/am1clock630.png',
    "700": 'https://ucarecdn.com/a14f1e49-5ed9-447a-a7a4-0659bc87b1c7/am1clock7.png',
    "730": 'https://ucarecdn.com/6dce4f60-b1e5-4e3f-8e16-3f5b9a891837/am1clock730.png',
    "800": 'https://ucarecdn.com/0c99474d-9f17-42c3-9df4-23faa5563efd/am1clock8.png',
    "830": 'https://ucarecdn.com/103bdcc7-a526-445a-9625-a6ab23886a95/am1clock830.png',
    "900": 'https://ucarecdn.com/d885a101-5939-4f5d-a53f-86df79cdba6e/am1clock9.png',
    "930": 'https://ucarecdn.com/0e4eae0c-09f8-437e-9162-cc415dc4b6c8/am1clock930.png',
    "1000": 'https://ucarecdn.com/e0b7dfee-3b3f-4694-996b-03f4b49864a6/am1clock10.png',
    "1030": 'https://ucarecdn.com/a2fd9401-c4fe-4f1c-8b46-b2aea88558e1/am1clock1030.png',
    "1100": 'https://ucarecdn.com/4f3be0b7-d903-49e6-99a5-3e4800ead17e/am1clock11.png',
    "1130": 'https://ucarecdn.com/163188aa-9ca0-4020-8b75-261b6f08c1e3/am1clock1130.png',
}
export default async ({ newsline, minutes }: { newsline: string, minutes: number }) => {
    //produce a 30 min digest
    const url = `https://dev-lake-api.qwiket.com/api/v1/openai/digest?newsline=rss-qwiket&minutes=${minutes}`;
    let now = Math.floor(Date.now() / 1000);
    const label=generateLabel();
    const bottomOfTheHour=label.timeIndex.indexOf('30')>0?true:false;
    
//@ts-ignore
    const image=hourImages[label.timeIndex];
    l("IMAGEL",label.timeIndex,image);
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
        title: `${bottomOfTheHour?'Bottom of the Hour':'Top of the Hour'} Digest, ${label.date} #${label.timeIndex}`,
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
        image
    }
    l('call pushOutputQwiket')
    await pushOutputQwiket({

        input: { qwiket, silo: 5, primaryTag: 'fq' },
    })
    return { success: true, qwiket }
}