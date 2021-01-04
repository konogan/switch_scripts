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

## Installation

#### Develop 

```sh
$ cd dev/preflight_transformer
$ npm run transpile
```
open preflight_transformer in SwitchScripter and save it


#### Production

```sh
$ cd dev/preflight_transformer
$ npm run pack
```
the production script is generated in production/
