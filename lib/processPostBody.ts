import cheerio from "whacko"
import { l, chalk, js } from "./common";


export  function processPostBody(body:string) {
   // l("PROCESS BODY", body)
   if(!body)
   return;
   const md=body; 
   let changed=false;
  // l(chalk.green.bold("body",body));
   let $ = cheerio.load(md, {
    decodeEntities: true,
})
  /* if (body) {
        let v = $("<div/>")
        .html("<div>" + md + "</div>")
        .contents();
    if (md && md.indexOf("https") >= 0) {
        // console.log("processBlock", { md })
    }*/
    //has to use jquery as the link is scrambled and markdown uses the b
    const tokens= ["uploads.disquscdn", "jpg", "png", "gif", "giphy"];
    tokens.forEach(function (
        token
    ) {
        // console.log("processBlock", { md, token })
        let disqusImages = $(`a[href *= "${token}"]`);
        disqusImages.each(function () {
            // console.log("processBlock IMAGE FOUNDs", { token })
            let el = $(this);
            const href = el.attr("href");
            if (
                (href.indexOf("disqus") >= 0 ||
                    href.indexOf("disq.us") >= 0) &&
                href.indexOf("imgurl") < 0
            ) {
                let src = href.split("url=");
                if (src[1]) src = decodeURIComponent(src[1]);
                else src = href;
                const w = src ? src.split(token) : [];
                if (w[1]) {
                    const w1 = w[1];
                    const s = w1.split(":")[0];
                    src = w[0] + token + s;
                }
                const htm = `<img style="height: 100%; width: 100%;" src="${src}"  /> `;
                // console.log("processBlock IMAGE CONFIRMED", { title: el.attr('title'), href: el.attr('href'), htm })
                el.replaceWith(htm);
                //  console.log("processBlock2", { htm, title: el.attr('title'), href: el.attr('href'), text: el.text() })
                changed = true;
            }
        });
    });
   // l(chalk.yellow.bold("PROCESS POST BODY"),$('body').html())   
    if(changed)
        return $('body').html();
   // }
    return body;
}