"use client";
import { useState, useEffect } from "react";
// Nếu bạn gặp lỗi import này, hãy đảm bảo bạn đã tạo file config ở Bước 4 trong hướng dẫn trước
// Nếu file config của bạn là .js, Next.js vẫn hiểu bình thường.
import { getContract, connectWallet } from "../utils/contractConfig";

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Hàm kết nối ví
  const handleConnect = async () => {
    try {
      const { address } = await connectWallet();
      setAccount(address);
      fetchCertificates(address);
    } catch (error: any) {
      alert(error.message || "Lỗi kết nối ví");
    }
  };

  // Hàm lấy danh sách văn bằng
  const fetchCertificates = async (userAddress: string) => {
    setLoading(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      // Gọi hàm lấy danh sách ID token của user từ Smart Contract
      const tokenIds = await contract.getCertificatesByOwner(userAddress);

      const certData = await Promise.all(
        tokenIds.map(async (id: any) => {
          // Lấy chi tiết từng bằng
          const details = await contract.certificates(id);
          // Lấy tên trường
          const schoolName = await contract.schoolNames(details.issuer);

          return {
            id: id.toString(),
            fileHash: details.fileHash,
            // Chuyển đổi timestamp sang ngày tháng
            issueDate: new Date(
              Number(details.issueDate) * 1000,
            ).toLocaleDateString(),
            issuer: details.issuer,
            schoolName: schoolName || "Không xác định",
            isValid: details.isValid,
          };
        }),
      );

      setCerts(certData);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-blue-800">
            🎓 E-Certificate Verify
          </h1>
          {!account ? (
            <button
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            >
              Kết nối ví
            </button>
          ) : (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded">
              👤 {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </header>

        {account && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Văn bằng của tôi</h2>

            {loading ? (
              <p>Đang tải dữ liệu từ Blockchain...</p>
            ) : certs.length === 0 ? (
              <p className="text-gray-500">
                Bạn chưa có văn bằng nào được cấp.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certs.map((cert) => (
                  <div
                    key={cert.id}
                    className={`border p-5 rounded-lg shadow-sm bg-white ${!cert.isValid ? "opacity-60 grayscale" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        Token ID: {cert.id}
                      </span>
                      {cert.isValid ? (
                        <span className="text-green-600 text-sm font-bold">
                          ✅ Hợp lệ
                        </span>
                      ) : (
                        <span className="text-red-600 text-sm font-bold">
                          🚫 Đã hủy
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold mb-1">
                      {cert.schoolName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Ngày cấp: {cert.issueDate}
                    </p>
                    <p className="text-xs text-gray-400 break-all">
                      Issuer: {cert.issuer}
                    </p>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 mb-1">
                        Mã Hash hồ sơ:
                      </p>
                      <code className="block bg-gray-100 p-2 rounded text-xs break-all">
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
