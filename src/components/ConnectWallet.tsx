
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

export default function ConnectWallet() {
  return (
    <div className="flex justify-center">
      <WalletMultiButton className="bg-primary hover:bg-primary/90 text-white rounded px-6 py-2" />
    </div>
  )
}
