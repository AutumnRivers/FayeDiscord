const { MessageEmbed } = require('discord.js');
const fs = require('fs/promises');
const version = require('../package.json').version;

const build = process.env.NODE_ENV == 'dev' ? 'Development' : 'Stable';

async function showChangelog(message) {
    const currentVersion = await fs.readFile(`./changelog/${version}.txt`);

    const changelogEmbed = new MessageEmbed()
    .setTitle('Faye Changelog - ' + version)
    .setDescription(currentVersion.toString())
    .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

    message.reply({ embeds: [changelogEmbed] });
}

module.exports = {
    name: 'changelog',
    description: "What's new, Faye-doo?",
    options: [],
    disableSlashCommand: false,
    dmOnly: false,
    hideInHelp: false,
    execute(message) {
        showChangelog(message);
    },
    executeInteraction(interaction) {
        showChangelog(interaction);
    }
}