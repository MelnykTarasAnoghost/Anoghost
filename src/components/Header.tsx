import React from 'react'
import { Link } from 'react-router-dom'
import ConnectWallet from '../components/ConnectWallet'


import { useWallet } from '@solana/wallet-adapter-react'


const Header = () => {

  const {connected} = useWallet();

  console.log(connected);
  

  return (
    <header className="sticky top-0 z-10 bg-[#242424] border-b border-[#333333]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to='/'>
          <div className="flex items-center">
            <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#512da8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#512da8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#512da8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xl font-bold">Cerdify</span>
          </div>
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link to="/issue" className="hover:text-[#512da8] transition-colors">Issue Certificate</Link>
            <Link to="/verify" className="hover:text-[#512da8] transition-colors">Verify Certificate</Link>
            {connected &&(
              <Link to="/profile" className="hover:text-[#512da8] transition-colors">Profile page</Link>
            )}
            
          </nav>
          <div className="flex space-x-4 justify-center items-center">
            <ConnectWallet />
          </div>
          <button className="md:hidden">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </header>
  )
}

export default Header