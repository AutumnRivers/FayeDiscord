<div align="center">
<img src="./assets/FayeBanner.png" alt="Faye banner">
</div>

---

<div align="center">
<a href="https://discord.gg/2w9VTE7">
<img src="https://img.shields.io/discord/690340526603632661?color=%237289da&label=Discord&logo=discord&logoColor=white" alt="Discord">
</a>
</div>

---

## Who/What is Faye?
Faye is a Discord bot made for [Autumn's Galaxy](https://discord.gg/2w9VTE7) that's designed as a personal assistant to the members and moderators! Faye is an all-in-one Discord bot that can do anything from creating role menus, to timing out users, to playing a game of Wordle in Discord! And the best part? Its creator doesn't support NFTs!

## How do I set up Faye?
After changing role IDs and such in the `/config` folder, you should be able to just run `npm start`/`yarn start` and get going!

## Does Faye require a database?
At time of writing, Faye uses [NeDB Revived](https://github.com/dills122/nedb) for its Wordle feature. A database file is used for leaderboard purposes. You can make one in `/database/wordle_leaderboards.db`.  
  
A database file is also used for the leveling system. Same folder, different file name: `/database/levels.db`

## Can I invite Faye to my server?
Unfortunately, no. Faye is built from the ground up to only be used with one specific server. However, the code is here, so you can edit the code to your liking and host your own instance of Faye!

## Is Faye hard to host?
Nope, in fact, Faye has files making it all ready to go with Heroku! You can deploy it instantly!

---

## Setup Requirements

* [Discord.js](https://discord.js.org/) v13+, older versions will *not* work.
* Node.JS v16+, older versions have not been tested

* Rename each `*_blank.db` file to just `*.db`. (eg, Rename `levels_blank.db` to `levels.db`)

After you've got all that, just run `yarn`/`npm isntall`!