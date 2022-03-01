const { Constants } = require('discord.js');

module.exports = {
    name: 'say',
    description: 'Developer Only - Make Faye say something!',
    options: [],
    disableSlashCommand: true,
    hideInHelp: true,
    execute(message, args) {
        const config = require(`../config/main.json`);
        if(message.author.id !== config.developerID) return message.reply('🚫 You\'re not allowed to run that command, sorry!');
        if(!args[0]) return message.reply('Woah, hold on there! You do not have any arguments! Change that, and I will get back to you, yeah?');

        message.channel.send(args.join(' '));
        message.delete();
    }
}