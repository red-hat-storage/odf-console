import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { i18nextToPo } from 'i18next-conv';
import minimist from 'minimist';
import * as common from './common.mjs';

// __dirname is not defined by default in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function save(target) {
  return (result) => {
    fs.writeFileSync(target, result);
  };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function removeValues(i18nFile, filePath) {
  const file = loadJson(i18nFile);

  const updatedFile = {};

  const keys = Object.keys(file);

  for (let i = 0; i < keys.length; i++) {
    updatedFile[keys[i]] = '';
  }

  const tmpFile = fs.openSync(filePath, 'w');

  fs.writeFileSync(tmpFile, JSON.stringify(updatedFile, null, 2));
}

async function consolidateWithExistingTranslations(
  filePath,
  fileName,
  language
) {
  const englishFile = loadJson(filePath);
  const englishKeys = Object.keys(englishFile);

  const existingTranslationsPath = `../../locales/${language}/${fileName}.json`;
  const existingTranslationsFullPath = path.join(
    __dirname,
    existingTranslationsPath
  );

  if (fs.existsSync(existingTranslationsFullPath)) {
    const existingTranslationsFile = loadJson(existingTranslationsFullPath);
    const existingKeys = Object.keys(existingTranslationsFile);
    const matchingKeys = englishKeys.filter(
      (k) => existingKeys.indexOf(k) > -1
    );

    for (let i = 0; i < matchingKeys.length; i++) {
      englishFile[matchingKeys[i]] = existingTranslationsFile[matchingKeys[i]];
    }

    fs.writeFileSync(filePath, JSON.stringify(englishFile, null, 2));
  }
}

async function processFile(fileName, language) {
  let tmpFile;
  let dirPath;
  const i18nFile = path.join(__dirname, `../../locales/en/${fileName}.json`);

  console.log(`Current dirname: ${__dirname}`);

  try {
    if (fs.existsSync(i18nFile)) {
      dirPath = path.join(__dirname, '../../locales/tmp');

      fs.mkdirSync(dirPath, { recursive: true });

      tmpFile = path.join(__dirname, `../../locales/tmp/${fileName}.json`);

      await removeValues(i18nFile, tmpFile);
      await consolidateWithExistingTranslations(tmpFile, fileName, language);

      fs.mkdirSync(path.join(__dirname, `../../po-files/${language}`), {
        recursive: true,
      });
      i18nextToPo(language, fs.readFileSync(tmpFile), {
        language,
        foldLength: 0,
        ctxSeparator: '~',
      })
        .then(
          save(
            path.join(
              __dirname,
              `../../po-files/${language}/${path.basename(fileName)}.po`
            ),
            language
          )
        )
        .catch((e) => console.error(fileName, e));
    }
  } catch (err) {
    console.error(`Failed to processFile ${fileName}:`, err);
  }
  common.deleteFile(tmpFile);
  common.deleteDir(dirPath);
  console.log(`Processed ${fileName}`);
}

const options = {
  string: ['language', 'package', 'file'],
  boolean: ['help'],
  array: ['files'],
  alias: {
    h: 'help',
    p: 'package',
    f: 'files',
    l: 'language',
  },
  default: {
    files: [],
  },
};

const args = minimist(process.argv.slice(2), options);

if (args.help) {
  console.log(
    "-h: help\n-l: language (i.e. 'ja')\n-f: file name to convert (i.e. 'nav')"
  );
} else if (args.files && args.language) {
  if (Array.isArray(args.files)) {
    for (let i = 0; i < args.files.length; i++) {
      await processFile(args.files[i], args.language);
    }
  } else {
    await processFile(args.files, args.language);
  }
}
