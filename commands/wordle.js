const { MessageEmbed, Constants } = require("discord.js");
const config = require('../config/main.json');
const Database = require('nedb-revived');
const db = new Database();
db.loadDatabase();

const leaderboard = new Database({ filename: './database/wordle_leaderboards.db' });
leaderboard.loadDatabase();

leaderboard.persistence.setAutocompactionInterval(config.autoCompactInterval);

const fs = require('fs/promises');
const leveling = require('../modules/level_system');

const build = process.env.NODE_ENV == 'dev' ? 'Development' : 'Stable';

const blankSquare = '🔳';
const blankRow = `${blankSquare} ${blankSquare} ${blankSquare} ${blankSquare} ${blankSquare}`;
const wrongSquare = '⬛';
const closeSquare = '🟨';
const correctSquare = '🟩';

const wordList = require('../wordle/wordlist.json');
const answers = require('../wordle/answers.json');
const version = require('../package.json').version;
const letters = require('../wordle/letterEmojis');

function dbToAwait(userID, dbVar) {
    if(!dbVar) dbVar = db;

    return new Promise(resolve => {
        dbVar.findOne({ user: userID }, (error, data) => {
            resolve(data);
        });
    });
}

function checkReset() {
    if(global.resetDatabases['wordle_leaderboards'] == true) leaderboard.loadDatabase();
    if(global.resetDatabases['wordle_leaderboards'] == true) global.resetDatabases['wordle_leaderboards'] = false;
}

async function showWordleFirstRun(message, devWord, hardMode) {
    if(!hardMode) hardMode = false;
    const authorID = message.author ? message.author.id : message.member.id;

    checkReset();

    const userData = await dbToAwait(authorID);
    if(userData) if(userData.playing) return;

    const wordleGuesses = [];
    const lettersArray = [];
    const currentGuess = 0;
    const correctWord = devWord ? devWord : answers[Math.floor(Math.random() * answers.length)];
    var descriptionPrefix = '';

    db.insert({ user: authorID, correctWord: correctWord, playing: true, currentGuess: currentGuess, wordleGuesses: wordleGuesses, letters: lettersArray, lettersObject: {}, pointsForGame: 0, correctLetters: [0,0,0,0,0], gotCorrectLetter: false });

    const leaderboardUser = await dbToAwait(authorID, leaderboard);

    if(!leaderboardUser) leaderboard.insert({ user: authorID, points: 0, wins: 0, losses: 0 });

    if(hardMode) descriptionPrefix = "<a:jermaburger:939426724788183053> You're playing hard mode! All guesses must include previous correct answers.\n\n"

    const wordleEmbed = new MessageEmbed()
    .setColor('#2C2F33')
    .setTitle('Faye!dle - 0/6')
    .setDescription(`${descriptionPrefix}Welcome to Faye!dle! In order to play, just send your guess in this channel. It must be five letters and in the word list. Try to guess the randomly-chosen word in six guesses! You have a time limit of 10 minutes for each guess. Good luck! If you'd like to quit the game, type "quit"\n\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}`)
    .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

    message.reply({ content: 'A game of Faye!dle has been started!', embeds: [wordleEmbed] });

    const filter = m => m.author.id == authorID;
    const newGuess = await message.channel.awaitMessages({ filter: filter, max: 1, time: 600000 });
    leveling.toggleEarningXP(authorID, false);
    playWordle(newGuess.first(), hardMode);
}

async function playWordle(message, isHardMode) {
    checkReset();
    
    const authorID = message.author ? message.author.id : message.member.id;

    const filter = m => m.author.id == authorID;
    const guess = message.content.toLowerCase();

    async function takeGuess() {
        const newGuess = await message.channel.awaitMessages({ filter: filter, max: 1, time: 600000 });
        playWordle(newGuess.first(), isHardMode);
    }

    if(guess == 'quit') {
        const userData = await dbToAwait(authorID);
        var correctWord = userData.correctWord;
        var points = userData.pointsForGame;
        if(currentGuess > 0) points -= 150;
        if(isHardMode && currentGuess > 0) points -= 150;
        const leaderboardDB = await dbToAwait(authorID, leaderboard);
        leaderboard.update({ user: authorID }, { $set: { points: leaderboardDB.points + points, losses: leaderboardDB.losses + 1 } });
        message.reply('Okay, thanks for playing anyway! In case you were curious, the correct word was ' + correctWord + '. You also got a total of ' + points + ' points.');
        leveling.toggleEarningXP(authorID, true);
        db.remove({ user: authorID });
    } else {
        const userData = await dbToAwait(authorID);
        var wordleGuesses = userData.wordleGuesses;
        var correctWord = userData.correctWord;
        var currentGuess = userData.currentGuess;
        var lettersArray = userData.letters;
        var lettersObject = userData.lettersObject;
        var points = userData.pointsForGame;
        var correctLetters = userData.correctLetters;
        var gotCorrectLetter = userData.gotCorrectLetter;

        var roundPoints = 0;

        const correctWordArray = correctWord.split('');

        console.log(correctWord);
    
        if(guess == correctWord) {
            wordleGuesses.push(`${correctSquare} ${correctSquare} ${correctSquare} ${correctSquare} ${correctSquare}`);
            currentGuess += 1;
    
            const allGuesses = wordleGuesses.join('\n');
            points += 250;
            if(isHardMode) points += 250;
            const winEmbed = new MessageEmbed()
            .setColor('#32a852')
            .setTitle(`Faye!dle - ${currentGuess}/6 - Excellent!`)
            .setDescription(`Correct! The word was ${correctWord}! You've earned ${points} points!\n\n${allGuesses}`)
            .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });
    
            message.reply({ content: "Say, you're good!", embeds: [winEmbed] });
            const leaderboardDB = await dbToAwait(authorID, leaderboard);
            leaderboard.update({ user: authorID }, { $set: { points: leaderboardDB.points + points, wins: leaderboardDB.wins + 1 } });
    
            leveling.toggleEarningXP(authorID, true);

            db.remove({ user: authorID });
        } else if(guess.length > 5 || guess.length < 5) {
            message.reply("⚠ Your message isn't the correct length! Are you sure that's five letters?");
            takeGuess();
        } else if(!wordList.includes(guess) && !answers.includes(guess)) {
            message.reply("❌ That word isn't in the word list! Try again!")
            takeGuess();
        } else {
            const guessArray = guess.split('');
            var fullGuess = '';
            var modifiableCorrectGuess = [...correctWordArray];
            var index = 0;
            var usesPreviousGuess = 0;
    
            for(index in guessArray) {
                var currentLetter = guessArray[index];
                var currentCorrectLettr = correctWordArray[index];
    
                if(currentLetter == currentCorrectLettr) {
                    modifiableCorrectGuess[index] = '0';
                }
            }

            for(index in guessArray) {
                var currentLetter = guessArray[index];
                var currentCorrectLettr = correctWordArray[index];
    
                console.log(currentLetter + ' - ' + currentCorrectLettr);
    
                if(currentLetter == currentCorrectLettr) {
                    lettersArray.push(currentLetter);
                    fullGuess += correctSquare;
                    modifiableCorrectGuess[index] = '0';
                    if(correctLetters[index] != currentLetter) points += 125;
                    if(correctLetters[index] != currentLetter) roundPoints += 125;
                    if(correctLetters[index] != 0) correctLetters[index] == currentLetter && usesPreviousGuess !== false ? usesPreviousGuess = true : usesPreviousGuess = false;
                    gotCorrectLetter = true;
                    correctLetters[index] = currentLetter;
                } else if(modifiableCorrectGuess.includes(currentLetter)) {
                    var letter = modifiableCorrectGuess.indexOf(currentLetter, index + 1);
                    if(letter <= -1) letter = modifiableCorrectGuess.indexOf(currentLetter, 0);
                    if(letter > -1) modifiableCorrectGuess[letter] = '0';
                    if(correctLetters[index] != 0) usesPreviousGuess = false;
                    lettersArray.push(currentLetter);
                    fullGuess += closeSquare;
                } else {
                    lettersArray.push(currentLetter);
                    if(correctLetters[index] != 0) usesPreviousGuess = false;
                    fullGuess += wrongSquare;
                }
            }

            console.log(usesPreviousGuess);
            if((usesPreviousGuess === false) && isHardMode && gotCorrectLetter) message.reply("<:cheems:811387824502472704> You're playing hard mode! Every consecutive guess you make needs to include the previous correct answers! Try guessing again, or... you know, you *could* always quit... 😏");
            if(usesPreviousGuess === false && isHardMode && gotCorrectLetter) return takeGuess();
    
            modifiableCorrectGuess = [...correctWordArray];

            fullGuess = fullGuess.split(closeSquare).join(closeSquare + ' ');
            fullGuess = fullGuess.split(correctSquare).join(correctSquare + ' ');
            fullGuess = fullGuess.split(wrongSquare).join(wrongSquare + ' ');

            if(points > 25) points -= 25;
            if(points > 25) roundPoints -= 25;

            db.update({ user: authorID }, { $push: { wordleGuesses: fullGuess }, $set: { currentGuess: currentGuess + 1, letters: lettersArray, lettersObject: lettersObject, pointsForGame: points, correctLetters: correctLetters, gotCorrectLetter: gotCorrectLetter } });
            wordleGuesses.push(fullGuess);
            currentGuess += 1;
    
            if(currentGuess >= 6) {
                const allGuesses = wordleGuesses.join('\n');
                if(points > 100) points -= 100;
                if(isHardMode && points > 50) points -= 100;
                const loseEmbed = new MessageEmbed()
                .setColor('#bd5751')
                .setTitle('Faye!dle - X/6 - Better luck next time!')
                .setDescription(`Argh! You almost had it! Try again? I'm sure you can do it this time!\n\nThe word was ${correctWord}. But, hey, you got ${points} points this game!\n\n${allGuesses}`)
                .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });
    
                message.reply({ content: 'So close!', embeds: [loseEmbed] });
    
                const leaderboardDB = await dbToAwait(authorID, leaderboard);
                leaderboard.update({ user: authorID }, { $set: { points: leaderboardDB.points + points, losses: leaderboardDB.losses + 1 } });
                leveling.toggleEarningXP(authorID, true);
                db.remove({ user: authorID });
            } else {
                var desc = '';
                var counter = 0;
                var row1letters, row2letters, row3letters, row4letters, row5letters;
                row1letters = [];
                row2letters = [];
                row3letters = [];
                row4letters = [];
                row5letters = [];

                for(row in wordleGuesses) {
                    var letterCounter = 0;
                    var currentLettersArray = lettersArray.slice(row * 5, (row * 5) + 5);
                    var currentRow = Number(row) + 1;
                    while(letterCounter < 6) {
                        eval(`row${currentRow}letters.push(letters.${currentLettersArray[letterCounter]})`);
                        letterCounter++;
                    }
                    eval(`lettersObject.row${currentRow}letters = row${currentRow}letters`);
                }

                desc = roundPoints > 0 ? `+${roundPoints} Points!\n\n` : `${roundPoints} Points...\n\n`;
        
                for(const [index, guessRow] of wordleGuesses.entries()) {
                    desc += eval(`lettersObject.row${index + 1}letters.join(' ')`);
                    desc += '\n';
                    desc += guessRow + '\n\n';
                    counter++;
                }
        
                if(counter < 6) while(counter < 6) {
                    desc += blankRow + '\n';
                    counter++;
                }
        
                const guessEmbed = new MessageEmbed()
                .setColor('#2C2F33')
                .setTitle(`Faye!dle - ${currentGuess}/6`)
                .setDescription(desc)
                .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });
        
                message.reply({ content: 'Keep going - you got this!', embeds: [guessEmbed] });
    
                takeGuess();
            }
        }
    }
}

async function showLeaderboard(message) {
    checkReset();
    const config = require('../config/main.json');

    leaderboard.find({}, async (err, board) => {
        if(!board[0]) return message.channel.send("There was an issue loading the Leaderboard! Maybe it was reset?");

        var boardArray = [];
        var boardArrayFinal = [];
        var boardArrayParsed = '';
        var counter = 0;

        while(counter < 10) {
            var currentEntry = board[counter];

            if(!currentEntry) counter++;
            if(!currentEntry) continue;

            const guildObject = message.client.guilds.cache.find(guild => guild.id == config.mainGuildID);
            const guildMembers = await guildObject.members.fetch();
            const memberObject = guildMembers.find(member => member.id == currentEntry.user);

            if(!memberObject) continue;

            boardArray.push({ tag: memberObject.user.tag, points: currentEntry.points });
            counter++;
        }

        const boardArraySorted = boardArray.sort((a, b) => { return b.points - a.points });
        
        for(const [index, entry] of boardArraySorted.entries()) {
            boardArrayFinal.push(`${index + 1}. **${entry.tag}** - ${entry.points} points`);
        }

        boardArrayParsed = boardArrayFinal.join('\n');

        const boardEmbed = new MessageEmbed()
        .setColor('#ffb700')
        .setTitle('Faye!dle Leaderboard - Top 10 Players')
        .setDescription(boardArrayParsed)
        .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

        message.reply({ content: "Here are the best Faye!dle gamers!", embeds: [boardEmbed] });
    });
}

async function showStats(message) {
    checkReset();
    const user = await dbToAwait(message.author.id, leaderboard);

    if(!user) return message.reply("You're not registered in the Faye!dle database yet! Play a game, then you can run this command :)");

    const fields = [
        {
            name: 'Wins',
            value: user.wins.toString()
        },
        {
            name: 'Losses/Quits',
            value: user.losses.toString()
        },
        {
            name: 'Total Score',
            value: user.points.toString()
        }
    ]

    const statsEmbed = new MessageEmbed()
    .setColor('#ffb700')
    .setTitle(`${message.author.tag}'s Faye!dle Stats`)
    .setFields(fields)
    .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

    message.reply({ content: 'Here are your stats!', embeds: [statsEmbed] });
}

function showArgs(message) {
    const args = "`faye!dle leaderboard` - Shows the global leaderboard. Only shows the top 10 players.\n\n`faye!dle stats` - Shows your personal Faye!dle stats\n\n`faye!dle hard` - Play Faye!dle in hard mode!\n\nIf you ever forget these or they seem overwhelming, you can also use `/fayedle` and the options will show up there!";

    message.reply(args);
}

module.exports = {
    name: 'dle',
    slashName: 'fayedle',
    description: 'Play a game of Faye!dle - Wordle in Discord!',
    options: [
        {
            name: 'hardmode',
            description: "Activates hard mode. Every guess needs to include previous correct answers.",
            required: false,
            type: Constants.ApplicationCommandOptionTypes.BOOLEAN
        },
        {
            name: 'leaderboard',
            description: "Whether or not to just show the leaderboard. Nullifies hardmode option.",
            required: false,
            type: Constants.ApplicationCommandOptionTypes.BOOLEAN
        },
        {
            name: 'stats',
            description: "Looks at your stats instead of anything else. Nullifies all other options.",
            required: false,
            type: Constants.ApplicationCommandOptionTypes.BOOLEAN
        }
    ],
    disableSlashCommand: false,
    dmOnly: false,
    hideInHelp: false,
    execute(message, args) {
        const config = require(`../config/main.json`);
        var devWord = '';
        var isHardMode = false;
        if(message.author.id == config.developerID) devWord = args[0] == 'hard' ? args[1] : args[0];
        if(args[0] == 'args') return showArgs(message);
        if(args[0] == 'stats') return showStats(message);
        if(args[0] == 'leaderboard') return showLeaderboard(message);
        if(args[0] == 'hard') isHardMode = true;
        showWordleFirstRun(message, devWord, isHardMode);
    },
    executeInteraction(interaction) {
        if(interaction.options.get('leaderboard')) if(interaction.options.get('leaderboard') == true) return showLeaderboard(interaction);
        const hardMode = interaction.options.get('hardmode').value;
        showWordleFirstRun(interaction, '', hardMode);
    }
}