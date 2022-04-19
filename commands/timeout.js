const { Constants } = require("discord.js");
const config = require('../config/main.json');

function timeoutMember(member) {
    member.timeout(600000, "Sent that mf straight to hell")
    .catch(err => {
        console.error('timeout failed lol');
    })
}

module.exports = {
    name: 'timeout',
    description: 'Timeout a user. Not meant to be used seriously.',
    options: [],
    hideInHelp: true,
    dsiableSlashCommand: true,
    async execute(message) {
        const repliedTo = await message.fetchReference();
        timeoutMember(repliedTo.member);
    }
}