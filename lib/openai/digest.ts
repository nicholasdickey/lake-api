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
    let ads: Article[] = [];
    let illegals: Article[] = [];
    let politics: Article[] = [];
    let society: Article[] = [];
    let war: Article[] = [];
    let economy: Article[] = [];
    let foreignaffairs: Article[] = [];
    let military: Article[] = [];
    let culture: Article[] = [];
    let history: Article[] = [];
    let health: Article[] = [];
    let education: Article[] = [];
    let crime: Article[] = [];
    let sports: Article[] = [];
    let science: Article[] = [];
    let outdoors: Article[] = [];
    let technology: Article[] = [];
    let religion: Article[] = [];
    let other: Article[] = [];
    let combinedText = '';
    let fullCombinedText = '';
    interface Record {
        url: string,
        image: string,
        title: string,
    }
    let records: Record[] = [];
    for (let i = 0; i < qwikets.length; i++) {
        const q = qwikets[i];
        for (let j = 0; j < records.length; j++) {
            const r = records[j];
            let score = 0;
            if (q.url == r.url)
                score++;
            if (q.image == r.image)
                score++;
            if (q.title == r.title)
                score++;
            if (score > 1) {
                l(chalk.red('DUPLICATE:', q.url))
                continue;
            }
            else {
                records.push({ url: q.url, image: q.image, title: q.title });
            }

        }

        const qwiket = await getQwiket({ threadid, slug: q.slug, withBody })

        let rawBody: any = qwiket?.body;
        // const parts=rawBody.split('{ai:summary}');
        let text = ''
        /*if(parts.length>1)
            text=parts[1];
        else
            text=parts[0];*/
        let hasSummary = false;
        const description = q.description;
        const descrParts = description.split("{ai:summary}");
        if (descrParts.length > 1) {
            text = descrParts[1]// to reduce the cost of tokens 
            hasSummary = true;
        }
        else {
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
            let qwiketMessages: ChatCompletionRequestMessage[] = [{ role: 'user', content: `Please summarize in under 140 characters and select only one appropriate hash tag from this list (#illegals,#politics, #society, #ukraine,#israel, #economy, #foreignaffairs,#military,#culture,#history,#health,#education,#crime,#sports,#science,#outdoors,#religion,#technology,#other): ${text}` }];
            let text2 = '';
            for (let i = 0; i < 4; i++) {
                try {
                    if (qwikets.length > 17||!hasSummary) {
                        const completion = await openai.createChatCompletion({
                            model: "gpt-4o-mini-2024-07-18",
                            messages: qwiketMessages,
                            max_tokens: 200,
                        })
                        text2 = completion.data.choices[0]?.message?.content.replace('\n\n', '</p><p>') || '';
                    }
                    else {
                        text2 = text;
                    }
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
            if (text2.trim().indexOf(':') == 0)
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
            const article = { title: q.title, url: q.url, text: hasSummary ? text : text2, publication: q.site_name || '', image: q.image, slug: q.slug };
            if (text2.toLowerCase().includes('#illegals')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#illegals', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#illegals', '');
                    article.text = text;
                }
                illegals.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#politics')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#politics', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#politics', '');
                    article.text = text;
                }
                politics.push(article)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#society')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#society', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#society', '');
                    article.text = text;
                }
                society.push(article)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#ukraine')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#ukraine', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#ukraine', '');
                    article.text = text;
                }
                war.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#israel')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#israel', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#israel', '');
                    article.text = text;
                }
                war.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#economy')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#economy', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#economy', '');
                    article.text = text;
                }
                economy.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#foreignaffairs')) {
                if (!hasSummary) {
                    text2 = text2.replace('#foreignaffairs', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#foreignaffairs', '');
                    article.text = text;
                }
                foreignaffairs.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#military')) {
                if (!hasSummary) {
                    text2.replaceAll('#military', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#military', '');
                    article.text = text;
                }
                military.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#culture')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#culture', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#culture', '');
                    article.text = text;
                }
                culture.push(article);
                if(qwikets.length<20)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#history')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#history', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#history', '');
                    article.text = text;
                }
                history.push(article);
                if(qwikets.length<20)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#health')) {
                if (!hasSummary) {
                    text2 = text2.replace('#health', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#health', '');
                    article.text = text;
                }
                health.push(article);
                if(qwikets.length<24)
                combinedText += `\n${text2}`;
            }
            else if (text2.includes('#education')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#education', '');
                    article.text = text2;
                }
                else {
                    text2 = text2.replaceAll('#education', '');
                    article.text = text2;
                }
                education.push(article)
                if(qwikets.length<20)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#crime')) {
                if (!hasSummary) {
                    text2 = text2.replace('#crime', '');

                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#crime', '');
                    article.text = text;
                }
                crime.push(article);
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#sports')) {
                if (!hasSummary) {
                    text2 = text2.replace('#sports', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#sports', '');
                    article.text = text;
                }
                sports.push(article)
                if(qwikets.length<12)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#science')) {
                if (!hasSummary) {
                    text2 = text2.replace('#science', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#science', '');
                    article.text = text;
                }
                science.push(article);
                if(qwikets.length<24)
                combinedText += `\n${text2}`;
              
            }
            else if (text2.toLowerCase().includes('#outdoors')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#outdoors', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#outdoors', '');
                    article.text = text;
                }
                outdoors.push(article);
                if(qwikets.length<10)
                combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#religion')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#religion', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#religion', '');
                    article.text = text;
                }
                religion.push(article);
                if(qwikets.length<28)
                combinedText += `\n${text2}`;

              //  combinedText += `\n${text2}`;
            }
            else if (text2.toLowerCase().includes('#technology')) {
                if (!hasSummary) {
                    text2 = text2.replaceAll('#technology', '');
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#technology', '');
                    article.text = text;
                }
                technology.push(article);
                if(qwikets.length<34)
                combinedText += `\n${text2}`;
            }
            else {
                text2 = text2.replaceAll('#other', '');
                if (!hasSummary) {
                    article.text = text2;
                }
                else {
                    text = text.replaceAll('#other', '');
                    article.text = text;
                }
                other.push(article)
                if(qwikets.length<14)
                combinedText += `\n${text2}`;
              //  combinedText += `\n${text2}`;
            }
            fullCombinedText += `\n${text2}`;

            //stack.push({ title: q.title, url: q.url, text: text2, publication: q.site_name || '' })
        }

    };
    const ad = { title: "Wish Text Composer", url: "https://www.wish-text.com/?utm_content=am1news", 
    text: `Are you tired of struggling to find the right words and perfect gifts for various occasions? Look no further! With wish-text.com, our AI-powered assistant is here to make your life easier, and it's free!
    Whether it's birthdays, graduations, holidays, or moments of illness or loss, wish-text.com provides personalized messages and thoughtful gift recommendations at no cost.  Try it today!`, publication:'wish-text.com', image: 'https://ucarecdn.com/478cc99f-1fd7-4a2b-804b-32ebafcd1555/wtad3.png', slug: 'wish-text-ad' };
   // ads.push(ad);       
    let html = ''
    let json: any = {}
    if (ads.length > 0) {
        json.sponsor = { items: [] };
        html += `<div class='digest-sponsor'><div class='digest-hashtag'>#sponsor</div>\n`
        ads.forEach(a => {
            json.sponsor.items.push({ title: a.title, url: a.url, text: a.text, publication: a.publication, image: a.image });
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split('#sponsor')[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (illegals.length > 0) {
        json.illegals = { items: [] };
        html += `<div class='digest-illegals'><div class='digest-hashtag'>#illegals</div>\n`
        illegals.forEach(a => {
            json.illegals.items.push({ title: a.title, url: a.url, text: a.text, publication: a.publication, image: a.image });
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split('#illegals')[0]}</p>\n`;
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
    if (society.length > 0) {
        json.society = { items: [] };
        html += `<div class='digest-society'><div class='digest-hashtag'>#society</div>\n`
        society.forEach(a => {
            json.society.items.push(a);

            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p class='digest-text'>${a.text.split(`#society`)[0]}</p>\n`;
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
    if (religion.length > 0) {
        json.religion = { items: [] };
        html += `<div class='digest-religion'><div class='digest-hashtag'>#religion</div>\n`
        religion.forEach(a => {
            json.religion.items.push(a);
            html += `<span class='digest-religion'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
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
    if (crime.length > 0) {
        json.crime = { items: [] };

        html += `<div class='digest-crime'><div class='digest-hashtag'>#crime</div>\n`
        crime.forEach(a => {
            json.crime.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (sports.length > 0) {
        json.sports = { items: [] };

        html += `<div class='digest-sports'><div class='digest-hashtag'>#sports</div>\n`
        sports.forEach(a => {
            json.sports.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (science.length > 0) {
        json.science = { items: [] };

        html += `<div class='digest-science'><div class='digest-hashtag'>#science</div>\n`
        science.forEach(a => {
            json.science.items.push(a);
            html += `<span class='digest-title'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (outdoors.length > 0) {
        json.outdoors = { items: [] };
        html += `<div class='digest-outdoors'><div class='digest-hashtag'>#outdoors</div>\n`
        outdoors.forEach(a => {
            json.outdoors.items.push(a);
            html += `<span class='digest-outdoors'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
        })
        html += `</div>`;
    }
    if (technology.length > 0) {
        json.technology = { items: [] };
        html += `<div class='digest-technology'><div class='digest-hashtag'>#technology</div>\n`
        technology.forEach(a => {
            json.technology.items.push(a);
            html += `<span class='digest-technology'><a href='${a.url}'>${a.publication}: ${a.title}</a></span><p  class='digest-text'>${a.text.split(`#crime`)[0]}</p>\n`;
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
    if (!combinedText||combinedText.length<2048){
        combinedText = fullCombinedText;
    }
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
    messages.push({ "role": "user", "content": `In the style of Ernst Hemingway, please summarize with a brief narrative, the essential gist only, keep shorter than 1000 characters - very important, cut off the rest!, grouping and prioritizing the most important to least important first to last,  removing all the category hashtags. Break it into small paragraphs, if needed. Do not use 'their' as a singular, put quotes around "far right" and "progressive":${combinedText}` });
    //  console.log("messages:", configuration.apiKey, messages)
    let completion: any = null;
    for (let i = 0; i < 4; i++) {
        l(chalk.cyan.bold("CALLING AI", i))
        try {
            //@ts-ignore
            completion = await openai.createChatCompletion({
                model: "gpt-4o-mini-2024-07-18",
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