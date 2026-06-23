import API from "./api"

export const getEvents = async () => {
  return API.get("/Calendar")
}