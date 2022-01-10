// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

/**
 *  @title NFT Smart Contract
 *  @author Stephan Fowler
 *  @notice ERC721 contract for stand-alone NFT collections with separable "agent" role, payment splitting, and lazy-minting capability
 *  @dev Enables lazy-minting by any user via precomputed signatures
 */
contract NFTsurface is
    ERC721,
    ERC721Burnable,
    EIP712,
    AccessControl,
    PaymentSplitter
{
    event IdRevoked(uint256 tokenId);
    event IdFloorSet(uint256 idFloor);

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    // See NFT Provenance notes regarding why these are immutable
    address public immutable owner;
    uint16 public immutable royaltyBasisPoints;

    uint256 public totalSupply;
    uint256 public idFloor;
    mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => bool) private revokedIds;
    mapping(uint256 => uint256) private prices;

    /**
     *  @dev Constructor immutably sets "owner" to the message sender; be sure to deploy contract using the account of the creator/artist/brand/etc.
     *  @param name ERC721 token name
     *  @param symbol ERC721 token symbol
     *  @param admin The administrator address can reassign roles
     *  @param agent The agent address is authorised for all minting, signing, and revoking operations
     *  @param payees Array of PaymentSplitter payee addresses
     *  @param shares Array of PaymentSplitter shares
     *  @param royaltyBasisPoints_ Percentage basis-points for royalty on secondary sales, eg 495 == 4.95%
     */
    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address agent,
        address[] memory payees,
        uint256[] memory shares,
        uint16 royaltyBasisPoints_
    )
        ERC721(name, symbol)
        EIP712("NFTsurface", "1.0.0")
        PaymentSplitter(payees, shares)
    {
        owner = _msgSender();
        royaltyBasisPoints = royaltyBasisPoints_;
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(AGENT_ROLE, agent);
    }

    event PriceSet(uint256 id, uint256 price);
    event Bought(uint256 id, address buyer);

    /**
     *  @notice Minting by the agent only
     *  @param recipient The recipient of the NFT
     *  @param id The intended token Id
     *  @param uri The intended token URI
     */
    function mintAuthorized(
        address recipient,
        uint256 id,
        string memory uri
    ) external {
        require(hasRole(AGENT_ROLE, _msgSender()), "unauthorized to mint");
        require(vacant(id));
        _mint(recipient, id, uri);
    }

    /**
     *  @notice Minting by any caller
     *  @dev Enables "lazy" minting by any user who can provide an agent's signature for the specified params and value
     *  @param id The intended token Id
     *  @param uri The intended token URI
     *  @param signature The ERC712 signature of the hash of message value, id, and uri
     */
    function mint(
        uint256 id,
        string memory uri,
        bytes calldata signature
    ) external payable {
        require(mintable(msg.value, id, uri, signature));
        _mint(_msgSender(), id, uri);
    }

    /**
     *  @notice Checks availability for minting and validity of a signature
     *  @dev Typically run before offering a mint option to users
     *  @param weiPrice The advertised price of the token
     *  @param id The intended token Id
     *  @param uri The intended token URI
     *  @param signature The ERC712 signature of the hash of weiPrice, id, and uri
     */
    function mintable(
        uint256 weiPrice,
        uint256 id,
        string memory uri,
        bytes calldata signature
    ) public view returns (bool) {
        require(vacant(id));
        require(
            hasRole(
                AGENT_ROLE,
                ECDSA.recover(_hash(weiPrice, id, uri), signature)
            ),
            "signature invalid or signer unauthorized"
        );
        return true;
    }

    /**
     *  @notice Checks the availability of a token Id
     *  @dev Reverts if the Id is previously minted, revoked, or burnt
     *  @param id The token Id
     */
    function vacant(uint256 id) public view returns (bool) {
        require(!_exists(id), "tokenId already minted");
        require(id >= idFloor, "tokenId below floor");
        require(!revokedIds[id], "tokenId revoked or burnt");
        return true;
    }

    /**
     *  @notice Sets the price at which a token may be bought
     *  @dev Setting a zero price cancels the sale (all prices are zero by default)
     *  @param id The token id
     *  @param _price The token price in wei
     */
    function setPrice(uint256 id, uint256 _price) external {
        require(_msgSender() == ownerOf(id), "caller is not token owner");
        prices[id] = _price;
        emit PriceSet(id, _price);
    }

    /**
     *  @notice Returns the price at which a token may be bought
     *  @dev A zero price means the token is not for sale
     *  @param id The token id
     */
    function price(uint256 id) external view returns (uint256) {
        return prices[id];
    }

    /**
     *  @notice Transfers the token to the caller, transfers the paid ETH to its owner (minus any royalty)
     *  @dev A zero price means the token is not for sale
     *  @param id The token id
     */
    function buy(uint256 id) external payable {
        require(_msgSender() != ownerOf(id), "caller is token owner");
        require(prices[id] > 0, "token not for sale");
        require(msg.value >= prices[id], "insufficient ETH sent");
        address seller = ownerOf(id);
        delete prices[id];
        _safeTransfer(seller, _msgSender(), id, "");
        Address.sendValue(
            payable(seller),
            (10000 - royaltyBasisPoints) * (msg.value / 10000)
        );
        emit Bought(id, _msgSender());
    }

    /**
     *  @notice Revokes a specified token Id, to disable any signatures that include it
     *  @param id The token Id that can no longer be minted
     */
    function revokeId(uint256 id) external {
        require(hasRole(AGENT_ROLE, _msgSender()), "unauthorized to revoke id");
        require(vacant(id));
        revokedIds[id] = true;
        IdRevoked(id);
    }

    /**
     *  @notice Revokes token Ids below a given floor, to disable any signatures that include them
     *  @param floor The floor for token Ids minted from now onward
     */
    function setIdFloor(uint256 floor) external {
        require(
            hasRole(AGENT_ROLE, _msgSender()),
            "unauthorized to set idFloor"
        );
        require(floor > idFloor, "must exceed current floor");
        idFloor = floor;
        IdFloorSet(idFloor);
    }

    /**
     *  @notice Returns the token URI, given the token Id
     *  @param id The token Id
     */
    function tokenURI(uint256 id) public view override returns (string memory) {
        return tokenURIs[id];
    }

    /**
     *  @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Minting also increments totalSupply
     */
    function _mint(
        address recipient,
        uint256 id,
        string memory uri
    ) internal {
        _safeMint(recipient, id);
        _setTokenURI(id, uri);
        totalSupply += 1;
    }

    /**
     * @dev Recreates the hash that the signer (may have) signed
     */
    function _hash(
        uint256 weiPrice,
        uint256 id,
        string memory uri
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "mint(uint256 weiPrice,uint256 tokenId,string tokenURI)"
                        ),
                        weiPrice,
                        id,
                        keccak256(bytes(uri))
                    )
                )
            );
    }

    /**
     * @dev record a token's URI against its Id
     */
    function _setTokenURI(uint256 id, string memory uri) internal {
        require(bytes(uri).length != 0, "tokenURI cannot be empty");
        tokenURIs[id] = uri;
    }

    /**
     * @dev burn a token and prevent the reuse of its Id
     */
    function _burn(uint256 id) internal override {
        super._burn(id);
        delete tokenURIs[id];
        revokedIds[id] = true;
        totalSupply -= 1;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);
        delete prices[tokenId];
    }
}
