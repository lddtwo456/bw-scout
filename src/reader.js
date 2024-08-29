const fs = require('fs');
const path = require('path');
const playerScout = require('./playerScout')

class LogReader {
  constructor(folder_path) {
    this.folder_path = folder_path;
    this.file_path = null;
    this.previous_size = 0;

    // keeps if you are in a pregame lobby thus if you should be processing chat messages for names
    this.in_pregame = false;
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
          this.in_pregame = true;
          console.log('sent to mini server');
        } else if (this.in_pregame) { // check for if you just left a pregame
          let i = 74;
          let shouldbreak = false;
          let hasrank = false;
          let grossmvppp = false; // mvp++ like to have annoying formatting so I'm being inclusive

          if (line.substring(74, 76) == ' o') {
            grossmvppp = true;
            i++; // increment becase for some reason they start with a space
          }

          //console.log('searching for left');
          while (i < line.length && !shouldbreak) {
            switch (line[i]) {
              case '[': // if player has a rank, you need to skip one space
                //console.log('hasrank')
                hasrank = true;
                break;
              case ' ':
                if (hasrank) { // skipping space for rank
                  //console.log('pastrank')
                  hasrank = false;
                } else if (grossmvppp) {
                  //console.log('pastdumformatting');
                  grossmvppp = false;
                } else { // made it past name
                  //console.log('found end');
                  shouldbreak = true;
                }
                break;
            }

            i++;
          }
          
          //console.log(line);
          //console.log(line.substring(i+4, i+21));
          if (line.substring(i+4, i+21) === 'joined the lobby!') {
            this.in_pregame = false;
            console.log('left mini');
          }
        }


        /*
        // check if /who usage
        if (line.substring(74, 82) === 'ONLINE: ') {
          this.processWho(line);
        }

        else {
          let i = 75;
          let shouldbreak = false;
          while (i < line.length && !shouldbreak) {
            switch (line[i]) {
              case '[': // is a message sent by a player
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
          if (line.substring(i, i+9) === 'has quit!') {
            let player_name = line.substring(74, i-1);
            this.removePlayer(player_name);
          } 
          else if (line.substring(i, i+12) === 'has joined (') {
            // tell reader to check for names sending chats
            this.in_pregame = true;

            let player_name = line.substring(74, i-1);
            console.log(line);
            // console.log("adding player "+player_name);
            console.log('cant currently scout players before match starts because of horrible bw update ;(');
            this.addPlayer(player_name);
          }
        }
        */
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
  }

  addPlayer(player_name) {
    playerScout.addPlayer(player_name);
  }

  removePlayer(player_name) {
    playerScout.removePlayer(player_name);
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