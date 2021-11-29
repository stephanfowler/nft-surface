require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const {
	CREATOR_ADDRESS,
	SIGNER_PRIVATE_KEY,
	RINKEBY_API_URL,
	ETHERSCAN_API_KEY,
	PINATA_API_KEY,
	PINATA_API_SECRET
} = process.env;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	defaultNetwork: "hardhat",
	networks: {
		hardhat: {},
		rinkeby: {
			url: RINKEBY_API_URL,
			accounts: [`0x${SIGNER_PRIVATE_KEY}`]
		}
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY
	},
	solidity: {
		version: "0.8.2",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			}
		}
	}
};

/**
 * Summary. Deploy the smart contract
 * Description. Deploys the contract using constructor arguments defined by the specified module (and runs a signature test against it)
 * @example npx hardhat deploy --args ./delpoyment_args_localhost.js --network localhost 
 */
task("deploy", "Deploys the contract using constructor arguments defined by the specified module (and runs a signature test against it)")
	.addParam("args", "Relative path to the arguments module")
	.setAction(async (args, hre) => {
		await hre.run('compile');
		const deploymentArgs = require(args.args);
		const [deployer] = await ethers.getSigners();
		const NFTsurface = await ethers.getContractFactory('NFTsurface');
		const contract = await NFTsurface.deploy(...deploymentArgs);
		await contract.deployed();

		const contractAddress = contract.address;
		const { chainId } = await ethers.provider.getNetwork();
		const signature = await hre.run('sign', {
			wei: "1000",
			id: 123,
			uri: "ipfs://foo.bar/123",
			contract: contractAddress,
			quiet: true
		});
		console.log('Contract deployed:')
		console.log({
			contractAddress,
			chainId,
			signatureTest: signature ? "succeeded" : "failed"
		});
	});


/**
 * Summary. Generates a signature
 * Description. Generates a signature for the 'mint' contract method, and tests it against the contract
 * @example npx hardhat sign --network localhost --wei 1000 --id 123 --uri ipfs://foo.bar/123 --contract 0xe7f17...etc 
 */
task("sign", "Generates a signature for the 'mint' contract method, and tests it against the contract")
	.addParam("wei", "The price in wei of the NFT", undefined, types.string)
	.addParam("id", "The intended tokenId of the NFT", undefined, types.int)
	.addParam("uri", "The intended tokenURI of the NFT", undefined, types.string)
	.addParam("contract", "The contract address", undefined, types.address)
	.addOptionalParam("quiet", "Suppress all output", false, types.boolean)
	.setAction(async (args) => {
		const weiPrice = args.wei;
		const tokenId = args.id;
		const tokenURI = args.uri;
		const contractAddress = args.contract;

		if (!ethers.utils.isAddress(contractAddress)) {
			console.log("Error: invalid address value for contract")
			return;
		}

		const [defaultAcc] = await ethers.getSigners();
		const NFTsurface = await ethers.getContractFactory('NFTsurface');
		const contract = await NFTsurface.attach(contractAddress);
		const { chainId } = await ethers.provider.getNetwork();

		const signature = await defaultAcc._signTypedData(
			{
				name: 'NFTsurface',
				version: '1.0.0',
				chainId: chainId,
				verifyingContract: contractAddress,
			},
			{
				mint: [
					{ name: 'weiPrice', type: 'uint256' },
					{ name: 'tokenId', type: 'uint256' },
					{ name: 'tokenURI', type: 'string' }
				],
			},
			{ weiPrice, tokenId, tokenURI },
		);

		try {
			const isMintable = await contract.mintable(weiPrice, tokenId, tokenURI, signature);
			!args.quiet && console.log({
				weiPrice,
				tokenId,
				tokenURI,
				signature
			});
			return signature;

		} catch (e) {
			const kmownError = "signature invalid or signer unauthorized";
			if (e.message.includes(kmownError)) {
				!args.quiet && console.log(kmownError);
			} else {
				!args.quiet && console.log(e.message);
			}
			return false;
		}
	});


/**
 * Summary. Catalog preparation
 * Description. ...
 * @example npx hardhat catalog --network localhost --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
 */
task("catalog", "Prepares the catalog ...")
	.addParam("contract", "The contract address", undefined, types.address)
	.addOptionalParam("catalogdir", "Absolute path of local directory containing catalog and images. By default, the directory used is client/public/catalog ")
	.setAction(async (args, hre) => {
		const contractAddress = args.contract;

		const catalogDirectory = args.catalogdir || __dirname + "/../client/public/catalog";

		const sharp = require("sharp");
		const _ = require('lodash');
		const fs = require('fs');

		const pinataSDK = require('@pinata/sdk');
		const pinata = pinataSDK(PINATA_API_KEY, PINATA_API_SECRET);
		const contractABI = require("./artifacts/contracts/NFTsurface.sol/NFTsurface.json");
		const keccak256 = require('keccak256');
		const AGENT_ROLE = `0x${keccak256('AGENT_ROLE').toString('hex')}`

		console.log("Connecting...");

		const [signer] = await ethers.getSigners();
		const contract = new ethers.Contract(contractAddress, contractABI.abi, signer)
		const { chainId, name } = await ethers.provider.getNetwork();

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
		} catch (e) {
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
		const catalog = require(catalogFilePath);

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

		const catalogUpdated = { NFTs: [] };
		let hasInvalidProperties = false;
		let failedSignatures = false;

		const idsNewlyMinted = [];
		const idsNewlyBurntOrRevoked = [];
		const idsUploadedImage = [];
		const idsUpdatedMetadata = [];
		const idsMintable = [];
		const idsWithheld = [];

		function checkValidProperties(nft) {
			// nb. tokenId is checked elsewhere
			const valid =
				nft.metadata &&
				nft.metadata.name &&
				nft.metadata.description &&
				nft.sourceImage
			return valid;
		}

		function pad(num, size) {
			var s = "000000000" + num;
			return s.substr(s.length - size);
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

		///////////////////////
		// Iterate over NFTs //
		///////////////////////

		for (const nft of catalog.NFTs) {

			const tokenId = nft.tokenId;
			let minted = false;
			let burnt = false;

			if (hasInvalidProperties) {
				return;
			} else if (!checkValidProperties(nft)) {
				console.log("Invalid props found for tokenId  " + tokenId);
				hasInvalidProperties = true;
				return;
			}

			// Fetch the tokenURI  
			const mintedTokenURI = await contract.tokenURI(tokenId);

			if (mintedTokenURI) {
				// we're already minted
				idsNewlyMinted.push(tokenId)
				nft.tokenURI = mintedTokenURI;
				delete nft.signature;
				minted = true;
			} else {
				try {
					// if this passes, we're neiter minted or burnt...
					await contract.vacant(tokenId);
				} catch (error) {
					// ah, we're burnt
					idsNewlyBurntOrRevoked.push(tokenId);
					delete nft.signature;
					burnt = true;
				}
			}

			if (minted || burnt ) { 
				console.log("Ignored " + tokenId + (minted ? " (minted)" : "") + (burnt ? " (burnt)" : ""))

			} else {
				// Make a meaningful filename for IPFS uploads
				const ipfsFilename = pad(tokenId, 6) + "_" + nft.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

				// If not done already, process the image (upload to IPFS, get dimensions, generate web optimised and placeholder images
				if (!nft.metadata.image || !nft.metadata.width || !nft.metadata.height || !nft.placeholderImage || !nft.webOptimizedImage) {
					const imageFilePath = catalogDirectory + "/" + nft.sourceImage;
					const fileStream = fs.createReadStream(imageFilePath);
					pinnedImage = await pinata.pinFileToIPFS(fileStream, { pinataMetadata: { name: ipfsFilename } });
					nft.metadata.image = "ipfs://" + pinnedImage.IpfsHash;

					const imageData = await processImage(imageFilePath);
					nft.metadata.width = imageData.width;
					nft.metadata.height = imageData.height;
					nft.placeholderImage = imageData.blurredBase64;
					nft.webOptimizedImage = imageData.webOptimizedFilePath.replace(catalogDirectory + "/", "");

					idsUploadedImage.push(tokenId);
				}

				// (re)create the tokenURI by uploading metadata JSON to IPFS
				const ipfsMetadata = { ...nft.metadata };
				ipfsMetadata.creatorAddress = CREATOR_ADDRESS;
				ipfsMetadata.contractAddress = contractAddress;
				ipfsMetadata.tokenId = tokenId;
				pinnedMetadata = await pinata.pinJSONToIPFS(ipfsMetadata, { pinataMetadata: { name: ipfsFilename + ".json" } });
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

				// If specified, weiPrice must be a numeric string, including the string "0"
				const weiPrice = ((typeof nft.weiPrice === 'string' || nft.weiPrice instanceof String)
					&& /^\d+$/.test(nft.weiPrice)) ? nft.weiPrice : undefined;

				// Presence of weiPrice implies item is (lazy) mintable, so needs a signature
				if (weiPrice) {
					// (Re)create the signature
					const signature = await hre.run('sign', {
						wei: weiPrice,
						id: tokenId,
						uri: nft.tokenURI,
						contract: contractAddress,
						quiet: true
					});

					// Test signature / mintableness 
					try {
						await contract.mintable(weiPrice, tokenId, nft.tokenURI, signature);
						nft.signature = signature;
						idsMintable.push(nft.tokenId);
					} catch (error) {
						failedSignatures = true;
						console.log("Errored " + tokenId + " ...signature invalid?")
					}
				} else {
					idsWithheld.push(nft.tokenId);
				}

				console.log("Updated " + tokenId + (nft.signature ? " (mintable)" : ""))
			}

			catalogUpdated.NFTs.push(nft)
		}

		// Warn on duplicate tokenURIs. This may be accidental or intended (tho kinda weird)
		const tokenURIs = _.map(catalogUpdated.NFTs, 'tokenURI');
		const duplicateURIs = (_.filter(tokenURIs, (val, i, iteratee) => _.includes(iteratee, val, i + 1)));
		if (duplicateURIs.length) {
			console.log("WARNING: duplicate tokenURIs found for: ");
			console.log(duplicateURIs);
		};

		// Abort on failed signatures
		if (failedSignatures) {
			console.log("ERROR: sigatures failed for unknown reason. Check your .env values?");
			return;
		}

		// OK all's good

		// Add the context
		// The client relies on this to know which network (chainId) the catalog is built for.
		catalogUpdated.context = {
			creatorAddress: CREATOR_ADDRESS,
			contractAddress,
			chainId
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

		console.log("Updated file:", catalogFilePath)
	});