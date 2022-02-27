// Constants
const commandDescs = [];

// Globals
global.fayeGuilds;
global.commands = [];
global.fayeAvatarURL;

// Built-in modules
const fs = require('fs');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const presences = require('./config/presences.json');

// Discord.JS
const Discord = require('discord.js');
const config = require('./config/main.json');
const prefix = config.prefix;
const Intents = Discord.Intents;
const faye = new Discord.Client({
    presence: config.presence,
    userAgentSuffix: [
        config.userAgent
    ],
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_WEBHOOKS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ],
    partials: [
        'CHANNEL',
        'GUILD_MEMBER'
    ]
});

faye.commands = new Discord.Collection(); // Is there a reason this isn't in the documentation? Was it ever in the documentation???

const token = process.env.FAYE_TOKEN; // This is the Discord bot token

// Set commands
const setCommands = async _ => {
    // Register the commands for Faye
    console.log(commandFiles);
    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        faye.commands.set(cmd.name, cmd);

        if(cmd.hideInHelp) continue;
        global.commands.push({ title: cmd.name, value: cmd.description, example: cmd.example })
        if(cmd.disableSlashCommand) continue;

        await faye.application.commands.create({
            name: cmd.name,
            description: cmd.description,
            options: cmd.options
        })
    }
}

const setSlashCommands = async () => {
    try {
        console.log('Refreshing Faye\'s Slash Commands! This won\'t take long...');

        await setCommands();

        console.log('Faye\'s Slash Commands successfully registered!')
    } catch(error) {
        console.error('Faye\'s Slash Commands could not be initialized properly! Notifying developer...');
        handleError(error);
    }
};

// Presences
const forceUpdatePresence = () => {
    const selectedPresence = presences[Math.floor(Math.random() * presences.length)];
    faye.user.setActivity(selectedPresence);
}

setInterval(forceUpdatePresence, config.presenceUpdateInterval); // Update presence every 30 minutes

// Notify that Faye is ready
faye.on('ready', async () => {
    setSlashCommands();
    global.fayeGuilds = faye.guilds;
    global.fayeAvatarURL = faye.user.avatarURL();
    console.log('Faye is successfully logged into Discord and ready to roll!');
});

faye.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return;

    try {
        faye.commands.get(interaction.commandName).executeInteraction(interaction);
    } catch(error) {
        interaction.channel.send('There was an error with your command! Do not worry, it has been reported to the developer :)');
        handleError(error);
    }
})

faye.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;
    var selectedRoles = [];

    for(const role of interaction.values) {
        var roleObject = interaction.guild.roles.cache.find(roleObj => roleObj.id === role);

        if(!roleObject) continue;

        selectedRoles.push(role);
        interaction.member.roles.add(roleObject, 'Requested via Faye');
    }

    for(const option of interaction.component.options) {
        const roleWasSelected = selectedRoles.find(roleID => roleID == option.value);
        const roleObject = interaction.guild.roles.cache.find(roleObj => roleObj.id === option.value);

        if(!roleWasSelected) interaction.member.roles.remove(roleObject, 'Deselected in Faye Menu');
    }

    interaction.reply({ content: 'Updated your roles for you! Looking snazzy!', ephemeral: true });

    return;
});

faye.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if(interaction.customId.startsWith('accept')) {
        const roleID = interaction.customId.split('_')[1];
        const guildObject = faye.guilds.cache.find(guild => guild.id == config.mainGuildID);
        const roleObject = guildObject.roles.cache.find(role => role.id == roleID);
        const guildMembers = await guildObject.members.fetch();
        const memberObject = guildMembers.find(member => member.id == interaction.user.id);

        memberObject.roles.add(roleObject, 'User accepted terms via Faye with Access command');

        interaction.update({ content: "Awesome, we're happy to have you! You can access the channel now. If you ever want to remove access, run the command again and deny the erms.", components: [] });
    } else if(interaction.customId.startsWith('deny')) {
        const roleID = interaction.customId.split('_')[1];
        const guildObject = faye.guilds.cache.find(guild => guild.id == config.mainGuildID);
        const roleObject = guildObject.roles.cache.find(role => role.id == roleID);
        const guildMembers = await guildObject.members.fetch();
        const memberObject = guildMembers.find(member => member.id == interaction.user.id);

        memberObject.roles.remove(roleObject, 'User denied terms via Faye with Access command');

        interaction.update({ content: "Okay - you won't have access to that channel, then! If this was a mistake, feel free to run the command again.", components: [] });
    }
})

faye.on('messageCreate', (message) => {
    if(!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        if(command == 'updatepresence') {
            const permsArray = message.member.permissions.toArray();
            if(!permsArray.find(perm => perm == 'ADMINISTRATOR')) {
                message.reply('🚫 You\'re not allowed to run that command, sorry!')
            } else {
                forceUpdatePresence();
                message.channel.send('Activity updated! Please note the timer is still running, so you might see me get updated in a bit, too!')
            }
        } else if(command == 'restart') {
            if(message.author.id != config.developerID) {
                return message.reply('🚫 You\'re not allowed to run that command, sorry!');
            } else {
                faye.application.commands.set([]);
                message.channel.send('Faye has been restarted!')
            }
        }

        const commandObject = faye.commands.get(command);

        if(!commandObject) return;

        commandObject.execute(message, args);
    } catch(error) {
        message.channel.send('There was an error with your command! Do not worry, it has been reported to the developer :)');
        handleError(error);
    }
});

faye.on('messageReactionAdd', (reaction, user) => {

})

function handleError(error) {
    console.error('An error occured with Faye!\n' + error);
}

faye.login(token); // Logs Faye into Discord