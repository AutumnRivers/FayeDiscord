// Config
const config = require('../config/main.json');

// FS
const fs = require('fs');
if(!fs.existsSync('./database/levels.db')) fs.writeFileSync('./database/levels.db', '');

// Database
const Database = require('nedb-revived');
const levels = new Database({ filename: './database/levels.db' });
levels.loadDatabase();

// Compacts the database so it doesn't take up 5 million lines
// NeDB only appends to the file and compacts it down when the file is loaded, but you can force it to compact at intervals
// For a system like this, this is perfect for cutting down on file size.
levels.persistence.setAutocompactionInterval(config.autoCompactInterval);

const baseLevelXP = 200;
const levelingChannel = '949857967749075014';

function dbToAwait(userID) {
    return new Promise(resolve => {
        levels.findOne({ userID: userID }, (error, data) => {
            resolve(data);
        });
    });
}

function checkReset() {
    if(global.resetDatabases['levels'] == true) levels.loadDatabase();
    if(global.resetDatabases['levels'] == true) global.resetDatabases['levels'] = false;
}

async function checkUser(message) {
    checkReset();
    const user = await dbToAwait(message.author.id);

    const defaultUserObject = {
        userID: message.author.id,
        xp: 0,
        level: 1,
        xpCooldown: 0,
        canEarnXP: true
    }

    if(!user) levels.insert(defaultUserObject);

    const currentTime = Date.now();
    const cooldown = user ? user.xpCooldown : 0;
    const userObject = user ? user : defaultUserObject;

    if(currentTime >= cooldown && userObject.canEarnXP === true) addUserXP(userObject, message.client);
}

async function addUserXP(user, client) {
    checkReset();
    const additionalReqXP = 150 * Math.floor(user.level / 5);
    const nextLevel = (baseLevelXP + (70 * (user.level - 1))) + additionalReqXP;
    const messageXP = Math.floor(Math.random() * (35 - 10 + 1)) + 10;

    const newCooldown = Date.now() + 30000; // Cooldown of 30 seconds

    const levelRoles = require('../config/levelroles.json');

    var newXP = user.xp + messageXP;
    var leveledUp = false;
    var newRole = '';
    var newRoleMsg = '';

    if(newXP > nextLevel) leveledUp = true;
    if(newXP > nextLevel) user.level++;
    if(leveledUp === true) newXP -= nextLevel;

    const config = require(`../config/main.json`);
    const guildObject = client.guilds.cache.find(guild => guild.id == config.mainGuildID);
    const channelObject = guildObject.channels.cache.find(ch => ch.id == levelingChannel);
    const guildMembers = await guildObject.members.fetch();
    const memberObject = guildMembers.find(member => member.id == user.userID);

    if(user.level % 5 === 0) if(levelRoles[`level${user.level}`]) newRole = guildObject.roles.cache.find(role => role.id == levelRoles[`level${user.level}`]);
    if(newRole) memberObject.roles.add(newRole);
    if(newRole) newRoleMsg = `They have received the **${newRole.name}** role! 🥳`;

    if(leveledUp === true) channelObject.send(`<@${user.userID}> has just **leveled up** to level ${user.level}! 🎉\n${newRoleMsg}`);

    levels.update({ userID: user.userID }, { $set: { xp: newXP, level: user.level, xpCooldown: newCooldown } });
}

async function toggleEarningXP(userID, canEarnXP) {
    checkReset();
    const user = await dbToAwait(userID);

    const defaultUserObject = {
        userID: userID,
        xp: 0,
        level: 1,
        xpCooldown: 0,
        canEarnXP: true
    }

    if(!user) levels.insert(defaultUserObject);

    levels.update({ userID: userID }, { $set: { canEarnXP: canEarnXP } });
}

async function getUser(userID) {
    checkReset();
    const user = await dbToAwait(userID);

    const defaultUserObject = {
        userID: userID,
        xp: 0,
        level: 1,
        xpCooldown: 0,
        canEarnXP: true
    }

    var userObject = user ? user : defaultUserObject;

    if(!user) levels.insert(defaultUserObject);

    const additionalReqXP = 150 * Math.floor(userObject.level / 5);
    const nextLevel = (baseLevelXP + (70 * (userObject.level - 1))) + additionalReqXP;

    userObject.nextLevelXP = nextLevel;

    return userObject;
}

module.exports.levelUser = checkUser;
module.exports.toggleEarningXP = toggleEarningXP;
module.exports.getUser = getUser;