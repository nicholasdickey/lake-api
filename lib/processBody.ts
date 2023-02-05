import cheerio from "whacko"
import { l, chalk, js } from "./common";


export function processBody({ body }) {
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
               // l(chalk.magenta.bold("UNPROCESSED HTML", html))
                html = html.replace(/\s\s+/g, ' ');
                //html=html.replace('&nbsp;',"");
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
                //$(`blockquote`).remove();


                $(`img`).attr('width', '100%');
                $(`img`).attr('height', 'auto');
                $(`video`).attr('width', '100%');
                $(`video`).attr('height', 'auto');
                $(`.wp-video`).removeAttr('style');


                $(`iframe`).attr('width', '100%');
                $(`iframe`).attr('height', 'auto');
                /*  $('.twitter-tweet a[href*="twitter.com"]').each(function () {
                     // console.log("each:", this)
                      const link = $(this).attr('href');
                      if (link) {
                          console.log("twitter link:", link)
                          const t = link.split('status/');
                          console.log("SPLIT:", t)
                          if (t.length > 1) {
                              console.log('t.length', t.length)
                              const tid = t[1].split('?')[0];
                              console.log("Twitter id:", tid)
                              $(this).parents('.twitter-tweet').replaceWith(`<twittertweetembed rel='twitter' tweetid='${tid}'/
                          ></twittertweetembed>`);
  
                          }
                      }
  
                  })
                  $('iframe[src*="youtube.com"]').each(function () {
                      const link = $(this).attr('src');
                      if (link) {
                          console.log("youtube src:", link)
                          const t = link.split('embed/');
                          console.log("SPLIT:", t)
                          if (t.length > 1) {
                              console.log('t.length', t.length)
                              const tid = t[1].split('?')[0];
                              console.log("Youtube id:", tid)
                              $(this).replaceWith(`<youtubeembed rel='youtube' videoid='${tid}'></youtube>`);
  
                          }
                      }
  
                  })
                  */
                
                /* $(`img[width]`).each(function(){
                  $(this).attr('width','100%')
                 })*/
                /*$(`img :not([width])`).each(function(){
                 l('image with no width')
                 $(this).attr('width','240px')
                })*/
                $(`figure`).removeAttr('style');
                // $(`*`).removeAttr('class');
                $(`*`).removeAttr('id');
                $('div').each(function () {
                    const $this = $(this);
                    if ($this.html().replace(/\s|&nbsp;/g, '').length === 0)
                        $this.remove();
                });
                $('p').each(function () {
                    const $this = $(this);
                    if ($this.html().replace(/\s|&nbsp;/g, '').length === 0)
                        $this.remove();
                });

                b.html = $('body').html();
               // l(chalk.yellow.bold("HTML assigning back to b.html", b.html));
                $('body').children().each(function (i) {
                    const tagName = $(this)[0].name;
                    const outerHtml: string = $(this).html();
                   // l(chalk.green.bold("TAG:", tagName, $(this)));
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
                            const className = $(this).attr('class');
                            if (className?.indexOf('twitter-tweet') >= 0) {
                                block.type = "twitter";
                                $(this).find('a[href*="twitter.com"]').each(async function () {
                                    // console.log("each:", this)
                                     const link = $(this).attr('href');
                                     if (link) {
                                        // console.log("twitter link:", link)
                                         const t = link.split('status/');
                                       // console.log("SPLIT:", t)
                                         if (t.length > 1) {
                                            // console.log('t.length', t.length)
                                             const tid = t[1].split('?')[0];
                                             block.id=tid;
                                             block.content='';
                                            // console.log("Twitter id:", tid)
                                            /* $(this).parents('.twitter-tweet').replaceWith(`<twittertweetembed rel='twitter' tweetid='${tid}'/
                                         ></twittertweetembed>`);*/
                 
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
             //   l(chalk.green("new html blocks:",js(htmlBlocks)))

            }

        })
       // body.blocks = blocks;
        // l('return body',js(body))
        return htmlBlocks;

    }
    return null;
}