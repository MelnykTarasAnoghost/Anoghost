import WalletConnectButton from "../components/WalletConnectButton";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white space-y-6">
      <h1 className="text-4xl font-bold">AnoGhost</h1>
      <WalletConnectButton />
      <Link to="/create-room" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl">
        Create New Room
      </Link>
    </div>
  );
}
