"use client";

import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Navbar from "@/components/Navbar";
import { useTheme } from "@/components/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [voterEmail, setVoterEmail] = useState("");
  const [voterPassword, setVoterPassword] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [voteCounts, setVoteCounts] = useState<{ [key: string]: number }>({});
  const [blockchainData, setBlockchainData] = useState<any[]>([]);

  const router = useRouter();
  const { theme } = useTheme();

  // Check if the admin is authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      const user = auth.currentUser;
      if (user && user.email === "prashansa.erica@gmail.com" || "shivansh@gmail.com") {
        setIsAuthenticated(true);
      } else {
        router.push("/auth");
      }
    };
    checkAuthStatus();
  }, [router]);

  // Fetch candidates, votes, and blockchain data
  useEffect(() => {
    const fetchCandidatesAndVotes = async () => {
      const candidatesSnapshot = await getDocs(collection(db, "candidates"));
      const candidateData = candidatesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCandidates(candidateData);

      const votesSnapshot = await getDocs(collection(db, "votes"));
      const voteCountsMap: { [key: string]: number } = {};

      votesSnapshot.docs.forEach((voteDoc) => {
        const candidateId = voteDoc.data().candidateId;
        if (candidateId) {
          voteCountsMap[candidateId] = (voteCountsMap[candidateId] || 0) + 1;
        }
      });

      setVoteCounts(voteCountsMap);
    };

    const fetchBlockchainData = async () => {
      try {
        const blockchainSnapshot = await getDocs(collection(db, "blockchain"));
        const allBlockchainData: any[] = [];

        blockchainSnapshot.forEach((doc) => {
          allBlockchainData.push({
            documentId: doc.id, // Include document ID
            chain: doc.data()?.chain || [],
          });
        });

        setBlockchainData(allBlockchainData);
      } catch (error) {
        console.error("Error fetching blockchain data", error);
      }
    };

    fetchCandidatesAndVotes();
    fetchBlockchainData();
  }, []);

  // Add a voter
  const handleAddVoter = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, voterEmail, voterPassword);
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        email: voterEmail,
        password: voterPassword,
        role: "voter",
      });
      setVoterEmail("");
      setVoterPassword("");
      alert("Temporary voter created successfully.");
    } catch (error) {
      console.error("Error creating voter", error);
      alert("Error creating voter. Please try again.");
    }
  };

  // Add a candidate
  const handleAddCandidate = async () => {
    try {
      if (candidateName.trim() === "") {
        alert("Please provide a valid candidate name.");
        return;
      }
      const newCandidateRef = await addDoc(collection(db, "candidates"), { name: candidateName });
      const newCandidate = { id: newCandidateRef.id, name: candidateName };

      setCandidates((prevCandidates) => [...prevCandidates, newCandidate]);
      setVoteCounts((prevVoteCounts) => ({ ...prevVoteCounts, [newCandidate.id]: 0 }));

      setCandidateName("");
      alert("Candidate added successfully.");
    } catch (error) {
      console.error("Error adding candidate", error);
      alert("Error adding candidate. Please try again.");
    }
  };

  // Delete a candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteDoc(doc(db, "candidates", candidateId));
      alert("Candidate deleted successfully.");
      setCandidates((prevCandidates) => prevCandidates.filter((candidate) => candidate.id !== candidateId));
      setVoteCounts((prevVoteCounts) => {
        const updatedCounts = { ...prevVoteCounts };
        delete updatedCounts[candidateId];
        return updatedCounts;
      });
    } catch (error) {
      console.error("Error deleting candidate", error);
      alert("Error deleting candidate. Please try again.");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Styling
  const containerStyle = theme === "light" ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-200";
  const boxStyle = theme === "light" ? "bg-white" : "bg-gray-800 border border-gray-700";
  const inputStyle = theme === "light" ? "text-gray-900" : "text-black bg-gray-100";
  const buttonStyle = theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600";

  return (
    <>
      <Navbar />
      <div className={`min-h-screen p-8 ${containerStyle}`}>
        <h1 className="text-3xl font-semibold text-center text-indigo-600 mb-8">Admin Dashboard</h1>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Add Temporary Voter</h2>

           <Link href="/face_register">
              <div  className={`w-full ${buttonStyle} text-white p-3 rounded-md mb-5 transition`} >Add facial id of voter</div>
            </Link>
          <input
            type="email"
            placeholder="Voter Email"
            value={voterEmail}
            onChange={(e) => setVoterEmail(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <input
            type="password"
            placeholder="Voter Password"
            value={voterPassword}
            onChange={(e) => setVoterPassword(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <button
            onClick={handleAddVoter}
            className={`w-full ${buttonStyle} text-white p-3 rounded-md transition`}
          >
            Add Voter
          </button>
        </div>


        <div></div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Add Candidate</h2>
          <input
            type="text"
            placeholder="Candidate Name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className={`w-full p-3 border rounded-md mb-4 ${inputStyle}`}
          />
          <button
            onClick={handleAddCandidate}
            className={`w-full ${buttonStyle} text-white p-3 rounded-md transition`}
          >
            Add Candidate
          </button>
        </div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Candidates and Votes</h2>
          <ul>
            {candidates.map((candidate) => (
              <li key={candidate.id} className="p-4 border-b border-gray-200 flex justify-between items-center">
                <span>{candidate.name}</span>
                <span>Votes: {voteCounts[candidate.id] || 0}</span>
                <button
                  onClick={() => handleDeleteCandidate(candidate.id)}
                  className="bg-red-500 text-white py-1 px-4 rounded-md hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${boxStyle} p-6 rounded-lg shadow-md`}>
          <h2 className="text-xl font-semibold mb-4">Blockchain Data</h2>
          {blockchainData.map((document) => (
            <div key={document.documentId} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Document ID: {document.documentId}</h3>
              <ul>
                {document.chain.map((block: any, index: number) => (
                  <li key={index} className="p-4 border-b border-gray-200">
                    <p>
                      <strong>Block #{block.index}</strong>
                    </p>
                    <p>
                      <strong>Timestamp:</strong> {new Date(block.timestamp).toLocaleString()}
                    </p>
                    <p>
                      <strong>Previous Hash:</strong> {block.previousHash}
                    </p>
                    <p>
                      <strong>Hash:</strong> {block.hash}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminPage;
