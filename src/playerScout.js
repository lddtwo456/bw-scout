const fetch = require('node-fetch');
const fs = require('fs').promises;

class playerScout {
  static players = [];
  static playerAddedListeners = [];

  static addPlayer(name) {
    playerScout.players.push(new player(name));
    playerScout.playerAddedListeners.forEach(listener => listener(name))
  }

  static onPlayerAdded(fnc) {
    playerScout.playerAddedListeners.push(fnc)
  }
}

class player {
  constructor (name) {
    this.name = name;
    this.uuid = null;

    // api key
    this.key = null;

    // player stats
    this.finals = 0;
    this.final_deaths = 0;

    // tells the gui if the stats have been updated yet to be displayed
    this.updated = false;

    console.log('initializing player '+name)
    this.init();
  }

  async init() {
    // get player's UUID for hypixel api from mojang api
    console.log('getting uuid of '+this.name);
    this.uuid = await this.getUUID();

    console.log('uuid='+this.uuid);

    // get api key from apikey.txt (in .gitignore, get your own)
    console.log('getting api key');
    try {
      const data = await fs.readFile('./src/apikey.txt', 'utf8');
      this.key = data.trim();
    } catch (err) {
      console.error('Error reading API key:', err);
    }
    console.log('apikey='+this.key);

    // get bedwars stats
    console.log('getting stats of player '+this.name)
    const stats = await this.getStats();

    console.log(stats);
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