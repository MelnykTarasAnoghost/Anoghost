
import ConnectWallet from '../components/ConnectWallet'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
 
    
    

      <section className="py-20 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Issue Verifiable Credentials as NFTs on Solana
            </h1>
            <p className="text-xl mb-8 text-[#e3e3e3]/80">
              Transform how institutions issue diplomas and certificates with blockchain-verified credentials that
              students can showcase in their Web3 profiles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <ConnectWallet />
              
              <button className="px-6 py-2 rounded-md bg-transparent border border-[#512da8] text-[#e3e3e3] hover:bg-[#1a1f2e] transition-colors text-lg font-medium">
                Learn More
              </button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute -top-4 -left-4 w-full h-full bg-[#512da8]/20 rounded-lg"></div>
              <div className="relative bg-[#1a1f2e] p-6 rounded-lg border border-[#512da8]/30">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center">
                      <span className="font-bold">UC</span>
                    </div>
                    <div className="ml-3">
                      <div className="font-bold">University of Crypto</div>
                      <div className="text-sm text-[#e3e3e3]/70">Verified Issuer</div>
                    </div>
                  </div>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 12L11 14L15 10"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="9" stroke="#512da8" strokeWidth="2" />
                  </svg>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">Blockchain Development Certificate</h3>
                  <p className="text-[#e3e3e3]/70">Awarded to: Alex Johnson</p>
                  <p className="text-[#e3e3e3]/70">Date: June 15, 2023</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">Smart Contracts</span>
                  <span className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">Solana</span>
                  <span className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">Web3</span>
                  <span className="px-2 py-1 bg-[#512da8]/20 rounded-full text-xs">DeFi</span>
                </div>
                <div className="text-xs text-[#e3e3e3]/50 flex items-center">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="#e3e3e3"
                      strokeOpacity="0.5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 6V12L16 14"
                      stroke="#e3e3e3"
                      strokeOpacity="0.5"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Verified on Solana • NFT ID: Sol...8f3d
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        <section id="features" className="py-20 bg-[#1a1f2e]/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Features</h2>
            <p className="max-w-2xl mx-auto text-[#e3e3e3]/80">
              Our platform offers a comprehensive solution for issuing, managing, and verifying blockchain-based
              credentials.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7M5 11V9C5 7.89543 5.89543 7 7 7M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7M7 7H17"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">NFT Credentials</h3>
              <p className="text-[#e3e3e3]/80">
                Issue diplomas and certificates as verifiable NFTs on Solana with complete metadata including issuing
                body, course details, and skill tags.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Decentralized Verification</h3>
              <p className="text-[#e3e3e3]/80">
                Enable credential verification through DAO voting or trusted institutions, ensuring authenticity without
                centralized authorities.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Expiration & Renewal</h3>
              <p className="text-[#e3e3e3]/80">
                Set expiration dates for credentials that require renewal, ensuring that professional certifications
                remain current.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13 10V3L4 14H11V21L20 10H13Z"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Upskilling Rewards</h3>
              <p className="text-[#e3e3e3]/80">
                Incentivize continuous learning with token rewards for completing additional courses and expanding skill
                sets.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V14C4 15.1046 4.89543 16 6 16H8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Web3 Integration</h3>
              <p className="text-[#e3e3e3]/80">
                Seamlessly add credentials to Web3 profiles, share on LinkedIn, or use in DAO job applications for
                enhanced visibility.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#1a1f2e]/30 p-6 rounded-lg border border-[#512da8]/20 hover:border-[#512da8]/50 transition-colors">
              <div className="w-12 h-12 bg-[#512da8]/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Skill Tagging</h3>
              <p className="text-[#e3e3e3]/80">
                Tag credentials with specific skills, making it easier for employers to find candidates with the exact
                qualifications they need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="max-w-2xl mx-auto text-[#e3e3e3]/80">
              Our platform simplifies the process of issuing and managing blockchain-based credentials.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center text-[#e3e3e3] font-bold">
                  1
                </div>
                <div className="hidden md:block h-1 flex-grow ml-4 bg-[#512da8]"></div>
              </div>
              <h3 className="text-xl font-bold mb-2">Institutions Create Credentials</h3>
              <p className="text-[#e3e3e3]/80">
                Educational institutions, online courses, and organizations create digital credentials with detailed
                metadata.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="hidden md:block h-1 flex-grow mr-4 bg-[#512da8]"></div>
                <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center text-[#e3e3e3] font-bold">
                  2
                </div>
                <div className="hidden md:block h-1 flex-grow ml-4 bg-[#512da8]"></div>
              </div>
              <h3 className="text-xl font-bold mb-2">Mint as NFTs on Solana</h3>
              <p className="text-[#e3e3e3]/80">
                Credentials are minted as NFTs on the Solana blockchain, ensuring they are verifiable and tamper-proof.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex items-center mb-4">
                <div className="hidden md:block h-1 flex-grow mr-4 bg-[#512da8]"></div>
                <div className="w-10 h-10 rounded-full bg-[#512da8] flex items-center justify-center text-[#e3e3e3] font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Students Showcase Credentials</h3>
              <p className="text-[#e3e3e3]/80">
                Recipients can display their credentials on Web3 profiles, share on social media, or use in job
                applications.
              </p>
            </div>
          </div>
        </div>
      </section>
<section id="benefits" className="py-20 bg-[#1a1f2e]/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Benefits</h2>
            <p className="max-w-2xl mx-auto text-[#e3e3e3]/80">
              Our platform offers unique advantages for both credential issuers and recipients.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Institutions */}
            <div>
              <div className="bg-[#512da8]/10 p-1 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21L21 21M19 21H14M5 21L3 21M5 21H10M9 7H10M9 11H10M9 15H10M14 7H15M14 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M14 21H10"
                    stroke="#512da8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">For Institutions</h3>
              <ul className="space-y-4">
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Reduce credential fraud with blockchain verification</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Enhance institutional reputation with cutting-edge technology</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Streamline credential management and verification processes</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Create new revenue streams through credential renewal and upskilling programs</span>
                </li>
              </ul>
            </div>

            {/* For Students */}
            <div>
              <div className="bg-[#512da8]/10 p-1 rounded-lg inline-block mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 14L11.2929 14.7071L12 15.4142L12.7071 14.7071L12 14ZM5 21L4.29289 21.7071L5 22.4142L5.70711 21.7071L5 21ZM19 21L19.7071 21.7071L20.4142 21L19.7071 20.2929L19 21ZM11.2929 14.7071L4.29289 21.7071L5.70711 20.2929L12.7071 13.2929L11.2929 14.7071ZM12.7071 14.7071L19.7071 21.7071L18.2929 20.2929L11.2929 13.2929L12.7071 14.7071ZM12 8C9.23858 8 7 5.76142 7 3H5C5 6.86599 8.13401 10 12 10V8ZM17 3C17 5.76142 14.7614 8 12 8V10C15.866 10 19 6.86599 19 3H17Z"
                    fill="#512da8"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">For Students</h3>
              <ul className="space-y-4">
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Own your credentials as digital assets that can't be lost or damaged</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Easily share verifiable credentials with employers and on social platforms</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Build a comprehensive Web3 profile showcasing all your achievements</span>
                </li>
                <li className="flex">
                  <svg
                    className="w-6 h-6 mr-2 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="#512da8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Earn rewards for continuing education and expanding your skill set</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
   
  )
}
