const fs = require('fs/promises');
const config = require('../config/main.json');

async function resetDatabase(message, dbFilename) {
    var dbFileExists = await fs.readFile(`./database/${dbFilename}.db`);
    if(dbFileExists.toString() == '') return message.reply("That database either doesn't exist or has already been reset!");

    try {
        await fs.writeFile(`./database/${dbFilename}.db`, '');
        message.reply("That database has been reset. Do note, however, that a *full* restart of Faye is required!");
    } catch(err) {
        message.reply('There was an error with that! Sending you the error now...');
        message.author.send("Hey! Here's the error:\n```\n" + err + "```");
    }
}

module.exports = {
    name: 'database',
    description: 'DEV ONLY - Manage the databases.',
    options: [],
    hideInHelp: true,
    disableSlashCommand: true,
    dmOnly: false,
    execute(message, args) {
        if(message.author.id != config.developerID) return;
        if(!args[0]) return;
        if(!args[1]) return;

        if(args[0] == 'reset') return resetDatabase(message, args[1]);
    }
}