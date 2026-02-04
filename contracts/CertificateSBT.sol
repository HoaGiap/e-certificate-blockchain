// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateSBT is ERC721URIStorage, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    uint256 private _nextTokenId;

    struct Certificate {
        string studentName;
        string degreeName;
        bytes32 fileHash;
        uint256 issueDate;
        address issuer;
        bool isValid;
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => string) public schoolNames;
    
    mapping(address => uint256[]) private _ownedTokens;

    mapping(bytes32 => bool) public isHashUsed;

    event CertificateIssued(uint256 indexed tokenId, address indexed student, string studentName);
    event CertificateRevoked(uint256 indexed tokenId, address indexed revoker);

    constructor() ERC721("AcademicCertificate", "ACERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender); 
    }

    function mint(
        address to, 
        string memory uri, 
        string memory _studentName, 
        string memory _degreeName, 
        bytes32 _fileHash
    ) public onlyRole(ISSUER_ROLE) {
        require(!isHashUsed[_fileHash], "CertificateSBT: Hash already used");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        certificates[tokenId] = Certificate({
            studentName: _studentName,
            degreeName: _degreeName,
            fileHash: _fileHash,
            issueDate: block.timestamp,
            issuer: msg.sender,
            isValid: true
        });

        _ownedTokens[to].push(tokenId);
        isHashUsed[_fileHash] = true;

        emit CertificateIssued(tokenId, to, _studentName);
    }

    function addIssuer(address _school, string memory _name) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, _school);
        schoolNames[_school] = _name;
    }

    // Soulbound logic: Chặn chuyển nhượng
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // Chỉ cho phép mint (from == 0) hoặc burn (to == 0), không cho transfer
        if (from != address(0) && to != address(0)) {
            revert("CertificateSBT: Soulbound token cannot be transferred");
        }
        
        return from;
    }

    function getCertificatesByOwner(address _owner) public view returns (uint256[] memory) {
        return _ownedTokens[_owner];
    }

    function getSchoolName(address schoolAddress) public view returns (string memory) {
        return schoolNames[schoolAddress];
    }

    function revoke(uint256 tokenId) public onlyRole(ISSUER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "CertificateSBT: Not found");

        Certificate storage cert = certificates[tokenId];

        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isOriginalIssuer = (cert.issuer == msg.sender);

        require(isAdmin || isOriginalIssuer, "CertificateSBT: Not authorized");

        _burn(tokenId);
        
        isHashUsed[cert.fileHash] = false;
        
        emit CertificateRevoked(tokenId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}