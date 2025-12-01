import { useParams, useNavigate, Link } from "react-router";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>User Profile</h1>
      <p>
        User ID: <strong>{userId}</strong>
      </p>

      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
        }}
      >
        <button onClick={handleGoBack}>Go Back</button>
        <Link to="/">Home</Link>
      </div>
    </div>
  );
}
