import { useState, useRef, useEffect } from "react";
import API from "../api/api";
import { Mic, Activity, MessageSquare, Sparkles, Volume2, VolumeX, Headphones, Radio } from "lucide-react";

const getNow = () => Date.now();

function Voice() {
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [needsActivation, setNeedsActivation] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isRecordingRef = useRef(false);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const hasSpokenRef = useRef(false);

  const cleanupAudioAnalyser = () => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  // Fetch the initial greeting TTS base64 from the backend on load
  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const res = await API.post("/voice/tts", {
          text: "Neural link established. How may I access the archives for you today?"
        });
        if (res.data.audio_base64) {
          const audioUrl = `data:audio/mp3;base64,${res.data.audio_base64}`;
          setAudioSrc(audioUrl);
          setAnswer("Neural link established. How may I access the archives for you today?");
        }
      } catch (err) {
        console.error("Failed to load greeting TTS", err);
      }
    };
    fetchGreeting();

    return () => {
      cleanupAudioAnalyser();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const activateLink = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setNeedsActivation(false);
        setHasStarted(true);
      }).catch(err => {
        console.error("Browser blocked autoplay. Interactive play required:", err);
      });
    }
  };

  const startRecording = async () => {
    if (isRecordingRef.current) return;

    // Stop any playing voice response when the user starts speaking
    if (audioRef.current) {
      audioRef.current.pause();
    }

    isRecordingRef.current = true;
    setIsRecording(true);
    hasSpokenRef.current = false;
    setVolumeLevel(0);
    setTranscript("");
    setAnswer("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!isRecordingRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        cleanupAudioAnalyser();

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendAudioToBackend(audioBlob);
      };

      // Set up AnalyserNode to detect silence & show visual volume levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStartTime = null;
      const SILENCE_THRESHOLD = 15; // 0-255 scale
      const SILENCE_DURATION_MS = 1500; // Stop after 1.5s of silence
      const MAX_RECORDING_MS = 15000; // Hard stop at 15s
      const INITIAL_SILENCE_TIMEOUT_MS = 5000; // Stop after 5s if user hasn't spoken yet
      const startTime = getNow();

      const checkVolume = () => {
        if (!isRecordingRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const avg = total / bufferLength;
        setVolumeLevel(avg);

        const now = getNow();
        const duration = now - startTime;

        if (avg > SILENCE_THRESHOLD) {
          hasSpokenRef.current = true;
          silenceStartTime = null;
        } else {
          // If the user hasn't started speaking and hits the initial silence timeout
          if (!hasSpokenRef.current && duration > INITIAL_SILENCE_TIMEOUT_MS) {
            console.log("No speech detected. Stopping...");
            stopRecording();
            return;
          }

          // If the user has started speaking and is now silent
          if (hasSpokenRef.current) {
            if (!silenceStartTime) {
              silenceStartTime = now;
            } else if (now - silenceStartTime > SILENCE_DURATION_MS) {
              console.log("Silence duration met. Stopping...");
              stopRecording();
              return;
            }
          }
        }

        if (duration > MAX_RECORDING_MS) {
          console.log("Max recording duration met. Stopping...");
          stopRecording();
          return;
        }

        requestAnimationFrame(checkVolume);
      };

      mediaRecorder.start();
      requestAnimationFrame(checkVolume);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for this feature.");
      isRecordingRef.current = false;
      setIsRecording(false);
      cleanupAudioAnalyser();
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;

    isRecordingRef.current = false;
    setIsRecording(false);
    setVolumeLevel(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      const res = await API.post("/voice/conversation", formData);
      setTranscript(res.data.transcript);
      setAnswer(res.data.answer);

      if (res.data.audio_base64) {
        const audioUrl = `data:audio/mp3;base64,${res.data.audio_base64}`;
        setAudioSrc(audioUrl);
      } else {
        // If no audio was returned, return to recording after a short pause in hands-free mode
        if (isHandsFree) {
          setTimeout(() => {
            if (isHandsFree && !isRecordingRef.current && !loading) {
              startRecording();
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error(err);
      setTranscript("ERROR: Could not process voice.");
      if (isHandsFree) {
        setTimeout(() => {
          if (isHandsFree && !isRecordingRef.current) {
            startRecording();
          }
        }, 3000);
      }
    }
    setLoading(false);
  };

  const handleAudioEnded = () => {
    console.log("Response audio play ended.");
    if (isHandsFree) {
      startRecording();
    }
  };

  const handleAudioPlay = () => {
    setNeedsActivation(false);
    setHasStarted(true);
  };

  const handleAudioError = (e) => {
    console.error("Audio playback error:", e);
    setNeedsActivation(true);
  };

  const pulseScale = 1 + (volumeLevel / 100);

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {audioSrc && (
        <audio 
          ref={audioRef} 
          src={audioSrc} 
          autoPlay 
          onPlay={handleAudioPlay}
          onError={handleAudioError}
          onEnded={handleAudioEnded}
        />
      )}

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-4xl text-[#e9e6f9] mb-2 tracking-tight">Instant Conversation</h1>
          <p className="text-[#aba9bb]">Have a real-time, hands-free conversational voice loop with your AI Second Brain.</p>
        </div>

        {/* Hands-Free Mode Toggle */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass-card border border-white/10">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isHandsFree ? 'text-[#e966ff] animate-pulse' : 'text-[#aba9bb]'}`} />
            <span className="text-xs font-mono text-[#e9e6f9] tracking-wider">HANDS-FREE</span>
          </div>
          <button 
            onClick={() => {
              const newVal = !isHandsFree;
              setIsHandsFree(newVal);
              if (!newVal) {
                stopRecording();
              }
            }}
            className={`w-11 h-6 rounded-full transition-all duration-300 relative ${isHandsFree ? 'bg-[#e966ff]' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${isHandsFree ? 'left-6' : 'left-1'}`}></div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Audio Processor */}
        <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[#00affe] opacity-5 pointer-events-none"></div>

          {needsActivation ? (
            <div className="flex flex-col items-center justify-center text-center p-6 z-10">
              <div className="w-20 h-20 rounded-full bg-[#00affe]/10 border border-[#00affe]/30 flex items-center justify-center mb-6 animate-pulse shadow-glow-primary">
                <Headphones className="w-10 h-10 text-[#00affe]" />
              </div>
              <h3 className="font-display text-2xl text-[#e9e6f9] mb-3">Establish Neural Link</h3>
              <p className="text-[#aba9bb] text-sm mb-6 max-w-sm leading-relaxed">
                To start speech-to-speech interaction, we need to initialize the neural transmitter interface.
              </p>
              <button 
                onClick={activateLink}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#00affe] to-[#b6a0ff] text-white font-semibold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,175,254,0.4)]"
              >
                Connect Voice Sync
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center z-10 w-full">
              <div className="relative mb-8 mt-4">
                {isRecording && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-full bg-[#e966ff] opacity-40 transition-transform duration-75"
                      style={{ transform: `scale(${pulseScale * 1.3})` }}
                    ></div>
                    <div 
                      className="absolute -inset-4 rounded-full bg-[#e966ff] opacity-15 transition-transform duration-75"
                      style={{ transform: `scale(${pulseScale * 1.6})` }}
                    ></div>
                  </>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-8 rounded-full border shadow-glow-primary transition-all duration-300 relative z-10 ${
                    isRecording 
                      ? 'bg-[#e966ff]/20 border-[#e966ff] text-[#e966ff]' 
                      : 'bg-[#121220] border-white/10 hover:border-[#00affe] text-[#00affe]'
                  }`}
                >
                  <Mic className={`w-16 h-16 ${isRecording ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              <h3 className="font-display text-2xl font-light mb-4 tabular-nums tracking-widest text-[#e9e6f9] text-center uppercase">
                {isRecording ? "Listening..." : loading ? "Thinking..." : "Tap Mic to Talk"}
              </h3>
              <p className="text-[#aba9bb] text-sm text-center max-w-xs leading-relaxed">
                {isRecording 
                  ? "Speak naturally. Recording will stop automatically when you are silent." 
                  : isHandsFree 
                    ? "Hands-free speech-to-speech loop is active." 
                    : "Tap mic, state your request, and tap again to send."}
              </p>

              {/* Live Volume Level Bar */}
              {isRecording && (
                <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00affe] to-[#e966ff] transition-all duration-75"
                    style={{ width: `${Math.min(100, (volumeLevel / 100) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Transcript & Signals */}
        <div className="glass-card flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-white/10 bg-[#121220]/50 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#b6a0ff]" />
              <h4 className="font-mono text-sm tracking-widest text-[#aba9bb] uppercase">Conversation Log</h4>
            </div>
            {hasStarted && !needsActivation && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] uppercase tracking-wider">
                Active Link
              </span>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-[#aba9bb]">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-8 bg-[#00affe] animate-[pulse_1s_ease-in-out_infinite]"></div>
                  <div className="w-1 h-12 bg-[#b6a0ff] animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
                  <div className="w-1 h-6 bg-[#e966ff] animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
                  <div className="w-1 h-10 bg-[#00affe] animate-[pulse_1s_ease-in-out_0.1s_infinite]"></div>
                  <div className="w-1 h-4 bg-[#b6a0ff] animate-[pulse_1s_ease-in-out_0.3s_infinite]"></div>
                </div>
                <p className="font-mono text-xs uppercase animate-pulse">Analyzing speech and compiling response...</p>
              </div>
            ) : transcript || answer ? (
              <div className="space-y-6">
                {transcript && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#00affe]">
                      <Mic className="w-4 h-4" />
                      <span className="font-mono text-xs uppercase">You</span>
                    </div>
                    <p className="text-lg leading-relaxed font-light text-[#aba9bb] border-l-2 border-[#00affe] pl-4">
                      {transcript}
                    </p>
                  </div>
                )}

                {answer && (
                  <div className="space-y-2 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-[#e966ff]">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-mono text-xs uppercase">Second Brain</span>
                    </div>
                    <div className="text-lg leading-relaxed font-light text-[#e9e6f9] border-l-2 border-[#e966ff] pl-4 whitespace-pre-wrap">
                      {answer}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[#aba9bb] opacity-50 font-mono text-xs uppercase">
                Awaiting Audio Input...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Voice;