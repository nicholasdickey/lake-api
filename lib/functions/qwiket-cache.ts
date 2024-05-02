import { getRedisClient } from "../redis";
import { getLeagueTeams, getTeamPlayers } from "./dbservice";



export const initRostersCache = async (threadid: number, userid: string, force: boolean) => {
    const redis = await getRedisClient({});
    const leagues = ['mlb', 'nba', 'nhl', 'nfl'];

    for (let league of leagues) {
        const teams = await getLeagueTeams({ threadid, league });
        for (let team of teams) {
            const key = `cache-team-roster-${team.teamid}-${userid}`;
            let roster = await redis?.get(key);
            if (!roster || force) {
                roster = await getTeamPlayers({ threadid, teamid: team.teamid, userid });
                await redis?.setex(key, 60 * 60 * 24, JSON.stringify(roster));
            }
        }
    }
}
export const initTeamRostersCache = async (threadid: number, userid: string, teamid: string) => {
    const redis = await getRedisClient({});
    const key = `cache-team-roster-${teamid}-${userid}`;
    let roster = await getTeamPlayers({ threadid, teamid: teamid, userid });
    await redis?.setex(key, 60 * 60 * 24, JSON.stringify(roster));

}



