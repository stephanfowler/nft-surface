const ownerAddress     = process.env.OWNER_ADDRESS;
const contractAddress  = process.env.CONTRACT_ADDRESS;
const pinataApiKey     = process.env.PINATA_API_KEY;
const pinataApiSecret  = process.env.PINATA_API_SECRET;
const catalogDirectory = process.env.CATALOG_DIRECTORY;

const { ethers }  = require('hardhat');
const sharp = require("sharp");
const _ = require('lodash');
const fs = require('fs');

const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(pinataApiKey, pinataApiSecret);

const contractABI = require("../artifacts/contracts/NFTagent.sol/NFTagent.json");

const keccak256 = require('keccak256');
const AGENT_ROLE = `0x${keccak256('AGENT_ROLE').toString('hex')}`

async function main() {
  console.log("Connecting...");

  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(contractAddress, contractABI.abi, signer)
  const {chainId, name} = await ethers.provider.getNetwork();

  // Confirm we have the right contract, and "agent" role
  try {
    await contract.deployed();
    console.log("Contract " + contractAddress + " found on network " + chainId + " (" + name + ")")
    const hasAgentRole = await contract.hasRole(AGENT_ROLE, signer.address);
    if (hasAgentRole) {
        console.log("Agent role confirmed for account " + signer.address);
    } else {
        console.log("Error: Agent role has NOT been given to account " + signer.address);
        return;
    }
  } catch(e) {
      e.reason = e.reason || "";
      if (e.reason.includes("contract not deployed")) {
          console.log("Error: Contract " + contractAddress + " was NOT found on network " + chainId + " (" + name + ")")
      } else if (e.reason.includes("cannot estimate gas")) {
          console.log("Error: NOT behaving as expected. Wrong combination of contract + network?")
      } else {
          console.log(e);
      }
      return;
  }

  const catalogFilePath = catalogDirectory + "/catalog_chainid_" + chainId + ".json";
  const catalog = require(catalogFilePath); // this will obvs error if not found

  const tokenIds = _.map(catalog.NFTs, 'tokenId');

  const missingIds = _.includes(tokenIds, undefined);
  if (missingIds) {
    console.log("ERROR: some items are missing a tokenId.");
    console.log(tokenIds);
    return;
  }

  const duplicateIds = (_.filter(tokenIds, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));
  if (duplicateIds.length) {
    console.log("ERROR: duplicates found for tokenIds: " + duplicateIds);
    console.log(tokenIds);
    return;
  };

  const nonIntegers = tokenIds.some(i => !Number.isInteger(i))
  if (nonIntegers) {
    console.log("ERROR: tokenIds must be integers");
    console.log(tokenIds);
    return;
  };

  const catalogUpdated = {NFTs:[]};
  let hasInvalidProperties = false;
  let failedSignatures = false;

  const idsNewlyMinted = [];
  const idsNewlyBurntOrRevoked = [];
  const idsUploadedImage = [];
  const idsUpdatedMetadata = [];
  const idsMintable = [];
  const idsWithheld = [];

  const signatureDomain = {
    name: 'NFTagent',
    version: '1.0.0',
    chainId: chainId,
    verifyingContract: contractAddress,
  };

  const signatureTypes = {
    NFT: [
      { name: 'weiPrice', type: 'uint256' },
      { name: 'tokenId',  type: 'uint256' },
      { name: 'tokenURI', type: 'string' }
    ],
  };

  function checkValidProperties(nft) {
    // nb. tokenId is checked elsewhere
    const valid =
      nft.metadata &&
      nft.metadata.name &&
      nft.metadata.description &&
      nft.sourceImage
    return valid;
  }

  function isMarkedMinted(nft) {
    return nft.status == "minted";
  }
  
  function markMinted(nft) {
    delete nft.signature;
    nft.status = "minted";
    idsNewlyMinted.push(nft.tokenId)
  }
  
  function isMarkedBurntOrRevoked(nft) {
    return nft.status == "burntOrRevoked";
  }
  
  function markBurntOrRevoked(nft) {
    delete nft.signature;
    nft.status = "burntOrRevoked";
    idsNewlyBurntOrRevoked.push(nft.tokenId);
  }
  
  function markWithheld(nft) {
    delete nft.signature;
    nft.status = "withheld";
    idsWithheld.push(nft.tokenId);
  }
  
  function markMintable(nft) {
    nft.status = "mintable";
    idsMintable.push(nft.tokenId);
  }
  
  function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
  }

  async function sign(weiPrice, tokenId, tokenURI) {
    return await signer._signTypedData(
      signatureDomain,
      signatureTypes,
      { weiPrice, tokenId, tokenURI },
    );
  }

  async function processImage(filePath) {
    try {
      const sharpImg = sharp(filePath);
      const meta = await sharpImg.metadata();
      const width = meta.width; 
      const height = meta.height
      const placeholderImgWidth = 10;
      const imgAspectRatio = width / height;
      const placeholderImgHeight = Math.round(placeholderImgWidth / imgAspectRatio);
      const blurredBase64 = await sharpImg
        .resize(placeholderImgWidth, placeholderImgHeight)
        .toBuffer()
        .then(
          buffer => `data:image/${meta.format};base64,${buffer.toString('base64')}`
        );
      const webOptimizedFilePath = filePath.replace(/\.[^/.]+$/, "") + "_web.jpg";
      const webOptimised = await sharpImg
        .resize(1200, 1200, {
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .toFormat('jpeg', { progressive: true, quality: 75 })
        .toFile(webOptimizedFilePath);

      return {
        width,
        height,
        blurredBase64,
        webOptimizedFilePath
      }
    } catch (error) {
      console.log(`Error during image processing: ${error}`);
    }
  }

  // Iterate over NFTs
  for (const nft of catalog.NFTs) {

    const tokenId = nft.tokenId;
    hasInvalidProperties = !checkValidProperties(nft) || hasInvalidProperties;

    if (isMarkedMinted(nft) || isMarkedBurntOrRevoked(nft)) {
      // noop
    } else {
      // Check what's happened since the script last ran
      const mintedTokenURI = await contract.tokenURI(tokenId);

      if (mintedTokenURI) {
        nft.tokenURI = mintedTokenURI;
        markMinted(nft);
      }

      if (!isMarkedMinted(nft)) {
        try {
          await contract.vacant(tokenId);
        } catch (error) {
          markBurntOrRevoked(nft);
        }
      }
    }

    if (!isMarkedMinted(nft) && !isMarkedBurntOrRevoked(nft)) {
      // The NFT is unminted, unburnt, and tokenId is unrevoked. Do all teh things. 

      // For IPFS uploads, first make a readable filename
      const ipfsFilename = pad(tokenId, 6) + "_" + nft.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      // upload image to IPFS, generate web optimised and placeholder images
      if (!nft.metadata.image) {
        console.log("Uploading : " + tokenId + " : " + nft.sourceImage);

        const imageFilePath = catalogDirectory + "/" + nft.sourceImage;
        const fileStream = fs.createReadStream(imageFilePath);
        pinnedImage = await pinata.pinFileToIPFS(fileStream, {pinataMetadata: {name: ipfsFilename}});
        nft.metadata.image = "ipfs://" + pinnedImage.IpfsHash;

        const imageData = await processImage(imageFilePath);
        nft.metadata.width    = imageData.width;
        nft.metadata.height   = imageData.height;
        nft.placeholderImage  = imageData.blurredBase64;
        nft.webOptimizedImage = imageData.webOptimizedFilePath.replace(catalogDirectory + "/", "");

        idsUploadedImage.push(tokenId);
      }

      nft.metadata.creatorAddress = ownerAddress;
      nft.metadata.contractAddress = contractAddress;

      // Temporarily add tokenId, so it gets into the IPFS metadata
      nft.metadata.tokenId = tokenId; 

      // Always (re)create the tokenURI, by uploading metadata JSON to IPFS
      pinnedMetadata = await pinata.pinJSONToIPFS(nft.metadata, {pinataMetadata:{name:ipfsFilename + ".json" }});
      const newTokenURI = "ipfs://" + pinnedMetadata.IpfsHash;
      const oldTokenURI = nft.tokenURI + "";
      if (newTokenURI !== oldTokenURI) {
        idsUpdatedMetadata.push(tokenId);
        nft.tokenURI = newTokenURI;
        if (oldTokenURI) {
          // remove old metadata from IPFS
          await pinata.unpin(nft.tokenURI.replace("ipfs://", ""));
        }
      }

      // Now remove temporarily-added tokenId, as we already have it in the parent level
      delete nft.metadata.tokenId; 

      // If specified, weiPrice must be a numeric string, including the string "0"
      const weiPrice = (( typeof nft.weiPrice === 'string' || nft.weiPrice instanceof String) 
          && /^\d+$/.test(nft.weiPrice)) ? nft.weiPrice : undefined;

      // Presence of weiPrice implies item is (lazy) mintable, so needs a signature
      if (weiPrice) {
        // (Re)create the signature
        const tokenURI = nft.tokenURI;
        const signature = await sign(weiPrice, tokenId, tokenURI);
        nft.signature = signature;

        // Test signature / mintableness 
        try {
          await contract.mintable(weiPrice, tokenId, tokenURI, signature);
          markMintable(nft);
        } catch (error) {
          failedSignatures = true;
        }
      } else {
        // lack of weiPrice implies item is not mintable, so is on display only.
        // nb. the computed tokenURI however means it can now be manually minted by the agent
        markWithheld(nft);
      }
    }

    catalogUpdated.NFTs.push(nft)

    console.log("Processed : " + nft.tokenId + " : " + nft.status)
  }

  // Warn on duplicate tokenURIs. This may be accidental or intended (tho kinda weird)
  const tokenURIs = _.map(catalogUpdated.NFTs, 'tokenURI');
  const duplicateURIs  = (_.filter(tokenURIs, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));
  if (duplicateURIs.length) {
    console.log("WARNING: duplicate tokenURIs found for: ");
    console.log(duplicateURIs);
  };

  // Abort on failed properties
  if (hasInvalidProperties) {
    console.log("ERROR: some items had missing properites. Read the docs.");
    return;
  }

  // Abort on failed signatures
  if (failedSignatures) {
    console.log("ERROR: sigatures failed for unknown reason. Check your .env values?");
    return;
  }

  // OK all's good

  // Add the context
  // The client relies on this to know which network (chainId) the catalog is built for.
  catalogUpdated.context = {
    signatureDomain,
    signatureTypes
  };

  // Update the catalog file
  fs.writeFileSync(catalogFilePath, JSON.stringify(catalogUpdated, null, 4));
  
  // Log some useful stuff
  console.log({
    idsNewlyMinted,
    idsNewlyBurntOrRevoked,
    idsMintable,
    idsWithheld,
    idsUploadedImage,
    idsUpdatedMetadata
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
