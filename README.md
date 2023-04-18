## CashTokens Wallet App

This is the code repository for <b>my CashTokens Wallet App</b>, an Android wallet with CashTokens support for chipnet. <br>

The project uses [Capacitor-js](https://capacitorjs.com/) to turn [My CashTokens Webwallet](https://github.com/mr-zwets/my-cashtokens-webwallet) into an Android app!

### Differences with the webwallet

The app does not have the 'createTokens' functonality and does not display the footer on each page.

### Run App

```
yarn
yarn vite build
npx cap sync
npx cap open android
```

