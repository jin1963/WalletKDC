let web3;
let userAccount;

window.addEventListener('load', async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
  } else {
    alert("MetaMask or Web3 Wallet not detected");
  }
});

async function connectWallet() {
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    userAccount = accounts[0];
    document.getElementById('walletAddress').innerText = userAccount;
    fetchBalances();
  } catch (error) {
    console.error(error);
  }
}

async function fetchBalances() {
  for (const [token, info] of Object.entries(tokenConfig)) {
    const contract = new web3.eth.Contract([
      { "constant":true, "inputs":[{ "name":"_owner","type":"address" }], "name":"balanceOf", "outputs":[{ "name":"balance","type":"uint256" }], "type":"function" }
    ], info.address);

    const balance = await contract.methods.balanceOf(userAccount).call();
    const formatted = web3.utils.fromWei(balance, 'ether');
    document.getElementById(`${token.toLowerCase()}Balance`).innerText = formatted;
  }
}

async function addToken(token) {
  const info = tokenConfig[token];
  try {
    await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: info.address,
          symbol: info.symbol,
          decimals: info.decimals,
          image: window.location.origin + '/' + info.image,
        },
      },
    });
  } catch (error) {
    console.error('Add token error:', error);
  }
}
