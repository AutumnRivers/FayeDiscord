const { Constants } = require('discord.js');

const calculate = (content => {
    const value = new Function('return ' + content)();
    if(typeof value != 'number') return '??? - something went wrong...';
    return value.toString();
});

module.exports = {
    name: "calc",
    description: "Faye will do some basic math for you.",
    options: [
        {
            name: "problem",
            description: "The math problem you want Faye to solve, like 2 + 2",
            required: true,
            type: Constants.ApplicationCommandOptionTypes.STRING
        }
    ],
    disableSlashCommand: false,
    example: "faye!calc 2*3",
    execute(message, args) {
        message.reply(calculate(args.join('')))
    },
    executeInteraction(interaction) {
        const problem = interaction.options.get('problem').value
        interaction.reply(`The answer to ${problem} is ` + calculate(problem));
    }
}