let web3;
let userAccount;

// Configuration for BNB Smart Chain
const bscChainId = '0x38'; // Chain ID for BNB Smart Chain (decimal 56)
const bscRpcUrl = 'https://bsc-dataseed.binance.org/';
const bscExplorerUrl = 'https://bscscan.com';
const bscCurrency = { name: 'BNB', symbol: 'BNB', decimals: 18 };

// Define token configuration (assuming this is in a separate config file or directly here)
// Example tokenConfig (you should have this already)
const tokenConfig = {
    "EXAMPLE_TOKEN": {
        address: "0xYourBNBTokenContractAddress", // **Replace with your actual BNB Smart Chain token contract address**
        symbol: "EXT",
        decimals: 18,
        image: "path/to/your/token_image.png"
    }
    // Add other tokens here
};


window.addEventListener('load', async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    document.getElementById('connectWallet').addEventListener('click', connectWallet);

    // Optional: Listen for chain changes
    ethereum.on('chainChanged', (chainId) => {
        console.log("Chain changed to:", chainId);
        // You might want to re-fetch balances or update UI here
        if (userAccount) { // If wallet is already connected
            fetchBalances();
        }
    });

  } else {
    alert("MetaMask or Web3 Wallet not detected");
  }
});

async function connectWallet() {
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    userAccount = accounts[0];
    document.getElementById('walletAddress').innerText = userAccount;
    
    // **NEW:** Check and switch to BNB Smart Chain before fetching balances
    await ensureBscChain();

    fetchBalances();
  } catch (error) {
    console.error(error);
  }
}

// --- NEW FUNCTION TO ENSURE BNB SMART CHAIN ---
async function ensureBscChain() {
  const currentChainId = await ethereum.request({ method: 'eth_chainId' });

  if (currentChainId !== bscChainId) {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: bscChainId }],
      });
      console.log("Switched to BNB Smart Chain.");
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: bscChainId,
                chainName: 'BNB Smart Chain',
                rpcUrls: [bscRpcUrl],
                nativeCurrency: bscCurrency,
                blockExplorerUrls: [bscExplorerUrl],
              },
            ],
          });
          console.log("Added BNB Smart Chain to MetaMask.");
          // After adding, MetaMask automatically switches to it.
        } catch (addError) {
          console.error("Failed to add BNB Smart Chain to MetaMask:", addError);
          alert("Please manually switch to BNB Smart Chain in MetaMask.");
          throw addError; // Re-throw to prevent further actions if chain not added/switched
        }
      } else {
        console.error("Failed to switch to BNB Smart Chain:", switchError);
        alert("Please manually switch to BNB Smart Chain in MetaMask.");
        throw switchError; // Re-throw if other error occurs during switch
      }
    }
  } else {
    console.log("Already on BNB Smart Chain.");
  }
}
// --- END NEW FUNCTION ---

async function fetchBalances() {
  // Ensure web3 is initialized and on the correct chain
  if (!web3 || !(await ethereum.request({ method: 'eth_chainId' })) === bscChainId) {
      console.warn("Not on BNB Smart Chain. Balances might not be accurate.");
      // You might want to add a UI message here
      return;
  }

  for (const [token, info] of Object.entries(tokenConfig)) {
    // Check if the token address is defined and valid
    if (!info.address || !web3.utils.isAddress(info.address)) {
        console.warn(`Invalid address for token: ${token}. Skipping balance fetch.`);
        continue;
    }

    try {
        const contract = new web3.eth.Contract([
          { "constant":true, "inputs":[{ "name":"_owner","type":"address" }], "name":"balanceOf", "outputs":[{ "name":"balance","type":"uint256" }], "type":"function" }
        ], info.address);

        const balance = await contract.methods.balanceOf(userAccount).call();
        const formatted = web3.utils.fromWei(balance, 'ether'); // Assumes 18 decimals, adjust if needed
        document.getElementById(`${token.toLowerCase()}Balance`).innerText = formatted;
    } catch (error) {
        console.error(`Error fetching balance for ${token}:`, error);
        document.getElementById(`${token.toLowerCase()}Balance`).innerText = 'Error';
    }
  }
}

async function addToken(token) {
  const info = tokenConfig[token];
  if (!info) {
      console.error(`Token config not found for ${token}`);
      return;
  }
  
  // **Crucial:** Ensure we are on BSC before adding the token
  try {
    await ensureBscChain(); 
  } catch (error) {
    console.error("Could not ensure BNB Smart Chain before adding token:", error);
    alert("Please ensure you are connected to BNB Smart Chain in MetaMask before adding the token.");
    return; // Stop if chain not correct
  }


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
    alert(`${info.symbol} token added successfully to MetaMask!`);
  } catch (error) {
    console.error('Add token error:', error);
    alert(`Failed to add ${info.symbol} token. Please try again or add manually.`);
  }
}
