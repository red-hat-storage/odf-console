const fs = require('fs');
const path = require('path');

module.exports = {
  deleteFile(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(`Failed to delete file ${filePath}:`, e);
    }
  },
  deleteDir(dirPath) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to delete directory ${dirPath}:`, e);
    }
  },
};
