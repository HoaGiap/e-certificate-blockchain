"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers"; // Import ethers để dùng utils
import { getContract, connectWallet } from "../utils/contractConfig";

// Định nghĩa các Role hash khớp với Smart Contract
const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
const ADMIN_ROLE = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE thường là 0x00...00

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State quản lý quyền hạn
  const [isIssuer, setIsIssuer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // State cho Form Cấp bằng (Mint)
  const [mintForm, setMintForm] = useState({
    student: "",
    uri: "",
    fileHash: "",
  });
  const [isMinting, setIsMinting] = useState(false);

  // State cho Form Thu hồi (Revoke)
  const [revokeId, setRevokeId] = useState("");

  // Hàm kết nối ví và kiểm tra quyền
  const handleConnect = async () => {
    try {
      const { address, signer } = await connectWallet();
      setAccount(address);

      // 1. Kiểm tra quyền của ví
      const contract = await getContract(signer);
      const _isIssuer = await contract.hasRole(ISSUER_ROLE, address);
      const _isAdmin = await contract.hasRole(ADMIN_ROLE, address);

      setIsIssuer(_isIssuer);
      setIsAdmin(_isAdmin);

      // 2. Tải danh sách bằng của chính mình (nếu có)
      fetchCertificates(address, contract);
    } catch (error: any) {
      alert(error.message || "Lỗi kết nối ví");
    }
  };

  // Hàm lấy danh sách văn bằng
  const fetchCertificates = async (
    userAddress: string,
    contractInstance?: any,
  ) => {
    setLoading(true);
    try {
      const contract =
        contractInstance || (await getContract((await connectWallet()).signer));

      // Lấy danh sách ID token
      const tokenIds = await contract.getCertificatesByOwner(userAddress);

      const certData = await Promise.all(
        tokenIds.map(async (id: any) => {
          try {
            // Kiểm tra xem token còn tồn tại không (vì revoke dùng _burn)
            // Nếu _burn rồi thì ownerOf sẽ revert lỗi
            await contract.ownerOf(id);

            const details = await contract.certificates(id);
            const schoolName = await contract.schoolNames(details.issuer);

            return {
              id: id.toString(),
              fileHash: details.fileHash,
              issueDate: new Date(
                Number(details.issueDate) * 1000,
              ).toLocaleDateString(),
              issuer: details.issuer,
              schoolName: schoolName || "Không xác định",
              isValid: true, // Nếu ownerOf không lỗi thì là valid
            };
          } catch (err) {
            // Nếu lỗi ownerOf => Token đã bị burn (thu hồi)
            // Chúng ta vẫn lấy thông tin từ struct cũ để hiển thị lịch sử (nếu struct chưa bị xóa)
            try {
              const details = await contract.certificates(id);
              return {
                id: id.toString(),
                fileHash: details.fileHash,
                issueDate: new Date(
                  Number(details.issueDate) * 1000,
                ).toLocaleDateString(),
                issuer: details.issuer,
                schoolName: "Đã thu hồi",
                isValid: false,
              };
            } catch (e) {
              return null; // Không lấy được dữ liệu gì
            }
          }
        }),
      );

      // Lọc bỏ các null nếu có
      setCerts(certData.filter((c) => c !== null));
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
    setLoading(false);
  };

  // Xử lý Cấp bằng (Mint)
  const handleMint = async () => {
    if (!mintForm.student || !mintForm.fileHash)
      return alert("Vui lòng nhập đủ thông tin!");
    setIsMinting(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      // Gọi hàm mint
      const tx = await contract.mint(
        mintForm.student,
        mintForm.uri,
        mintForm.fileHash,
      );
      await tx.wait(); // Đợi transaction hoàn thành

      alert("✅ Cấp bằng thành công!");
      setMintForm({ student: "", uri: "", fileHash: "" }); // Reset form
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + (error.reason || error.message));
    }
    setIsMinting(false);
  };

  // Xử lý Thu hồi (Revoke)
  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      const tx = await contract.revoke(revokeId);
      await tx.wait();

      alert("🚫 Đã thu hồi văn bằng #" + revokeId);
      setRevokeId("");
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + (error.reason || error.message));
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-800">
              🎓 E-Certificate Verify
            </h1>
            {isIssuer && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded ml-2">
                Chế độ Nhà Trường (Issuer)
              </span>
            )}
            {isAdmin && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded ml-2">
                Admin
              </span>
            )}
          </div>

          {!account ? (
            <button
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Kết nối ví
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-700">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <p className="text-xs text-green-600">● Đã kết nối</p>
              </div>
            </div>
          )}
        </header>

        {/* Khu vực dành cho Nhà trường (ISSUER) */}
        {account && isIssuer && (
          <section className="mb-10 bg-white p-6 rounded-xl shadow-md border border-blue-100">
            <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
              🏫 Quản lý Cấp bằng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Cấp bằng */}
              <div>
                <h3 className="font-semibold mb-3">Cấp bằng mới (Mint)</h3>
                <div className="space-y-3">
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Địa chỉ ví sinh viên (0x...)"
                    value={mintForm.student}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, student: e.target.value })
                    }
                  />
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Link ảnh/PDF (IPFS URI)"
                    value={mintForm.uri}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, uri: e.target.value })
                    }
                  />
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Mã Hash file (bytes32)"
                    value={mintForm.fileHash}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, fileHash: e.target.value })
                    }
                  />
                  <button
                    onClick={handleMint}
                    disabled={isMinting}
                    className={`w-full text-white font-bold py-2 px-4 rounded ${isMinting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                  >
                    {isMinting ? "Đang xử lý..." : "Cấp bằng ngay"}
                  </button>
                  <p className="text-xs text-gray-400 italic">
                    * Lưu ý: Mã Hash cần định dạng bytes32 (0x...)
                  </p>
                </div>
              </div>

              {/* Form Thu hồi */}
              <div className="border-l pl-8">
                <h3 className="font-semibold mb-3 text-red-600">
                  Thu hồi bằng (Revoke)
                </h3>
                <div className="space-y-3">
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Token ID cần thu hồi"
                    value={revokeId}
                    onChange={(e) => setRevokeId(e.target.value)}
                  />
                  <button
                    onClick={handleRevoke}
                    className="w-full bg-red-100 text-red-700 font-bold py-2 px-4 rounded hover:bg-red-200"
                  >
                    Thu hồi bằng
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Danh sách văn bằng của User */}
        {account && (
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              📂 Văn bằng của tôi
            </h2>

            {loading ? (
              <div className="text-center py-10 text-gray-500">
                Đang tải dữ liệu từ Blockchain...
              </div>
            ) : certs.length === 0 ? (
              <p className="text-gray-500 bg-gray-100 p-4 rounded text-center">
                Bạn chưa có văn bằng nào được cấp.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certs.map((cert) => (
                  <div
                    key={cert.id}
                    className={`border p-5 rounded-lg shadow-sm bg-white relative overflow-hidden ${!cert.isValid ? "bg-gray-50" : ""}`}
                  >
                    {!cert.isValid && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 z-10">
                        ĐÃ HỦY
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        ID: #{cert.id}
                      </span>
                      {cert.isValid ? (
                        <span className="text-green-600 text-xs font-bold flex items-center">
                          ✅ Hợp lệ
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-bold">
                          🚫 Vô hiệu
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-lg font-bold mb-1 ${!cert.isValid ? "line-through text-gray-400" : "text-blue-900"}`}
                    >
                      {cert.schoolName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Ngày cấp: {cert.issueDate}
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 mb-1">
                        Hash hồ sơ gốc:
                      </p>
                      <code className="block bg-gray-100 p-2 rounded text-xs break-all text-gray-600">
                        {cert.fileHash}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
