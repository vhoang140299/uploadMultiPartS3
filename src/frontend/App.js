import "./App.css"
import { useEffect, useState } from "react"
import axios from "axios"
function App() {
  const [file, setFile] = useState(undefined)
  const [uploader, setUploader] = useState(undefined)
  const [fileId, setFileId] = useState(undefined)
  const [fileName, setFileName] = useState(undefined)
  const fileSizeChuck = 1024 * 1024 * 10
  const [s3Urls, setUrls] = useState([])
  const [slicesFile, setSlicesFile] = useState([])
  const [etags, setEtags] = useState([])
  const [blobFiles, setBlobFile] = useState([])
  let config = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "ETag",
    },
  }

  const onchangeFile = (e) => {
    const fileChanged = e.target?.files?.[0]
    setFile(fileChanged)
    console.log(fileChanged)
    axios.post("http://localhost:3001/uploads/start-upload", { name: fileChanged.name }, config).then((res) => {
      console.log(res)

      setFileId(res.data.UploadId)
      setFileName(res.data.Key)
    })
  }
  const onCancel = () => {
    if (uploader) {
      uploader.abort()
      setFile(undefined)
    }
  }

  const onUpload = async () => {
    const chunkFiles = []
    const chunkCount = Math.floor(file.size / fileSizeChuck) + 1
    console.log(chunkCount)
    let tags = []
    let files = []
    for (let uploadCount = 1; uploadCount < chunkCount + 1; uploadCount++) {
      let start = (uploadCount - 1) * fileSizeChuck
      let end = uploadCount * fileSizeChuck
      let fileBlob = uploadCount < chunkCount ? file.slice(start, end) : file.slice(start)
      files.push(fileBlob)
      setBlobFile(files)
    }
    try {
      if (files.length > 0) {
        await Promise.all(
          files.map(async (file, index) => {
            console.log(file, index)
            const signedUrl = await axios.post(
              "http://localhost:3001/uploads/get-upload-url",
              { partNumber: index + 1, uploadId: fileId, name: fileName },
              config,
            )
            // console.log("signedUrl", signedUrl)
            let uploadChuck = await fetch(signedUrl.data, {
              method: "PUT",
              body: file,
            })
            // console.log(uploadChuck)
            let EtagHeader = uploadChuck.headers.get("ETag")
            console.log(EtagHeader)
            let uploadPartDetails = {
              ETag: EtagHeader,
              PartNumber: index + 1,
            }
            console.log(uploadPartDetails)
            tags.push(uploadPartDetails)
          }),
        )
      }
    } catch (error) {}

    console.log(tags)
    if (tags.length > 0) {
      const completeUpload = await axios.post(`http://localhost:3001/complete`, {
        name: fileName,
        parts: tags,
        uploadId: fileId,
      })
      console.log(completeUpload)
    }
  }

  return (
    <div className="App">
      <h1>Upload your file</h1>
      <div>
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
