//./lib/process-body.ts
//@ts-ignore
import cheerio from "whacko"
import { l, chalk, js } from "./common";

export function processBody({ body }:{body:any}) {
   // l("PROCESS BODY", body)
    if (body) {

        const blocks = body.blocks;
        let htmlBlocks:{type:string,content:string}[] = [];
        blocks.forEach((b: any) => {
            let html;
            if (b.blockType == 'html') {
                html = b.html;
            }
            if (html) {
                html = html.replace(/\s\s+/g, ' ');
                let $ = cheerio.load(html, {
                    decodeEntities: true,
                })
               
                $(`pre`).remove();
                $(`code`).remove();
                $(`script`).remove();
                $(`svg`).remove();
                $(`style`).remove();
                $(`.heateor_sssp_sharing_ul`).remove();
                $(`center`).remove();
                $(`.disce-*`).remove();

                $(`img`).attr('width', '100%');
                $(`img`).attr('height', 'auto');
                $(`video`).attr('width', '100%');
                $(`video`).attr('height', 'auto');
                $(`.wp-video`).removeAttr('style');

                $(`iframe`).attr('width', '100%');
                $(`iframe`).attr('height', 'auto');
                
                $(`figure`).removeAttr('style');

                $(`*`).removeAttr('id');
                $('div').each(function () {
                     //@ts-ignore
                    const $this = $(this);
                    if ($this.html().replace(/\s|&nbsp;/g, '').length === 0)
                        $this.remove();
                });
                $('p').each(function () {
                     //@ts-ignore
                    const $this = $(this);
                    if ($this.html().replace(/\s|&nbsp;/g, '').length === 0)
                        $this.remove();
                });

                b.html = $('body').html();
                //@ts-ignore
                $('body').children().each(function (i) {
                    //@ts-ignore
                    const tagName = $(this)[0].name;
                     //@ts-ignore
                    const outerHtml: string = $(this).html();

                    let block: {
                        type: string;
                        content: string;
                        id?:string;
                        ast?:any;
                    } = {
                        type: "",
                        content: outerHtml
                    }
                    switch (tagName) {
                        case "p":
                        case "section":    
                            block.type = "text";
                            break;
                        case "blockquote":
                             //@ts-ignore
                            const className = $(this).attr('class');
                            if (className?.indexOf('twitter-tweet') >= 0) {
                                block.type = "twitter";
                                 //@ts-ignore
                                $(this).find('a[href*="twitter.com"]').each(async function () {
                                     //@ts-ignore
                                     const link = $(this).attr('href');
                                     if (link) {
                                         const t = link.split('status/');
                                         if (t.length > 1) {
                                             const tid = t[1].split('?')[0];
                                             block.id=tid;
                                             block.content='';
                                         }
                                     }
                                 })
                            }
                            else
                                block.type="text";
                            break;
                        case "img":
                        case "picture":
                        case "figure":
                            block.type="image";
                            break;
                        case "div":
                            block.type="text";
                            break;
                        case "iframe":
                            block.type="iframe"    
                    }
                    if(block.type)
                    htmlBlocks.push(block);

                })
            }
        })
        return htmlBlocks;
    }
    return null;
}