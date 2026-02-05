"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ArrowLeft, User } from "lucide-react";
import { getContract, connectWallet } from "../../utils/contractConfig";

const ADMIN_ROLE = ethers.ZeroHash;

export default function AdminPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [form, setForm] = useState({ address: "", name: "" });
  const [newAdmin, setNewAdmin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddAdmin = async () => {
    if (!newAdmin) return;
    setLoading(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const tx = await contract.grantRole(ADMIN_ROLE, newAdmin);
      await tx.wait();
      alert("Đã cấp quyền Admin thành công cho: " + newAdmin);
      setNewAdmin("");
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const { signer, address } = await connectWallet();
      setAccount(address);
      const contract = await getContract(signer);

      // Check Admin Role
      const hasRole = await contract.hasRole(ADMIN_ROLE, address);
      setIsAdmin(true); // Trusting standard check, but local var for UI
      if (hasRole) {
        fetchIssuers(contract);
      } else {
        alert("Bạn không phải Admin!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIssuers = async (contract: any) => {
    try {
      const issuerAddresses = await contract.getAllIssuers();
      const list = [];
      for (const addr of issuerAddresses) {
        const name = await contract.getSchoolName(addr);
        list.push({ address: addr, name });
      }
      setIssuers(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddIssuer = async () => {
    if (!form.address || !form.name) return;
    setLoading(true);
    try {
      const { signer } = await connectWallet();
      const contract = await getContract(signer);
      const tx = await contract.addIssuer(form.address, form.name);
      await tx.wait();
      alert("Thêm trường/Issuer thành công!");
      fetchIssuers(contract);
      setForm({ address: "", name: "" });
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
    setLoading(false);
  };

  if (!account)
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded shadow-2xl text-center border-t-4 border-blue-600">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            Quản Trị Hệ Thống
          </h2>
          <p className="text-gray-600 mb-6">
            Vui lòng kết nối ví Admin để tiếp tục
          </p>
          <button
            onClick={checkLogin}
            className="bg-blue-600 text-white px-8 py-3 rounded font-bold hover:bg-blue-700 transition transform hover:scale-105"
          >
            🔗 Kết nối Ví Admin
          </button>
        </div>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded shadow-2xl text-center border-t-4 border-red-600">
          <h2 className="text-2xl font-bold text-red-900 mb-2">
            Truy cập Bị Từ Chối
          </h2>
          <p className="text-gray-600">Bạn không có quyền Admin.</p>
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow">
          <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-2">
            <User className="w-8 h-8" />
            Quản Trị Hệ Thống
          </h1>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-[#3498DB] text-white rounded font-semibold hover:bg-[#2980B9] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay về
          </a>
        </div>

        {/* Add Issuer Form */}
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Thêm Trường/Đơn Vị
          </h2>
          <div className="flex gap-3">
            <input
              className="flex-1 border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Địa chỉ ví (0x...)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="flex-1 border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Tên trường"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <button
              onClick={handleAddIssuer}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading ? "Đang..." : "Thêm"}
            </button>
          </div>
        </div>

        {/* Add Admin Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Cấp Quyền Admin
          </h2>
          <div className="flex gap-3">
            <input
              className="flex-1 border border-gray-300 p-3 rounded focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Địa chỉ ví Admin mới (0x...)"
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
            />
            <button
              onClick={handleAddAdmin}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded font-semibold hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {loading ? "Đang..." : "Cấp"}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            ⚠️ Admin mới sẽ có toàn quyền quản lý hệ thống
          </p>
        </div>

        {/* Issuer List */}
        <div className="bg-white p-6 rounded shadow border-t-4 border-blue-600">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Danh Sách Trường/Đơn Vị
          </h2>
          {issuers.length === 0 ? (
            <p className="text-gray-500 text-center py-6">Chưa có trường nào</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">Tên Trường</th>
                    <th className="p-3 text-left">Địa Chỉ Ví</th>
                  </tr>
                </thead>
                <tbody>
                  {issuers.map((iss, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{iss.name}</td>
                      <td className="p-3 font-mono text-xs text-gray-600 break-all">
                        {iss.address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
