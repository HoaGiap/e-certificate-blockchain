"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Link, ArrowLeft, RefreshCw } from "lucide-react";
import { getContract, connectWallet } from "../../utils/contractConfig";

export default function ExplorerPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Use a read-only provider if wallet not connected, but for simplicity try connecting or use window.ethereum
      let provider;
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // Fallback or alert
        alert("Vui lòng cài Metamask để xem dữ liệu Blockchain!");
        setLoading(false);
        return;
      }

      const contract = await getContract(provider);

      // Fetch "CertificateIssued" events with reduced block range
      const currentBlock = await provider.getBlockNumber();
      // Reduce to 1000 blocks to avoid RPC "range too large" error
      const fromBlock = Math.max(0, currentBlock - 1000);

      const issuedEvents = await contract.queryFilter(
        "CertificateIssued",
        fromBlock,
        "latest",
      );
      const revokedEvents = await contract.queryFilter(
        "CertificateRevoked",
        fromBlock,
        "latest",
      );

      // Format events
      const formattedIssued = await Promise.all(
        issuedEvents.map(async (e: any) => {
          const block = await e.getBlock();
          return {
            type: "ISSUE", // Cấp bằng
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            args: {
              tokenId: e.args[0].toString(),
              student: e.args[1],
              name: e.args[2],
            },
          };
        }),
      );

      const formattedRevoked = await Promise.all(
        revokedEvents.map(async (e: any) => {
          const block = await e.getBlock();
          return {
            type: "REVOKE", // Thu hồi
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toLocaleString(),
            args: {
              tokenId: e.args[0].toString(),
              revoker: e.args[1],
            },
          };
        }),
      );

      // Combine and Sort by Block Number (Descending - Newest first)
      const allEvents = [...formattedIssued, ...formattedRevoked].sort(
        (a, b) => b.blockNumber - a.blockNumber,
      );

      setEvents(allEvents);
    } catch (e: any) {
      console.error(e);
      alert("Lỗi tải dữ liệu: " + e.message);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow">
          <div>
            <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-2">
              <Link className="w-8 h-8" />
              Transaction Explorer
            </h1>
            <p className="text-gray-600 text-sm">
              Lịch sử giao dịch trên Blockchain
            </p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
          >
            ← Quay về
          </a>
        </header>

        <div className="bg-white rounded shadow overflow-hidden border-t-4 border-blue-600">
          {/* Header */}
          <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">
              📊 Lịch Sử Giao Dịch ({events.length})
            </h3>
            <button
              onClick={fetchEvents}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
            >
              {loading ? "Đang tải..." : "🔄 Làm mới"}
            </button>
          </div>

          {loading && events.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Đang đồng bộ dữ liệu...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-3">Loại GD</th>
                    <th className="p-3">Tx Hash</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {ev.type === "ISSUE" ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">
                            ★ CẤP
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold">
                            ✕ THU HỒI
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-blue-600">
                        <a
                          href={`https://explorer.cronos.org/testnet/tx/${ev.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {ev.txHash.slice(0, 8)}...{ev.txHash.slice(-6)} ↗
                        </a>
                      </td>
                      <td className="p-3">
                        <div className="text-xs">{ev.timestamp}</div>
                        <div className="text-xs text-gray-500">
                          Block #{ev.blockNumber}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {ev.type === "ISSUE" ? (
                          <div>
                            <p>Người nhận: {ev.args.student.slice(0, 6)}...</p>
                            <p>
                              <strong>{ev.args.name}</strong>
                            </p>
                          </div>
                        ) : (
                          <p className="text-red-500 font-bold">
                            Văn bằng #{ev.args.tokenId} hủy
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && !loading && (
                <div className="p-10 text-center text-gray-400 italic">
                  Chưa có giao dịch nào
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
