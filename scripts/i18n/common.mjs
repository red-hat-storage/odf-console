import fs from 'fs';
import path from 'path';

export function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error(`Failed to delete file ${filePath}:`, e);
  }
}

export function deleteDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (e) {
    console.error(`Failed to delete directory ${dirPath}:`, e);
  }
}
