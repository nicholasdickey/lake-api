import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai";

//@ts-ignore
import cheerio from "whacko";
import { fetchQueue } from "../queue/fetch-queue";
import { getRedisClient } from "../redis";
import { l, chalk, js, sleep } from "../common";
import { getQwiket } from "../db/qwiket";
import { getPost, checkChatbotPost, setChatbotPost } from "../db/post";
import Stack from "../stack";


const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function handler(
    newsline: string,
    minutes: number,
) {


    // l(chalk.green('comment.ts: slug:', slug, 'postid:', postid))
    if (!newsline || !minutes)
        return { success: false, error: 'missing newsline or minutes' };

    const type = 'newsline';
    const forum = 'usconservative';

    const tag = '';
    const lastid = 0
    const page = 0;
    const sessionid = '';
    let threadid = Math.floor(Math.random() * 100000000);
    const redis = await getRedisClient({});
    if (!redis)
        return { success: false, error: "Unable to create redis" }

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
    //const min = ""+minutes;
    //const m = +min;
    qwikets = qwikets.filter((p: { shared_time: number; }) => p.shared_time > now - minutes * 60);
    l(chalk.yellow("qwikets2:", qwikets.length));
    if (!qwikets || !qwikets.length)
        return ({ success: false, error: "No items found" });
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
    let sports: Article[] = [];
    let science: Article[] = [];
    let outdoors: Article[] = [];
    let other: Article[] = [];
    let combinedText = '';
    let fullCombinedText = '';
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
                    //@ts-ignore
                    const $ = cheerio.load(`<html>${body}</html`);
                    text = $(`html`).text().trim();
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
            let qwiketMessages: ChatCompletionRequestMessage[] = [{ role: 'user', content: `Please summarize in under 140 characters and select only one appropriate hash tag from this list (#immigration,#politics, #social, #warinukraine,#economy, #foreignaffairs,#military,#culture,#history,#health,#education,#criminal,#sports,#science,#outdoors): ${text}` }];
            let text2 = '';
            for (let i = 0; i < 4; i++) {
                try {
                    const completion = await openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: qwiketMessages,
                        max_tokens: 200,
                    })
                    text2 = completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>') || '';
                    if (text2)
                        break;
                } catch (ex) {
                    l(chalk.redBright("ex:", ex))
                    l("sleeping");
                    await sleep(30000);
                }
            }
            // stack.push({text:text2})
            if (!text2)
                continue;
            if (text2.indexOf(':') == 0)
                text2 = text2.substring(1);
            l(chalk.greenBright("push", text2))


            String.prototype.replaceAll = function (strReplace, strWith) {
                // See http://stackoverflow.com/a/3561711/556609
                //@ts-ignore
                var esc = strReplace.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var reg = new RegExp(esc, 'ig');
                //@ts-ignore
                return this.replace(reg, strWith);
            };
            const article = { title: q.title, url: q.url, text: text2, publication: q.site_name || '', image: q.image, slug: q.slug };
            if (text2.toLowerCase().includes('#immigration')) {
                text2 = text2.replaceAll('#immigration', '');
                article.text = text2;
                immigration.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#politics')) {
                text2 = text2.replaceAll('#politics', '');
                article.text = text2;
                politics.push(article)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#social')) {
                text2 = text2.replaceAll('#social', '');
                article.text = text2;
                social.push(article)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#warinukraine')) {
                text2 = text2.replaceAll('#warinukraine', '');
                article.text = text2;
                war.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#economy')) {
                text2 = text2.replaceAll('#economy', '');
                article.text = text2;
                economy.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#foreignaffairs')) {
                text2 = text2.replace('#foreignaffairs', '');
                article.text = text2;
                foreignaffairs.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#military')) {
                text2.replaceAll('#military', '');
                article.text = text2;
                military.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#culture')) {
                text2 = text2.replaceAll('#culture', '');
                article.text = text2;
                culture.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#history')) {
                text2 = text2.replaceAll('#history', '');
                article.text = text2;
                history.push(article)
            }
            else if (text2.toLowerCase().includes('#health')) {
                text2 = text2.replace('#health', '');
                article.text = text2;
                health.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.includes('#education')) {
                text2 = text2.replaceAll('#education', '');
                article.text = text2;
                education.push(article)
            }
            else if (text2.toLowerCase().includes('#criminal')) {
                text2 = text2.replace('#criminal', '');
                article.text = text2;
                criminal.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#sports')) {
                text2 = text2.replace('#sports', '');
                article.text = text2;
                sports.push(article)
            }
            else if (text2.toLowerCase().includes('#science')) {
                text2 = text2.replace('#science', '');
                article.text = text2;
                science.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#outdoors')) {
                text2 = text2.replaceAll('#outdoors', '');
                article.text = text2;
                outdoors.push(article);
            }
            else {
                text2 = text2.replaceAll('#other', '');
                article.text = text2;
                other.push(article)
                combinedText += `\n${text2}`;
            }
            fullCombinedText += `\n${text2}`;

            //stack.push({ title: q.title, url: q.url, text: text2, publication: q.site_name || '' })
        }

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

        html += `<div class='digest-criminal'><div class='digest-hashtag'>#criminal</div>\n`
        criminal.forEach(a => {
            json.criminal.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#criminal`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (sports.length > 0) {
        json.sports = { items: [] };

        html += `<div class='digest-sports'><div class='digest-hashtag'>#sports</div>\n`
        sports.forEach(a => {
            json.sports.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#criminal`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (science.length > 0) {
        json.science = { items: [] };

        html += `<div class='digest-science'><div class='digest-hashtag'>#science</div>\n`
        science.forEach(a => {
            json.criminal.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#criminal`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (outdoors.length > 0) {
        json.outdoors = { items: [] };
        html += `<div class='digest-outdoors'><div class='digest-hashtag'>#outdoors</div>\n`
        outdoors.forEach(a => {
            json.outdoors.items.push(a);
            html += `<span class='digest-outdoors'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#criminal`)[0]}</p>\n`;
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
    if (!combinedText)
        combinedText = fullCombinedText;
    console.log(chalk.cyan.bold("inputText", combinedText));
    let tokens = combinedText.split(" ").length;
    if (tokens > 3000)
        combinedText = combinedText.substring(0, 22000);
    tokens = combinedText.split(" ").length;
    if (tokens > 3000)
        combinedText = combinedText.substring(0, 16000);
    tokens = combinedText.split(" ").length;
    if (tokens > 3000)
        combinedText = combinedText.substring(0, 14000);
    console.log(chalk.magenta.bold("combinedText", combinedText));
    messages.push({ "role": "user", "content": `Please summarize with in a brief narrative the following in the style of Hemingway:${combinedText}` });
    //  console.log("messages:", configuration.apiKey, messages)
    let completion: any = null;
    for (let i = 0; i < 4; i++) {
        l(chalk.cyan.bold("CALLING AI", i))
        try {
            //@ts-ignore
            completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: messages,
            })
            l(chalk.cyan.bold("AI RESULT", i), completion.data.choices[0]?.message?.conten)
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
        return { success: false, error: 'no  completion possible' }
    }
    const content = `<p>${completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>')}</p>`;
    //  console.log("content:", content);
    const content2 = `Hot take: ${content}<hr/>${html}`;
    console.log("result:", content2)
    //res.setHeader('Content-Type', 'text/html; charset=utf-8');
    console.log(chalk.blue.bold("json", js(json)));
    return { success: true, json }

}