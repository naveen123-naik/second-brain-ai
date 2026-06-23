import API from "./api"

export const sendVoice = async (audio) => {

  const formData = new FormData()
  formData.append("file", audio)

  return API.post("/Voice", formData)
}