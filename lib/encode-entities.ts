//encode-entities.ts
//https://stackoverflow.com/questions/18749591/encode-html-entities-in-javascript

export default function encodeEntities(str:string) {
    return str.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}