// Constants
const commandDescs = [];

// Globals
global.fayeGuilds;
global.commands = [];
global.fayeAvatarURL;

// Built-in modules
const fs = require('fs');
const http = require('http');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const presences = require('./config/presences.json');

// Discord.JS
const Discord = require('discord.js');
const config = require('./config/main.json');
var prefix = config.prefix;
if(process.env.NODE_ENV == 'dev') prefix = config.devPrefix;
const Intents = Discord.Intents;
const faye = new Discord.Client({
    presence: presences[Math.floor(Math.random() * presences.length)],
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
faye.aliases = new Discord.Collection();

const token = process.env.FAYE_TOKEN; // This is the Discord bot token

// Set commands
const setCommands = async _ => {
    // Register the commands for Faye
    for (const file of commandFiles) {
        const cmd = require(`./commands/${file}`);
        faye.commands.set(cmd.name, cmd);

        if(cmd.hideInHelp) continue;
        global.commands.push({ title: cmd.name, value: cmd.description, example: cmd.example, slashName: cmd.slashName })
        if(cmd.disableSlashCommand) continue;

        await faye.application.commands.create({
            name: cmd.slashName ? cmd.slashName : cmd.name,
            description: cmd.description,
            options: cmd.options
        });
        faye.aliases.set(cmd.slashName, cmd);
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
    await setSlashCommands();
    global.fayeGuilds = faye.guilds;
    global.fayeAvatarURL = faye.user.avatarURL();
    console.log('Faye is successfully logged into Discord and ready to roll!');

    faye.user.id == config.clientID ? console.log('Logged in as stable!') : faye.user.id == config.devClientID ? console.log('Logged in as dev!') : console.log("I'm not sure what I'm logged in as...");
});

faye.on('interactionCreate', async interaction => {
    if(!interaction.isCommand()) return;

    try {
        var commandObj = faye.commands.get(interaction.commandName);
        if(!commandObj) commandObj = faye.aliases.get(interaction.commandName)
        commandObj.executeInteraction(interaction);
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
    } else if(interaction.customId.startsWith('unban')) {
        const userID = interaction.customId.split('_')[1];
        const guildObject = faye.guilds.cache.find(guild => guild.id == config.mainGuildID);
        const permsArray = interaction.member.permissions.toArray();
        if(!permsArray.find(perm => perm == 'BAN_MEMBERS')) return interaction.reply({ content: "You can't do that!", ephemeral: true });
        guildObject.bans.remove(userID, 'Unbanned via Faye undo button');     
        interaction.reply({ content: 'Unbanned the user!', ephemeral: true });
    }
})

faye.on('messageCreate', (message) => {
    if(!message.content.toLowerCase().startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        if(command == 'updatepresence') {
            if(message.author.id != config.developerID) {
                message.reply('🚫 You\'re not allowed to run that command, sorry!')
            } else {
                forceUpdatePresence();
                message.channel.send('Activity updated! Please note the timer is still running, so you might see me get updated in a bit, too!')
            }
        } else if(command == 'restart') {
            if(message.author.id != config.developerID) {
                return message.reply('🚫 You\'re not allowed to run that command, sorry!');
            } else {
                message.channel.send('Faye is restarting...')
                process.kill();
            }
        } else if(command == 'testgreeting') {
            if(message.author.id != config.developerID) {
                return message.reply('🚫 You\'re not allowed to run that command, sorry!');
            } else {
                const greeting = fs.readFileSync('./messages/greeting.txt');
                console.log(greeting);
                message.member.send(greeting.toString());
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

faye.on('guildMemberAdd', (member) => {
    const greeting = fs.readFileSync('./messages/greeting.txt');
    try {
        member.send(greeting.toString());
    } catch(err) {
        handleError(err);
    }
});

faye.on('guildMemberRemove', async (member) => {
    const fetchedLog = await member.guild.fetchAuditLogs({ limit: 1, type: 'MEMBER_KICK' });
    const kickLog = fetchedLog.entries.first();

    if(!kickLog) return;

    const modUser = kickLog.executor;
    const user = kickLog.target;

    if(kickLog.createdAt < member.joinedAt) return;

    if(user.id == member.id) {
        const modlog = member.guild.channels.cache.find(ch => ch.id == config.modlogID);

        const modlogEmbed = new Discord.MessageEmbed()
        .setColor('#f0f078')
        .setTitle(`${modUser.tag} just gave a user the boot!`)
        .setDescription(`🚪 **Kicked** ${user.tag}\n🤔 **Reason**: ${kickLog.reason}`)
        .setFooter({ text: "⚠ This action cannot be undone." });

        modlog.send({ embeds: [modlogEmbed] });
    }
})

faye.on('guildBanAdd', async (ban) => {
    const user = ban.user;
    const modlog = ban.guild.channels.cache.find(ch => ch.id == config.modlogID);
    const banLog = await ban.guild.fetchAuditLogs({ type: 'MEMBER_BAN_ADD', limit: 1 });
    var reason = ban.reason;
    var modUser;

    const latestBan = banLog.entries.first();

    latestBan ? modUser = latestBan.executor.tag : modUser = 'Somebody...';

    if(!modlog) return console.error('Error! Modlog channel not found :( Panic maybe?');
    if(!reason) reason = 'No reason specified... oh, the humanity!';

    const modlogEmbed = new Discord.MessageEmbed()
    .setColor('#d44f4a')
    .setTitle(`${modUser} just threw down the ban hammer!`)
    .setDescription(`🔨 **Banned** ${user.tag}\n🤔 **Reason**: ${latestBan.reason}`)
    .setFooter({ text: "⚠ Was this action a mistake? Push the button below to undo it!" });

    const row = new Discord.MessageActionRow()
    .addComponents(
        new Discord.MessageButton()
        .setCustomId(`unban_${ban.user.id}`)
        .setLabel(`Unban ${user.username}`)
        .setStyle('SECONDARY')
        .setEmoji('⚠')
    );

    const modlogMsg = await modlog.send({ components: [row], embeds: [modlogEmbed] });

    const msgEditTimeout = setTimeout(() => {
        modlogMsg.delete();
        modlogEmbed.footer.text = "⌚ The ability to undo this has timed out.";
        modlog.send({ embeds: [modlogEmbed], components: [] });
    }, 600000);

    const filter = interaction => interaction.customId == `unban_${user.id}` && interaction.member.permissions.toArray().includes('BAN_MEMBERS');
    modlog.awaitMessageComponent({ filter: filter, componentType: 'BUTTON' })
    .then(interaction => {
        modlogMsg.delete();

        const editedEmbed = new Discord.MessageEmbed()
        .setColor('#32a852')
        .setTitle(`${interaction.user.tag} undid the ban!`)
        .setDescription(`🤗 **Unbanned** ${user.tag}\n🤔 **Reason**: Undone with Faye`)
        .setFooter({ text: "⚠ This action can only be undone with Faye." });

        modlog.send({ embeds: [editedEmbed], components: [] });
        clearTimeout(msgEditTimeout);
    });
});

function handleError(error) {
    console.trace(`An error occured with Faye! Do not worry, it has been caught :)\n${error}`);
};

faye.login(token); // Logs Faye into Discord

http.createServer((req, res) => {
    res.write("Faye's here to help!");
    res.end()
}).listen(process.env.PORT || 80);