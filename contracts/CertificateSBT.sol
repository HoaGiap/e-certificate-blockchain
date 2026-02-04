// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateSBT is ERC721URIStorage, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    uint256 private _nextTokenId;

    struct Certificate {
        bytes32 fileHash;
        uint256 issueDate;
        address issuer;
        bool isValid; // Trạng thái hiệu lực của bằng
    }

    mapping(uint256 => Certificate) public certificates;
    mapping(address => string) public schoolNames;
    
    // [TỐI ƯU] Mapping này giúp lấy danh sách bằng của user mà không cần vòng lặp tốn gas
    mapping(address => uint256[]) private _ownedTokens;

    // [TỐI ƯU] Kiểm tra xem hash của file văn bằng đã tồn tại chưa để tránh cấp trùng
    mapping(bytes32 => bool) public isHashUsed;

    event CertificateIssued(uint256 indexed tokenId, address indexed student, bytes32 fileHash);
    event CertificateRevoked(uint256 indexed tokenId, address indexed revoker);

    constructor() ERC721("AcademicCertificate", "ACERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender); 
    }

    function mint(address to, string memory uri, bytes32 fileHash) public onlyRole(ISSUER_ROLE) {
        // [TỐI ƯU] Kiểm tra tránh cấp trùng văn bằng
        require(!isHashUsed[fileHash], "CertificateSBT: This file hash has already been issued");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        certificates[tokenId] = Certificate({
            fileHash: fileHash,
            issueDate: block.timestamp,
            issuer: msg.sender,
            isValid: true
        });

        // [TỐI ƯU] Lưu token vào danh sách sở hữu
        _ownedTokens[to].push(tokenId);
        isHashUsed[fileHash] = true;

        emit CertificateIssued(tokenId, to, fileHash);
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
            revert("CertificateSBT: Certificates are soulbound and cannot be transferred");
        }
        
        return from;
    }

    // [TỐI ƯU] Hàm lấy danh sách token cực nhanh, không sợ lỗi Out of Gas
    function getCertificatesByOwner(address _owner) public view returns (uint256[] memory) {
        return _ownedTokens[_owner];
    }

    function getSchoolName(address schoolAddress) public view returns (string memory) {
        return schoolNames[schoolAddress];
    }

    // [BẢO MẬT] Sửa lỗi logic thu hồi
    function revoke(uint256 tokenId) public onlyRole(ISSUER_ROLE) {
        // Kiểm tra token có tồn tại không (bằng cách check owner khác 0)
        require(_ownerOf(tokenId) != address(0), "CertificateSBT: Certificate does not exist");

        Certificate storage cert = certificates[tokenId];

        // Logic bảo mật: Chỉ Admin HOẶC Người cấp bằng đó mới được thu hồi
        bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isOriginalIssuer = (cert.issuer == msg.sender);

        require(isAdmin || isOriginalIssuer, "CertificateSBT: Not authorized to revoke this certificate");

        // Có thể chọn Burn (xóa hẳn) hoặc đánh dấu là Vô hiệu (isValid = false)
        // Ở đây mình giữ nguyên logic Burn của bạn
        _burn(tokenId);
        
        // Cập nhật trạng thái hash để có thể cấp lại nếu cần (tùy nghiệp vụ)
        isHashUsed[cert.fileHash] = false;
        
        // Lưu ý: Việc xóa tokenId khỏi mảng _ownedTokens khá tốn gas. 
        // Vì đây là SBT (ít khi bị burn), ta có thể chấp nhận mảng vẫn giữ ID cũ 
        // hoặc xử lý phức tạp hơn. Với bài tập, ta để đơn giản.

        emit CertificateRevoked(tokenId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
