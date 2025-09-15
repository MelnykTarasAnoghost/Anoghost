// src/types/webrtc.d.ts

// Define the pair that the createEncodedStreams method returns
interface ReadableWritablePair<R, W> {
  readable: ReadableStream<R>;
  writable: WritableStream<W>;
}

// Define the frame types for clarity
type RTCEncodedFrame = RTCEncodedAudioFrame | RTCEncodedVideoFrame;

// Augment the existing WebRTC interfaces with the correct method signature
interface RTCRtpSender {
  createEncodedStreams(): ReadableWritablePair<RTCEncodedFrame, RTCEncodedFrame>;
}

interface RTCRtpReceiver {
  createEncodedStreams(): ReadableWritablePair<RTCEncodedFrame, RTCEncodedFrame>;
}

// Also include the playsInline property we added before
interface HTMLMediaElement {
  playsInline: boolean;
}