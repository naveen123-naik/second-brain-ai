import API from "./api"

export const askAI = async (question) => {
  // Post to backend chat endpoint (lowercase) as defined in FastAPI routes
  return API.post("/chat/", { question })
}

export const getChats = async () => {
  // Retrieve chat history if implemented (placeholder endpoint)
  return API.get("/chat/history")
}