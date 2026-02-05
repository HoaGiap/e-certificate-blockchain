"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
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
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900">
            Kênh Nhà Trường (Issuer)
          </h1>
          <a href="/" className="text-blue-500">
            ← Trang chủ
          </a>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {["dashboard", "single", "batch", "revoke"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 font-medium ${activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "dashboard" && "Danh sách đã cấp"}
              {tab === "single" && "Cấp bằng Lẻ"}
              {tab === "batch" && "Cấp bằng Lô (CSV)"}
              {tab === "revoke" && "Thu hồi"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white p-6 rounded shadow">
          {activeTab === "dashboard" && (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">ID</th>
                  <th className="p-2">Sinh viên</th>
                  <th className="p-2">Bằng cấp</th>
                  <th className="p-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-2">#{c.id}</td>
                    <td className="p-2">{c.studentName}</td>
                    <td className="p-2">{c.degreeName}</td>
                    <td className="p-2">
                      {c.isValid ? (
                        <span className="text-green-600">Hiệu lực</span>
                      ) : (
                        <span className="text-red-600">Đã hủy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "single" && (
            <div className="grid grid-cols-2 gap-4">
              <input
                className="border p-2 rounded"
                placeholder="Ví Sinh viên"
                value={singleForm.student}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, student: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Tên Sinh viên"
                value={singleForm.name}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, name: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Tên Văn bằng"
                value={singleForm.degree}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, degree: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Ngày sinh (DD/MM/YYYY)"
                value={singleForm.dob}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, dob: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Xếp loại (Giỏi/Khá...)"
                value={singleForm.class}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, class: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Hình thức ĐT (Chính quy...)"
                value={singleForm.form}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, form: e.target.value })
                }
              />
              <input
                className="border p-2 rounded"
                placeholder="Năm TN (2024)"
                value={singleForm.year}
                onChange={(e) =>
                  setSingleForm({ ...singleForm, year: e.target.value })
                }
              />
              <button
                onClick={handleSingleMint}
                disabled={loading}
                className="col-span-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                {loading ? "Đang xử lý..." : "Cấp bằng"}
              </button>
            </div>
          )}

          {activeTab === "batch" && (
            <div>
              <p className="mb-2 text-sm text-gray-600">
                Nhập dữ liệu CSV (Mỗi dòng 1 sinh viên). Định dạng: <br />
                <code>Address, Name, Degree, DoB, Class, Form, Year</code>
              </p>
              <textarea
                className="w-full border p-2 rounded h-40 font-mono"
                placeholder="0x123..., NGUYEN VAN A, KY SU CNTT, 01/01/2000, GIOI, CHINH QUY, 2023"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
              />
              <button
                onClick={handleBatchMint}
                disabled={loading}
                className="mt-4 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
              >
                {loading ? "Đang xử lý..." : "Cấp danh sách này"}
              </button>
            </div>
          )}

          {activeTab === "revoke" && (
            <div>
              <p className="mb-2">Nhập ID văn bằng cần thu hồi:</p>
              <input
                className="border p-2 rounded w-64 mr-4"
                placeholder="Token ID (VD: 1, 2...)"
                value={revokeId}
                onChange={(e) => setRevokeId(e.target.value)}
              />
              <button
                onClick={handleRevoke}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                {loading ? "..." : "Xác nhận Thu hồi"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
