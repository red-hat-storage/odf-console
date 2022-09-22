This i18n-scripts directory contains all the required scripts for i18n automation. Also, the list of languages we are currently supporting are stored in `languages.sh`.

## Steps

1. Install: the [unofficial Memsource CLI client](https://github.com/unofficial-memsource/memsource-cli-client#pip-install).

2. Configure: [it with your Memsource login info](https://github.com/unofficial-memsource/memsource-cli-client#configuration-red-hat-enterprise-linux-derivatives).

3. Log in: once above two steps are completed, run `source ~/.memsourcerc`.

4. Upload translations: you need to create a new project using your project's template. Each template will have its own unique id and an owner (example: for odf-console, name of our template is "OCP ODF UI" and id is "193065").
   Run `yarn memsource-upload -v <VERSION> -s <SPRINT>`.
   This script will create a new project for you and will call `export-pos.sh` and `i18n-to-po.js` which will export all i18next `.json` files in `.po` format in all the languages we currently support, and will upload these `.po` files under newly created project on Memsource.

5. Download translations: for downloading we download all files in `.po` format and then convert into `.json`.
   Run `yarn memsource-download -p <PROJECT_ID>` (example: from the Memsource project URL "https://cloud.memsource.com/web/project2/show/FBfZeTEWPYaC4VXhgrW0R2" the series of numbers and letters after /show/).
   This script will download/convert and store all the required files under `/locales/${LANGUAGE}/` directory.
