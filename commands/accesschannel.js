const { MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');

async function createButtons(message, channel) {
    const row = new MessageActionRow();
    row.addComponents([
        new MessageButton()
        .setCustomId(`accept_${channel.roleID}`)
        .setLabel('Accept Terms')
        .setStyle('SUCCESS')
        .setEmoji('🔞'),
        new MessageButton()
        .setCustomId(`deny_${channel.roleID}`)
        .setLabel('Deny Terms')
        .setStyle('DANGER')
        .setEmoji('✖')
    ]);

    message.channel.send({ content: channel.terms, components: [row] });
}

module.exports = {
    name: 'access',
    description: 'DMs ONLY - Access a channel that requires terms. Assigns a role to you.',
    options: [],
    disableSlashCommand: true,
    dmOnly: true,
    example: "faye!access nsfw",
    execute(message, args) {
        if(message.channel.type !== 'DM') return message.delete();
        if(!args[0]) return message.reply('Woah, hold on there! You do not have any arguments! Change that, and I will get back to you, yeah?');

        const channelName = args[0];
        const file = require(`../config/accesschannels.json`);
        var channel = file.filter(channel => channel.name == channelName);

        if(!channel[0]) return message.reply('That self-channel does not exist!');

        createButtons(message, channel[0]);
    }
}