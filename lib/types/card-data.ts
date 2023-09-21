import ImageData from "./image-data";
export default interface CardData {
    image:ImageData;
    signature: string;
    num?: number;  //session_history ordinal
    linkid?:number;
    cardNum?:number;
    cardMax?:number;
    greeting?:string;
    metaimage?:string;
    animatedSignature?:number;
  }
  