const fs = require('fs');

async function giveAccess(message, channel) {
    const config = require(`../config/main.json`);
    const guildObject = global.fayeGuilds.cache.find(guild => guild.id == config.mainGuildID);
    const channelObject = guildObject.channels.cache.find(ch => ch.id == channel);
    const guildMembers = await guildObject.members.fetch();
    const memberObject = guildMembers.find(member => member.id == message.author.id);

    channelObject.permissionOverwrites.create(memberObject.id, { VIEW_CHANNEL: true }, { reason: 'Requested via Faye from selfchannel command', type: 1 });
}

module.exports = {
    name: 'selfchannel',
    description: 'DMs ONLY - Access a channel that typically needs a self-assigned role without needing said role! Perfect if you wanna go incognito.',
    options: [],
    disableSlashCommand: true,
    dmOnly: true,
    example: "faye!selfchannel lgbtqia",
    async execute(message, args) {
        if(message.channel.type !== 'DM') return message.delete();
        if(!args[0]) return message.reply('Woah, hold on there! You do not have any arguments! Change that, and I will get back to you, yeah?');

        const channelName = args[0];
        const file = require(`../config/selfchannels.json`);
        var channel = file.filter(channel => channel.name == channelName);

        if(!channel[0]) return message.reply('That self-channel does not exist!');

        if(channel[0].channelID.constructor.name == 'Array') {
            for(const channelID of channel[0].channelID) {
                giveAccess(message, channelID)
            }

            message.author.send('Gave you access to the channels! They should now be available to you under the "Special Channels" category! :)\n\nIf you would like to remove access, please contact a moderator!');
        } else {
            giveAccess(message, channel[0].channelID);
            message.author.send('Gave you access to the channel! Try it out: <#' + channel[0].channelID + '>\n\nIf you would like to remove access, please contact a moderator!');
        }
    }
}