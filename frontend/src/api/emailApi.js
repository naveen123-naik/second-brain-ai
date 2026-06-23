import API from "./api"

export const getEmails = async () => {
  return API.get("/Email")
}