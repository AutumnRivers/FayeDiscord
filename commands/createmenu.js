const { Constants, MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');
const fs = require('fs');

async function createMenu(message, file, filename) {

    const roleOptions = await parseRoles(file);

    const row = new MessageActionRow();
    row.addComponents(
        new MessageSelectMenu()
        .setCustomId(filename)
        .setPlaceholder('Nothing selected, how boring!')
        .setMinValues(0)
        .setMaxValues(file.roles.length)
        .addOptions(roleOptions)
    );

    const embed = new MessageEmbed();
    embed.setColor(file.color)
    .setTitle(file.title)
    .setDescription(file.desc)

    message.channel.send({ embeds: [embed], components: [row] });
    message.delete();
}

async function parseRoles(file) {
    const rolesArray = file.roles;
    var roleOptions = []

    for(role in rolesArray) {
        const roleObject = rolesArray[role];

        roleOptions.push({
            label: roleObject.name,
            emoji: {
                name: roleObject.icon
            },
            description: roleObject.description,
            value: roleObject.roleID
        })
    };

    return roleOptions;
}

module.exports = {
    name: "createmenu",
    description: "Create a menu from a roles list file. Must be an Admin or higher.",
    options: [
        {
            name: "filename",
            description: "The name of the file without the extension. Like 'gameroles'",
            required: true,
            type: Constants.ApplicationCommandOptionTypes.STRING
        }
    ],
    disableSlashCommand: true,
    execute(message, args) {
        const permsArray = message.member.permissions.toArray();
        if(!permsArray.find(perm => perm == 'ADMINISTRATOR')) return message.reply('🚫 You\'re not allowed to run that command, sorry!')
        if(!args[0]) return message.reply('Woah, hold on there! You do not have any arguments! Change that, and I will get back to you, yeah?')

        const fileName = args[0];
        const fileExists = fs.existsSync(`./config/${fileName}.json`);

        if(!fileExists) return message.reply('That file does not exist!');

        const file = require(`../config/${fileName}.json`);
        
        createMenu(message, file, fileName);
    }
}