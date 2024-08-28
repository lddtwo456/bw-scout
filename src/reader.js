const fs = require('fs');
const path = require('path');
const playerScout = require('./playerScout')

class LogReader {
  constructor(folder_path) {
    this.folder_path = folder_path;
    this.file_path = null;
    this.previous_size = 0;

    // used when main run loop checks for new players, servers, etc
    this.new_server = false;
    this.new_players = [];
    this.removed_players = [];
  }

  // initiates log file path
  async init() {
    this.file_path = await this.searchForLog(this.folder_path);
    this.startReading();
  }

  // starts reading log file
  startReading() {
    let first_read = true;
    let lines = [];
    fs.watchFile(this.file_path, (curr, prev) => {
      if (curr.size > this.previous_size) {
        const stream = fs.createReadStream(this.file_path, {
          start: this.previous_size,
          end: curr.size,
          encoding: 'utf8',
        });

        stream.on('data', (chunk) => {
          if (!first_read) {
            lines = chunk.split('\n');
          
            for (const line of lines) {
              this.processLine(line);
            }
          } else {
            first_read = false;
          }
        })

        this.previous_size = curr.size;
      }
    });
  }

  // processes lines (I don't like nesting)
  processLine(line) {
    if (line) {
      // if loggesd event is a chat event
      if (line.substring(67, 73) == '[CHAT]') {
        // check if sent to new mini
        if (line.substring(74, 93) == 'Sending you to mini') {
          console.log('sent to mini server');
        }

        // check if message is sent by a player or is in a main lobby
        else {
          let i = 75;
          let shouldbreak = false;
          while (i < line.length && !shouldbreak) {
            switch (line[i]) {
              case '[': // isn't in a mini or is a message sent by a player
                return;
              case ':': // is a message sent by a player
                return;
              case ' ': // past name
                shouldbreak = true;
                break;
            }
            i++;
          }

          // check if message is someone joining or leaving
          if (line.substring(i, i+9) == 'has quit!') {
            let player_name = line.substring(74, i-1);
            this.removePlayer(player_name);
          }
          if (line.substring(i, i+12) == 'has joined (') {
            let player_name = line.substring(74, i-1);
            console.log("adding player "+player_name);
            this.addPlayer(player_name);
          }
        }
      }
    }
  }

  addPlayer(player_name) {
    playerScout.addPlayer(player_name);
  }

  removePlayer(player_name) {
    this.removed_players.push(player_name);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // searches for the latest log file
  async searchForLog(folder_path) {
    let recent_file = [];
    while (true) {
      console.log('reading folder...');
  
      // read the directory's contents
      const files = fs.readdirSync(folder_path);
  
      // filter directories and get full paths
      const file_paths = files
        .filter(file => fs.statSync(path.join(folder_path, file)).isFile()) // filters out non-files
        .map(file => path.join(folder_path, file)); // turns each file into it's full path
  
      console.log('searching...');
      recent_file = file_paths.filter(file_path => {
        const stats = fs.statSync(file_path);
        return Date.now() - stats.mtimeMs <= 1000;
      })
  
      if (recent_file.length > 0) {
        console.log('success!');
        console.log(recent_file[0]);
        return recent_file[0];
      }
      console.log('failed');
  
      // sleep half a second so the code doesn't explode your computer
      await this.sleep(500);
    }
  }
}

module.exports = LogReader;