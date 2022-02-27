module.exports = {
    name: "ping",
    description: "A fun little command to see if Faye is running.",
    options: [],
    disableSlashCommand: false,
    execute(message, args) {
        message.reply('Pong!');
    },
    executeInteraction(interaction) {
        interaction.reply('Pong!');
    }
};