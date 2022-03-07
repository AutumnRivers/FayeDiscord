const fs = require('fs/promises');
const config = require('../config/main.json');
const Database = require('nedb-revived');

function awaitDeletion(dbfile) {
    return new Promise(resolve => {
        dbfile.remove({}, {multi: true} , (error, num) => {
            resolve(num);
        })
    });
}

async function resetDatabase(message, dbFilename) {
    var dbFileExists = await fs.readFile(`./database/${dbFilename}.db`);
    if(dbFileExists.toString() == '') return message.reply("That database either doesn't exist or has already been reset!");

    try {
        //await fs.writeFile(`./database/${dbFilename}.db`, '');
        const db = new Database({ filename: `./database/${dbFilename}.db` });
        db.loadDatabase();
        await awaitDeletion(db);

        global.resetDatabases[dbFilename] = true;

        message.reply("That database has been reset. Remember to compact the database with `faye!database compact`!");
    } catch(err) {
        message.reply('There was an error with that! Sending you the error now...');
        message.author.send("Hey! Here's the error:\n```\n" + err + "```");
    }
}

async function compactDatabase(message, dbFilename) {
    var dbFileExists = await fs.readFile(`./database/${dbFilename}.db`);
    if(dbFileExists.toString() == '') return message.reply("That database either doesn't exist or there's nothing to compact!");

    try {
        const db = new Database({ filename: `./database/${dbFilename}.db` });
        db.loadDatabase();

        db.persistence.compactDatafile();

        message.reply("Forcefully compacted the data file! 🛠")
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
        if(args[0] == 'compact') return compactDatabase(message, args[1]);
    }
}