"use client";
import { useState, useRef } from "react";
import { ethers } from "ethers";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getContract, connectWallet } from "../utils/contractConfig";

const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
const ADMIN_ROLE = ethers.ZeroHash;

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isIssuer, setIsIssuer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form cấp bằng: Bỏ nhập Hash thủ công, thay bằng nhập Tên
  const [mintForm, setMintForm] = useState({
    student: "",
    studentName: "",
    degreeName: "",
  });
  const [isMinting, setIsMinting] = useState(false);
  const [revokeId, setRevokeId] = useState("");

  // Ref để chụp ảnh in PDF
  const certRef = useRef<HTMLDivElement>(null);
  const [selectedCert, setSelectedCert] = useState<any>(null); // Bằng đang được chọn để xem/in

  const handleConnect = async () => {
    try {
      const { address, signer } = await connectWallet();
      setAccount(address);
      const contract = await getContract(signer);
      setIsIssuer(await contract.hasRole(ISSUER_ROLE, address));
      setIsAdmin(await contract.hasRole(ADMIN_ROLE, address));
      fetchCertificates(address, contract);
    } catch (error: any) {
      alert(error.message || "Lỗi kết nối ví");
    }
  };

  const fetchCertificates = async (
    userAddress: string,
    contractInstance?: any,
  ) => {
    setLoading(true);
    try {
      const contract =
        contractInstance || (await getContract((await connectWallet()).signer));
      const tokenIds = await contract.getCertificatesByOwner(userAddress);

      const certData = await Promise.all(
        tokenIds.map(async (id: any) => {
          try {
            await contract.ownerOf(id); // Check burn
            const details = await contract.certificates(id);
            const schoolName = await contract.schoolNames(details.issuer);
            return {
              id: id.toString(),
              studentName: details.studentName, // Lấy tên SV từ contract
              degreeName: details.degreeName, // Lấy tên bằng từ contract
              fileHash: details.fileHash,
              issueDate: new Date(
                Number(details.issueDate) * 1000,
              ).toLocaleDateString("vi-VN"),
              issuer: details.issuer,
              schoolName: schoolName || "Trường Đại học Blockchain",
              isValid: true,
            };
          } catch (err) {
            // Xử lý bằng đã thu hồi
            try {
              const details = await contract.certificates(id);
              return {
                id: id.toString(),
                studentName: details.studentName,
                degreeName: details.degreeName,
                fileHash: details.fileHash,
                issueDate: new Date(
                  Number(details.issueDate) * 1000,
                ).toLocaleDateString("vi-VN"),
                issuer: details.issuer,
                schoolName: "Đã thu hồi",
                isValid: false,
              };
            } catch (e) {
              return null;
            }
          }
        }),
      );
      setCerts(certData.filter((c) => c !== null));
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleMint = async () => {
    if (!mintForm.student || !mintForm.studentName || !mintForm.degreeName)
      return alert("Vui lòng nhập đủ thông tin!");

    if (!ethers.isAddress(mintForm.student)) {
      return alert(
        "❌ Địa chỉ ví sinh viên không hợp lệ (Phải bắt đầu bằng 0x...)",
      );
    }
    setIsMinting(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      // TỰ ĐỘNG SINH HASH: Kết hợp Tên + Bằng + Thời gian để tạo hash duy nhất
      const uniqueString = `${mintForm.studentName}-${mintForm.degreeName}-${Date.now()}`;
      const autoHash = ethers.id(uniqueString); // Keccak256 hash

      // URI tạm thời (có thể nâng cấp upload IPFS sau)
      const fakeUri = "ipfs://metadata-placeholder";

      const tx = await contract.mint(
        mintForm.student,
        fakeUri,
        mintForm.studentName,
        mintForm.degreeName,
        autoHash,
      );
      await tx.wait();
      alert("✅ Cấp bằng thành công!");
      setMintForm({ student: "", studentName: "", degreeName: "" });
      fetchCertificates(account!); // Refresh danh sách
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + (error.reason || error.message));
    }
    setIsMinting(false);
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const tx = await contract.revoke(revokeId);
      await tx.wait();
      alert("🚫 Đã thu hồi văn bằng #" + revokeId);
      setRevokeId("");
      fetchCertificates(account!);
    } catch (error: any) {
      alert("Lỗi: " + (error.reason || error.message));
    }
  };

  // Hàm Xuất PDF
  const exportPDF = () => {
    const input = certRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4"); // 'l' = landscape (ngang)
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bang_${selectedCert.studentName}.pdf`);
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b">
          <h1 className="text-3xl font-bold text-blue-900">
            🎓 Hệ thống Văn bằng Số
          </h1>
          {!account ? (
            <button
              onClick={handleConnect}
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-blue-700 transition"
            >
              Kết nối ví
            </button>
          ) : (
            <div className="text-right">
              <p className="font-bold text-gray-800">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
              {isIssuer && (
                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                  Issuer
                </span>
              )}
            </div>
          )}
        </header>

        {/* --- FORM CẤP BẰNG (Chỉ hiện cho Issuer) --- */}
        {account && isIssuer && (
          <section className="mb-10 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
            <h2 className="text-xl font-bold text-blue-900 mb-4">
              🏫 Cấp Văn Bằng Mới
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <input
                  className="w-full border p-3 rounded"
                  placeholder="Địa chỉ ví sinh viên (0x...)"
                  value={mintForm.student}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, student: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="w-full border p-3 rounded"
                    placeholder="Họ tên sinh viên"
                    value={mintForm.studentName}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, studentName: e.target.value })
                    }
                  />
                  <input
                    className="w-full border p-3 rounded"
                    placeholder="Tên văn bằng (VD: Cử nhân IT)"
                    value={mintForm.degreeName}
                    onChange={(e) =>
                      setMintForm({ ...mintForm, degreeName: e.target.value })
                    }
                  />
                </div>
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className={`w-full text-white font-bold py-3 rounded ${isMinting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {isMinting ? "Đang xử lý blockchain..." : "Cấp bằng ngay"}
                </button>
              </div>
              <div className="border-l pl-6 space-y-4">
                <h3 className="font-bold text-red-600">Thu hồi bằng</h3>
                <input
                  className="w-full border p-3 rounded"
                  placeholder="Token ID"
                  value={revokeId}
                  onChange={(e) => setRevokeId(e.target.value)}
                />
                <button
                  onClick={handleRevoke}
                  className="w-full bg-red-100 text-red-700 font-bold py-2 rounded hover:bg-red-200"
                >
                  Xác nhận Thu hồi
                </button>
              </div>
            </div>
          </section>
        )}

        {/* --- DANH SÁCH VĂN BẰNG --- */}
        {account && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              📂 Thư viện Văn bằng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certs.map((cert) => (
                <div
                  key={cert.id}
                  className={`cursor-pointer border-2 hover:border-blue-500 transition p-6 rounded-xl bg-white shadow-sm ${!cert.isValid ? "grayscale opacity-70" : ""}`}
                  onClick={() => cert.isValid && setSelectedCert(cert)}
                >
                  <div className="flex justify-between mb-4">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                      #{cert.id}
                    </span>
                    {cert.isValid ? (
                      <span className="text-green-600 font-bold text-sm">
                        Hiệu lực
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold text-sm">
                        Đã hủy
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 mb-1">
                    {cert.studentName}
                  </h3>
                  <p className="text-gray-600 mb-2">{cert.degreeName}</p>
                  <p className="text-xs text-gray-400">{cert.schoolName}</p>
                  <p className="text-xs text-gray-400 mt-1">{cert.issueDate}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- MODAL XEM CHI TIẾT & IN ẤN --- */}
        {selectedCert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">Xem trước bản in</h3>
                <div className="flex gap-2">
                  <button
                    onClick={exportPDF}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    ⬇ Tải PDF
                  </button>
                  <button
                    onClick={() => setSelectedCert(null)}
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Đóng
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-auto bg-gray-200 flex justify-center">
                {/* --- MẪU GIẤY CHỨNG NHẬN ĐỂ IN --- */}
                <div
                  ref={certRef}
                  className="bg-white w-[800px] h-[600px] p-10 border-8 border-double border-yellow-600 relative flex flex-col items-center justify-between shadow-xl text-center"
                >
                  {/* Họa tiết nền (Optional) */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none flex justify-center items-center">
                    <span className="text-9xl font-serif">🎓</span>
                  </div>

                  <div className="mt-8">
                    <h1 className="text-4xl font-serif font-bold text-blue-900 uppercase mb-2">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </h1>
                    <p className="text-lg font-serif mb-8">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <h2 className="text-5xl font-serif font-bold text-red-700 uppercase tracking-widest mb-4">
                      BẰNG TỐT NGHIỆP
                    </h2>
                  </div>

                  <div className="space-y-4 font-serif text-lg w-full px-16">
                    <p>
                      Hiệu trưởng trường{" "}
                      <span className="font-bold text-xl">
                        {selectedCert.schoolName}
                      </span>{" "}
                      chứng nhận:
                    </p>
                    <div className="text-3xl font-bold text-blue-900 my-4 uppercase">
                      {selectedCert.studentName}
                    </div>
                    <p>Đã tốt nghiệp và được cấp bằng:</p>
                    <div className="text-2xl font-bold text-gray-800 uppercase">
                      {selectedCert.degreeName}
                    </div>
                    <p>Ngày cấp: {selectedCert.issueDate}</p>
                  </div>

                  <div className="w-full flex justify-between items-end px-10 mb-8">
                    <div className="text-left text-xs text-gray-500">
                      <p>Số hiệu: {selectedCert.id}</p>
                      <p>Hash: {selectedCert.fileHash.slice(0, 20)}...</p>
                      <p>Xác thực trên Blockchain</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold mb-10">HIỆU TRƯỞNG</p>
                      <p className="italic text-gray-400">(Đã ký số)</p>
                    </div>
                  </div>
                </div>
                {/* --- HẾT MẪU --- */}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
