import { getGameEvents } from '../utils/game-events';

export function addLineupMinutes(players, gameEvents) {
    players.forEach(player => {
        // Reset minutes to 0
        player.minutes = 0;

        // Filter game events relevant to this player's time in the match
        const playerEvents = gameEvents.filter(event => event.playerId === player.id);

        let substituteInMinute = null;
        let substituteOutMinute = null;
        let gameStartMinute = 0; // Default for when the player starts the game
        let gameEndMinute = 90; // Default for full game (normal time)

        playerEvents.forEach(event => {
            if (event.type === 'sub-in' && substituteInMinute === null) {
                substituteInMinute = event.minute;
            } else if (event.type === 'sub-out') {
                substituteOutMinute = event.minute;
            }
        });

        const entryMinute = substituteInMinute !== null ? substituteInMinute : gameStartMinute;
        const exitMinute = substituteOutMinute !== null ? substituteOutMinute : gameEndMinute;

        player.minutes = exitMinute - entryMinute;
    });
}