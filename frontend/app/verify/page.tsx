"use client";
import { useState, useRef } from "react";
import { ethers } from "ethers";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CertificateSBT from "../../src/contracts/CertificateSBT.json";
import DeployedAddresses from "../../src/contracts/deployed_addresses.json";

const CONTRACT_ADDRESS =
  DeployedAddresses["CertificateSBTModule#CertificateSBT_v6"];

export default function VerifyPage() {
  const [hash, setHash] = useState("");
  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal & PDF
  const certRef = useRef<HTMLDivElement>(null);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  const verifyCertificate = async () => {
    if (!hash) return;
    setLoading(true);
    setError("");
    setCertData(null);
    setSelectedCert(null);

    try {
      // Use Public Provider for simple verification (no wallet needed)
      const provider = new ethers.JsonRpcProvider("https://evm-t3.cronos.org/");
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CertificateSBT.abi,
        provider,
      );

      // 1. Check if hash exists
      const exists = await contract.isHashUsed(hash);
      if (!exists) {
        throw new Error("Không tìm thấy văn bằng với mã Hash này.");
      }

      // 2. Get Token ID
      const tokenId = await contract.hashToTokenId(hash);

      // 3. Get Certificate Details
      const cert = await contract.certificates(tokenId);

      // 4. Check Validity
      if (!cert.isValid) {
        throw new Error("Văn bằng đã bị thu hồi (Revoked).");
      }

      // 5. Get School Name
      const schoolName = await contract.getSchoolName(cert.issuer);

      setCertData({
        id: tokenId.toString(),
        studentName: cert.studentName,
        degreeName: cert.degreeName,
        schoolName: schoolName,
        issueDate: new Date(Number(cert.issueDate) * 1000).toLocaleDateString(),
        classification: cert.classification,
        graduationYear: cert.graduationYear,
        formOfTraining: cert.formOfTraining,
        dateOfBirth: cert.dateOfBirth,
        fileHash: cert.fileHash,
      });
    } catch (err: any) {
      setError(err.reason || err.message || "Lỗi xác thực.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const input = certRef.current;
    if (!input) return;
    html2canvas(input, { scale: 3, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`Bang_${selectedCert.studentName}.pdf`);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-800">
          Tra cứu Văn bằng
        </h1>

        <div className="relative">
          <input
            type="text"
            className="w-full border p-3 rounded mb-4 focus:ring-2 focus:ring-blue-500 pr-10"
            placeholder="Nhập mã Hash văn bằng (0x...)"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
          />
          {hash && (
            <button
              onClick={() => setHash("")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={verifyCertificate}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Đang kiểm tra..." : "Kiểm tra"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
            ❌ {error}
          </div>
        )}

        {certData && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="text-lg font-bold text-green-800 mb-2">
              ✅ Văn bằng Hợp lệ
            </h2>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <p>
                <strong>Sinh viên:</strong> {certData.studentName}
              </p>
              <p>
                <strong>Văn bằng:</strong> {certData.degreeName}
              </p>
              <p>
                <strong>Cơ sở đào tạo:</strong> {certData.schoolName}
              </p>
              <p>
                <strong>Ngày cấp:</strong> {certData.issueDate}
              </p>
            </div>

            <button
              onClick={() => setSelectedCert(certData)}
              className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow"
            >
              Xem chi tiết văn bằng
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-500 hover:underline">
            ← Quay lại trang chủ
          </a>
        </div>
      </div>

      {/* --- MODAL CHI TIẾT (Reused from Home) --- */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-fit max-w-[95vw] p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
            >
              ✕
            </button>

            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex flex-col">
              <div
                ref={certRef}
                className="relative bg-white text-black shadow-2xl flex flex-col items-center m-auto shrink-0"
                style={{
                  width: "1123px",
                  height: "794px",
                  fontFamily: '"Times New Roman", Times, serif',
                  padding: "40px",
                }}
              >
                <div className="w-full h-full border-[5px] border-[#b71c1c] p-1 relative">
                  <div className="w-full h-full border-[2px] border-[#daa520] relative flex flex-col items-center pt-2 pb-24 px-16">
                    <div className="absolute inset-0 flex justify-center items-center opacity-5 pointer-events-none">
                      <svg
                        width="400"
                        height="400"
                        viewBox="0 0 100 100"
                        fill="#b71c1c"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="black"
                          strokeWidth="3"
                          fill="none"
                        />
                        <text x="50" y="55" fontSize="10" textAnchor="middle">
                          Bằng Cấp
                        </text>
                      </svg>
                    </div>

                    <div className="text-center mb-8">
                      <h3 className="text-[18px] font-bold uppercase mb-1 tracking-wide">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </h3>
                      <h4 className="text-[19px] font-bold mb-1 relative inline-block">
                        Độc lập - Tự do - Hạnh phúc
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full h-[1px] bg-black"></span>
                      </h4>
                    </div>

                    <div className="text-center mb-8">
                      <p className="text-[16px] mb-2">
                        HIỆU TRƯỞNG TRƯỜNG{" "}
                        {selectedCert.schoolName.toUpperCase()}
                      </p>
                      <p className="text-[16px]">Cấp bằng</p>
                      <h1
                        className="text-[48px] font-bold text-[#b71c1c] uppercase tracking-wide scale-y-110 mt-4 mb-2 leading-none"
                        style={{ textShadow: "1px 1px 0px rgba(0,0,0,0.1)" }}
                      >
                        TỐT NGHIỆP
                      </h1>
                    </div>

                    {/* --- PHẦN 3: THÔNG TIN SINH VIÊN --- */}
                    <div className="w-[850px] mx-auto space-y-4 text-[18px] leading-relaxed relative z-10 text-left">
                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Cho:
                        </span>
                        <span className="text-[26px] font-bold uppercase text-blue-900 leading-none">
                          {selectedCert.studentName}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Ngành:
                        </span>
                        <span className="font-bold text-[20px] uppercase leading-none">
                          {selectedCert.degreeName}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Ngày sinh:
                        </span>
                        <span className="font-bold">
                          {selectedCert.dateOfBirth}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Xếp loại:
                        </span>
                        <span className="font-bold">
                          {selectedCert.classification}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Hình thức:
                        </span>
                        <span className="font-bold">
                          {selectedCert.formOfTraining}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-4">
                        <span className="w-[120px] font-bold text-gray-700 shrink-0">
                          Năm TN:
                        </span>
                        <span className="font-bold">
                          {selectedCert.graduationYear}
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex justify-between items-end mt-auto px-10">
                      <div className="text-left text-[14px]">
                        <p>
                          Số hiệu bằng:{" "}
                          <span className="font-bold text-[#b71c1c] text-[16px]">
                            {selectedCert.id.padStart(6, "0")}
                          </span>
                        </p>
                        <p>
                          Sổ vào sổ cấp bằng:{" "}
                          <span className="font-bold">....../QA</span>
                        </p>
                        <div className="mt-4 border-2 border-black p-1 inline-block bg-white">
                          <div className="w-16 h-16 bg-gray-800 flex items-center justify-center text-white text-[8px] text-center p-1">
                            BLOCKCHAIN
                            <br />
                            VERIFIED
                          </div>
                        </div>
                        <p className="text-[10px] mt-1 italic text-gray-500 max-w-[200px] break-all">
                          Hash: {selectedCert.fileHash}
                        </p>
                      </div>

                      <div className="text-center relative">
                        <p className="italic mb-2">
                          ..., ngày {new Date().getDate()} tháng{" "}
                          {new Date().getMonth() + 1} năm{" "}
                          {new Date().getFullYear()}
                        </p>
                        <p className="font-bold text-[20px] uppercase mb-16">
                          HIỆU TRƯỞNG
                        </p>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-40">
                          <p className="font-cursive text-blue-800 text-2xl -rotate-12 opacity-80">
                            ....
                          </p>
                        </div>
                        <p className="font-bold text-[18px] uppercase mt-10">
                          GS. TS. ....
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Đóng
              </button>
              <button
                onClick={exportPDF}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow-lg flex items-center gap-2"
              >
                Tải PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
