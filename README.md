# Switch Scripts
This repository contain CMI Scripts for Enfocus Switch.
___
### Warning
In SwitchScripter select main.ts not main.js. 
Otherwise the ts file will be deleted when saving by SwitchScripter
See [Script folder structure](https://www.enfocus.com/manuals/DeveloperGuide/SW/20.1/home.html#en-us/common/swscr/concept/co_swscr_scriptfolderstructure.html)

___

## Preflight Transformer
The purpose of this script is to transform the response from a preflight into a PDF file that overlays alerts and messages.




## XMLExporter
The purpose of this script is to export all variables and datasets attached to a job in an XML file.



___
## Installations

#### Develop 

```sh
$ cd dev/[projectScript]
$ npm run transpile
```
open [projectScript] in SwitchScripter and save it


#### Production

```sh
$ cd dev/[projectScript]
$ npm run pack
```
the production script is generated in production/
