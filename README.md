## Cashonize Android App

This is the code repository for the <b>Cashonize Android App</b>, a Bitcoin Cash Android Wallet with CashTokens support. <br>

The project uses [Capacitor-js](https://capacitorjs.com/) & [Vite](https://vitejs.dev/) to turn [the Cashonize wallet](https://github.com/cashonize/wallet) into an Android app!

### Differences with the webwallet

The app does not have the 'createTokens' functonality and does not display the github repo on the footer of each page.
The Cashonize app uses the Preferences API instead of local storage to keep items configures on the settings page.

### Run App

```
yarn
yarn vite build
npx cap sync
npx cap open android
```

The `vite build` command will create a `dist` folder with the bundled assets.

###  Special thanks to

For making the app version a big thanks should go to Kallisti
