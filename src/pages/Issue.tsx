
import IssueCertificate from '../components/IssueCertificate'

export default function Issue() {
  return (
    <div className="container max-w-full w-full pt-20">
      <h2 className="text-4xl m-5 text-center mb-10 font-medium">Issue a New Certificate</h2>
      <IssueCertificate />
    </div>
  )
}

