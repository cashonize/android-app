## CashTokens Wallet App

This is the code repository for <b>my CashTokens Wallet App</b>, an Android wallet with CashTokens support for chipnet. <br>

The project uses [Capacitor-js](https://capacitorjs.com/) & [Vite](https://vitejs.dev/) to turn [My CashTokens Webwallet](https://github.com/mr-zwets/my-cashtokens-webwallet) into an Android app!

### Differences with the webwallet

The app does not have the 'createTokens' functonality and does not display the footer on each page.

### Run App

```
yarn
yarn vite build
npx cap sync
npx cap open android
```

### Problem

Importing Capacitor-js plugins does not work.

```
D/Capacitor: Registering plugin instance: Preferences
W/Capacitor: Unable to read file at path public/plugins
D/Capacitor: Loading app at http://localhost
...
V/Capacitor/Plugin: To native (Capacitor plugin): callbackId: 23838399, pluginId: Preferences, methodName: get
V/Capacitor: callback: 23838399, pluginId: Preferences, methodName: get, methodData: {"key":"darkMode"}
W/System: A resource failed to call close. 

```
