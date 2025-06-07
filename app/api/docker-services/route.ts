import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try to connect to FastAPI backend
    const response = await fetch("https://api.abhinavkm.com/docker-services", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`FastAPI backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error connecting to FastAPI backend:", error)

    // Return error response - frontend will fallback to dummy data
    return NextResponse.json(
      {
        error: "Unable to connect to Docker service backend",
        message: "Make sure the FastAPI server is running on port 8000",
      },
      { status: 503 },
    )
  }
}
