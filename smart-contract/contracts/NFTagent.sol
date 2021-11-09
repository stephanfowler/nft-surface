// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract NFTagent is ERC721, ERC721Burnable, EIP712, AccessControl, PaymentSplitter {
    event IdRevoked(uint256 tokenId);
    event IdFloorSet(uint256 idFloor);

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    address public immutable owner;
    uint256 public totalSupply = 0;
    uint256 public idFloor = 0;
    
    mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => bool) private revokedIds;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address agent,
        address[] memory payees,
        uint256[] memory shares
    ) 
        ERC721(name, symbol) 
        EIP712("NFTagent", "1.0.0")
        PaymentSplitter(payees, shares)
    {
        owner = _msgSender();
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(AGENT_ROLE, agent);
    }
    
    function mintAuthorized(address recipient, uint256 id, string memory uri) external {
        require(hasRole(AGENT_ROLE, _msgSender()), "unauthorized to mint");
        require(vacant(id));
        _mint(recipient, id, uri);
    }

    function mint(uint256 id, string memory uri, bytes calldata signature) external payable {
        require(mintable(msg.value, id, uri, signature));
        _mint(_msgSender(), id, uri);
    }

    function mintable(uint256 weiPrice, uint256 id, string memory uri, bytes calldata signature) public view returns (bool) {
        require(vacant(id));
        require(hasRole(AGENT_ROLE, ECDSA.recover(_hash(weiPrice, id, uri), signature)), 'signature invalid or signer unauthorized');
        return true;
    }

    function vacant(uint256 id) public view returns(bool) {
        require(!_exists(id), "tokenId already minted");
        require(id >= idFloor, "tokenId below floor");
        require(!revokedIds[id], "tokenId revoked or burnt");
        return true;
    }

    function revokeId(uint256 id) external {
        require(hasRole(AGENT_ROLE, _msgSender()), "unauthorized to revoke id");
        require(vacant(id));
        revokedIds[id] = true;
        IdRevoked(id);
    }

    function setIdFloor(uint256 floor) external {
        require(hasRole(AGENT_ROLE, _msgSender()), "unauthorized to set idFloor");
        require(floor > idFloor, "must exceed current floor");
        idFloor = floor;
        IdFloorSet(idFloor);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return tokenURIs[id];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _mint(address recipient, uint256 id, string memory uri) internal {
        _safeMint(recipient, id);
        _setTokenURI(id, uri);
        totalSupply += 1;
    }

    function _hash(uint256 weiPrice, uint256 id, string memory uri) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            keccak256("NFT(uint256 weiPrice,uint256 tokenId,string tokenURI)"),
            weiPrice,
            id,
            keccak256(bytes(uri))
        )));
    }

    function _setTokenURI(uint256 id, string memory uri) internal {
        require(bytes(uri).length != 0, "tokenURI cannot be empty");
        tokenURIs[id] = uri;
    }

    function _burn(uint256 id) internal override {
        super._burn(id);
        delete tokenURIs[id];
        revokedIds[id] = true;
        totalSupply -= 1;
    }

    function _beforeTokenTransfer(address from, address to, uint256 id) internal override(ERC721) {
        super._beforeTokenTransfer(from, to, id);
    }
}