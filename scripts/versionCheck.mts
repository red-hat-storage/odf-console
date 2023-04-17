import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as semver from 'semver';

const SUPPORTED_PLUGINS = ['odf', 'mco'];
const defaultVer = '0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validatePluginName = (pluginName) =>
  SUPPORTED_PLUGINS.includes(pluginName);

const pluginNameArgument = '--plugin';

const args = process.argv;

const indexOfPluginArgument = args.indexOf(pluginNameArgument);
const pluginToBeProcessed = args[indexOfPluginArgument + 1];

if (!validatePluginName(pluginToBeProcessed)) {
  throw new Error(`Invalid argument: '${pluginToBeProcessed}'`);
}
const pluginDir = `${__dirname}/../plugins/${pluginToBeProcessed}`;

const consolePlugin = JSON.parse(
  fs.readFileSync(`${pluginDir}/console-plugin.json`, {
    encoding: 'utf-8',
  })
);

const version = process.env['PLUGIN_VERSION'] || defaultVer;
const pluginFileName = `${pluginDir}/console-plugin.json`;
consolePlugin.version = semver.valid(version) || defaultVer;
fs.writeFileSync(pluginFileName, JSON.stringify(consolePlugin, null, 2));
fs.appendFileSync(pluginFileName, '\n');
