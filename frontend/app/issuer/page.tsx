"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Building2,
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { getContract, connectWallet } from "../../utils/contractConfig";

export default function IssuerPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [certs, setCerts] = useState<any[]>([]);

  // Forms
  const [singleForm, setSingleForm] = useState({
    student: "",
    name: "",
    degree: "",
    dob: "",
    class: "",
    form: "",
    year: "",
  });
  const [csvData, setCsvData] = useState("");
  const [revokeId, setRevokeId] = useState("");

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const { signer, address } = await connectWallet();
      setAccount(address);
      fetchIssuedCerts(signer);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIssuedCerts = async (signer: any) => {
    const contract = await getContract(signer);
    // V6: getIssuedCertificates
    const ids = await contract.getIssuedCertificates(await signer.getAddress());
    const list = [];
    for (const id of ids) {
      const c = await contract.certificates(id);
      // Explicitly map struct fields to object to avoid "undefined" or Spread issues
      list.push({
        id: id.toString(),
        studentName: c.studentName, // c[0]
        degreeName: c.degreeName, // c[1]
        isValid: c.isValid, // c[5]
      });
    }
    setCerts(list);
  };

  const handleSingleMint = async () => {
    setLoading(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const unique = `${singleForm.name}-${singleForm.degree}-${Date.now()}`;
      const hash = ethers.id(unique);

      const tx = await contract.mint(
        singleForm.student,
        "ipfs://placeholder",
        singleForm.name.toUpperCase(),
        singleForm.degree.toUpperCase(),
        hash,
        singleForm.dob,
        singleForm.class,
        singleForm.form,
        singleForm.year,
      );
      await tx.wait();
      alert("Cấp bằng thành công!");
      fetchIssuedCerts(signer);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
    setLoading(false);
  };

  const handleBatchMint = async () => {
    setLoading(true);
    try {
      const rows = csvData.trim().split("\n");
      const tos = [],
        uris = [],
        names = [],
        degrees = [],
        hashes = [],
        dobs = [],
        classes = [],
        forms = [],
        years = [];

      for (const row of rows) {
        const cols = row.split(",").map((s) => s.trim());
        if (cols.length < 7) continue;
        // Format: Addr, Name, Degree, DoB, Class, Form, Year
        tos.push(cols[0]);
        names.push(cols[1].toUpperCase());
        degrees.push(cols[2].toUpperCase());
        dobs.push(cols[3]);
        classes.push(cols[4]);
        forms.push(cols[5]);
        years.push(cols[6]);

        const unique = `${cols[1]}-${cols[2]}-${Date.now()}-${Math.random()}`;
        hashes.push(ethers.id(unique));
        uris.push("ipfs://placeholder");
      }

      const { signer } = await connectWallet();
      const contract = await getContract(signer);

      const tx = await contract.batchMint(
        tos,
        uris,
        names,
        degrees,
        hashes,
        dobs,
        classes,
        forms,
        years,
      );
      await tx.wait();
      alert(`Đã cấp ${tos.length} bằng thành công!`);
      fetchIssuedCerts(signer);
    } catch (e: any) {
      alert("Lỗi Batch Mint: " + e.message);
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    setLoading(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const tx = await contract.revoke(revokeId);
      await tx.wait();
      alert("Đã thu hồi văn bằng #" + revokeId);
      fetchIssuedCerts(signer);
    } catch (e: any) {
      alert("Lỗi Thu hồi: " + e.message);
    }
    setLoading(false);
  };

  if (!account)
    return (
      <div className="p-10 text-center">
        <button onClick={checkLogin}>Connect Wallet</button>
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow">
          <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Kênh Nhà Trường
          </h1>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-[#3498DB] text-white rounded font-semibold hover:bg-[#2980B9] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay về
          </a>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b flex-wrap">
          {["dashboard", "single", "batch", "revoke"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 font-semibold transition ${activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "dashboard" && "📋 Danh sách"}
              {tab === "single" && "🎓 Cấp Lẻ"}
              {tab === "batch" && "📊 Cấp Lô"}
              {tab === "revoke" && "🗑 Thu hồi"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white p-6 rounded shadow">
          {activeTab === "dashboard" && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-900">
                Danh sách Văn bằng Đã Cấp
              </h3>
              {certs.length === 0 ? (
                <p className="text-gray-500 italic text-center py-8">
                  Không có văn bằng nào.👋
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-blue-100 border-b-2 border-blue-600">
                        <th className="p-4 font-bold text-blue-900">#ID</th>
                        <th className="p-4 font-bold text-blue-900">
                          Sinh viên
                        </th>
                        <th className="p-4 font-bold text-blue-900">
                          Bằng cấp
                        </th>
                        <th className="p-4 font-bold text-blue-900">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-blue-50 transition"
                        >
                          <td className="p-4 font-bold text-blue-600">
                            #{c.id}
                          </td>
                          <td className="p-4 font-medium">{c.studentName}</td>
                          <td className="p-4">{c.degreeName}</td>
                          <td className="p-4">
                            {c.isValid ? (
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-sm">
                                ✓ Hiệu lực
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-sm">
                                ✗ Đã hủy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "single" && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                Cấp Văn Bằng Cá Nhân
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ví Sinh viên"
                  value={singleForm.student}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, student: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Tên Sinh viên"
                  value={singleForm.name}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, name: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Tên Văn bằng"
                  value={singleForm.degree}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, degree: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ngày sinh (DD/MM/YYYY)"
                  value={singleForm.dob}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, dob: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Xếp loại"
                  value={singleForm.class}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, class: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Hình thức ĐT"
                  value={singleForm.form}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, form: e.target.value })
                  }
                />
                <input
                  className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Năm TN"
                  value={singleForm.year}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, year: e.target.value })
                  }
                />
              </div>
              <button
                onClick={handleSingleMint}
                disabled={loading}
                className="mt-4 w-full bg-green-600 text-white p-3 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                {loading ? "Đang..." : "Cấp bằng"}
              </button>
            </div>
          )}

          {activeTab === "batch" && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-800">
                Cấp Văn Bằng Danh Sách (CSV)
              </h3>
              <p className="mb-3 text-sm text-gray-600">
                Định dạng: Address, Name, Degree, DoB, Class, Form, Year
              </p>
              <textarea
                className="w-full border border-gray-300 p-3 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                placeholder="0x123..., NGUYEN VAN A, KY SU CNTT, 01/01/2000, GIOI, CHINH QUY, 2023"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
              />
              <button
                onClick={handleBatchMint}
                disabled={loading}
                className="mt-4 w-full bg-purple-600 text-white p-3 rounded font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {loading ? "Đang..." : "Cấp danh sách"}
              </button>
            </div>
          )}

          {activeTab === "revoke" && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-red-700">
                Thu Hồi Văn Bằng
              </h3>
              <div className="flex gap-3">
                <input
                  className="flex-1 border border-gray-300 p-3 rounded focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  placeholder="Token ID"
                  value={revokeId}
                  onChange={(e) => setRevokeId(e.target.value)}
                />
                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {loading ? "Đang..." : "Thu hồi"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
