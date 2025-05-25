import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

// Inline loader component
function Loader() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-200">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [answer, setAnswer] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) navigate("/login");
    fetchDocuments();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const res = await API.get("documents/");
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPage(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoadingUpload(true);
    try {
      await API.post("documents/", formData);
      setMessage("Upload successful!");
      setFile(null);
      fetchDocuments();
    } catch (err) {
      setMessage("Upload failed");
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDelete = async (id) => {
    setLoadingDeleteId(id);
    try {
      await API.delete(`documents/${id}/`);
      setMessage("Document deleted");
      fetchDocuments();
    } catch (err) {
      setMessage("Failed to delete");
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleAsk = async () => {
    if (!question || !selectedDoc) {
      setMessage("Please select a document and type a question.");
      return;
    }

    setLoadingAnswer(true);
    setAnswer("");
    try {
      const res = await API.post("ask-question/", {
        question,
        document_id: selectedDoc,
      });
      setAnswer(res.data.answer);
      setMessage("");
    } catch (err) {
      setMessage("Failed to get answer from AI");
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loadingPage) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-200 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Document Dashboard
        </h2>

        <form onSubmit={handleUpload} className="flex gap-2 mb-4">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border px-2 py-1 rounded"
          />
          <button
            className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
            disabled={loadingUpload}
          >
            {loadingUpload ? "Uploading..." : "Upload"}
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-green-600 mb-4">{message}</p>
        )}

        <h3 className="text-xl mb-2 font-semibold">Your Documents:</h3>
        <ul className="space-y-2">
          {documents.length === 0 && (
            <li className="text-gray-500">No documents yet.</li>
          )}
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex justify-between items-center border p-2 rounded"
            >
              <a
                href={`http://127.0.0.1:8000${doc.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline"
              >
                {doc.file.split("/").pop()}
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={loadingDeleteId === doc.id}
                className={`px-3 py-1 rounded ${
                  loadingDeleteId === doc.id
                    ? "bg-gray-400 text-white"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {loadingDeleteId === doc.id ? "Deleting..." : "Delete"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-10 border-t pt-6">
          <h3 className="text-xl font-semibold mb-2">
            Ask a Question About a Document
          </h3>

          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="w-full px-4 py-2 border rounded mb-2"
          >
            <option value="">Select a document</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.file.split("/").pop()}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="w-full px-4 py-2 border rounded mb-2"
          />

          <button
            onClick={handleAsk}
            disabled={loadingAnswer}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
          >
            {loadingAnswer ? "Thinking..." : "Ask Question"}
          </button>

          {answer && (
            <div className="mt-4 p-4 bg-gray-100 rounded shadow">
              <h4 className="font-semibold mb-1">AI Answer:</h4>
              <p className="text-gray-800">{answer}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
