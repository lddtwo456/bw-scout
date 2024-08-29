const fetch = require('node-fetch');
const fs = require('fs').promises;

class playerScout {
  static players = [];
  static playerAddedListeners = [];
  static playerRemovedListeners = [];
  static playersResetListeners = [];

  static addPlayer(name) {
    playerScout.players.push(new player(name));
    playerScout.playerAddedListeners.forEach(listener => listener(name));
  }

  static removePlayer(name) {
    playerScout.players = playerScout.players.filter(item => item.name != name);
    playerScout.playerRemovedListeners.forEach(listener => listener(name));
  }

  static removeAll() {
    playerScout.players = [];
    playerScout.playersResetListeners.forEach(listener => listener());
  }

  static getPlayerData(name) {
    return playerScout.players.find(person => person.name === name);
  }

  static onPlayerAdded(fnc) {
    playerScout.playerAddedListeners.push(fnc);
  }

  static onPlayerRemoved(fnc) {
    playerScout.playerRemovedListeners.push(fnc);
  }

  static onPlayersReset(fnc) {
    playerScout.playersResetListeners.push(fnc);
  }
}

class player {
  constructor (name) {
    this.name = name;
    this.uuid = null;

    // api key
    this.key = null;

    // player stats
    this.finals = null;
    this.final_deaths = null;
    this.fkdr = null;

    this.wins = null;
    this.losses = null;
    this.wlr = null;

    this.beds_broken = null;
    this.beds_lost = null;
    this.bblr = null;

    this.exp = null;
    this.star = null;

    this.winstreak = null;

    // tells the gui if the stats have been updated yet to be displayed
    this.updated = false;

    //console.log('initializing player '+name)
    this.init();
  }

  async init() {
    // get player's UUID for hypixel api from mojang api
    //console.log('getting uuid of '+this.name);
    if (!this.uuid) {
      this.uuid = await this.getUUID();
    }

    //console.log('uuid='+this.uuid);

    // get api key from apikey.txt (in .gitignore, get your own)
    //console.log('getting api key');
    try {
      const data = await fs.readFile('./src/apikey.txt', 'utf8');
      this.key = data.trim();
    } catch (err) {
      console.error('Error reading API key:', err);
    }
    //console.log('apikey='+this.key);

    // get bedwars stats
    console.log('getting stats of player '+this.name)
    const stats = await this.getStats();

    this.finals = stats.final_kills_bedwars;
    this.final_deaths = stats.final_deaths_bedwars;
    this.fkdr = this.finals/this.final_deaths;
    
    this.wins = stats.wins_bedwars;
    this.losses = stats.losses_bedwars;
    this.wlr = this.wins/this.losses;

    this.beds_broken = stats.beds_broken_bedwars;
    this.beds_lost = stats.beds_lost_bedwars;
    this.bblr = this.beds_broken/this.beds_lost;

    this.exp = stats.experience;
    this.level = Math.floor(this.exp/5000);

    try {
      this.winstreak = stats.winstreak;
    } catch (err) {
      console.error('error fetching winstreak: '+err);
    }

    console.log('\n'+this.name+'\n');
    console.log('fkdr: '+this.fkdr);
    console.log('wlr: '+this.wlr);
    console.log('bblr: '+this.bblr);
    console.log('star: '+this.star);
    console.log('winstreak: '+this.winstreak);
  }

  async getStats() {
    const url = 'https://api.hypixel.net/player?key='+this.key+'&uuid='+this.uuid;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const bedwarsStats = data.player.stats.Bedwars;
        return bedwarsStats;
      } else {
        console.error('Error fetching data:', data.cause);
        return null;
      }
    } catch (error) {
      console.error('Error making request:', error);
      return null;
    }
  }

  async getUUID() {
    const url = 'https://api.mojang.com/users/profiles/minecraft/'+this.name;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.id) {
        return data.id;
      } else {
        console.error('Player '+this.name+' not found');
        return null;
      }
    } catch (error) {
      console.error('Error making request:', error);
      return null;
    }
  }
}

module.exports = playerScout;