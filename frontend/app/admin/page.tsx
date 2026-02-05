"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
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
      <div className="p-10 text-center">
        <button
          onClick={checkLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Kết nối Ví Admin
        </button>
      </div>
    );

  if (!isAdmin)
    return (
      <div className="p-10 text-center text-red-600">Truy cập bị từ chối.</div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Quản trị Hệ thống (Admin)
          </h1>
          <a href="/" className="text-blue-500">
            ← Trang chủ
          </a>
        </div>

        {/* Add Issuer Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-bold mb-4">
            Thêm Trường/Đơn vị cấp bằng
          </h2>
          <div className="flex gap-4">
            <input
              className="border p-2 rounded flex-1"
              placeholder="Địa chỉ ví (0x...)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="border p-2 rounded flex-1"
              placeholder="Tên trường (VD: ĐH BK Hà Nội)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <button
              onClick={handleAddIssuer}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Thêm"}
            </button>
          </div>
        </div>

        {/* Add Admin Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 border-l-4 border-purple-600">
          <h2 className="text-lg font-bold mb-4 text-purple-800">
            Thêm Quản trị viên (Grant Admin Role)
          </h2>
          <div className="flex gap-4">
            <input
              className="border p-2 rounded flex-1"
              placeholder="Địa chỉ ví Admin mới (0x...)"
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
            />
            <button
              onClick={handleAddAdmin}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Cấp quyền Admin"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            * Lưu ý: Admin mới sẽ có toàn quyền quản lý hệ thống tương đương với
            bạn.
          </p>
        </div>

        {/* Issuer List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">
            Danh sách Đơn vị đã cấp quyền
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Tên trường</th>
                <th className="p-2">Địa chỉ ví</th>
              </tr>
            </thead>
            <tbody>
              {issuers.map((iss, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{iss.name}</td>
                  <td className="p-2 text-gray-600 font-mono text-sm">
                    {iss.address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
