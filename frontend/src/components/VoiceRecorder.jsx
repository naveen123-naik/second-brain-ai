import { useState } from "react"
import { sendVoice } from "../api/voiceApi"

function VoiceRecorder() {

  const [recording, setRecording] = useState(false)
  const [response, setResponse] = useState("")

  let mediaRecorder
  let audioChunks = []

  const startRecording = async () => {

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    })

    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.start()
    setRecording(true)

    mediaRecorder.ondataavailable = e => {
      audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {

      const blob = new Blob(audioChunks)

      const file = new File([blob], "voice.wav")

      const res = await sendVoice(file)

      setResponse(res.data.response)
    }
  }

  const stopRecording = () => {
    mediaRecorder.stop()
    setRecording(false)
  }

  return (
    <div>

      <button
        onClick={recording ? stopRecording : startRecording}
        className="bg-red-500 text-white px-4 py-2"
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      <p className="mt-4">
        {response}
      </p>

    </div>
  )
}

export default VoiceRecorder