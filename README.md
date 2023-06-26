## Cashonize Android App

This is the code repository for the <b>Cashonize Android App</b>, a Bitcoin Cash Android Wallet with CashTokens support. <br>

The project uses [Capacitor-js](https://capacitorjs.com/) & [Vite](https://vitejs.dev/) to turn [the Cashonize webwallet](https://github.com/cashonize/wallet) into an Android app!

### Differences with the webwallet

The app does not have the 'createTokens' functonality and does not display the github repo on the footer of each page.
The Cashonize app uses Capacitor Plugins for things like clipboard functionality & storing preferences.

### Run App

```
yarn
yarn vite build
npx cap sync
npx cap open android
```

The `vite build` command will create a `dist` folder with the bundled assets.

###  Special thanks to

Special thanks to Kallisti for helping get set up with capacitor-js for android & for resolving a persistent problem with using the Preferences API down the line.
And also to the capacitor team for their software & for pointing me in the right direction with the build process to enable plugins.
