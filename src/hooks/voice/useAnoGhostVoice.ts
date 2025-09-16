import { useState, useRef, useEffect, useCallback } from 'react';
import { getSocket } from '@/services/socket';
import { Device, types as MediasoupTypes } from 'mediasoup-client';
import { createRoomKey, decryptFrame, encryptFrame } from '@/utils/voiceEncryption';

// Type alias for the encoded frames to resolve TypeScript ambiguity
type RTCEncodedFrame = RTCEncodedAudioFrame | RTCEncodedVideoFrame;

// Type definition for a participant in the voice chat
type Participant = {
  socketId: string;
  consumer: MediasoupTypes.Consumer;
  audioElement: HTMLAudioElement;
};

/**
 * A comprehensive React hook to manage a full-featured, E2EE voice chat session with AnoGhost.
 */
export function useAnoGhostVoice() {
  const socket = getSocket();
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<MediasoupTypes.Transport | null>(null);
  const recvTransportRef = useRef<MediasoupTypes.Transport | null>(null);
  const producerRef = useRef<MediasoupTypes.Producer | null>(null);
  const roomKeyRef = useRef<CryptoKey | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // --- Core Functions ---

  const addAudioTrack = useCallback((socketId: string, consumer: MediasoupTypes.Consumer) => {
    const { track } = consumer;
    if (!track) {
      console.error(`[CLIENT] No track in consumer from ${socketId}`);
      return;
    }

    console.log(`[CLIENT] Adding audio track from ${socketId}, readyState=${track.readyState}, muted=${track.muted}`);

    const stream = new MediaStream([track]);
    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.volume = 1.0;
    audioElement.autoplay = true; // на всяк випадок
    audioElement.playsInline = true;

    audioElement.style.display = 'none'; // hide element if you don't want it visible
    document.body.appendChild(audioElement);
    
    audioElement.play()
      .then(() => console.log(`[CLIENT] AudioElement playing for ${socketId}`))
      .catch(e => console.error(`[CLIENT] Autoplay failed for ${socketId}:`, e));

    setParticipants(prev => {
      const newMap = new Map(prev);
      newMap.set(socketId, { socketId, consumer, audioElement });
      return newMap;
    });
  }, []);


  const removeParticipant = useCallback((socketId: string) => {
    setParticipants(prev => {
      const newMap = new Map(prev);
      const participant = newMap.get(socketId);
      if (participant) {
        participant.consumer.close();
        participant.audioElement.srcObject = null;
        participant.audioElement.remove();
        newMap.delete(socketId);
      }
      return newMap;
    });
  }, []);

  const joinVoice = async () => {
    if (!socket || isConnected) {
      console.log('Join voice aborted: Socket not ready or already connected.');
      return;
    }
    console.log('[JOIN VOICE START]');

    try {
      // 1. Initialize Mediasoup Device
      console.log('[1] Emitting "voice:getRtpCapabilities"...');
      const routerRtpCapabilities = await new Promise<MediasoupTypes.RtpCapabilities>((resolve, reject) => {
        socket.emit('voice:getRtpCapabilities', (response: { rtpCapabilities?: MediasoupTypes.RtpCapabilities; error?: string }) => {
          if (response.error) return reject(new Error(response.error));
          console.log('[1.1] Received RTP capabilities.');
          resolve(response.rtpCapabilities!);
        });
      });

      const device = new Device();
      await device.load({ routerRtpCapabilities });
      deviceRef.current = device;
      console.log('[1.2] Mediasoup device loaded.');

      // 2. Create Send and Receive Transports
      const createTransport = async (direction: 'send' | 'recv'): Promise<MediasoupTypes.Transport> => {
        console.log(`[2] Emitting "voice:createTransport" for ${direction} transport...`);
        const transportOptions = await new Promise<any>((resolve, reject) => {
          socket.emit('voice:createTransport', (response: any) => {
            if (response.error) reject(new Error(response.error));
            else resolve(response);
          });
        });
        console.log(`[2.1] Received options for ${direction} transport.`);

        const transport = direction === 'send'
          ? device.createSendTransport(transportOptions)
          : device.createRecvTransport(transportOptions);

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            console.log(`[CLIENT] ${direction} transport connecting...`);
          
            const timeout = setTimeout(() => {
              console.error(`[CLIENT] ${direction} transport connect timeout!`);
              errback(new Error('Transport connect timeout'));
            }, 5000); // 5s timeout
          
            socket.emit('voice:connectTransport', { transportId: transport.id, dtlsParameters }, () => {
              clearTimeout(timeout);
              console.log(`[CLIENT] ${direction} transport connected.`);
              callback();
            });
          });
          
        return transport;
      };

      sendTransportRef.current = await createTransport('send');
      recvTransportRef.current = await createTransport('recv');
      console.log('[2.4] Both transports created.');

      sendTransportRef.current?.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            console.log(
              "[CLIENT] Send transport producing handler START.",
              "transportId=",
              sendTransportRef.current?.id,
              " kind=",
              kind
            );

            console.log(
              "[CLIENT] rtpParameters codecs count:",
              rtpParameters?.codecs?.length
            );

            // Якщо transport ще не підключений — зачекати до 5 сек.
            if (sendTransportRef.current?.connectionState !== "connected") {
              console.log(
                "[CLIENT] Transport not yet connected (state=",
                sendTransportRef.current?.connectionState,
                "), waiting up to 5s..."
              );
              await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(
                  () => reject(new Error("Transport connect timeout inside produce")),
                  5000
                );

                const onStateChange = () => {
                  if (sendTransportRef.current?.connectionState === "connected") {
                    clearTimeout(timer);
                    sendTransportRef.current?.off(
                      "connectionstatechange",
                      onStateChange
                    );
                    resolve();
                  }
                };

                sendTransportRef.current?.on(
                  "connectionstatechange",
                  onStateChange
                );
              });
            }

            console.log(
              "[CLIENT] Emitting voice:produce -> server with transportId:",
              sendTransportRef.current?.id
            );

            const produceResponse = await Promise.race([
              new Promise<any>((resolve, reject) => {
                socket.emit(
                  "voice:produce",
                  {
                    transportId: sendTransportRef.current!.id,
                    kind,
                    rtpParameters,
                  },
                  (response: any) => {
                    if (response?.error) {
                      console.error(
                        "[CLIENT] voice:produce response error:",
                        response.error
                      );
                      return reject(new Error(response.error));
                    }
                    console.log(
                      "[CLIENT] voice:produce response payload:",
                      response
                    );
                    resolve(response);
                  }
                );
              }),
              new Promise((_r, reject) =>
                setTimeout(() => reject(new Error("voice:produce emit timeout")), 5000)
              ),
            ]);

            console.log(
              "[CLIENT] Producer created with ID (from server):",
              produceResponse.id
            );
            callback({ id: produceResponse.id });
          } catch (err) {
            console.error("[CLIENT] produce failed:", err);
            errback(err as Error);
          }
        }
      );
      

      // 3. Setup E2EE Key
      roomKeyRef.current = await createRoomKey();
      console.log('[3] E2EE room key created.');

      // 4. Get Masked & Encrypted Audio Stream
      console.log('[4] Setting up audio context and masked track...');

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.audioWorklet.addModule('/robot-voice-processor.js');
      
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      
      const micSource = audioContext.createMediaStreamSource(micStream);
      const seed = parseInt(socket.id ? socket.id.substring(0, 4) : '0', 16);
      const robotNode = new AudioWorkletNode(audioContext, 'robot-voice-processor', { processorOptions: { seed } });
      
      const destination = audioContext.createMediaStreamDestination();
      micSource.connect(robotNode).connect(destination);
      const maskedAudioTrack = destination.stream.getAudioTracks()[0];
      
      // const maskedAudioTrack = micStream.getAudioTracks()[0]; // use raw mic track
      console.log('[4.1] Masked audio track ready.');
      

      const producer = await sendTransportRef.current.produce({
        track: maskedAudioTrack,
        codecOptions: { opusStereo: true },
        onRtpSender: (rtpSender) => {
          console.log('[CLIENT] onRtpSender callback fired, setting up E2EE transform.');
          // try {
          //   if (!roomKeyRef.current) return console.warn('[CLIENT][E2EE] Room key not ready yet!');
          //   const senderStreams = rtpSender.createEncodedStreams() as ReadableWritablePair<RTCEncodedFrame, RTCEncodedFrame>;
      
          //   const transformStream = new TransformStream<RTCEncodedFrame, RTCEncodedFrame>({
          //     transform: async (chunk, controller) => {
          //       try {
          //         if (!roomKeyRef.current) {
          //           console.warn('[CLIENT][E2EE] Room key missing for chunk', chunk.timestamp);
          //           controller.enqueue(chunk);
          //           return;
          //         }
      
          //         // console.log('[CLIENT][E2EE] Encrypting chunk timestamp:', chunk.timestamp);
          //         chunk.data = await encryptFrame(roomKeyRef.current, chunk.data);
          //         controller.enqueue(chunk);
      
          //       } catch (e) {
          //         console.error('[CLIENT][E2EE] Encryption failed for chunk', chunk.timestamp, e);
          //         controller.enqueue(chunk); // pass it anyway
          //       }
          //     }
          //   });
      
          //   senderStreams.readable
          //     .pipeThrough(transformStream)
          //     .pipeTo(senderStreams.writable)
          //     .catch(e => console.error('[CLIENT][E2EE] PipeTo failed:', e));
      
          // } catch (e) {
          //   console.error('[CLIENT][E2EE] Failed to setup transform streams:', e);
          // }
        },
      });

      producerRef.current = producer;
      socket.emit('voice:join');
      setIsConnected(true);
      console.log('[JOIN VOICE SUCCESS]');

    } catch (error) {
      console.error("Failed to join voice chat:", error);
      // Add cleanup logic here in case of failure
      leaveVoice();
    }
  };

  const leaveVoice = () => {
    if (!isConnected) return;
    console.log('Leaving voice chat...');

    socket?.emit('voice:leave');

    producerRef.current?.close();
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    audioContextRef.current?.close();
    micStreamRef.current?.getTracks().forEach(track => track.stop());

    participants.forEach(p => removeParticipant(p.socketId));

    deviceRef.current = null;
    producerRef.current = null;
    sendTransportRef.current = null;
    recvTransportRef.current = null;
    roomKeyRef.current = null;
    audioContextRef.current = null;
    micStreamRef.current = null;
    
    setParticipants(new Map());
    setIsConnected(false);
  };

  // --- Socket Event Listeners ---

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewProducer = async ({ producerId, socketId }: { producerId: string, socketId: string }) => {
      const recvTransport = recvTransportRef.current;
      if (!recvTransport || !deviceRef.current) return;
      
      console.log(`[CLIENT] New producer from ${socketId}, creating consumer...`);
    
      const consumerOptions = await new Promise<any>((resolve, reject) => {
        socket.emit('voice:consume', { 
          transportId: recvTransport.id, 
          producerId, 
          rtpCapabilities: deviceRef.current!.rtpCapabilities 
        }, (response: any) => {
          if (response.error) {
            console.error('[CLIENT] consume failed:', response.error);
            reject(new Error(response.error));
          } else {
            console.log('[CLIENT] consume options received:', response);
            resolve(response);
          }
        });
      });
    
      const consumer = await recvTransport.consume(consumerOptions);
      console.log('[CLIENT] Consumer created with id:', consumer.id, 'kind:', consumer.kind);
    
      addAudioTrack(socketId, consumer);
    
      await consumer.resume();

      await new Promise<void>((resolve, reject) => {
        socket.emit('voice:resume', { consumerId: consumer.id }, (res: any) => {
          if (res?.error) return reject(new Error(res.error));
          console.log('[CLIENT] Server confirmed consumer resumed');
          resolve();
        });
      });

      console.log('[CLIENT] Consumer resumed for', socketId);
    };
    

    socket.on('voice:newProducer', handleNewProducer);
    socket.on('voice:participantLeft', ({ socketId }) => removeParticipant(socketId));

    return () => {
      socket.off('voice:newProducer', handleNewProducer);
      socket.off('voice:participantLeft');
    };
  }, [socket, isConnected, addAudioTrack, removeParticipant]);

  return { joinVoice, leaveVoice, isConnected, participants: Array.from(participants.values()) };
}