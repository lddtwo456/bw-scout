const fs = require('fs');
const path = require('path');

class LogReader {
  constructor(folder_path) {
    this.folder_path = folder_path;
    this.file_path = null;
    this.previous_size = 0;
  }

  // initiates log file path
  async init() {
    this.file_path = await this.searchForLog(this.folder_path);
    this.startReading();
  }

  // starts reading log file
  startReading() {
    fs.watchFile(this.file_path, (curr, prev) => {
      if (curr.size > this.previous_size) {
        const stream = fs.createReadStream(this.file_path, {
          start: this.previous_size,
          end: curr.size,
          encoding: 'utf8',
        });

        stream.on('data', (chunk) => {
          console.log(chunk)
        })

        this.previous_size = curr.size;
      }
    });
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