const { Constants } = require("discord.js");
const config = require('../config/main.json');

async function kickMember(message, user, reason) {
    const faye = message.client;
    reason += ` - performed by ${message.author.tag}`;

    var isUserID;
    if(!isNaN(Number(user))) isUserID = true;

    const guildObject = faye.guilds.cache.find(guild => guild.id == config.mainGuildID);

    if(isUserID) {
        const guildMembers = await guildObject.members.fetch();
        const memberObject = guildMembers.find(member => member.id == user);

        if(!memberObject) return message.reply("Nope, sorry, couldn't find that user...");

        memberObject.kick(reason);
    } else {
        user.kick(reason);
    }

    message.reply('Kicked the user!');
}

module.exports = {
    name: 'kick',
    description: 'Kick a user! Simple nuff, right?',
    options: [],
    disableSlashCommand: true,
    hideInHelp: true,
    execute(message, args) {
        if(!message.mentions.members[0] && !args[0]) return message.reply("Well I can't just kick nobody!");
        const permsArray = message.member.permissions.toArray();
        if(!permsArray.find(perm => perm == 'KICK_MEMBERS')) return message.reply("❌ You're not allowed to run that command!");

        if(!message.mentions.members.first() && isNaN(Number(args[0]))) return message.reply("I don't see a user in your message... typo?");

        var user = message.mentions.members.first() || args[0];
        var reason = args.slice(1, args.length);

        kickMember(message, user, reason.join(' '));
    }
}