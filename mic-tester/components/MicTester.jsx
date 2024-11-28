import { useState, useEffect, useRef } from 'react';
import { Mic, Settings, Volume2 } from 'lucide-react';

const MicTester = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    // Get available audio devices
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        setDevices(audioDevices);
        if (audioDevices.length > 0) {
          setSelectedDevice(audioDevices[0].deviceId);
        }
      });
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined
        }
      });
      
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setIsRecording(true);
      drawWaveform();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
    setVolume(0);
  };

  const drawWaveform = () => {
    if (!isRecording || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(14, 16, 20)';
      canvasCtx.fillRect(0, 0, width, height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(66, 153, 225)';
      canvasCtx.beginPath();
      
      const sliceWidth = width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
      
      // Calculate volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      setVolume(Math.min(100, (avg - 128) * 2));
    };
    
    draw();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Microphone Tester</h1>
          <p className="text-gray-400">Test your microphone and audio input levels</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <select
                className="bg-gray-700 text-white rounded-md px-4 py-2"
                value={selectedDevice || ''}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
              <Settings className="w-6 h-6 text-gray-400" />
            </div>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-6 py-2 rounded-full flex items-center space-x-2 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>{isRecording ? 'Stop' : 'Start'}</span>
            </button>
          </div>
          
          <div className="relative mb-6">
            <canvas
              ref={canvasRef}
              className="w-full h-40 bg-gray-900 rounded-lg"
              width={800}
              height={160}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <Volume2 className="w-6 h-6 text-gray-400" />
            <div className="flex-1 bg-gray-700 h-4 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${volume}%` }}
              />
            </div>
            <span className="text-gray-400 w-12">{Math.round(volume)}%</span>
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-400">
          <p>Make sure you've granted microphone permissions to use this tester</p>
        </div>
      </div>
    </div>
  );
};

export default MicTester;