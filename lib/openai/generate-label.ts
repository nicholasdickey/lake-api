export default ()=>{
    var currentdate = new Date();
    const datetime =currentdate.toLocaleString('en-US', { timeZone: 'America/Chicago' })// formatDate(new Date());
    const ampm=datetime.indexOf('AM')>0?'AM':'PM';
    const dateParts=datetime.split(',');
    const date=dateParts[0];
    const timeParts=dateParts[1].split(':');
    const hoursPart=parseInt(timeParts[0]);
    let minutesPart=parseInt(timeParts[1]);
    if(minutesPart<30)
    minutesPart=0;
    if(minutesPart>30)
    minutesPart=30;
    const timeIndex=hoursPart*100+minutesPart;
    return {
        date,
        timeIndex:""+timeIndex,
        ampm
    }
}