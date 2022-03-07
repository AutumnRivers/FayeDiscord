const { MessageEmbed } = require('discord.js');
const leveling = require('../modules/level_system');

const version = require('../package.json').version;
const build = process.env.NODE_ENV == 'dev' ? 'Development' : 'Stable';

async function showLevel(message) {
    const authorID = message.author ? message.author.id : message.member.id;
    const discordUser = message.author ? message.author : message.member.user;
    const user = await leveling.getUser(authorID);

    const embedFields = [
        {
            name: 'Level',
            value: String(user.level)
        },
        {
            name: 'Current XP',
            value: String(user.xp)
        },
        {
            name: 'XP For Next Level',
            value: String(user.nextLevelXP)
        }
    ]

    const levelEmbed = new MessageEmbed()
    .setColor('#1982fa')
    .setTitle(`${discordUser.tag}'s Faye Rank`)
    .setFields(embedFields)
    .setFooter({ text: `Faye v${version} - Official ${build} Build`, iconURL: global.fayeAvatarURL });

    message.reply({ embeds: [levelEmbed] });
}

module.exports = {
    name: 'level',
    description: "View your current level and EXP in the server, also views what special perms you get :)",
    options: [],
    disableSlashCommand: false,
    dmOnly: false,
    execute(message) {
        showLevel(message);
    },
    executeInteraction(interaction) {
        showLevel(interaction);
    }
}