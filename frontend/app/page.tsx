"use client";
import { useState, useRef, useEffect } from "react";
import { ethers } from "ethers";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BookOpen,
  BarChart3,
  Search,
  Link,
  Building2,
  User,
  Sparkles,
  FileText,
  Download,
  Copy,
  GraduationCap,
  LogOut,
  Link2,
} from "lucide-react";
import { getContract, connectWallet } from "../utils/contractConfig";

const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
const ADMIN_ROLE = ethers.ZeroHash;

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState({ issuer: false, admin: false });

  // Minting Form
  const [mintForm, setMintForm] = useState({
    student: "",
    studentName: "",
    degreeName: "",
    dateOfBirth: "",
    classification: "",
    formOfTraining: "",
    graduationYear: "",
  });
  const [isMinting, setIsMinting] = useState(false);

  // PDF Export logic
  const certRef = useRef<HTMLDivElement>(null);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", checkLogin);
      checkLogin();
    }
  }, []);

  const checkLogin = async () => {
    try {
      const { signer, address } = await connectWallet();
      setAccount(address);
      fetchCertificates(address);
      checkRoles(signer, address);
    } catch (error) {
      //   console.log("Chưa kết nối ví");
    }
  };

  const handleConnect = async () => {
    await checkLogin();
  };

  const checkRoles = async (signer: any, address: string) => {
    try {
      const contract = await getContract(signer);
      const isIssuer = await contract.hasRole(ISSUER_ROLE, address);
      const isAdmin = await contract.hasRole(ADMIN_ROLE, address);
      setRoles({ issuer: isIssuer, admin: isAdmin });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCertificates = async (ownerAddress: string) => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = await getContract(provider);
      const tokenIds = await contract.getCertificatesByOwner(ownerAddress);

      const certData = await Promise.all(
        tokenIds.map(async (tokenId: any) => {
          try {
            const cert = await contract.certificates(tokenId);
            const schoolName = await contract.getSchoolName(cert.issuer);
            return {
              id: tokenId.toString(),
              studentName: cert.studentName,
              degreeName: cert.degreeName,
              issueDate: new Date(
                Number(cert.issueDate) * 1000,
              ).toLocaleDateString(),
              schoolName:
                schoolName ||
                `Issuer (${cert.issuer.slice(0, 6)}...${cert.issuer.slice(-4)})`,
              fileHash: cert.fileHash,
              isValid: cert.isValid,
              dateOfBirth: cert.dateOfBirth,
              classification: cert.classification,
              graduationYear: cert.graduationYear,
              formOfTraining: cert.formOfTraining,
            };
          } catch (e) {
            return null;
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
      return alert("Thiếu thông tin!");
    setIsMinting(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const uniqueString = `${mintForm.studentName}-${mintForm.degreeName}-${Date.now()}`;
      const autoHash = ethers.id(uniqueString);

      // V6 Mint Call
      const tx = await contract.mint(
        mintForm.student,
        "ipfs://placeholder",
        mintForm.studentName.toUpperCase(),
        mintForm.degreeName.toUpperCase(),
        autoHash,
        mintForm.dateOfBirth,
        mintForm.classification,
        mintForm.formOfTraining,
        mintForm.graduationYear,
      );
      await tx.wait();
      alert("Cấp bằng thành công!");
      setMintForm({
        student: "",
        studentName: "",
        degreeName: "",
        dateOfBirth: "",
        classification: "",
        formOfTraining: "",
        graduationYear: "",
      });
      // Refresh certs if minting to self (unlikely but possible)
      fetchCertificates(account!);
    } catch (e: any) {
      alert("Lỗi: " + (e.reason || e.message));
    }
    setIsMinting(false);
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
    <main className="min-h-screen bg-gray-100 font-sans flex">
      {/* SIDEBAR NAVIGATION - EduManager Style */}
      <aside className="w-64 bg-[#2C3E50] shadow-2xl p-6 flex flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-white w-8 h-8" />
          <h1 className="text-xl font-bold text-white">EduManager</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {/* Always visible */}
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 bg-[#3498DB] text-white rounded font-semibold hover:bg-[#2980B9] transition"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Tổng Quan</span>
          </a>

          <a
            href="/verify"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 rounded font-semibold transition"
          >
            <Search className="w-5 h-5" />
            <span>Tra Cứu Văn Bằng</span>
          </a>

          <a
            href="/explorer"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 rounded font-semibold transition"
          >
            <Link className="w-5 h-5" />
            <span>Explorer</span>
          </a>

          {/* Only visible for Issuer */}
          {roles.issuer && (
            <a
              href="/issuer"
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 rounded font-semibold transition border-l-4 border-cyan-500"
            >
              <Building2 className="w-5 h-5" />
              <span>Kênh Nhà Trường</span>
            </a>
          )}

          {/* Only visible for Admin */}
          {roles.admin && (
            <a
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 rounded font-semibold transition border-l-4 border-cyan-500"
            >
              <User className="w-5 h-5" />
              <span>Quản Trị</span>
            </a>
          )}
        </nav>

        {/* Connection Status & Logout */}
        <div className="border-t border-gray-600 pt-4 space-y-3">
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 bg-[#3498DB] text-white px-4 py-3 rounded font-semibold hover:bg-[#2980B9] transition"
          >
            <Link2 className="w-5 h-5" />
            {account ? `✓ Đã kết nối` : "Kết nối Ví"}
          </button>
          {account && (
            <p className="text-xs text-gray-400 break-all">
              <strong>Ví:</strong> {account.slice(0, 6)}...{account.slice(-4)}
            </p>
          )}
          <button className="w-full flex items-center justify-center gap-2 text-red-400 px-4 py-2 rounded font-semibold hover:bg-red-900/20 transition">
            <LogOut className="w-5 h-5" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          {/* --- FORM CẤP BẰNG (Visible if Issuer) --- */}
          {account && roles.issuer && (
            <section className="mb-8 bg-gradient-to-br from-blue-50 to-white p-8 rounded shadow-lg border-l-4 border-[#2C3E50]">
              <h2 className="text-2xl font-bold mb-6 text-[#2C3E50] uppercase flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Cấp văn bằng mới
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Địa chỉ ví sinh viên (0x...)"
                  value={mintForm.student}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, student: e.target.value })
                  }
                />
                <input
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Họ và tên sinh viên (In hoa)"
                  value={mintForm.studentName}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, studentName: e.target.value })
                  }
                />
                <input
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Tên văn bằng (VD: CỬ NHÂN CNTT)"
                  value={mintForm.degreeName}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, degreeName: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Ngày sinh (DD/MM/YYYY)"
                  value={mintForm.dateOfBirth}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, dateOfBirth: e.target.value })
                  }
                />
                <select
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  value={mintForm.classification}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, classification: e.target.value })
                  }
                >
                  <option value="">-- Xếp loại --</option>
                  <option value="Xuất sắc">Xuất sắc</option>
                  <option value="Giỏi">Giỏi</option>
                  <option value="Khá">Khá</option>
                  <option value="Trung bình">Trung bình</option>
                </select>
                <input
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Hình thức đào tạo (VD: Chính quy)"
                  value={mintForm.formOfTraining}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, formOfTraining: e.target.value })
                  }
                />
                <input
                  className="border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#2C3E50]"
                  placeholder="Năm tốt nghiệp (VD: 2024)"
                  value={mintForm.graduationYear}
                  onChange={(e) =>
                    setMintForm({ ...mintForm, graduationYear: e.target.value })
                  }
                />

                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="md:col-span-2 bg-[#3498DB] text-white p-4 rounded font-bold text-lg hover:bg-[#2980B9] transition disabled:bg-gray-400 disabled:opacity-50 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-5 h-5" />
                  {isMinting ? "Đang xử lý..." : "Cấp bằng ngay"}
                </button>
              </div>
            </section>
          )}

          {/* STUDENT CERTIFICATES */}
          <section>
            <h2 className="text-2xl font-bold mb-6 text-[#2C3E50] border-b-4 border-[#2C3E50] pb-3 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Văn bằng của tôi
            </h2>
            {loading ? (
              <p>Đang tải...</p>
            ) : certs.length === 0 ? (
              <p className="text-gray-500 italic">
                Ví này chưa sở hữu văn bằng nào.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certs.map((cert) => (
                  <div
                    key={cert.id}
                    className={`bg-white p-5 rounded shadow-md border-t-4 ${cert.isValid ? "border-green-500" : "border-red-500"}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-[#2C3E50] line-clamp-2 min-h-[3.5rem]">
                        {cert.degreeName}
                      </h3>
                      {!cert.isValid && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          Đã hủy
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Sinh viên:</span>{" "}
                        {cert.studentName}
                      </p>
                      <p>
                        <span className="font-semibold">Cấp bởi:</span>{" "}
                        {cert.schoolName}
                      </p>
                      <p>
                        <span className="font-semibold">Ngày cấp:</span>{" "}
                        {cert.issueDate}
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(cert.fileHash);
                          alert("✓ Đã sao chép mã Hash thành công!");
                        }}
                        className="flex-1 bg-white border-2 border-[#3498DB] text-[#3498DB] font-bold py-2 rounded hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-1"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Hash
                      </button>
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="flex-1 bg-[#3498DB] text-white font-bold py-2 rounded hover:bg-[#2980B9] transition flex items-center justify-center gap-1"
                      >
                        👁️ Xem chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CERTIFICATE MODAL */}
          {selectedCert && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded shadow-2xl w-fit max-w-[95vw] p-6 relative overflow-y-auto max-h-[90vh]">
                <button
                  onClick={() => setSelectedCert(null)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl"
                >
                  ✕
                </button>

                <div className="flex-1 overflow-auto bg-gray-100 p-4 flex flex-col">
                  {/* ============================================================== */}
                  {/* KHU VỰC THIẾT KẾ BẰNG - CHỈNH SỬA TẠI ĐÂY                    */}
                  {/* Sử dụng Font Times New Roman chuẩn hệ thống để không lỗi dấu   */}
                  {/* ============================================================== */}
                  <div
                    ref={certRef}
                    className="relative bg-white text-black shadow-2xl flex flex-col items-center m-auto shrink-0"
                    style={{
                      width: "1123px", // Khổ A4 Ngang chuẩn (297mm)
                      height: "794px", // Khổ A4 Ngang chuẩn (210mm)
                      fontFamily: '"Times New Roman", Times, serif', // FONT CHUẨN
                      padding: "40px",
                    }}
                  >
                    {/* KHUNG VIỀN HOA VĂN (Mô phỏng bằng CSS Border kép) */}
                    <div className="w-full h-full border-[5px] border-[#b71c1c] p-1 relative">
                      <div className="w-full h-full border-[2px] border-[#daa520] relative flex flex-col items-center pt-2 pb-24 px-16">
                        {/* HỌA TIẾT NỀN (TRỐNG ĐỒNG / LOGO) */}
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
                            <text
                              x="50"
                              y="55"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              Bằng Cấp
                            </text>
                          </svg>
                        </div>

                        {/* --- PHẦN 1: QUỐC HIỆU --- */}
                        <div className="text-center mb-8">
                          <h3 className="text-[18px] font-bold uppercase mb-1 tracking-wide">
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </h3>
                          <h4 className="text-[19px] font-bold mb-1 relative inline-block">
                            Độc lập - Tự do - Hạnh phúc
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-full h-[1px] bg-black"></span>{" "}
                            {/* Gạch chân */}
                          </h4>
                        </div>

                        {/* --- PHẦN 2: TIÊU ĐỀ --- */}
                        <div className="text-center mb-8">
                          <p className="text-[16px] mb-2">
                            HIỆU TRƯỞNG TRƯỜNG{" "}
                            {selectedCert.schoolName.toUpperCase()}
                          </p>
                          <p className="text-[16px]">Cấp bằng</p>

                          <h1
                            className="text-[48px] font-bold text-[#b71c1c] uppercase tracking-wide scale-y-110 mt-4 mb-2 leading-none"
                            style={{
                              textShadow: "1px 1px 0px rgba(0,0,0,0.1)",
                            }}
                          >
                            TỐT NGHIỆP
                          </h1>
                        </div>

                        {/* --- PHẦN 3: THÔNG TIN SINH VIÊN --- */}
                        {/* --- PHẦN 3: THÔNG TIN SINH VIÊN --- */}
                        <div className="w-[850px] mx-auto space-y-4 text-[18px] leading-relaxed relative z-10 text-left">
                          <div className="flex items-baseline gap-4">
                            <span className="w-[120px] font-bold text-gray-700 shrink-0">
                              Ông/Bà:
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

                        {/* --- PHẦN 4: CHỮ KÝ & SỐ HIỆU --- */}
                        <div className="w-full flex justify-between items-end mt-auto px-10">
                          {/* Bên trái: Số hiệu */}
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

                            {/* QR Code giả lập */}
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

                          {/* Bên phải: Chữ ký */}
                          <div className="text-center relative">
                            <p className="italic mb-2">
                              ..., ngày {new Date().getDate()} tháng{" "}
                              {new Date().getMonth() + 1} năm{" "}
                              {new Date().getFullYear()}
                            </p>
                            <p className="font-bold text-[20px] uppercase mb-16">
                              HIỆU TRƯỞNG
                            </p>

                            {/* Chữ ký giả */}
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

                  <div className="mt-8 text-xs text-gray-400 font-mono text-center break-all">
                    Digital Signature Hash: {selectedCert.fileHash}
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button
                    onClick={() => setSelectedCert(null)}
                    className="px-6 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded transition transform hover:scale-105 flex items-center gap-2"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={exportPDF}
                    className="px-6 py-3 bg-[#3498DB] text-white font-bold rounded hover:bg-[#2980B9] transition transform hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Tải PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
