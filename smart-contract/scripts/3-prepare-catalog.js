const creatorAddress   = process.env.CREATOR_ADDRESS;
const contractAddress  = process.env.CONTRACT_ADDRESS;
const ethereumApiKey   = process.env.RINKEBY_API_URL;
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

async function main() {
  console.log("Connecting...");

  const [signer] = await ethers.getSigners();
  const provider = new ethers.providers.JsonRpcProvider(ethereumApiKey);
  const contract = new ethers.Contract(contractAddress, contractABI.abi, provider);
  const {chainId} = await ethers.provider.getNetwork();

  console.log("chainId : " + chainId);

  const catalogFilePath       = catalogDirectory + "/catalog_chainid_" + chainId + ".json";
  const catalog = require(catalogFilePath);

  const tokenIds    = _.map(catalog.NFTs, 'tokenId');

  const missingIds  = _.includes(tokenIds, undefined);
  if (missingIds) {
    console.log("ERROR: some items are missing a tokenId.");
    console.log(tokenIds);
    return;
  }

  const duplicateIds  = (_.filter(tokenIds, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));
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
  let failedProperties = false;
  let failedSignatures = false;

  const idsNewlyMinted = [];
  const idsNewlyBurnt = [];
  const idsUploadedImage = [];
  const idsUpdatedMetadata = [];
  const idsSigned = [];
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

  function validProperties(nft) {
    // nb. tokenId is checked elsewhere
    const valid =
      nft.metadata &&
      nft.metadata.name &&
      nft.metadata.description &&
      nft.sourceImage
    return valid;
  }

  function isMinted(nft) {
    return nft.status == "minted";
  }
  
  function isBurnt(nft) {
    return nft.status == "burnt";
  }
  
  function setMinted(nft) {
    delete nft.signature;
    nft.status = "minted";
    idsNewlyMinted.push(nft.tokenId)
  }
  
  function setBurnt(nft) {
    delete nft.signature;
    nft.status = "burnt";
    idsNewlyBurnt.push(nft.tokenId);
  }
  
  function setWithheld(nft) {
    delete nft.signature;
    nft.status = "withheld";
    idsWithheld.push(nft.tokenId);
  }
  
  function setSigned(nft) {
    nft.status = "claimable";
    idsSigned.push(nft.tokenId);
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
    failedProperties = !validProperties(nft) || failedProperties;

    if (isMinted(nft)) {
      // noop

    } else if (isBurnt(nft)) {
      // noop

    } else {
      const tokenId = nft.tokenId;

      let isBurnt = false;
      // Use a malformed claimable call to establish if the fail is due to token unavailability
      // Yes it's ugly.
      try {
        await contract.claimable("0", tokenId, "", "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
      } catch (error) {
        isBurnt = (error.reason == "tokenId revoked or burnt");
      }

      if (isBurnt) {
        setBurnt(nft);
      } else {
        // Fetch tokenURI from contract, to check if newly minted
        const mintedTokenURI = await contract.tokenURI(tokenId);

        if (mintedTokenURI) {
          // It's minted! (because the NFT's tokenId maps to a tokenURI)
          // Add minted tokenURI in case existing value is wrong or missing
          nft.tokenURI = mintedTokenURI;
          setMinted(nft);

        } else {
          // For IPFS uploads, first make a readable filename
          const ipfsFilename = pad(tokenId, 6) + "_" + nft.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

          // TODO decide should we ALWAYS upload sourceImage? In case it has has changed.
          //if (!nft.metadata.image) {
          if (true) {
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

          nft.metadata.creatorAddress = creatorAddress;
          nft.metadata.contractAddress = contractAddress;

          // Always (re)create the tokenURI by first uploading metadata JSON to IPFS
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

          // If specified, weiPrice must be a numeric string, including "0"
          const weiPrice = (( typeof nft.weiPrice === 'string' || nft.weiPrice instanceof String) 
              && /^\d+$/.test(nft.weiPrice)) ? nft.weiPrice : undefined;

          // Presence of weiPrice implies item is claimable for lazy-minting            
          if (weiPrice) {
            // (Re)create the signature
            const tokenURI = nft.tokenURI;
            const signature = await sign(weiPrice, tokenId, tokenURI);
            nft.signature = signature;

            // Test signature / claimability
            try {
              const claimableTest = await contract.claimable(weiPrice, tokenId, tokenURI, signature);
              setSigned(nft);
            } catch (error) {
              failedSignatures = true;
            }
          } else {
            // lack of weiPrice implies item is not claimable, so is on display only.
            // nb. the computed tokenURI means it can now be manually minted by an authorised user
            setWithheld(nft);
          }
        }
      }
    }
    catalogUpdated.NFTs.push(nft)

    console.log("Processed : " + nft.tokenId + " : " + nft.status)
  }

  // Warn on duplicate tokenURIs. This may be accidental or intended (eg. multi-edition items)
  const tokenURIs = _.map(catalogUpdated.NFTs, 'tokenURI');
  const duplicateURIs  = (_.filter(tokenURIs, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));
  if (duplicateURIs.length) {
    console.log("WARNING: duplicate tokenURIs found for: ");
    console.log(duplicateURIs);
  };

  // Abort on failed properties
  if (failedProperties) {
    console.log("ERROR: some items had missing properites. Read the docs. ");
    return;
  }

  // Abort on failed signatures
  if (failedSignatures) {
    console.log("ERROR: sigatures failed.... check config, including .env ?");
    return;
  }

  // OK all's good

  const stats = {
    idsNewlyMinted,
    idsNewlyBurnt,
    idsSigned,
    idsWithheld,
    idsUploadedImage,
    idsUpdatedMetadata
  };

  // Write the file back to disk (!)
  catalogUpdated.context = {
    signatureDomain,
    signatureTypes
  };
  fs.writeFileSync(catalogFilePath, JSON.stringify(catalogUpdated, null, 4));
  
  console.log(signatureDomain);
  console.log(stats);  
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
