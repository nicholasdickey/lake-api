import { l, chalk, microtime, js, ds, uxToMySql } from "../../common.js";
import articleBody from './article-body.js';
const rules = async ($, url) => {
    $(`script`).remove();
    $(`img`).remove();
    $(`figure`).remove();
    $(`picture`).remove();
    $(`video`).remove();
    $(`style`).remove();
    // $(`a`).remove();
    $(`button`).remove();
    $(`nav`).remove();
    $(`head`).remove();
    $(`header`).remove();
    $(`footer`).remove();
    $(`input`).remove();
    $(`form`).remove();
    $(`label`).remove();
    $(`iframe`).remove();
    $(`svg`).remove();
    $(`.time`).remove();
    $(`.metrics-channel`).remove();
    $(`.speakr-wrapper`).remove();
    $(`.top-contrib-block`).remove();
    $(`.info`).remove();
    $(`.author-info`).remove();
    $(`.user-input`).remove();
    $(`.sponsor`).remove();
    $(`.sharenow-buttons`).remove();
    $(`.entry-submit-correction`).remove();
    $(`.article-sharing`).remove();
    $(`#after-article-tags`).remove();
    $(`.article-tags`).remove();
    $(`.ff-fancy-header-container`).remove();
    $(`.promo`).remove();
    $(`.sidebar`).remove();
    $(`.article-meta`).remove();
    $(`.banner`).remove();
    $(`.social-bar`).remove();
    $(`.post-header__byline`).remove();
    $(`.advs`).remove();
    $(`.catcher`).remove();
    $(`.social`).remove();
    $(`.newsletter`).remove();
    $(`.banner-placeholder`).remove();
    $(`.above-headline`).remove();
    $(`.comments`).remove();
    $(`.edit`).remove();
    // l(chalk.cyanBright("PREP: HTML", $.html()))
    let b = $("#article-body");
    if (b.html()) {
        l(chalk.green("*** *** #article-body"))
        return b.text();
    }
    b = $(`.article_body`);

    if (b.html()) {
        l(chalk.greenBright("*** *** article_body"))
        return b.text();
    }
    b = $(`.ArticleBody-articleBody .group`);
    if (b.html()) {
        l(chalk.greenBright("*** *** .ArticleBody-articleBody .group"))
        l(chalk.magentaBright(b.html()))
        return b.text();
    }

    b = $(`.post-body`);
    if (b.html()) {
        l(chalk.greenBright("*** *** post-body"))
        l(chalk.magentaBright(b.html()))
        return b.text();
    }
    b = $(`.article__content`);
    if (b.html()) {
        l(chalk.greenBright("*** *** article__content"))
        l(chalk.magentaBright(b.html()))
        return b.text();
    }

    b = $(`.article-content`);
    if (b.html()) {
        l(chalk.green("*** *** article-content"))
        return b.text();
    }
    b = $(`.available-content`);
    if (b.html()) {
        l(chalk.greenBright("*** *** available-content"))
        //  l("substack html:", b.html())
        return b.text();
    }
    b = $(`.entry-content`);
    if (b.html()) {
        l(chalk.greenBright("*** *** entry-content"))
        //  l("substack html:", b.html())
        return b.text();
    }
    b = $(`.body-container`);
    if (b.html()) {
        l(chalk.greenBright("*** *** body-container"))
        //l(chalk.yellowBright(b.html()))
        return b.text();
    }
    b=$(`div [data-testid="prism-article-body"]`);
    if (b.html()) {
        l(chalk.greenBright(`*** *** adiv [data-testid="prism-article-body"]`))
        l(chalk.magentaBright(b.html()))
        return b.text();
    }
    b = $(`article section`);
    if (b.html()) {
        l(chalk.greenBright("*** *** article section"))
        l(chalk.magentaBright(b.html()))
        return b.text();
    }
    b = $(`.body-description`);
    if (b.html()) {
        l(chalk.greenBright("*** *** body-description"))
        // l(chalk.yellowBright(b.html()))
        return b.text();
    }

    b = $(`article`);
    if (b.html()) {
        l(chalk.greenBright("*** *** article"))
        l(chalk.yellowBright(b.html()))
        return b.text();
    }
    b = $(`.the-content`);
    if (b.html()) {
        l(chalk.greenBright("*** *** the-content"))
        l(chalk.yellowBright(b.html()))
        return b.text();
    }
    if (!url.endsWith('/')) {
        url= url + '/';
    }
    const ampUrl = url + 'amp'
    l("amp:", ampUrl)
    //========================"
    let body;
    const response = await fetch(ampUrl);
    if (response)
        body = await response.text();
    //  l(chalk.blue("amp body:", body))
    if (body) { // this is for regular articles
        //log("body:", body)
        l(chalk.yellow("amp body:", body))
        let v = $("<div/>").html(body).contents();
        // l(chalk.magenta("v:", v.text()))
        const error404 = v.find('.page-404-content');
        l(chalk.magenta("error404:", error404.html()))
        if (!error404 || !error404.html()) {
            l(chalk.green("no 404"))
            //log("json:",v.html())
            // v.find('script').remove();
            const b = v.find('.article-content')//.find('script').remove().find('amp-analytics').remove();//[1].html();
            b.find('script').remove();
            b.find('.amp-ad').remove();
            b.find('i-amphtml-sizer').remove();
            b.find('figure').remove();
            b.find('.ad-unit--center').remove();
            b.find('amp-connatix-player ').remove();
            b.find('img').remove();
            b.find('span').each(function (i) {
                $(this).removeAttr(`style`);
            });
            b.find('p').each(function (i) {
                $(this).removeAttr(`style`);
            });


            let bb = b.text().trim();
            bb = bb.replace(/{(.)} /g, "$1");
            bb = bb.replace("NRPLUS MEMBER ARTICLE", "");
            l(chalk.green.bold(bb))

            return bb;
        }
        else {
            l(chalk.red("404"))
        }
    }

    const hrefToJson = $('link[type="application/json"]').attr('href');
    l(chalk.magenta("href=", hrefToJson))
    if (hrefToJson) {
        const responseHref = await fetch(hrefToJson);
        const json = await responseHref.json();
        const content = json.content;
        let bb = content.rendered;
        bb = bb.replace(/{(.)} /g, "$1");
        bb = bb.replace("NRPLUS MEMBER ARTICLE", "");
        return bb;
    }
    b = $(`#js-Story-Content-0`);

    if (b.html()) {
        //l("news9 html:", b.html())
        return b.text();
    }
    l(124443)
    /* let amp = $(`link[rel="amphtml"]`).attr('href');
 
     if (amp) {
         l(chalk.red("amp", amp))
         let response = await fetch(amp);
         l(chalk.yellow('response'))
         //log("response!!!");
         let body = await response.text();
       //  l("body", body)
         // log("body:",body)
         let v = $("<div/>").html(body).contents();
         let b = v.find('.storytext-container')
         if (b.html()) {
             l(chalk.green("body", b.html()))
 
 
             item.body = remove(b).html();
             return (item);
         }
         b = v.find('.td-post-content')
         if (b.html()) {
            // l(chalk.green("body2", b.html()))
 
 
             item.body = remove(b).html();
             return (item);
         }
 
     }
     */
    b = $(`#main article`).last();
    if (b.html()) {
        //  b = b.find(`.field--name-body`);
        return b.text();
    }

    b = $(`.td-post-content`).last();

    if (b.html()) {
        return b.text();

    }

    b = $(`.entry-content`);
    if (!b.html()) {
        //l(chalk.green(b.html()))
        b = $('article');
        if (b.html())
            b = b.find('section');
    }
    if (b.html()) {
        //l("entry-content html:", b.html())
        b.find(`img`).first().remove();
        b.find(`.heateorSssClear`).remove()
        b.find(`.advads-content`).remove();
        b.find(`.google-auto-placed`).remove();
        b.find(`#wpd-post-rating`).remove();
        b.find(`.wp-post-author-wrap`).remove();
        b.find(`.twitter-share`).remove();
        b.find(`.sharedaddy`).remove();
        b.find(`.addtoany_share_save_container`).remove();
        b.find(`.advads-powerinbox-2x4`).remove();
        b.find(`.advads-revcontent-below-article`).remove();
        b.find(`.code-block`).remove();

        b.find(`.heateor_sss_sharing_container`).remove();

        b.find(`.widget__head`).remove();
        b.find(`.widget__head`).remove();

        return b.text();
    }



};
export default rules;