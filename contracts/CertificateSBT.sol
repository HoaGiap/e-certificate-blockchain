// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

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
        string dateOfBirth;     // New: Ngày sinh
        string classification;  // New: Xếp loại
        string formOfTraining;  // New: Hình thức đào tạo
        string graduationYear;  // New: Năm tốt nghiệp
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => string) public schoolNames;
    
    mapping(address => uint256[]) private _ownedTokens;
    
    // New: Track certificates issued by a specific issuer
    mapping(address => uint256[]) private _issuedTokens;
    
    // New: Reverse lookup for checking hash existence quickly and returning ID
    mapping(bytes32 => uint256) public hashToTokenId;
    
    // New: List of all issuers for Admin Dashboard
    address[] public allIssuers;

    mapping(bytes32 => bool) public isHashUsed;

    event CertificateIssued(uint256 indexed tokenId, address indexed student, string studentName);
    event CertificateRevoked(uint256 indexed tokenId, address indexed revoker);

    constructor() ERC721("AcademicCertificate", "ACERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender); 
        allIssuers.push(msg.sender); // Add deployer as first issuer
        schoolNames[msg.sender] = "Default System Admin";
    }

    function mint(
        address to, 
        string memory uri, 
        string memory _studentName, 
        string memory _degreeName, 
        bytes32 _fileHash,
        string memory _dateOfBirth,
        string memory _classification,
        string memory _formOfTraining,
        string memory _graduationYear
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
            isValid: true,
            dateOfBirth: _dateOfBirth,
            classification: _classification,
            formOfTraining: _formOfTraining,
            graduationYear: _graduationYear
        });

        _ownedTokens[to].push(tokenId);
        _issuedTokens[msg.sender].push(tokenId); // Track for dashboard
        isHashUsed[_fileHash] = true;
        hashToTokenId[_fileHash] = tokenId; // Map hash to ID

        emit CertificateIssued(tokenId, to, _studentName);
    }

    // New: Batch Minting
    function batchMint(
        address[] memory tos,
        string[] memory uris,
        string[] memory names,
        string[] memory degrees,
        bytes32[] memory hashes,
        string[] memory dobs,
        string[] memory classes,
        string[] memory forms,
        string[] memory gradYears
    ) public onlyRole(ISSUER_ROLE) {
        require(tos.length == names.length, "Input length mismatch");

        for (uint i = 0; i < tos.length; i++) {
            mint(tos[i], uris[i], names[i], degrees[i], hashes[i], dobs[i], classes[i], forms[i], gradYears[i]);
        }
    }

    function addIssuer(address _school, string memory _name) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(ISSUER_ROLE, _school)) {
             _grantRole(ISSUER_ROLE, _school);
             allIssuers.push(_school);
        }
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

    // New: Get certificates issued by an address
    function getIssuedCertificates(address _issuer) public view returns (uint256[] memory) {
        return _issuedTokens[_issuer];
    }
    
    // New: Get all issuers
    function getAllIssuers() public view returns (address[] memory) {
        return allIssuers;
    }

    function getSchoolName(address schoolAddress) public view returns (string memory) {
        return schoolNames[schoolAddress];
    }

    // Updated: Soft Revoke (Mark as Invalid)
    function revoke(uint256 tokenId) public onlyRole(ISSUER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "CertificateSBT: Not found");

        Certificate storage cert = certificates[tokenId];

        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isOriginalIssuer = (cert.issuer == msg.sender);

        require(isAdmin || isOriginalIssuer, "CertificateSBT: Not authorized");

        cert.isValid = false; // Soft delete
        
        emit CertificateRevoked(tokenId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}