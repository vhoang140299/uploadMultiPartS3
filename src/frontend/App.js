import "./App.css"
import { Uploader } from "./utils/upload"
import { useEffect, useState } from "react"
import axios from "axios"
function App() {
  const [file, setFile] = useState(undefined)
  const [uploader, setUploader] = useState(undefined)
  const [fileId, setFileId] = useState(undefined)
  const [fileKey, setFileKey] = useState(undefined)
  const fileSizeChuck = 1024 * 1024 * 5
  const [s3Urls, setUrls] = useState([])
  const [slicesFile, setSlicesFile] = useState([])
  let config = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
  }

  const getInitMultipart = (file) => {
    axios
      .post(
        " http://localhost:3001/uploads/initializeMultipartUpload",
        {
          name: file.name,
        },
        config,
      )
      .then((res) => {
        if (res) {
          console.log(11111111, res)
          setFileId(res.data.fileId)
          setFileKey(res.data.fileKey)
          const parts = Math.ceil(file.size / fileSizeChuck)
          const body = {
            fileKey: res.data.fileKey,
            fileId: res.data.fileId,
            parts: parts,
          }
          console.log(body)
          axios
            .post(" http://localhost:3001/uploads/getMultipartPreSignedUrls", body, config)
            .then((res) => {
              if (res.data.parts && res.data.parts.length > 0) {
                setUrls(res.data.parts)
              }
            })
            .catch((err) => console.log(err))
        }
      })
      .catch((err) => {
        console.log(err)
      })
  }

  const onchangeFile = (e) => {
    const fileChanged = e.target?.files?.[0]
    setFile(fileChanged)
    getInitMultipart(fileChanged)
  }
  const onCancel = () => {
    if (uploader) {
      uploader.abort()
      setFile(undefined)
    }
  }

  const onUpload = () => {
    const chunkFiles = []
    console.log(s3Urls[s3Urls.length - 1].PartNumber)
    if (s3Urls.length > 0) {
      const sentSize = (s3Urls[0].PartNumber - 1) * fileSizeChuck
      console.log(sentSize) /// sai
      while (sentSize < s3Urls[s3Urls.length - 1].PartNumber) {
        const chuckFile = file.slice(sentSize, sentSize + fileSizeChuck)
        chunkFiles.push(chuckFile)
        console.log(sentSize)
      }
    }
    console.log(s3Urls.length)
  }
  return (
    <div className="App">
      <h1>Upload your file</h1>
      <div>
        -----
        <input type="file" onChange={onchangeFile} />
      </div>
      <div>
        <button onClick={onCancel}>Cancel</button>
      </div>
      <div>
        <button onClick={onUpload}>Upload</button>
      </div>
    </div>
  )
}

export default App
