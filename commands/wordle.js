const { MessageEmbed } = require("discord.js");
const Database = require('nedb');
const db = new Database();
db.loadDatabase();

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

function dbToAwait(userID) {
    return new Promise(resolve => {
        db.findOne({ user: userID }, (error, data) => {
            resolve(data);
        });
    });
}

async function showWordleFirstRun(message, devWord) {
    const authorID = message.author ? message.author.id : message.member.id;

    const userData = await dbToAwait(authorID);
    if(userData) if(userData.playing) return;

    const wordleGuesses = [];
    const lettersArray = [];
    const currentGuess = 0;
    const correctWord = devWord ? devWord : answers[Math.floor(Math.random() * answers.length)];

    db.insert({ user: authorID, correctWord: correctWord, playing: true, currentGuess: currentGuess, wordleGuesses: wordleGuesses, letters: lettersArray, lettersObject: {} });

    const wordleEmbed = new MessageEmbed()
    .setColor('#2C2F33')
    .setTitle('Faye!dle - 0/6')
    .setDescription(`Welcome to Faye!dle! In order to play, just send your guess in this channel. It must be five letters and in the word list. Try to guess the randomly-chosen word in six guesses! You have a time limit of 10 minutes for each guess. Good luck! If you'd like to quit the game, type "quit"\n\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}\n${blankRow}`)
    .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

    message.reply({ content: 'A game of Faye!dle has been started!', embeds: [wordleEmbed] });

    const filter = m => m.author.id == authorID;
    const newGuess = await message.channel.awaitMessages({ filter: filter, max: 1, time: 600000 });
    playWordle(newGuess.first());
}

async function playWordle(message) {
    const authorID = message.author ? message.author.id : message.member.id;

    const filter = m => m.author.id == authorID;
    const guess = message.content.toLowerCase();

    async function takeGuess() {
        const newGuess = await message.channel.awaitMessages({ filter: filter, max: 1, time: 600000 });
        playWordle(newGuess.first());
    }

    if(guess == 'quit') {
        const userData = await dbToAwait(authorID);
        var correctWord = userData.correctWord;
        message.reply('Okay, thanks for playing anyway! In case you were curious, the correct word was ' + correctWord);
        db.remove({ user: authorID });
    } else {
        const userData = await dbToAwait(authorID);
        var wordleGuesses = userData.wordleGuesses;
        var correctWord = userData.correctWord;
        var currentGuess = userData.currentGuess;
        var lettersArray = userData.letters;
        var lettersObject = userData.lettersObject;
        
        const correctWordArray = correctWord.split('');

        console.log(correctWord);
    
        if(guess == correctWord) {
            wordleGuesses.push(`${correctSquare} ${correctSquare} ${correctSquare} ${correctSquare} ${correctSquare}`);
            currentGuess += 1;
    
            const allGuesses = wordleGuesses.join('\n');
            const winEmbed = new MessageEmbed()
            .setColor('#32a852')
            .setTitle(`Faye!dle - ${currentGuess}/6 - Excellent!`)
            .setDescription(`Correct! The word was ${correctWord}!\n\n${allGuesses}`)
            .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });
    
            message.reply({ content: "Say, you're good!", embeds: [winEmbed] });
    
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
                } else if(modifiableCorrectGuess.includes(currentLetter)) {
                    var letter = modifiableCorrectGuess.indexOf(currentLetter, index + 1);
                    if(letter <= -1) letter = modifiableCorrectGuess.indexOf(currentLetter, 0);
                    if(letter > -1) modifiableCorrectGuess[letter] = '0';
                    lettersArray.push(currentLetter);
                    fullGuess += closeSquare;
                } else {
                    lettersArray.push(currentLetter);
                    fullGuess += wrongSquare;
                }
            }
    
            modifiableCorrectGuess = [...correctWordArray];

            fullGuess = fullGuess.split(closeSquare).join(closeSquare + ' ');
            fullGuess = fullGuess.split(correctSquare).join(correctSquare + ' ');
            fullGuess = fullGuess.split(wrongSquare).join(wrongSquare + ' ');
            db.update({ user: authorID }, { $push: { wordleGuesses: fullGuess }, $set: { currentGuess: currentGuess + 1, letters: lettersArray, lettersObject: lettersObject } });
            wordleGuesses.push(fullGuess);
            currentGuess += 1;
    
            if(currentGuess >= 6) {
                const allGuesses = wordleGuesses.join('\n');
                const loseEmbed = new MessageEmbed()
                .setColor('#bd5751')
                .setTitle('Faye!dle - X/6 - Better luck next time!')
                .setDescription(`Argh! You almost had it! Try again? I'm sure you can do it this time!\n\nThe word was ${correctWord}\n\n${allGuesses}`)
                .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });
    
                message.reply({ content: 'So close!', embeds: [loseEmbed] });
    
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

module.exports = {
    name: 'dle',
    slashName: 'fayedle',
    description: 'Play a game of Faye!dle - Wordle in Discord!',
    options: [],
    disableSlashCommand: false,
    dmOnly: false,
    hideInHelp: false,
    execute(message, args) {
        const config = require(`../config/main.json`);
        var devWord = '';
        if(message.author.id == config.developerID) devWord = args[0];
        showWordleFirstRun(message, devWord);
    },
    executeInteraction(interaction) {
        showWordleFirstRun(interaction);
    }
}