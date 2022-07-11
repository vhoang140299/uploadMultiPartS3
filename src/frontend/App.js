import "./App.css"
import { useEffect, useState } from "react"
import axios from "axios"
function App() {
  const [file, setFile] = useState(undefined)
  const [uploader, setUploader] = useState(undefined)
  const [fileId, setFileId] = useState(undefined)
  const [fileKey, setFileKey] = useState(undefined)
  const fileSizeChuck = 1024 * 1024 * 6
  const [s3Urls, setUrls] = useState([])
  const [slicesFile, setSlicesFile] = useState([])
  const [etags, setEtags] = useState([])
  let config = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "ETag",
    },
  }

  const getInitMultipart = (file) => {
    axios
      .post(
        "http://localhost:3001/uploads/initializeMultipartUpload",
        {
          name: file.name,
        },
        config,
      )
      .then((res) => {
        if (res) {
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
            .post("http://localhost:3001/uploads/getMultipartPreSignedUrls", body, config)
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

  const onUpload = async () => {
    const chunkFiles = []
    let tags = []

    if (s3Urls.length > 0) {
      await Promise.all(
        s3Urls.map(async (s3Url) => {
          const sentSize = (s3Url.PartNumber - 1) * fileSizeChuck
          const chuckFile = file.slice(sentSize, sentSize + fileSizeChuck)
          console.log(chuckFile)
          console.log(chuckFile.size)
          console.log(sentSize, sentSize + fileSizeChuck)
          try {
            const res = await axios.put(
              s3Url.signedUrl,
              {
                file: chuckFile,
              },
              config,
            )
            console.log(res.headers)

            if (res && res?.headers?.etag) {
              const uploadedPart = {
                PartNumber: s3Url.PartNumber,
                ETag: res.headers.etag.replaceAll('"', ""),
              }
              tags.push(uploadedPart)
            }
            chunkFiles.push(chuckFile)
          } catch (error) {
            throw error
          }
          return 0
        }),
      )

      if (tags.length > 0) {
        axios
          .post(
            "http://localhost:3001/uploads/finalizeMultipartUpload",
            { fileId: fileId, fileKey: fileKey, parts: tags },
            config,
          )
          .then((res) => {
            console.log(res)
          })
          .catch((err) => {
            console.log(err)
          })
      }

      console.log(tags)
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
