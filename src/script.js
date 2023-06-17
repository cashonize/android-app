import { queryTotalSupplyFT, queryActiveMinting, querySupplyNFTs } from './queryChainGraph.js';
import { Preferences } from '@capacitor/preferences';
import { Clipboard } from '@capacitor/clipboard';

const explorerUrlMainnet = "https://explorer.bitcoinunlimited.info";
const explorerUrlChipnet = "https://chipnet.chaingraph.cash";
const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql";
const trustedTokenLists = [
  "https://otr.cash/.well-known/bitcoin-cash-metadata-registry.json",
  "https://raw.githubusercontent.com/mr-zwets/example_bcmr/main/example_bcmr.json"
];
const ipfsGateway = "https://ipfs.io/ipfs/";
const nameWallet = "mywallet";

// Helper functions capacitor preferences plugin
const getPreference = async (preferenceKey) => {
  return await Preferences.get({key: preferenceKey});
};
const setPreference = async (preferenceKey, preferenceValue) => {
  if(preferenceKey == 'darkMode') preferenceValue = preferenceValue.toString()
  await Preferences.set({
    key: preferenceKey,
    value: preferenceValue,
  });
};

const newWalletView = document.querySelector('#newWalletView');
const seedphrase = document.getElementById("seedphrase");

// Change view logic
window.changeView = function changeView(newView) {
  const views = ['walletView','tokenView','settingsView'];
  // First hide all views
  views.forEach((view, index) => {
    document.querySelector(`#${view}`).classList.add("hide");
    document.querySelector(`#view${index}`).classList = "view";
  })
  // Show selected view & highlight in nav
  document.querySelector(`#${views[newView]}`).classList.remove("hide");
  document.querySelector(`#view${newView}`).classList = "view active";
}

// Logic dark mode
let darkMode = false;
// Get darkmode in preferences API
const readDarkMode = (await getPreference("darkMode")).value;
if (readDarkMode === "true") {
  document.querySelector('#darkmode').checked = true;
  toggleDarkmode();
}
/*
if (readDarkMode == undefined && matchMedia &&
window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.querySelector('#darkmode').checked = true;
  toggleDarkmode();
}*/
// see switchery docs
//let elems = Array.prototype.slice.call(document.querySelectorAll('.js-switch'));
//elems.forEach(elem => {
//  const switchery = new Switchery(elem, { size: 'small', color:"#0ac18f"});
//});
const changeDarkMode = document.querySelector('#darkmode');
changeDarkMode.onchange = () => toggleDarkmode();
async function toggleDarkmode() {
  darkMode = !darkMode;
  document.body.classList= darkMode? "dark" : "";
  const icons = document.querySelectorAll('.icon');
  if(darkMode) icons.forEach(icon => icon.classList.add("dark"));
  else icons.forEach(icon => icon.classList.remove("dark"));
  // Set darkmode in preferences API
  await setPreference("darkMode",darkMode)
  document.querySelector('#darkmode').checked = darkMode;
}

// Logic default unit
const readUnit = (await getPreference("unit")).value;
if(readUnit) document.querySelector('#selectUnit').value = readUnit;
let unit = readUnit || 'tBCH';

// Logic network
const readNetwork = (await getPreference("network")).value;
let network = "mainnet"
let walletClass
let explorerUrl
let watchAddressCancel
let watchBalanceCancel

// Make sure rest of code executes after mainnet-js has been imported properly
Object.assign(globalThis, await __mainnetPromise);

// Test that indexedDB is available
const db = window.indexedDB.open('test');
db.onerror = () => {
  newWalletView.classList.remove("hide");
  setTimeout(() => alert("Can't create a persistent wallet because indexedDb is unavailable, might be because of private window."), 100);
}

const mainnetWalletExists = await Wallet.namedExists(nameWallet);
const testnetWalletExists = await TestNetWallet.namedExists(nameWallet);
const walletExists = mainnetWalletExists || testnetWalletExists;
walletClass = Wallet

if(!readNetwork && walletExists){
  network = mainnetWalletExists ? "mainnet" : "chipnet";
  setPreference("network", network);
}
if(readNetwork) network = readNetwork;
document.querySelector('#selectNetwork').value = network;
if(network === "chipnet") walletClass = TestNetWallet;
if(!walletExists) newWalletView.classList.remove("hide");
else{loadWalletInfo()};

window.createNewWallet = async function createNewWallet() {
  // Initialize wallet
  DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"]
  Config.DefaultParentDerivationPath = "m/44'/145'/0'";
  await walletClass.named(nameWallet);
  loadWalletInfo()
}

window.importWallet = async function importWallet() {
  // Initialize wallet
  DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"]
  const seedphrase = document.querySelector('#enterSeedphrase').value;
  const selectedDerivationPath = document.querySelector('#derivationPath').value;
  const derivationPath = selectedDerivationPath == "standard"? "m/44'/145'/0'/0/0" : "m/44'/0'/0'/0/0";
  if(selectedDerivationPath == "standard") Config.DefaultParentDerivationPath = "m/44'/145'/0'";
  const walletId = `seed:mainnet:${seedphrase}:${derivationPath}`;
  await walletClass.replaceNamed(nameWallet, walletId);
  loadWalletInfo()
}

async function loadWalletInfo() {
  // Show My Wallet View
  changeView(0);
  const nav = document.querySelector('.nav');
  nav.classList.remove("hide");
  newWalletView.classList.add("hide");

  // Initialize wallet
  DefaultProvider.servers.testnet = ["wss://chipnet.imaginary.cash:50004"]
  const wallet = await walletClass.named(nameWallet);
  seedphrase.textContent = wallet.mnemonic;
  document.querySelector('#walletDerivationPath').textContent = wallet.derivationPath;
  console.log(wallet);
  Config.EnforceCashTokenReceiptAddresses = true;
  explorerUrl = network === "mainnet" ? explorerUrlMainnet : explorerUrlChipnet;

  // Import BCMRs in the trusted tokenlists
  for await(const tokenListUrl of trustedTokenLists){
    await BCMR.addMetadataRegistryFromUri(tokenListUrl);
  }

  // Display USD & BC balance and watch for changes
  let balance = await wallet.getBalance();
  let maxAmountToSend = await wallet.getMaxAmountToSend();
  if(unit == "satoshis"){
    document.querySelector('#balance').innerText = balance.sat;
    const bchUnit = network === "mainnet" ? " satoshis" : " testnet satoshis"; 
    document.querySelector('#balanceUnit').innerText = bchUnit;
    document.querySelector('#sendUnit').innerText = ' sats';
  } else {
    const bch = balance.sat / 100_000_000;
    document.querySelector('#balance').innerText = bch;
    const bchUnit = network === "mainnet" ? " BCH" : " tBCH"; 
    document.querySelector('#balanceUnit').innerText = bchUnit;
    document.querySelector('#sendUnit').innerText = bchUnit;
  }
  document.querySelector('#balanceUsd').innerText = `${balance.usd} $`;
  const showUsdString = network === "chipnet"? "none" : "block";
  document.querySelector('#showsUsdBalance').style = `display: ${showUsdString}`;
  watchBalanceCancel = wallet.watchBalance(async (newBalance) => {
    balance = newBalance;
    maxAmountToSend = await wallet.getMaxAmountToSend();
    if(unit == "satoshis"){
      document.querySelector('#balance').innerText = balance.sat;
      const satsUnit = network === "mainnet" ? " satoshis" : " testnet satoshis"; 
      document.querySelector('#balanceUnit').innerText = satsUnit;
    } else{
      const bch = balance.sat / 100_000_000
      document.querySelector('#balance').innerText = bch;
      const bchUnit = network === "mainnet" ? " BCH" : " tBCH"; 
      document.querySelector('#balanceUnit').innerText = bchUnit;
    }
    document.querySelector('#balanceUsd').innerText = `${balance.usd} $`;
  });

  document.querySelector('#sendAddr').addEventListener("input", () => {
    const inputValue = document.querySelector('#sendAddr').value;
    if(inputValue.includes("?amount=")){
      const bip21Addr = inputValue.split("?");
      const baseAddress = bip21Addr[0];
      document.querySelector('#sendAddr').value = baseAddress;
      const bip21params = bip21Addr[1];
      let amount = bip21params.split("amount=")[1];
      if(unit == "satoshis") amount = Math.round(parseFloat(amount) * 100_000_000);
      document.querySelector('#sendAmount').value = amount;
    }
  })

  // Initilize address and display QR code
  const regularAddr = await wallet.getDepositAddress();
  const tokenAddr = await wallet.getTokenDepositAddress();
  document.querySelector('#depositAddr').innerText = regularAddr;
  document.querySelector('#depositTokenAddr').innerText = tokenAddr;
  document.querySelector('#qr1').contents = regularAddr;
  document.querySelector('#qr2').contents = tokenAddr;
  document.querySelector('#placeholderQr').classList.add("hide");
  document.querySelector('#qr1').classList.remove("hide");

  // Display token categories, construct arrayTokens and watch for changes
  let arrayTokens = [];
  let tokenCategories = [];
  let importedRegistries = false;
  fetchTokens();
  async function fetchTokens() {
    arrayTokens = [];
    const getFungibleTokensResponse = await wallet.getAllTokenBalances();
    const getNFTsResponse = await wallet.getAllNftTokenBalances();
    tokenCategories = Object.keys({...getFungibleTokensResponse, ...getNFTsResponse})
    document.querySelector('#tokenBalance').innerText = `${tokenCategories.length} different token categories`;
    for (const tokenId of Object.keys(getFungibleTokensResponse)) {
      arrayTokens.push({ tokenId, amount: getFungibleTokensResponse[tokenId] });
    }
    for (const tokenId of Object.keys(getNFTsResponse)) {
      const utxos = await wallet.getTokenUtxos(tokenId);
      if(utxos.length == 1){
        const tokenData = utxos[0].token;
        arrayTokens.push({ tokenId, tokenData, utxotxid:utxos[0].txid, vout:utxos[0].vout });
        continue;
      } else {
        const nfts = [];
        for (const utxo of utxos) {
          const tokenData = utxo.token;
          if(tokenData.capability) nfts.push({ tokenId, tokenData, utxotxid:utxo.txid, vout:utxo.vout });
        }
        arrayTokens.push({ tokenId, nfts });
      }
    }
    // Either display tokens in wallet or display there are no tokens
    const divNoTokens = document.querySelector('#noTokensFound');
    document.querySelector('#loadingTokenData').classList.add("hide");
    const divVerifiedOnly = document.querySelector('#verifiedOnly');
    createListWithTemplate(arrayTokens);
    if (arrayTokens.length) {
      divNoTokens.classList.add("hide");
      divVerifiedOnly.classList.remove("hide");
      if(!importedRegistries) importRegistries(arrayTokens);
      importedRegistries = true;
    } else {
      divNoTokens.classList.remove("hide");
      divVerifiedOnly.classList.add("hide");
    }
  }

  watchAddressCancel = wallet.watchAddressTokenTransactions(async(tx) => fetchTokens());

  // Functionality buttons BchWallet view
  window.maxBch = function maxBch(event) {
    if(unit == "BCH"){
      event.currentTarget.parentElement.querySelector('#sendAmount').value = maxAmountToSend.bch;
    } else if(unit == "satoshis"){
      event.currentTarget.parentElement.querySelector('#sendAmount').value = maxAmountToSend.sat;
    }
  }
  document.querySelector('#send').addEventListener("click", async () => {
    try {
      const amount = document.querySelector('#sendAmount').value;
      const validInput = Number.isInteger(+amount) && +amount > 0;
      if(!validInput && unit=="satoshis") throw(`Amount satoshis to send must be a valid integer`);
      if(amount < 546 && unit=="satoshis") throw(`Must send atleast 546 satoshis`);
      const addr = document.querySelector('#sendAddr').value;
      const unitToSend = (unit == "BCH")? "bch" : "sat";
      const { txId } = await wallet.send([{ cashaddr: addr, value: amount, unit: unitToSend }]);
      alert(`Sent ${amount} sats to ${addr}`);
      console.log(`Sent ${amount} sats to ${addr} \n${explorerUrl}/tx/${txId}`);
      document.querySelector('#sendAmount').value = "";
      document.querySelector('#sendAddr').value = "";
    } catch (error) { alert(error) }
  });

  // Import onchain resolved BCMRs
  async function importRegistries(tokens) {
    tokens.forEach(async (token, index) => {
      try{
        const authChain = await BCMR.fetchAuthChainFromChaingraph({
          chaingraphUrl,
          transactionHash: token.tokenId,
          network
        });
        if(authChain.at(-1)){
          try{
            const bcmrLocation = authChain.at(-1).uris[0];
            let httpsUrl = bcmrLocation;
            if(httpsUrl.startsWith("ipfs://")) httpsUrl = httpsUrl.replace("ipfs://", ipfsGateway);
            if(!httpsUrl.startsWith("http")) httpsUrl = `https://${bcmrLocation}`;
            await BCMR.addMetadataRegistryFromUri(httpsUrl);
            console.log("Importing an on-chain resolved BCMR!");
            reRenderToken(token, index);
          }catch(e){ console.log(e) }
        }
      } catch(error){ }
    })
  }
  
  // Rerender token after new tokenInfo
  function reRenderToken(token, index) {
    const tokenCard = document.querySelector("#Placeholder").children[index];
    const tokenInfo = BCMR.getTokenInfo(token.tokenId);
    console.log("re-rendering token with new tokenInfo");
    if(tokenInfo){
      const symbol = tokenInfo.token.symbol || "";
      tokenCard.querySelector("#tokenName").textContent = `Name: ${tokenInfo.name}`;
      if(tokenInfo.description) tokenCard.querySelector("#tokenDescription").textContent = `Token description: ${tokenInfo.description}`;
      if(tokenInfo.uris?.web) tokenCard.querySelector("#tokenWebLink").textContent = `Token web link: ${tokenInfo.uris.web}`;
      if(token.amount){
        tokenCard.querySelector("#sendUnit").textContent = symbol;
        const decimals = tokenInfo.token.decimals || 0;
        const textTokenAmount = `${token.amount/(10**decimals)} ${symbol}`;
        tokenCard.querySelector("#tokenAmount").textContent = `Token amount: ${textTokenAmount}`;
        tokenCard.querySelector("#tokenDecimals").textContent = `Number of decimals: ${decimals}`;
      }
      const BCMRs = BCMR.getRegistries();
      const hardCodedBCMR = BCMRs[0];
      const isVerified = hardCodedBCMR.identities[token.tokenId];
      tokenCard.querySelector("#verified").classList.remove("hide");
      if(!isVerified){
        tokenCard.querySelector(".verifiedIcon").classList = "unverifiedIcon";
        tokenCard.querySelector(".tooltiptext").textContent = "Unverified";
      }
      function newIcon(element, iconSrc){
        const icon = document.createElement("img");
        if(iconSrc.startsWith("ipfs://")) iconSrc = ipfsGateway+iconSrc.slice(7);
        icon.src = iconSrc;
        icon.style = "width:48px; max-width:inherit; border-radius:50%;";
        const tokenIcon = element.querySelector("#tokenIcon");
        tokenIcon.removeChild(tokenIcon.lastChild);
        tokenIcon.appendChild(icon);
      }
      if(tokenInfo?.uris?.icon) newIcon(tokenCard, tokenInfo.uris.icon);
      if(token.tokenData){
        const NFTmetadata = tokenInfo.token.nfts?.parse.types[(token.tokenData.commitment)];
        if(NFTmetadata?.uris?.icon){
          newIcon(tokenCard, NFTmetadata.uris.icon)
        }
      }
      if(token.nfts){
        const children = tokenCard.children;
        for(let i=1; i<children.length; i++){
          const nftCard = children[i];
          const nft = token.nfts[i-1];
          const NFTmetadata = tokenInfo.token.nfts?.parse.types[(nft.tokenData.commitment)];
          if(NFTmetadata) nftCard.querySelector("#tokenName").textContent = `Name: ${NFTmetadata.name}`;
          if(NFTmetadata?.extensions?.attributes){
            if(NFTmetadata?.description) nftCard.querySelector("#tokenDescription").textContent = `NFT description: ${NFTmetadata.description}`
            const infoButtonNft = nftCard.querySelector('#infoButton');
            const nftInfoDisplay = nftCard.querySelector("#tokenInfoDisplay");
            const displayAttributes = nftCard.querySelector("#nftAttributes");
            nftCard.querySelector("#showAttributes").classList.remove("hide");
            nftCard.querySelector("#tokenCommitment").classList.add("hide");
            infoButtonNft.classList.remove("hide");
            infoButtonNft.onclick = async () => {
              nftInfoDisplay.classList.toggle("hide");
              const attributes = NFTmetadata.extensions.attributes;
              console.log(NFTmetadata.description)
              let htmlStringAttributes = "";
              Object.keys(attributes).forEach(attributeKey => {
                const nftAttribute = attributes[attributeKey] ? attributes[attributeKey] : "None";
                htmlStringAttributes += `${attributeKey}: ${nftAttribute}\n`
              });
              displayAttributes.textContent = htmlStringAttributes;
            }
          }
          if(NFTmetadata?.uris?.icon){
            newIcon(nftCard, NFTmetadata.uris.icon);
            
            const modal = nftCard.querySelector("#tokenIconModal");
            // Get the image and insert it inside the modal
            const img = nftCard.querySelector("#tokenIcon");
            img.classList.add("nftIcon")
            const modalImg = nftCard.querySelector("#imgTokenIcon");
            const captionText = nftCard.querySelector("#caption");
            img.onclick = function(){
              modal.style.display = "block";
              modalImg.src = this.firstChild.src;
              captionText.textContent = NFTmetadata.name;
            }
            // Get the <span> element that closes the modal
            const span = nftCard.getElementsByClassName("close")[0];
            // When the user clicks on <span> (x), close the modal
            span.onclick = function() {
              modal.style.display = "none";
            }
          } else if(tokenInfo?.uris?.icon){
            newIcon(nftCard, tokenInfo.uris.icon);
          }
        }
      }
    }
  }

  // Create tokenlist
  function createListWithTemplate(tokens) {
    const Placeholder = document.getElementById("Placeholder");
    const ul = document.createElement("ul");
    ul.setAttribute("id", "Placeholder");
    const template = document.getElementById("token-template");

    tokens.forEach(async (token, index) => {
      const tokenCard = document.importNode(template.content, true);
      const tokenInfo = BCMR.getTokenInfo(token.tokenId);
      let decimals = 0;
      let symbol = "";
      if(tokenInfo){
        symbol = tokenInfo.token.symbol;
        decimals = tokenInfo.token.decimals;
      }
      // Display tokenID for fungibles & NFTs
      const displayId = `${token.tokenId.slice(0, 20)}...${token.tokenId.slice(-10)}`;
      tokenCard.querySelector("#tokenID").textContent = displayId;
      tokenCard.querySelector("#tokenID").value = token.tokenId;
      // Correct colors icons token-actionbar
      const actionbarIcons = tokenCard.querySelectorAll('.icon');
      if(darkMode) actionbarIcons.forEach(icon => icon.classList.add("dark"));
      if(tokenInfo){
        tokenCard.querySelector("#tokenName").textContent = `Name: ${tokenInfo.name}`;
        if(tokenInfo.description) tokenCard.querySelector("#tokenDescription").textContent = `Token description: ${tokenInfo.description}`;
        if(tokenInfo.uris?.web) tokenCard.querySelector("#tokenWebLink").textContent = `Token web link: ${tokenInfo.uris.web}`;
        tokenCard.querySelector("#tokenDecimals").textContent = `Number of decimals: ${tokenInfo.token.decimals}`;
        tokenCard.querySelector("#sendUnit").textContent = symbol;
        const BCMRs = BCMR.getRegistries();
        const hardCodedBCMR = BCMRs[0];
        const isVerified = hardCodedBCMR.identities[token.tokenId];
        tokenCard.querySelector("#verified").classList.remove("hide");
        if(!isVerified){
          tokenCard.querySelector(".verifiedIcon").classList = "unverifiedIcon";
          tokenCard.querySelector(".tooltiptext").textContent = "Unverified";
        } 
      }
      // TokenInfo display with queries onclick
      const tokenInfoDisplay = tokenCard.querySelector("#tokenInfoDisplay");
      const infoButton = tokenCard.querySelector('#infoButton');
      const onchainTokenInfo = tokenCard.querySelector('#onchainTokenInfo');
      infoButton.onclick = async () => {
        tokenInfoDisplay.classList.toggle("hide");
        const alreadyLoaded = onchainTokenInfo.textContent;
        if(token.amount && !alreadyLoaded){
          // Fetch total token supply
          const responseJson = await queryTotalSupplyFT(token.tokenId, chaingraphUrl);
          const totalAmount = responseJson.data.transaction[0].outputs.reduce((total, output) => total +  parseInt(output.fungible_token_amount),0);
          onchainTokenInfo.textContent = `Genesis supply: ${totalAmount} tokens`;
          console.log(`Fetched genesis supply from chaingraph demo instance`);
        } else if(!alreadyLoaded){
          // Has active minting NFT
          const responseJson = await queryActiveMinting(token.tokenId, chaingraphUrl);
          let textOnchainTokenInfo = (responseJson.data.output.length)? "Has an active minting NFT":"Does not have an active minting NFT";
          let responseJson2 = await querySupplyNFTs(token.tokenId, chaingraphUrl);
          let amountNFTs = responseJson2.data.output.length;
          let indexOffset = 0;
          // limit of items returned by chaingraphquery is 5000
          while(responseJson2.data.output.length == 5000){
            indexOffset += 1;
            responseJson2 = await querySupplyNFTs(token.tokenId, chaingraphUrl, 5000 *indexOffset);
            amountNFTs += responseJson2.data.output.length;
          }
          textOnchainTokenInfo += ` \r\n Total supply: ${amountNFTs} immutable NFTs`;
          onchainTokenInfo.textContent = textOnchainTokenInfo;
          console.log(`Fetched existance of active minting tokens from chaingraph demo instance`);
        }
      }
      // Reusable function so it can also render icons for child nfts
      function generateIcon(element, nftCommitment){
        // Display tokenIcon whether generated or costum
        let icon = createIcon({
          seed: token.tokenId,
          size: 12,
          scale: 4,
          spotcolor: '#000'
        });
        if(tokenInfo?.uris?.icon){
          icon = document.createElement("img");
          let iconSrc = tokenInfo.uris.icon;
          if(token.tokenData){
            const NFTmetadata = tokenInfo.token.nfts?.parse.types[(token.tokenData.commitment)];
            if(NFTmetadata?.uris?.icon){
              iconSrc = NFTmetadata.uris.icon;
            }
          }
          if(token.nfts){
            const NFTmetadata = tokenInfo.token.nfts?.parse.types[nftCommitment];
            if(NFTmetadata?.uris?.icon){
              iconSrc = NFTmetadata.uris.icon;
            }
          }
          if(iconSrc.startsWith("ipfs://")) iconSrc = ipfsGateway+iconSrc.slice(7);
          icon.src = iconSrc;
          icon.style = "width:48px; max-width: inherit;";
        }
        const tokenIcon = element.querySelector("#tokenIcon");
        tokenIcon.appendChild(icon);
      }
      generateIcon(tokenCard)
      // Stuff specific for fungibles
      if(token.amount){
        tokenCard.querySelector("#tokenType").textContent = "Fungible Tokens";
        const textTokenAmount = `${token.amount/(10**decimals)} ${symbol}`;
        tokenCard.querySelector("#tokenAmount").textContent = `Token amount: ${textTokenAmount}`;
        const tokenSend = tokenCard.querySelector('#tokenSend');
        tokenCard.getElementById("sendButton").onclick = () => tokenSend.classList.toggle("hide");
        const sendSomeButton = tokenSend.querySelector("#sendSomeButton");
        sendSomeButton.onclick = () => {
          let tokenAmount = Number(tokenSend.querySelector('#sendTokenAmount').value);
          const inputAddress = tokenSend.querySelector('#tokenAddress').value;
          sendTokens(inputAddress, tokenAmount, token.tokenId, tokenInfo);
        }
        function maxTokens(event) {
          let tokenAmount = token.amount;
          if(tokenInfo) tokenAmount = token.amount / (10 ** tokenInfo.token.decimals);
          event.currentTarget.parentElement.querySelector('#sendTokenAmount').value = tokenAmount;
        }
        tokenCard.getElementById("maxButton").onclick = (event) => maxTokens(event);
      } 
      if(token.tokenData) renderNft(token, tokenCard)
      // Reusable function so it can also render child nfts
      async function renderNft(nft, element){
        // Stuff specific for NFTs
        const tokenCapability = nft.tokenData.capability;
        const nftTypes = {
          minting: "Minting NFT",
          mutable: "Mutable NFT",
          none: "Immutable NFT"
        };
        element.querySelector("#tokenType").textContent = nftTypes[tokenCapability];
        const tokenCommitment = nft.tokenData.commitment;
        if (tokenCommitment != "") {
          const commitmentText = `NFT commitment: ${tokenCommitment}`;
          element.querySelector("#tokenCommitment").textContent = commitmentText;
        }
        const nftSend = element.querySelector('#nftSend');
        element.getElementById("sendButton").onclick = () => nftSend.classList.toggle("hide");
        const sendNftButton = nftSend.querySelector("#sendNFT");
        sendNftButton.onclick = () => {
          const inputAddress = nftSend.querySelector('#tokenAddress').value;
          sendNft(inputAddress, nft.tokenId, tokenCapability, tokenCommitment)
        }
        const nftMint = element.querySelector('#nftMint');
        const nftBurn = element.querySelector('#nftBurn');
        const authTransfer = element.querySelector('#authTransfer');
        if (tokenCapability == "minting"){ 
          const mintButton = element.querySelector('#mintButton');
          const burnButton = element.querySelector('#burnButton');
          const authButton = element.querySelector('#authButton');
          mintButton.classList.remove("hide");
          mintButton.onclick = () => nftMint.classList.toggle("hide");
          burnButton.classList.remove("hide");
          burnButton.onclick = () => nftBurn.classList.toggle("hide");
        }
        const mintNftButton = nftMint.querySelector("#mintNFT");
        mintNftButton.onclick = () => {
          const commitmentInput = nftMint.querySelector('#commitmentInput').value;
          mintNft(nft.tokenId, commitmentInput);
        }
        const burnNftButton = nftBurn.querySelector("#burnNFT");
        burnNftButton.onclick = () => {
          burnNft(nft.tokenId, tokenCommitment);
        }
        const transferAuthButton = authTransfer.querySelector("#transferAuth");
        transferAuthButton.onclick = () => {
          const authDestinationAddress = authTransfer.querySelector('#destinationAddr').value;
          transferAuth(nft.tokenId, tokenCommitment, authDestinationAddress);
        }
        const mintNftsButton = nftMint.querySelector("#mintNFTs");
        mintNftsButton.onclick = () => {
          const amountNFTs = nftMint.querySelector('#amountNFTs').value;
          mintNft(nft.tokenId, "", amountNFTs);
        }
      } if(token.nfts){
        tokenCard.querySelector("#tokenType").textContent = "NFT group";
        tokenCard.querySelector("#nrChildNfts").textContent = `Number NFTs: ${token.nfts.length}`;
        tokenCard.querySelector('#sendButton').classList.add("hide");
        tokenCard.querySelector("#showMore").classList.remove("hide");

        for(let i=0; i< token.nfts.length; i++){
          const childNft = document.importNode(template.content, true);
          childNft.querySelector(".item").style.marginLeft = "25px";
          childNft.querySelector(".item").classList.add("hide");
          const nftCommitment = token.nfts[i].tokenData.commitment
          generateIcon(childNft, nftCommitment);
          renderNft(token.nfts[i],childNft);
          childNft.querySelector("#tokenIdBox").classList.add("hide");
          childNft.querySelector("#infoButton").classList.add("hide");
          childNft.querySelector("#childNftCommitment").classList.remove("hide");
          const childNftCommitment = nftCommitment || 'none'
          childNft.querySelector("#childNftCommitment").textContent = `Commitment: ${childNftCommitment}`

          tokenCard.querySelector(".item").appendChild(childNft);
        }
        // use the querySelector outside the function
        const showIcon = tokenCard.querySelector("#showIcon");
        function toggleChildNfts() {
          const group = document.querySelector("#Placeholder").children[index];
          showIcon.classList.toggle("less");
          const children = group.querySelectorAll(".item");
          children.forEach(child => child.classList.toggle("hide"));
        }
        tokenCard.querySelector("#childNfts").onclick = toggleChildNfts;
      }
      ul.appendChild(tokenCard);
    });
    Placeholder.replaceWith(ul);
  }

  // Functionality buttons MyTokens view
  async function sendTokens(address, amountEntered, tokenId, tokenInfo) {
    try {
      const decimals = tokenInfo? tokenInfo.token.decimals : 0;
      const amountTokens = decimals ? amountEntered * (10 ** decimals) : amountEntered;
      const validInput = Number.isInteger(amountTokens) && amountTokens > 0;
      if(!validInput && !decimals) throw(`Amount tokens to send must be a valid integer`);
      if(!validInput && decimals) throw(`Amount tokens to send must only have ${decimals} decimal places`);
      const { txId } = await wallet.send([
        new TokenSendRequest({
          cashaddr: address,
          amount: amountTokens,
          tokenId: tokenId,
        }),
      ]);
      const displayId = `${tokenId.slice(0, 20)}...${tokenId.slice(-10)}`;
      let message = `Sent ${amountEntered} fungible tokens of category ${displayId} to ${address}`;
      if(tokenInfo) message = `Sent ${amountEntered} ${tokenInfo.token.symbol} to ${address}`;
      alert(message);
      console.log(`${message} \n${explorerUrl}/tx/${txId}`);
    } catch (error) { 
      alert(error);
      console.log(error);
    }
  }

  async function sendNft(address, tokenId, tokenCapability, tokenCommitment) {
    try {  
    const { txId } = await wallet.send([
        new TokenSendRequest({
          cashaddr: address,
          tokenId: tokenId,
          commitment: tokenCommitment,
          capability: tokenCapability,
        }),
      ]);
      console.log(tokenCommitment, tokenCapability)
      const displayId = `${tokenId.slice(0, 20)}...${tokenId.slice(-10)}`;
      alert(`Sent NFT of category ${displayId} to ${address}`);
      console.log(`Sent NFT of category ${displayId} to ${address} \n${explorerUrl}/tx/${txId}`);
    } catch (error) { 
      alert(error);
      console.log(error);
    }
  }

  async function mintNft(tokenId, tokenCommitment, amount=1) {
    try {
      const isHex = (str) => /^[A-F0-9]+$/i.test(str);
      const validCommitment = (isHex(tokenCommitment) || tokenCommitment == "")
      if(!validCommitment) throw(`tokenCommitment '${tokenCommitment}' must be a hexadecimal`);
      const mintRequest = new TokenMintRequest({
        cashaddr: tokenAddr,
        commitment: tokenCommitment,
        capability: NFTCapability.none,
        value: 1000,
      })
      const arraySendrequests = [];
      for (let i = 0; i < amount; i++) arraySendrequests.push(mintRequest);
      const { txId } = await wallet.tokenMint(
        tokenId,
        arraySendrequests
      );
      const displayId = `${tokenId.slice(0, 20)}...${tokenId.slice(-10)}`;
      const commitmentText= tokenCommitment? `with commitment ${tokenCommitment}`: "";
      if(amount == 1){
        alert(`Minted immutable NFT of category ${displayId} ${commitmentText}`);
        console.log(`Minted immutable NFT of category ${displayId} ${commitmentText} \n${explorerUrl}/tx/${txId}`);
      } else {
        alert(`Minted ${amount} NFTs of category ${displayId}`);
        console.log(`Minted ${amount} immutable NFT of category ${displayId} \n${explorerUrl}/tx/${txId}`);
      }
    } catch (error) { alert(error) }
  }

  async function burnNft(tokenId, tokenCommitment) {
    try {
      const { txId } = await wallet.tokenBurn(
        {
          tokenId: tokenId,
          capability: NFTCapability.minting,
          commitment: tokenCommitment,
        },
        "burn", // optional OP_RETURN message
      );
      const displayId = `${tokenId.slice(0, 20)}...${tokenId.slice(-10)}`;
      alert(`Burned minting NFT of category ${displayId}`);
      console.log(`Burned minting NFT of category ${displayId} \n${explorerUrl}/tx/${txId}`);
    } catch (error) { alert(error) }
  }
}

// Verified only switch
let displayVerifiedOnly = false;
const changeVerifiedOnly = document.querySelector('#verifiedOnlySwitch');
changeVerifiedOnly.onchange = () => toggleVerifiedOnly();
function toggleVerifiedOnly() {
  displayVerifiedOnly = !displayVerifiedOnly;
  document.querySelector('#noVerifiedTokens').classList.add("hide");
  const tokenCards = document.querySelector("#Placeholder").children;
  if(displayVerifiedOnly){
    for(const tokenCard of tokenCards){
        tokenCard.classList.add("hide");
        const isVerified = tokenCard.children[0].querySelector('.verifiedIcon') && !tokenCard.querySelector('#verified').classList.contains("hide");
        if(isVerified) tokenCard.classList.remove("hide");
      }
      const tokenList = document.querySelector("#Placeholder");
      const shownTokenCards = tokenList.querySelectorAll(".item:not(.hide)");
      if(!shownTokenCards[0]) document.querySelector('#noVerifiedTokens').classList.remove("hide");
  } else {
    for(const tokenCard of tokenCards){
      tokenCard.classList.remove("hide");
    }
  } 
}

// Logic for copy onclick
window.copyTextContent = async function copyTextContent(id) {
  const element = document.getElementById(id);
  await Clipboard.write({string: element.textContent});
}
window.copyTokenID = async function copyTokenID(event, id='tokenID') {
  const tokenIdString = event.currentTarget.parentElement.querySelector(`#${id}`).value;
  await Clipboard.write({string: tokenIdString});
}

// Change default unit
window.selectUnit = function selectUnit(event){
  const oldUnit = unit;
  if(oldUnit == "BCH"){
    const bch = document.querySelector('#balance').innerText;
    const balanceSatoshis = bch * 100_000_000;
    document.querySelector('#balance').innerText = balanceSatoshis;
    document.querySelector('#balanceUnit').innerText = ' testnet satoshis';
    document.querySelector('#sendUnit').innerText = ' sats';
  } else if(oldUnit == "satoshis"){
  const balanceSatoshis = document.querySelector('#balance').innerText;
    const bch = balanceSatoshis / 100_000_000;
    document.querySelector('#balance').innerText = bch;
    document.querySelector('#balanceUnit').innerText = ' BCH';
    document.querySelector('#sendUnit').innerText = ' BCH';
  }
  unit = event.target.value;
  setPreference("unit", unit);
  document.querySelector('#sendAmount').value = "";
}

// Change network
window.changeNetwork = function changeNetwork(event){
  network = event.target.value;
  walletClass = network === "chipnet" ? TestNetWallet : Wallet;
  setPreference("network", network);
  watchAddressCancel()
  watchBalanceCancel()
  loadWalletInfo();
}

window.toggleSeedphrase = (event) => {
  seedphrase.classList.toggle("hide");
  const isHidden = seedphrase.classList.contains("hide");
  event.srcElement.value = isHidden ? "Show seed phrase" : "Hide seed phrase";
}

window.confirmDeleteWallet = (event) => {
  let text = "You are about to delete your Cashonize wallet info from this browser.\nAre you sure you want to delete?";
  if (confirm(text) == true){
    indexedDB.deleteDatabase("bitcoincash");
    indexedDB.deleteDatabase("bchtest");
    location.reload(); 
  }
}

window.switchAddressType = () => {
  const currentQrCode = document.querySelector('qr-code:not(.hide)');
  const otherQrCode = document.querySelector('qr-code.hide');
  currentQrCode.classList.add("hide");
  otherQrCode.classList.remove("hide");
  otherQrCode.animateQRCode('MaterializeIn');
}
