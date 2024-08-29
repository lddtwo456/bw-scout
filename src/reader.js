const fs = require('fs');
const path = require('path');
const playerScout = require('./playerScout')

class LogReader {
  constructor(folder_path) {
    this.folder_path = folder_path;
    this.file_path = null;
    this.previous_size = 0;

    // runtime state
    this.in_pregame = false;
    this.checked_who = false;
  }

  // initiates log file path
  async init() {
    this.file_path = await this.searchForLog(this.folder_path);
    this.startReading();
  }

  // starts reading log file
  startReading() {
    fs.writeFile(this.file_path, '', (err) => {
      if (err) throw err;
      console.log('log cleared');
    })

    let lines = [];
    fs.watchFile(this.file_path, (curr, prev) => {
      if (curr.size > this.previous_size) {
        const stream = fs.createReadStream(this.file_path, {
          start: this.previous_size,
          end: curr.size,
          encoding: 'ascii',
        });

        stream.on('data', (chunk) => {
          lines = chunk.split('\n');
          
          for (const line of lines) {
            this.processLine(line);
          }
        })

        this.previous_size = curr.size;
      }
    });
  }

  // processes lines (I don't like nesting)
  processLine(line) {
    if (line) {
      // if logged event is a chat event
      if (line.substring(67, 73) === '[CHAT]') {
        // check if sent to new mini
        if (line.substring(74, 93) === 'Sending you to mini') {
          this.in_game = true;
          this.removeAll();
          console.log('sent to mini server');
        } 
        else if (this.in_game) {
          // checking first to see if you left the pregame lobby
          // lines only have color formatting in lobbies for some reason
          let first2 = line.substring(74, 76);
          if (first2 == 'o?' || first2 == ' o') {
            this.in_game = false;
            this.removeAll();
            console.log('left mini');
            return; // exit function
          }

          // check for /who but only if /who hasn't been checked yet
          if (!this.checked_who) {
            // separated if statements mean I'm not calling string.substring() unnecessarily
            if (line.substring(74, 82) === 'ONLINE: ') {
              this.processWho(line);
            }
          }

          // check for players who are final killed but only after player data has been fetched
          if (this.checked_who) {
            if (line.endsWith('FINAL KILL!')) {
              this.removePlayer(line.substring(74, line.length).split(' ')[0]);
            }
          }
        }
      }
    }
  }

  // process /who usages
  processWho(line) {
    let i = 82;
    let name = '';
    while (i < line.length) {
      if (line[i] == ',') {
        this.addPlayer(name);
        name = '';
      } else if (line[i] == ' ') {
        name = '';
      } else {
        name += line[i];
      }

      i++;
    }
    this.addPlayer(name);
  }

  addPlayer(player_name) {
    playerScout.addPlayer(player_name);
  }

  removePlayer(player_name) {
    playerScout.removePlayer(player_name);
  }

  removeAll() {
    playerScout.removeAll();
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