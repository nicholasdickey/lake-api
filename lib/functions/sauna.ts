
import { l, chalk, microtime, js, ds,uxToMySql,allowLog, sleep } from "../common.js";
import { getSaunaAvailabilities } from "./dbservice";



export const getAvailability=async(threadid:number,resource:string)=>{
    //1. get resource range
    //2. find current day of the month and day of the week
    interface DayAvailability {
        year: number;
        month: number;
        day: number;
        dayoftheweek:number;
        availability: string;
      }
      const availabilities=await getSaunaAvailabilities({threadid,resource});
      l(chalk.greenBright("availabilities",js(availabilities)));
      let days=availabilities.days;
    
      function generateCalendarWithPrefill(n: number): DayAvailability[][][] {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // First day of the current month
        let currentDay = new Date(startOfMonth);
        const endOfPeriod = new Date(today);
        endOfPeriod.setDate(today.getDate() + n - 1); // End date is 60 days from today
        const endOfMonth = new Date(endOfPeriod.getFullYear(), endOfPeriod.getMonth() + 1, 0); // Last day of the current month
        let calendar: DayAvailability[][][] = [];
        let currentMonth: DayAvailability[][] = [];
        let week: DayAvailability[] = [];
      
        // Function to prefill "outofbounds" for the week
        function prefillWeek(dayOfWeek: number,debug:string,year:number,month:number) {
          for (let i = 0; i < dayOfWeek; i++) {
            week.push({ year: year, month: month, day: -1, dayoftheweek: i, availability: `${debug}:outofbounds` });
          }
        }
        let runout=false;
        while (currentDay <= endOfMonth) {
          const year = currentDay.getFullYear();
          const month = currentDay.getMonth() + 1; // JavaScript months are 0-indexed
          const day = currentDay.getDate();
          const dayOfWeek = currentDay.getDay(); // Sunday = 0, Saturday = 6
          const isPast = currentDay < today;
          const availability = isPast ? "past" : "current";
      
          // Start of new month and week logic
          if (day === 1 || week.length === 0) {
            if (day === 1) {
              prefillWeek(dayOfWeek,"pre-fill",year,month); // Prefill with 'outofbounds' for new month's first week
            }
            //if (week.length > 0) { // Push the completed week and start a new one
            //  currentMonth.push(week);
            /*  if (day === 1) {
                prefillWeek(dayOfWeek,"pre-0",year,month); // Prefill again if the loop has already started
              }*/
            //}
          }
          if(runout){
            week.push({
                year: year,
                month: month,
                day: day,
                dayoftheweek: dayOfWeek,
                availability: "runout:outofbounds",
              });
          }
          else
          week.push({
            year: year,
            month: month,
            day: day,
            dayoftheweek: dayOfWeek,
            availability: availability,
          });
      
          currentDay.setDate(currentDay.getDate() + 1); // Move to the next day
          if(currentDay>endOfPeriod)
            runout=true;
          //end of week logic
          if(currentDay.getDay()===0&&currentDay.getMonth()+1==month){
            currentMonth.push(week);
            week=[];
          }
          // End of month logic
          if (currentDay.getMonth() + 1 !== month /*|| currentDay > endOfPeriod*/) {
            let c=1;
            while (week.length < 7) { // Fill the rest of the week if necessary
              week.push({ year: year, month: month, day: -1, dayoftheweek:dayOfWeek+c++, availability: "outofbounds" });
            }
            currentMonth.push(week); // Push the last week of the month
            if (currentMonth.length) {
              calendar.push(currentMonth); // Push the completed month
            }
            currentMonth = []; // Reset for the next month
            week = []; // Reset for the next month's first week
            if(runout)
                break;
          }
        }
      
        return calendar;
      }
      
      // Example usage:
      const calendar = generateCalendarWithPrefill(days);
      console.log(JSON.stringify(calendar, null, 2)); // This will print the structured calendar
            console.log(js(calendar));
      return calendar;
      
}
const calMonthBack=()=>{
}
const calPeriodForward=(period:number)=>{
}