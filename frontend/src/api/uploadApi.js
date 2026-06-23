import API from "./api"

export const uploadFile = async (file) => {

  const formData = new FormData()
  formData.append("file", file)

  return API.post("/Upload", formData)
}