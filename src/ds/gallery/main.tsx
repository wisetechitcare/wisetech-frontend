import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/ds/styles/globals.css"
import { GalleryApp } from "./GalleryApp"

createRoot(document.getElementById("kit-root")!).render(
  <StrictMode>
    <GalleryApp />
  </StrictMode>,
)
