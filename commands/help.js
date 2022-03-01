const { MessageEmbed } = require("discord.js")

function buildEmbed(message) {
    const embedConfig = require('../config/helpembed.json');
    const version = require('../package.json').version;

    var fields = [];

    for(const command of global.commands) {
        var finalValue = command.value;
        var finalTitle = command.title;
        
        if(command.slashName) finalTitle += ' & /' + command.slashName;
        if(command.example) finalValue += `\n\nExample: \`${command.example}\``;

        fields.push({
            name: finalTitle,
            value: finalValue
        })
    }

    const helpEmbed = new MessageEmbed()
    .setColor(embedConfig.color)
    .setTitle(embedConfig.title)
    .addFields(fields)
    .setFooter({ text: `Faye v${version} - Official Stable Build`, iconURL: global.fayeAvatarURL });

    message.reply({ embeds: [helpEmbed] });
}

module.exports = {
    name: 'help',
    description: 'Need help with Faye? Run this command!',
    options: [],
    disableSlashCommand: false,
    dmOnly: false,
    execute(message) {
        buildEmbed(message);
    },
    executeInteraction(interaction) {
        buildEmbed(interaction);
    }
}