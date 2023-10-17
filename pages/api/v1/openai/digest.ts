import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";
import NextCors from 'nextjs-cors';
//@ts-ignore
import cheerio from "whacko";
import { fetchQueue } from "../../../../lib/queue/fetch-queue";
import { getRedisClient } from "../../../../lib/redis";
import { l, chalk, js, sleep } from "../../../../lib/common";
import { getQwiket } from "../../../../lib/db/qwiket";
import Stack from "../../../../lib/stack";


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    let threadid = Math.floor(Math.random() * 100000000);
    let { newsline, minutes } = req.query;

    // l(chalk.green('comment.ts: slug:', slug, 'postid:', postid))
    if (!newsline || !minutes)
        return res.status(403).json({ error: 'missing newsline or minutes' });

    const type = 'newsline';
    const forum = 'usconservative';

    const tag = '';
    const lastid = 0
    const page = 0;
    const sessionid = '';

    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {
        let ret: any = await fetchQueue({ type, newsline, forum, tag, lastid, firstid: 0, page, sessionid, countonly: 0, userslug: '', tail: '', qwiketid: '', size: 250, solo: 0, test: '', debug: '', threadid, redis })
        const items = ret.items;
        let newItems = items.filter((p: any) => p != null)
        newItems = await Promise.all(newItems.map(async ({ item }: any) => {
            if (!item)
                return null;
            const isPost = item.qpostid ? true : false;

            let description = item.description;//.substring(0, 196);
            if (description.length == 196)
                description += "...";
            let common = {
                catName: isPost ? item.cat_name : item.catName,
                catIcon: isPost ? item.cat_icon : item.catIcon,
                qpostid: item.qpostid ? item.qpostid : '',
                published_time: item.published_time,
                shared_time: item.shared_time,
                slug: item.threadid,
                title: item.title,
                site_name: item.site_name || '',
                url: item.url,
                description: description,
                author: item.author,
                image: item.image,
                tag: isPost ? item.category : item.cat,
            }

            // console.log("ITEM:",common)
            return common;
        }))
        let qwikets = newItems.filter((p: any) => p != null);
        l(chalk.yellow("qwikets1:", qwikets.length));
        let now = Math.floor(Date.now() / 1000)
        const min = minutes as string | '';
        const m = +min;
        qwikets = qwikets.filter((p: { shared_time: number; }) => p.shared_time > now - m * 60);
        l(chalk.yellow("qwikets2:", qwikets.length));

        const withBody: [0, 1] = 1 as any;
        interface Article {
            title: string;
            url: string;
            text: string;
            publication: string;
            image: string;
            slug: string
        }

        const stack = new Stack<{ text: string }>();
        let messages: ChatCompletionRequestMessage[] = [];

        let immigration: Article[] = [];
        let politics: Article[] = [];
        let social: Article[] = [];
        let war: Article[] = [];
        let economy: Article[] = [];
        let foreignaffairs: Article[] = [];
        let military: Article[] = [];
        let culture: Article[] = [];
        let history: Article[] = [];
        let health: Article[] = [];
        let education: Article[] = [];
        let criminal: Article[] = [];
        let other: Article[] = [];
        let combinedText = '';
        for (let i = 0; i < qwikets.length; i++) {
            const q = qwikets[i];


            const qwiket = await getQwiket({ threadid, slug: q.slug, withBody })

            let rawBody: any = qwiket?.body;
            // const parts=rawBody.split('{ai:summary}');
            let text = ''
            /*if(parts.length>1)
                text=parts[1];
            else
                text=parts[0];*/


            if (rawBody) {
                // l(chalk.red('rawBody:', js(rawBody), typeof (rawBody)))
                // const body=JSON.parse(rawBody);
                const blocks = rawBody['blocks'];
                //l(chalk.cyan('blocks:', js(blocks)))
                for (let i = 0; i < blocks.length; i++) {
                    const block: { blockType: string, html: string | null } = blocks[i];
                    //l("blockType", block.blockType)
                    if (block.blockType == 'html') {
                        const body = block.html || '';
                        const $ = cheerio.load(`<html>${body}</html`);
                        text = $(`html`).text();
                        break;;
                    }

                }

            }

            if (text) {
                let tokens = text.split(" ").length;
                if (tokens > 3000)
                    text = text.substring(0, 22000);
                tokens = text.split(" ").length;
                if (tokens > 3000)
                    text = text.substring(0, 16000);
                tokens = text.split(" ").length;
                if (tokens > 3000)
                    text = text.substring(0, 14000);
                let qwiketMessages: ChatCompletionRequestMessage[] = [{ role: 'user', content: `Please summarize in under 140 characters and select only one appropriate hash tag from this list (#immigration,#politics, #social, #ukraine, #israel, #economy, #foreignaffairs,#military,#culture,#history,#health,#education,#criminal):${text}` }];
                const completion = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: qwiketMessages,
                    max_tokens: 200,

                })
                let text2 = completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>') || '';
                l(chalk.greenBright("push", text2))
                // stack.push({text:text2})
                combinedText += `\n${text2}`;
                const article = { title: q.title, url: q.url, text: text2, publication: q.site_name || '', image: q.image, slug: q.slug };
                if (text2.includes('#immigration'))
                    immigration.push()
                else if (text2.includes('#politics'))
                    politics.push(article)
                else if (text2.includes('#social'))
                    social.push(article)
                else if (text2.includes('#ukraine'))
                    war.push(article)
                else if (text2.includes('#israel'))
                    war.push(article)
                else if (text2.includes('#economy'))
                    economy.push(article)
                else if (text2.includes('#foreignaffairs'))
                    foreignaffairs.push(article)
                else if (text2.includes('#military'))
                    military.push(article)
                else if (text2.includes('#culture'))
                    culture.push(article)
                else if (text2.includes('#history'))
                    history.push(article)
                else if (text2.includes('#health'))
                    health.push(article)
                else if (text2.includes('#education'))
                    education.push(article)
                else if (text2.includes('#criminal'))
                    criminal.push(article)

                else
                    other.push(article)


                //stack.push({ title: q.title, url: q.url, text: text2, publication: q.site_name || '' })
            }
            await sleep(5000);
        };
        let html = ''
        let json: any = {}
        if (immigration.length > 0) {
            json.immigration = { items: [] };
            html += `<div class='digest-immigration'><div class='digest-hashtag'>#immigration</div>\n`
            immigration.forEach(a => {
                json.immigration.items.push({ title: a.title, url: a.url, text: a.text, publication: a.publication, image: a.image });
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split('#immigration')[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (politics.length > 0) {
            json.politics = { items: [] };
            html += `<div class='digest-politics'><div class='digest-hashtag'>#politics</div>\n`
            politics.forEach(a => {
                json.politics.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split('#politics')[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (social.length > 0) {
            json.social = { items: [] };
            html += `<div class='digest-social'><div class='digest-hashtag'>#social</div>\n`
            social.forEach(a => {
                json.social.items.push(a);

                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#social`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (war.length > 0) {
            json.war = { items: [] };
            html += `<div class='digest-war'><div class='digest-hashtag'>#war</div>\n`
            war.forEach(a => {
                json.war.items.push(a);
                html += `<span class='digest-title'>><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#war`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (foreignaffairs.length > 0) {
            json.foreignaffairs = { items: [] };
            html += `<div class='digest-foreignaffairs'><div class='digest-hashtag'>#foreignaffairs</div>\n`
            foreignaffairs.forEach(a => {
                json.foreignaffairs.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#foreignaffairs`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (economy.length > 0) {
            json.economy = { items: [] };
            html += `<div class='digest-economy'><div class='digest-hashtag'>#economy</div>\n`
            economy.forEach(a => {
                json.economy.items.push(a);
                html += `<span class='digest-title'>><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#economy`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (military.length > 0) {
            json.military = { items: [] };
            html += `<div class='digest-military'><div class='digest-hashtag'>#military</div>\n`
            military.forEach(a => {
                json.military.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#military`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (culture.length > 0) {
            json.culture = { items: [] };
            html += `<div class='digest-culture'><div class='digest-hashtag'>#culture</div>\n`
            culture.forEach(a => {
                json.culture.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#culture`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (history.length > 0) {
            json.history = { items: [] };
            html += `<div class='digest-history'><div class='digest-hashtag'>#history</div>\n`
            history.forEach(a => {
                json.history.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#history`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (health.length > 0) {
            json.health = { items: [] };
            html += `<div class='digest-health'><div class='digest-hashtag'>#health</div>\n`
            health.forEach(a => {
                json.health.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#health`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (education.length > 0) {
            json.education = { items: [] };
            html += `<div class='digest-health'><div class='digest-hashtag'>#education</div>\n`
            education.forEach(a => {
                json.education.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#education`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (criminal.length > 0) {
            json.criminal = { items: [] };

            html += `<div class='digest-health'><div class='digest-hashtag'>#criminal</div>\n`
            criminal.forEach(a => {
                json.criminal.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#criminal`)[0]}</p>\n`;
            })
            html += `</div>`;
        }
        if (other.length > 0) {
            json.other = { items: [] };
            html += `<div class='digest-other'><div class='digest-hashtag'>#other</div>\n`
            other.forEach(a => {
                json.other.items.push(a);
                html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#other`)[0]}</p>\n`;
            })
            html += `</div>`;
        }

        // l(chalk.red("stack size", stack.size()));
        /* while (stack.size() > 0) {
             const article = stack.pop();
             if (article) {
                 // messages.push({ role: "user", content: `{title:{${article.title}},url:{${article.url}},publication:{${article.publication},text:{${article.text}}}` });
                 messages.push({ role: "user", content: `title:${article.title}, url:${article.url} publication:${article.publication}. body:${article.text}` });
                 l(chalk.yellowBright("push message", { role: "user", content: `{title:{${article.title}},url:{${article.url}},publication:{${article.publication},text:{${article.text}}}` }))
             }
     
         }*/
        // console.log(chalk.cyan.bold("inputText", combinedText));
        let tokens = combinedText.split(" ").length;
        if (tokens > 3000)
            combinedText = combinedText.substring(0, 22000);
        tokens = combinedText.split(" ").length;
        if (tokens > 3000)
            combinedText = combinedText.substring(0, 16000);
        tokens = combinedText.split(" ").length;
        if (tokens > 3000)
            combinedText = combinedText.substring(0, 14000);
        //console.log(chalk.magenta.bold("combinedText", combinedText));
        messages.push({ "role": "user", "content": `Please summarize the following in the style of Hemingway:${combinedText}` });
        //  console.log("messages:", configuration.apiKey, messages)
        let completion: any = null;
        for (let i = 0; i < 1; i++) {
            l(chalk.cyan.bold("CALLING AI", i))
            try {
                //@ts-ignore
                completion = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: messages,


                })
                l(chalk.cyan.bold("AI RESULT", i), completion)
                if (completion) {
                    json.summary = completion.data.choices[0]?.message?.content;
                    break;
                }
                l("no completion loop", i)
            }
            catch (x) {
                l('SLEEP', x);
                await sleep(10000);
            }
        }
        if (!completion) {
            return res.status(200).json({ result: 'no  completion possible' })
        }
        const content = `<p>${completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>')}</p>`;
        //  console.log("content:", content);
        const content2 = `Hot take: ${content}<hr/>${html}`;
        console.log("result:", content2)
        //res.setHeader('Content-Type', 'text/html; charset=utf-8');
        console.log(chalk.blue.bold("json", js(json)));
        res.status(200).json(json)
    }
    finally {
        redis?.quit();
    }

}